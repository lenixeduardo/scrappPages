import type { Business } from "../leads.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/** Public Overpass instances, tried in order — they rate-limit independently. */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

/** Nominatim's usage policy requires a real identifying User-Agent. */
const USER_AGENT = "scrapppages-lead-prospector/2.0 (https://github.com/lenixeduardo/scrappPages)";

export class OsmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OsmError";
  }
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocode(address: string): Promise<GeocodedLocation> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!response.ok) {
    throw new OsmError(`Nominatim respondeu ${response.status} ao geocodificar "${address}".`);
  }

  const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  const first = results[0];
  if (!first) throw new OsmError(`Não foi possível localizar "${address}" no OpenStreetMap.`);

  return { lat: Number(first.lat), lng: Number(first.lon), formattedAddress: first.display_name };
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Storefront trades most likely to be running on a phone number and an
 * Instagram page instead of a real website.
 */
const AMENITY_VALUES = [
  "restaurant",
  "cafe",
  "bar",
  "fast_food",
  "pharmacy",
  "veterinary",
  "driving_school",
  "dentist",
  "clinic",
];

function buildQuery(lat: number, lng: number, radiusMeters: number, keyword?: string): string {
  const around = `around:${radiusMeters},${lat},${lng}`;
  const filter = keyword ? `["name"~"${keyword.replace(/["\\]/g, "")}",i]` : "";

  const selectors = [
    `nwr["shop"]${filter}(${around});`,
    `nwr["craft"]${filter}(${around});`,
    `nwr["office"]${filter}(${around});`,
    `nwr["amenity"~"^(${AMENITY_VALUES.join("|")})$"]${filter}(${around});`,
    `nwr["leisure"="fitness_centre"]${filter}(${around});`,
  ].join("\n  ");

  return `[out:json][timeout:60];\n(\n  ${selectors}\n);\nout center tags;`;
}

const SOCIAL_TAGS = [
  "contact:facebook",
  "contact:instagram",
  "contact:whatsapp",
  "contact:tiktok",
  "contact:youtube",
  "facebook",
  "instagram",
];

function toAddress(tags: Record<string, string>): string | undefined {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
  const rest = [tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(" - ");
  const full = [street, rest].filter(Boolean).join(" - ");
  return full || undefined;
}

function toCategory(tags: Record<string, string>): string | undefined {
  const raw = tags.shop ?? tags.craft ?? tags.amenity ?? tags.office ?? tags.leisure;
  return raw ? raw.replace(/_/g, " ") : undefined;
}

export function mapElementToBusiness(element: OverpassElement): Business | undefined {
  const tags = element.tags;
  if (!tags?.name) return undefined;

  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  const socialUrls = SOCIAL_TAGS.map((tag) => tags[tag]).filter((value): value is string => Boolean(value));

  return {
    id: `${element.type}/${element.id}`,
    name: tags.name,
    address: toAddress(tags),
    phone: tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"] ?? tags["contact:whatsapp"],
    website: tags.website ?? tags["contact:website"] ?? tags.url,
    socialUrls: socialUrls.length ? socialUrls : undefined,
    category: toCategory(tags),
    mapUri:
      lat !== undefined && lon !== undefined
        ? `https://www.openstreetmap.org/${element.type}/${element.id}`
        : undefined,
    permanentlyClosed: tags.disused === "yes" || Boolean(tags["disused:shop"]) || tags.opening_hours === "closed",
  };
}

export interface OverpassOutcome {
  businesses: Business[];
  endpointUsed: string;
  rawCount: number;
}

export async function searchBusinesses(input: {
  lat: number;
  lng: number;
  radiusMeters: number;
  keyword?: string;
  endpoints?: string[];
}): Promise<OverpassOutcome> {
  const query = buildQuery(input.lat, input.lng, input.radiusMeters, input.keyword);
  const endpoints = input.endpoints ?? OVERPASS_ENDPOINTS;
  const failures: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: new URLSearchParams({ data: query }),
      });

      if (!response.ok) {
        failures.push(`${endpoint} → HTTP ${response.status}`);
        continue;
      }

      const data = (await response.json()) as { elements?: OverpassElement[] };
      const elements = data.elements ?? [];
      const businesses = elements
        .map(mapElementToBusiness)
        .filter((business): business is Business => business !== undefined);

      return { businesses, endpointUsed: endpoint, rawCount: elements.length };
    } catch (error) {
      failures.push(`${endpoint} → ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new OsmError(`Nenhum servidor Overpass respondeu. Tentativas:\n${failures.join("\n")}`);
}

export { buildQuery };
