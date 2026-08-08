import type { Business } from "../leads.js";

export interface PlaceRecord {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  primaryType?: string;
}

export function mapPlaceToBusiness(place: PlaceRecord): Business {
  return {
    id: place.id,
    name: place.displayName?.text ?? "",
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
    website: place.websiteUri,
    rating: place.rating,
    reviews: place.userRatingCount,
    category: place.primaryTypeDisplayName?.text ?? place.primaryType?.replace(/_/g, " "),
    mapUri: place.googleMapsUri,
    permanentlyClosed: place.businessStatus === "CLOSED_PERMANENTLY",
    temporarilyClosed: place.businessStatus === "CLOSED_TEMPORARILY",
  };
}

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

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
  /** Called after each page; return false to stop paginating and save billable calls. */
  onPage?: (places: PlaceRecord[]) => boolean;
}

export interface SearchOutcome {
  places: PlaceRecord[];
  apiCalls: number;
}

/** Text Search (New), following nextPageToken until maxPlaces or onPage says stop. */
export async function searchText(input: TextSearchInput): Promise<SearchOutcome> {
  const collected: PlaceRecord[] = [];
  let pageToken: string | undefined;
  let apiCalls = 0;

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
    apiCalls += 1;
    const page = data.places ?? [];
    collected.push(...page);
    pageToken = data.nextPageToken;

    if (input.onPage && !input.onPage(page)) break;
  } while (pageToken && collected.length < input.maxPlaces);

  return { places: collected.slice(0, input.maxPlaces), apiCalls };
}
