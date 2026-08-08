import { selectLeads, type Business, type Lead, type SelectOptions } from "./leads.js";
import * as google from "./providers/google.js";
import * as osm from "./providers/osm.js";

export const DEFAULT_LOCATION = "Avenida Paulista, São Paulo, Brasil";
export const DEFAULT_RADIUS_METERS = 2000;
export const MAX_RADIUS_METERS = 50000;
export const DEFAULT_TARGET_LEADS = 10;
export const MAX_TARGET_LEADS = 200;
export const DEFAULT_MAX_PLACES_SCANNED = 400;
export const MAX_PLACES_SCANNED_CAP = 2000;

export type Provider = "osm" | "google";

/** Categories used to fan out the paid Google provider, which has no bulk query. */
const GOOGLE_CATEGORIES = [
  "padaria",
  "salão de beleza",
  "barbearia",
  "pet shop",
  "lanchonete",
  "oficina mecânica",
  "loja de roupas",
  "academia",
  "restaurante",
  "farmácia",
  "papelaria",
  "borracharia",
];

export interface ProspectInput {
  location?: string;
  radiusMeters?: number;
  keyword?: string;
  type?: string;
  targetLeads?: number;
  maxPlacesScanned?: number;
  includeSocialOnly?: boolean;
  requirePhone?: boolean;
  provider?: Provider;
}

export interface ProspectResult {
  leads: Lead[];
  provider: Provider;
  origin: { formattedAddress: string; lat: number; lng: number };
  radiusMeters: number;
  scanned: number;
  targetLeads: number;
  reachedTarget: boolean;
  billableCalls: number;
  source: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function prospectViaOsm(
  input: ProspectInput,
  radiusMeters: number,
  targetLeads: number,
  maxPlacesScanned: number,
  selectOptions: SelectOptions,
): Promise<ProspectResult> {
  const location = input.location?.trim() || DEFAULT_LOCATION;
  const origin = await osm.geocode(location);

  const { businesses, endpointUsed } = await osm.searchBusinesses({
    lat: origin.lat,
    lng: origin.lng,
    radiusMeters,
    keyword: input.keyword,
  });

  const scanned = businesses.slice(0, maxPlacesScanned);
  const leads = selectLeads(scanned, selectOptions);

  return {
    leads: leads.slice(0, targetLeads),
    provider: "osm",
    origin: { formattedAddress: origin.formattedAddress, lat: origin.lat, lng: origin.lng },
    radiusMeters,
    scanned: scanned.length,
    targetLeads,
    reachedTarget: leads.length >= targetLeads,
    billableCalls: 0,
    source: `OpenStreetMap (Nominatim + ${endpointUsed})`,
  };
}

async function prospectViaGoogle(
  input: ProspectInput,
  radiusMeters: number,
  targetLeads: number,
  maxPlacesScanned: number,
  selectOptions: SelectOptions,
  apiKey: string,
): Promise<ProspectResult> {
  const location = input.location?.trim() || DEFAULT_LOCATION;
  const origin = await google.geocodeLocation(location, apiKey);

  const collected: Business[] = [];
  let billableCalls = 1;
  let leads: Lead[] = [];

  const queries = input.keyword ? [input.keyword] : input.type ? [input.type] : GOOGLE_CATEGORIES;

  for (const query of queries) {
    if (leads.length >= targetLeads || collected.length >= maxPlacesScanned) break;

    const outcome = await google.searchText({
      textQuery: `${query} em ${origin.formattedAddress}`,
      lat: origin.lat,
      lng: origin.lng,
      radiusMeters,
      maxPlaces: Math.min(60, maxPlacesScanned - collected.length),
      apiKey,
      onPage: (page) => {
        collected.push(...page.map(google.mapPlaceToBusiness));
        leads = selectLeads(collected, selectOptions);
        return leads.length < targetLeads;
      },
    });
    billableCalls += outcome.apiCalls;
  }

  return {
    leads: leads.slice(0, targetLeads),
    provider: "google",
    origin: { formattedAddress: origin.formattedAddress, lat: origin.lat, lng: origin.lng },
    radiusMeters,
    scanned: new Set(collected.map((business) => business.id)).size,
    targetLeads,
    reachedTarget: leads.length >= targetLeads,
    billableCalls,
    source: "Google Places API (New)",
  };
}

export async function prospect(input: ProspectInput, apiKey?: string): Promise<ProspectResult> {
  const provider = input.provider ?? "osm";
  const radiusMeters = clamp(input.radiusMeters ?? DEFAULT_RADIUS_METERS, 1, MAX_RADIUS_METERS);
  const targetLeads = clamp(input.targetLeads ?? DEFAULT_TARGET_LEADS, 1, MAX_TARGET_LEADS);
  const maxPlacesScanned = clamp(
    input.maxPlacesScanned ?? DEFAULT_MAX_PLACES_SCANNED,
    targetLeads,
    MAX_PLACES_SCANNED_CAP,
  );

  const selectOptions: SelectOptions = {
    includeSocialOnly: input.includeSocialOnly ?? true,
    requirePhone: input.requirePhone ?? false,
  };

  if (provider === "google") {
    if (!apiKey) {
      throw new Error(
        "provider='google' exige GOOGLE_MAPS_API_KEY. Use provider='osm' (padrão) para buscar sem chave e sem custo.",
      );
    }
    return prospectViaGoogle(input, radiusMeters, targetLeads, maxPlacesScanned, selectOptions, apiKey);
  }

  return prospectViaOsm(input, radiusMeters, targetLeads, maxPlacesScanned, selectOptions);
}
