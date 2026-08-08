import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { config } from "../config.js";
import { formatLead } from "../prospecting/leads.js";
import {
  DEFAULT_LOCATION,
  DEFAULT_MAX_PLACES_SCANNED,
  DEFAULT_RADIUS_METERS,
  DEFAULT_TARGET_LEADS,
  MAX_PLACES_SCANNED_CAP,
  MAX_RADIUS_METERS,
  MAX_TARGET_LEADS,
  prospect,
} from "../prospecting/prospect.js";

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

export function registerScrapeBusinessesWithoutWebsiteTool(server: McpServer): void {
  server.registerTool(
    "scrape_businesses_without_website",
    {
      title: "Buscar comércios sem site (leads)",
      description:
        "Encontra comércios próximos a um endereço que NÃO têm site próprio — sem site nenhum, só rede social/marketplace, ou com o site do Google Business (desativado em 2024). São leads para venda de criação de sites. Usa o OpenStreetMap por padrão: gratuito, sem chave de API e sem cobrança.",
      inputSchema: {
        location: z
          .string()
          .optional()
          .describe(`Endereço ou região de referência. Padrão: "${DEFAULT_LOCATION}".`),
        radiusMeters: z
          .number()
          .int()
          .positive()
          .max(MAX_RADIUS_METERS)
          .optional()
          .describe(`Raio de busca em metros (máx. ${MAX_RADIUS_METERS}). Padrão: ${DEFAULT_RADIUS_METERS}.`),
        keyword: z
          .string()
          .optional()
          .describe("Filtra pelo nome do estabelecimento (ex: 'padaria'). Se omitido, traz todo tipo de comércio."),
        targetLeads: z
          .number()
          .int()
          .positive()
          .max(MAX_TARGET_LEADS)
          .optional()
          .describe(`Quantos leads retornar (máx. ${MAX_TARGET_LEADS}). Padrão: ${DEFAULT_TARGET_LEADS}.`),
        maxPlacesScanned: z
          .number()
          .int()
          .positive()
          .max(MAX_PLACES_SCANNED_CAP)
          .optional()
          .describe(`Teto de estabelecimentos analisados (máx. ${MAX_PLACES_SCANNED_CAP}). Padrão: ${DEFAULT_MAX_PLACES_SCANNED}.`),
        includeSocialOnly: z
          .boolean()
          .optional()
          .describe("Incluir quem só tem Instagram/Facebook como 'site'. Padrão: true."),
        requirePhone: z
          .boolean()
          .optional()
          .describe("Retornar apenas leads com telefone público. Padrão: false."),
        provider: z
          .enum(["osm", "google"])
          .optional()
          .describe(
            "Fonte dos dados. 'osm' (padrão) é gratuito e sem chave. 'google' tem cobertura melhor mas é PAGO (Places API New, tier Enterprise) e exige GOOGLE_MAPS_API_KEY.",
          ),
      },
      annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const result = await prospect(input, config.googleMapsApiKey);

        if (result.leads.length === 0) {
          return errorResult(
            `Nenhum comércio sem site encontrado em torno de "${result.origin.formattedAddress}" (raio ${result.radiusMeters}m, ${result.scanned} analisados). Tente aumentar o raio ou mudar o local.`,
          );
        }

        const header = [
          `${result.leads.length} lead(s) sem site em torno de "${result.origin.formattedAddress}" (raio ${result.radiusMeters}m).`,
          `Fonte: ${result.source}. Analisados: ${result.scanned}. Chamadas cobradas: ${result.billableCalls}.`,
          result.reachedTarget
            ? ""
            : `Atenção: meta era ${result.targetLeads} leads; aumente radiusMeters para encontrar mais.`,
        ]
          .filter(Boolean)
          .join("\n");

        const body = result.leads.map((lead, index) => formatLead(lead, index + 1)).join("\n\n");

        return {
          content: [{ type: "text" as const, text: `${header}\n\n${body}` }],
          structuredContent: {
            origin: result.origin.formattedAddress,
            provider: result.provider,
            radiusMeters: result.radiusMeters,
            scanned: result.scanned,
            billableCalls: result.billableCalls,
            reachedTarget: result.reachedTarget,
            leads: result.leads,
          },
        };
      } catch (error) {
        return errorResult(`Falha ao buscar leads: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
