import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { config } from "../config.js";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

const DEFAULT_LOCATION = "Avenida Paulista, São Paulo, Brasil";
const DEFAULT_RADIUS_METERS = 1500;
const MAX_RADIUS_METERS = 5000;
const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_CAP = 60;
const NEARBY_SEARCH_PAGE_DELAY_MS = 2000;

interface GeocodeResult {
  geometry: { location: { lat: number; lng: number } };
  formatted_address: string;
}

interface NearbySearchResult {
  place_id: string;
  name: string;
  vicinity?: string;
}

interface PlaceDetailsResult {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  rating?: number;
  types?: string[];
}

function requireApiKey(): string {
  if (!config.googleMapsApiKey) {
    throw new Error(
      "Variável de ambiente GOOGLE_MAPS_API_KEY não configurada. Gere uma chave no Google Cloud Console com as APIs 'Places API' e 'Geocoding API' habilitadas.",
    );
  }
  return config.googleMapsApiKey;
}

async function geocodeLocation(address: string, apiKey: string): Promise<GeocodeResult> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as {
    status: string;
    results: GeocodeResult[];
    error_message?: string;
  };

  if (data.status !== "OK" || data.results.length === 0) {
    throw new Error(
      `Não foi possível geocodificar "${address}": ${data.status}${data.error_message ? ` - ${data.error_message}` : ""}`,
    );
  }

  return data.results[0]!;
}

async function fetchNearbyPlaces(input: {
  lat: number;
  lng: number;
  radiusMeters: number;
  type?: string;
  keyword?: string;
  apiKey: string;
  maxResults: number;
}): Promise<NearbySearchResult[]> {
  const results: NearbySearchResult[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(NEARBY_SEARCH_URL);
    url.searchParams.set("key", input.apiKey);

    if (pageToken) {
      url.searchParams.set("pagetoken", pageToken);
      await new Promise((resolve) => setTimeout(resolve, NEARBY_SEARCH_PAGE_DELAY_MS));
    } else {
      url.searchParams.set("location", `${input.lat},${input.lng}`);
      url.searchParams.set("radius", String(input.radiusMeters));
      if (input.type) url.searchParams.set("type", input.type);
      if (input.keyword) url.searchParams.set("keyword", input.keyword);
    }

    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      results: NearbySearchResult[];
      next_page_token?: string;
      error_message?: string;
    };

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Erro na busca de estabelecimentos: ${data.status}${data.error_message ? ` - ${data.error_message}` : ""}`,
      );
    }

    results.push(...data.results);
    pageToken = data.next_page_token;
  } while (pageToken && results.length < input.maxResults);

  return results.slice(0, input.maxResults);
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetailsResult | undefined> {
  const url = new URL(PLACE_DETAILS_URL);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,international_phone_number,website,url,rating,types",
  );

  const response = await fetch(url);
  const data = (await response.json()) as {
    status: string;
    result?: PlaceDetailsResult;
    error_message?: string;
  };

  if (data.status !== "OK") {
    console.error(`Erro ao buscar detalhes do lugar ${placeId}: ${data.status} ${data.error_message ?? ""}`);
    return undefined;
  }

  return data.result;
}

function formatBusiness(details: PlaceDetailsResult): string {
  const lines = [`- ${details.name}`];
  if (details.formatted_address) lines.push(`  Endereço: ${details.formatted_address}`);
  const phone = details.formatted_phone_number ?? details.international_phone_number;
  if (phone) lines.push(`  Telefone: ${phone}`);
  if (details.rating !== undefined) lines.push(`  Avaliação: ${details.rating}`);
  if (details.url) lines.push(`  Google Maps: ${details.url}`);
  if (details.types?.length) lines.push(`  Categoria: ${details.types.join(", ")}`);
  return lines.join("\n");
}

export function registerScrapeBusinessesWithoutWebsiteTool(server: McpServer): void {
  server.registerTool(
    "scrape_businesses_without_website",
    {
      title: "Buscar comércios sem site próximos a um local",
      description:
        "Busca comércios/estabelecimentos próximos a um endereço (padrão: Avenida Paulista, São Paulo) usando a Google Places API e retorna apenas aqueles que NÃO possuem site cadastrado no Google — potenciais leads para venda de criação de sites. Requer a variável de ambiente GOOGLE_MAPS_API_KEY configurada com Places API e Geocoding API habilitadas.",
      inputSchema: {
        location: z
          .string()
          .optional()
          .describe(
            `Endereço ou região de referência para a busca. Padrão: "${DEFAULT_LOCATION}".`,
          ),
        radiusMeters: z
          .number()
          .int()
          .positive()
          .max(MAX_RADIUS_METERS)
          .optional()
          .describe(`Raio de busca em metros a partir do local (máx. ${MAX_RADIUS_METERS}). Padrão: ${DEFAULT_RADIUS_METERS}.`),
        type: z
          .string()
          .optional()
          .describe(
            "Tipo de estabelecimento do Google Places (ex: 'restaurant', 'store', 'beauty_salon'). Opcional.",
          ),
        keyword: z
          .string()
          .optional()
          .describe("Palavra-chave adicional para refinar a busca (ex: 'padaria', 'pet shop')."),
        maxResults: z
          .number()
          .int()
          .positive()
          .max(MAX_RESULTS_CAP)
          .optional()
          .describe(`Número máximo de estabelecimentos a analisar (máx. ${MAX_RESULTS_CAP}). Padrão: ${DEFAULT_MAX_RESULTS}.`),
      },
      annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ location, radiusMeters, type, keyword, maxResults }) => {
      const apiKey = requireApiKey();
      const targetLocation = location ?? DEFAULT_LOCATION;
      const radius = radiusMeters ?? DEFAULT_RADIUS_METERS;
      const limit = maxResults ?? DEFAULT_MAX_RESULTS;

      const geocoded = await geocodeLocation(targetLocation, apiKey);
      const nearby = await fetchNearbyPlaces({
        lat: geocoded.geometry.location.lat,
        lng: geocoded.geometry.location.lng,
        radiusMeters: radius,
        type,
        keyword,
        apiKey,
        maxResults: limit,
      });

      const detailsList = await Promise.all(
        nearby.map((place) => fetchPlaceDetails(place.place_id, apiKey)),
      );

      const withoutWebsite = detailsList.filter(
        (details): details is PlaceDetailsResult => details !== undefined && !details.website,
      );

      const header = `Busca em torno de "${geocoded.formatted_address}" (raio ${radius}m). Analisados: ${nearby.length}. Sem site cadastrado: ${withoutWebsite.length}.`;

      const body =
        withoutWebsite.length > 0
          ? withoutWebsite.map(formatBusiness).join("\n\n")
          : "Nenhum comércio sem site foi encontrado nesse raio. Tente aumentar o raio, trocar o tipo/palavra-chave ou o local de referência.";

      return {
        content: [
          {
            type: "text" as const,
            text: [header, body].join("\n\n"),
          },
        ],
      };
    },
  );
}
