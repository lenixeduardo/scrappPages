import { selectLeads, type Lead, type PlaceRecord, type SelectOptions } from "./leads.js";
import { geocodeLocation, searchNearby, searchText, type GeocodedLocation } from "./places-client.js";

export const DEFAULT_LOCATION = "Avenida Paulista, São Paulo, Brasil";
export const DEFAULT_RADIUS_METERS = 2000;
export const MAX_RADIUS_METERS = 50000;
export const DEFAULT_TARGET_LEADS = 10;
export const MAX_TARGET_LEADS = 60;
export const DEFAULT_MAX_PLACES_SCANNED = 120;
export const MAX_PLACES_SCANNED_CAP = 400;

/**
 * Small storefront trades, which in Brazil are the categories most likely to
 * run on a phone number and an Instagram page instead of a real website.
 */
const DEFAULT_CATEGORIES = [
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
  type?: string;
  keyword?: string;
  targetLeads?: number;
  maxPlacesScanned?: number;
  includeSocialOnly?: boolean;
  requirePhone?: boolean;
}

export interface ProspectResult {
  leads: Lead[];
  origin: GeocodedLocation;
  radiusMeters: number;
  scanned: number;
  targetLeads: number;
  reachedTarget: boolean;
  queriesUsed: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function prospect(input: ProspectInput, apiKey: string): Promise<ProspectResult> {
  const location = input.location?.trim() || DEFAULT_LOCATION;
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

  const origin = await geocodeLocation(location, apiKey);

  const places: PlaceRecord[] = [];
  const queriesUsed: string[] = [];
  let leads: Lead[] = [];

  const absorb = (batch: PlaceRecord[], label: string): void => {
    if (batch.length === 0) return;
    places.push(...batch);
    queriesUsed.push(label);
    leads = selectLeads(places, selectOptions);
  };

  if (input.type) {
    const batch = await searchNearby({
      lat: origin.lat,
      lng: origin.lng,
      radiusMeters,
      includedTypes: [input.type],
      maxPlaces: maxPlacesScanned,
      apiKey,
    });
    absorb(batch, `tipo:${input.type}`);
  }

  // Fan out across categories until the caller's lead target is actually met,
  // rather than returning whatever a single fixed-size scan happened to yield.
  const queries = input.keyword ? [input.keyword] : input.type ? [input.type] : DEFAULT_CATEGORIES;

  for (const query of queries) {
    if (leads.length >= targetLeads || places.length >= maxPlacesScanned) break;

    const batch = await searchText({
      textQuery: `${query} em ${origin.formattedAddress}`,
      lat: origin.lat,
      lng: origin.lng,
      radiusMeters,
      maxPlaces: Math.min(60, maxPlacesScanned - places.length),
      apiKey,
    });
    absorb(batch, query);
  }

  return {
    leads: leads.slice(0, targetLeads),
    origin,
    radiusMeters,
    scanned: new Set(places.map((place) => place.id)).size,
    targetLeads,
    reachedTarget: leads.length >= targetLeads,
    queriesUsed,
  };
}
