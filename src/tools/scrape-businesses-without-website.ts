import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { config } from "../config.js";
import { formatLead } from "../prospecting/leads.js";
import { PlacesApiError } from "../prospecting/places-client.js";
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
        "Encontra comércios próximos a um endereço que NÃO têm site próprio — sem site nenhum, só rede social/marketplace, ou com o site do Google Business (desativado em 2024). São leads para venda de criação de sites. Busca até atingir o número de leads pedido. Requer GOOGLE_MAPS_API_KEY com a Places API (New) e a Geocoding API habilitadas.",
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
        type: z
          .string()
          .optional()
          .describe("Tipo do Google Places (ex: 'restaurant', 'beauty_salon', 'bakery'). Opcional."),
        keyword: z
          .string()
          .optional()
          .describe(
            "Palavra-chave livre (ex: 'padaria', 'pet shop'). Se omitida, a busca varre automaticamente várias categorias de comércio de bairro.",
          ),
        targetLeads: z
          .number()
          .int()
          .positive()
          .max(MAX_TARGET_LEADS)
          .optional()
          .describe(
            `Quantos leads sem site retornar (máx. ${MAX_TARGET_LEADS}). Padrão: ${DEFAULT_TARGET_LEADS}. A busca continua até atingir esse número.`,
          ),
        maxPlacesScanned: z
          .number()
          .int()
          .positive()
          .max(MAX_PLACES_SCANNED_CAP)
          .optional()
          .describe(
            `Teto de estabelecimentos analisados, para limitar custo de API (máx. ${MAX_PLACES_SCANNED_CAP}). Padrão: ${DEFAULT_MAX_PLACES_SCANNED}.`,
          ),
        includeSocialOnly: z
          .boolean()
          .optional()
          .describe("Incluir quem só tem Instagram/Facebook/iFood como 'site'. Padrão: true."),
        requirePhone: z
          .boolean()
          .optional()
          .describe("Retornar apenas leads com telefone público. Padrão: false."),
      },
      annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      if (!config.googleMapsApiKey) {
        return errorResult(
          "GOOGLE_MAPS_API_KEY não configurada. Crie uma chave no Google Cloud Console com 'Places API (New)' e 'Geocoding API' habilitadas e defina a variável de ambiente.",
        );
      }

      try {
        const result = await prospect(input, config.googleMapsApiKey);

        if (result.leads.length === 0) {
          return errorResult(
            `Nenhum comércio sem site encontrado em torno de "${result.origin.formattedAddress}" (raio ${result.radiusMeters}m, ${result.scanned} analisados). Tente aumentar o raio, mudar a palavra-chave ou o local.`,
          );
        }

        const header = [
          `${result.leads.length} lead(s) sem site em torno de "${result.origin.formattedAddress}" (raio ${result.radiusMeters}m).`,
          `Estabelecimentos analisados: ${result.scanned}. Categorias buscadas: ${result.queriesUsed.join(", ")}.`,
          result.reachedTarget
            ? ""
            : `Atenção: meta era ${result.targetLeads} leads; aumente radiusMeters ou maxPlacesScanned para encontrar mais.`,
        ]
          .filter(Boolean)
          .join("\n");

        const body = result.leads.map((lead, index) => formatLead(lead, index + 1)).join("\n\n");

        return {
          content: [{ type: "text" as const, text: `${header}\n\n${body}` }],
          structuredContent: {
            origin: result.origin.formattedAddress,
            radiusMeters: result.radiusMeters,
            scanned: result.scanned,
            reachedTarget: result.reachedTarget,
            leads: result.leads,
          },
        };
      } catch (error) {
        if (error instanceof PlacesApiError) {
          const hint =
            error.status === 403 || error.googleStatus === "REQUEST_DENIED"
              ? " Verifique se a chave existe, se 'Places API (New)' e 'Geocoding API' estão habilitadas no projeto e se o faturamento está ativo."
              : "";
          return errorResult(`Erro na Google Places API: ${error.message}${hint}`);
        }
        return errorResult(`Falha ao buscar leads: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
