import type { PlaceRecord } from "./leads.js";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const SEARCH_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";

export const PLACE_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.googleMapsUri",
  "places.primaryType",
  "places.primaryTypeDisplayName",
].join(",");

export const MAX_PAGE_SIZE = 20;

export class PlacesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly googleStatus?: string,
  ) {
    super(message);
    this.name = "PlacesApiError";
  }
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeLocation(address: string, apiKey: string): Promise<GeocodedLocation> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    results: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[];
  };

  const first = data.results?.[0];
  if (data.status !== "OK" || !first) {
    throw new PlacesApiError(
      `Não foi possível localizar "${address}" (${data.status}${data.error_message ? `: ${data.error_message}` : ""}).`,
      response.status,
      data.status,
    );
  }

  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formattedAddress: first.formatted_address,
  };
}

async function postPlaces(url: string, body: unknown, apiKey: string): Promise<{ places?: PlaceRecord[]; nextPageToken?: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": `${PLACE_FIELDS},nextPageToken`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as {
    places?: PlaceRecord[];
    nextPageToken?: string;
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    throw new PlacesApiError(
      data.error?.message ?? `Places API respondeu ${response.status}.`,
      response.status,
      data.error?.status,
    );
  }

  return data;
}

export interface TextSearchInput {
  textQuery: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxPlaces: number;
  apiKey: string;
}

/** Text Search (New), following nextPageToken until maxPlaces is reached. */
export async function searchText(input: TextSearchInput): Promise<PlaceRecord[]> {
  const collected: PlaceRecord[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = {
      textQuery: input.textQuery,
      pageSize: Math.min(MAX_PAGE_SIZE, input.maxPlaces - collected.length),
      languageCode: "pt-BR",
      regionCode: "BR",
      locationRestriction: {
        circle: {
          center: { latitude: input.lat, longitude: input.lng },
          radius: input.radiusMeters,
        },
      },
    };
    if (pageToken) body.pageToken = pageToken;

    const data = await postPlaces(SEARCH_TEXT_URL, body, input.apiKey);
    collected.push(...(data.places ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken && collected.length < input.maxPlaces);

  return collected.slice(0, input.maxPlaces);
}

export interface NearbySearchInput {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes?: string[];
  maxPlaces: number;
  apiKey: string;
}

/** Nearby Search (New). Caps at 20 results and has no pagination. */
export async function searchNearby(input: NearbySearchInput): Promise<PlaceRecord[]> {
  const body: Record<string, unknown> = {
    maxResultCount: Math.min(MAX_PAGE_SIZE, input.maxPlaces),
    languageCode: "pt-BR",
    regionCode: "BR",
    locationRestriction: {
      circle: {
        center: { latitude: input.lat, longitude: input.lng },
        radius: input.radiusMeters,
      },
    },
  };
  if (input.includedTypes?.length) body.includedTypes = input.includedTypes;

  const data = await postPlaces(SEARCH_NEARBY_URL, body, input.apiKey);
  return data.places ?? [];
}
