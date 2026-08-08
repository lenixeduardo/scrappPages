import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { config } from "../config.js";
import type { BusinessLead, LeadSource } from "../types/lead.js";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

export const DEFAULT_LOCATION = "Avenida Paulista, São Paulo, Brasil";
export const DEFAULT_RADIUS_METERS = 1500;
const MAX_RADIUS_METERS = 5000;
export const DEFAULT_MAX_RESULTS = 20;
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

export interface PlaceDetailsResult {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

/**
 * Costura mínima de HTTP. Só o suficiente para o `fetch` global e para o
 * cliente falso da fixture, que permite rodar a extração inteira offline.
 */
export type FetchLike = (url: URL) => Promise<{ json: () => Promise<unknown> }>;

function requireApiKey(): string {
  if (!config.googleMapsApiKey) {
    throw new Error(
      "Variável de ambiente GOOGLE_MAPS_API_KEY não configurada. Gere uma chave no Google Cloud Console com as APIs 'Places API' e 'Geocoding API' habilitadas.",
    );
  }
  return config.googleMapsApiKey;
}

/** Dependências da extração. `fetchImpl` é o que permite rodar offline. */
export interface PlacesDeps {
  apiKey: string;
  /** Padrão: o `fetch` global. */
  fetchImpl?: FetchLike;
  /** Espera entre páginas do Nearby Search. Padrão: 2000ms (exigência do Google). */
  pageDelayMs?: number;
  /** Origem carimbada nos leads. Padrão: `google-places`. */
  source?: LeadSource;
}

function httpGet(deps: PlacesDeps): FetchLike {
  return deps.fetchImpl ?? ((url: URL) => fetch(url));
}

export async function geocodeLocation(address: string, deps: PlacesDeps): Promise<GeocodeResult> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", address);
  url.searchParams.set("key", deps.apiKey);

  const response = await httpGet(deps)(url);
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

export async function fetchNearbyPlaces(
  input: {
    lat: number;
    lng: number;
    radiusMeters: number;
    type?: string;
    keyword?: string;
    maxResults: number;
  },
  deps: PlacesDeps,
): Promise<NearbySearchResult[]> {
  const results: NearbySearchResult[] = [];
  const pageDelayMs = deps.pageDelayMs ?? NEARBY_SEARCH_PAGE_DELAY_MS;
  let pageToken: string | undefined;

  do {
    const url = new URL(NEARBY_SEARCH_URL);
    url.searchParams.set("key", deps.apiKey);

    if (pageToken) {
      url.searchParams.set("pagetoken", pageToken);
      if (pageDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, pageDelayMs));
      }
    } else {
      url.searchParams.set("location", `${input.lat},${input.lng}`);
      url.searchParams.set("radius", String(input.radiusMeters));
      if (input.type) url.searchParams.set("type", input.type);
      if (input.keyword) url.searchParams.set("keyword", input.keyword);
    }

    const response = await httpGet(deps)(url);
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

export async function fetchPlaceDetails(
  placeId: string,
  deps: PlacesDeps,
): Promise<PlaceDetailsResult | undefined> {
  const url = new URL(PLACE_DETAILS_URL);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", deps.apiKey);
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,international_phone_number,website,url,rating,user_ratings_total,types",
  );

  const response = await httpGet(deps)(url);
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

export function toBusinessLead(
  details: PlaceDetailsResult,
  placeId: string,
  source: LeadSource = "google-places",
): BusinessLead {
  return {
    placeId,
    name: details.name,
    formattedAddress: details.formatted_address,
    phone: details.formatted_phone_number ?? details.international_phone_number,
    googleMapsUrl: details.url,
    rating: details.rating,
    userRatingsTotal: details.user_ratings_total,
    types: details.types,
    source,
  };
}

export function formatBusiness(lead: BusinessLead): string {
  const lines = [`- ${lead.name}`];
  if (lead.formattedAddress) lines.push(`  Endereço: ${lead.formattedAddress}`);
  if (lead.phone) lines.push(`  Telefone: ${lead.phone}`);
  if (lead.rating !== undefined) lines.push(`  Avaliação: ${lead.rating}`);
  if (lead.googleMapsUrl) lines.push(`  Google Maps: ${lead.googleMapsUrl}`);
  if (lead.types?.length) lines.push(`  Categoria: ${lead.types.join(", ")}`);
  return lines.join("\n");
}

// Type alias em vez de interface: o SDK exige que `structuredContent` seja
// atribuível a `{ [x: string]: unknown }`, e só aliases ganham index signature
// implícita.
export type ExtractLeadsResult = {
  /** Endereço normalizado que o Geocoding devolveu para a busca. */
  resolvedLocation: string;
  radiusMeters: number;
  /** Quantos estabelecimentos foram trazidos pelo Nearby Search. */
  analyzed: number;
  /** Quantos já tinham site cadastrado e por isso foram descartados. */
  withWebsite: number;
  /** Quantos tiveram falha no Place Details (não dá para afirmar se têm site). */
  detailsFailed: number;
  leads: BusinessLead[];
  source: LeadSource;
};

/**
 * Roda a extração de ponta a ponta: geocodifica o endereço, busca os
 * estabelecimentos ao redor, consulta o detalhe de cada um e devolve só os que
 * não têm site cadastrado no Google.
 *
 * Exportada para que o script de teste de fluxo possa acionar a extração
 * diretamente, sem subir o servidor MCP.
 */
export async function extractLeadsWithoutWebsite(
  input: {
    location?: string;
    radiusMeters?: number;
    type?: string;
    keyword?: string;
    maxResults?: number;
  },
  deps: PlacesDeps,
): Promise<ExtractLeadsResult> {
  const targetLocation = input.location ?? DEFAULT_LOCATION;
  const radius = input.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const limit = input.maxResults ?? DEFAULT_MAX_RESULTS;
  const source = deps.source ?? "google-places";

  const geocoded = await geocodeLocation(targetLocation, deps);
  const nearby = await fetchNearbyPlaces(
    {
      lat: geocoded.geometry.location.lat,
      lng: geocoded.geometry.location.lng,
      radiusMeters: radius,
      type: input.type,
      keyword: input.keyword,
      maxResults: limit,
    },
    deps,
  );

  const detailsList = await Promise.all(
    nearby.map(async (place) => ({
      placeId: place.place_id,
      details: await fetchPlaceDetails(place.place_id, deps),
    })),
  );

  const detailsFailed = detailsList.filter((entry) => entry.details === undefined).length;
  const withWebsite = detailsList.filter((entry) => Boolean(entry.details?.website)).length;
  const leads = detailsList
    .filter((entry) => entry.details !== undefined && !entry.details.website)
    .map((entry) => toBusinessLead(entry.details!, entry.placeId, source));

  return {
    resolvedLocation: geocoded.formatted_address,
    radiusMeters: radius,
    analyzed: nearby.length,
    withWebsite,
    detailsFailed,
    leads,
    source,
  };
}

const leadOutputSchema = {
  resolvedLocation: z.string(),
  radiusMeters: z.number(),
  analyzed: z.number(),
  withWebsite: z.number(),
  detailsFailed: z.number(),
  source: z.enum(["google-places", "fixture"]),
  leads: z.array(
    z.object({
      placeId: z.string().optional(),
      name: z.string(),
      formattedAddress: z.string().optional(),
      phone: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      rating: z.number().optional(),
      userRatingsTotal: z.number().optional(),
      types: z.array(z.string()).optional(),
      source: z.enum(["google-places", "fixture"]),
    }),
  ),
};

export function registerScrapeBusinessesWithoutWebsiteTool(server: McpServer): void {
  server.registerTool(
    "scrape_businesses_without_website",
    {
      title: "Buscar comércios sem site próximos a um local",
      description:
        "Busca comércios/estabelecimentos próximos a um endereço (padrão: Avenida Paulista, São Paulo) usando a Google Places API e retorna apenas aqueles que NÃO possuem site cadastrado no Google — potenciais leads para venda de criação de sites. Devolve também os leads em JSON estruturado, prontos para alimentar o tool 'render_lead_mockup'. Requer a variável de ambiente GOOGLE_MAPS_API_KEY configurada com Places API e Geocoding API habilitadas.",
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
      outputSchema: leadOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ location, radiusMeters, type, keyword, maxResults }) => {
      const apiKey = requireApiKey();
      const result = await extractLeadsWithoutWebsite(
        { location, radiusMeters, type, keyword, maxResults },
        { apiKey },
      );

      const headerParts = [
        `Busca em torno de "${result.resolvedLocation}" (raio ${result.radiusMeters}m).`,
        `Analisados: ${result.analyzed}.`,
        `Sem site cadastrado: ${result.leads.length}.`,
      ];
      if (result.detailsFailed > 0) {
        headerParts.push(`Sem detalhe disponível (indefinido): ${result.detailsFailed}.`);
      }

      const body =
        result.leads.length > 0
          ? result.leads.map(formatBusiness).join("\n\n")
          : "Nenhum comércio sem site foi encontrado nesse raio. Tente aumentar o raio, trocar o tipo/palavra-chave ou o local de referência.";

      return {
        content: [
          {
            type: "text" as const,
            text: [headerParts.join(" "), body].join("\n\n"),
          },
        ],
        structuredContent: result,
      };
    },
  );
}
