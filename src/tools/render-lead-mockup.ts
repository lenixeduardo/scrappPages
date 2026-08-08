import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { buildMockupHtml } from "../render/mockup-template.js";
import { ChromiumUnavailableError, RenderSession } from "../render/render-png.js";
import { themeForLead } from "../render/theme.js";
import type { BusinessLead } from "../types/lead.js";

/**
 * Acima disso o base64 tende a estourar o limite prático de uma resposta
 * JSON-RPC, então o mockup é reencodado em JPEG.
 */
const MAX_BASE64_BYTES = 750_000;

const formats = ["png", "jpeg", "html"] as const;

export function registerRenderLeadMockupTool(server: McpServer): void {
  server.registerTool(
    "render_lead_mockup",
    {
      title: "Gerar imagem de mockup de site para um lead",
      description:
        "Gera de verdade a imagem (PNG/JPEG) de uma homepage de demonstração para um comércio que não tem site, a partir dos dados do lead. A imagem é renderizada localmente com HTML + Chromium, sem chamar nenhuma API paga de imagem. O tema visual (paleta, textos, ícones) é escolhido pela categoria do negócio. Use com os dados devolvidos por 'scrape_businesses_without_website'. Em ambientes sem Chromium instalado, cai automaticamente para format='html'.",
      inputSchema: {
        businessName: z
          .string()
          .min(1)
          .describe("Nome do estabelecimento, exatamente como aparece no Google."),
        address: z
          .string()
          .optional()
          .describe("Endereço completo, ex: 'R. Augusta, 2145 - Cerqueira César, São Paulo - SP'."),
        phone: z.string().optional().describe("Telefone de contato, ex: '(11) 3061-7788'."),
        rating: z.number().min(0).max(5).optional().describe("Nota do Google, de 0 a 5."),
        userRatingsTotal: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Quantidade de avaliações no Google."),
        googleTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Array `types` do Place Details (ex: ['bakery','food','store']). Define a paleta e os textos do mockup.",
          ),
        format: z
          .enum(formats)
          .optional()
          .describe("Padrão: png. Use 'html' para receber o código-fonte em vez da imagem."),
        watermark: z
          .boolean()
          .optional()
          .describe("Carimba a imagem como dado simulado. Padrão: false."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ businessName, address, phone, rating, userRatingsTotal, googleTypes, format, watermark }) => {
      const lead: BusinessLead = {
        name: businessName,
        formattedAddress: address,
        phone,
        rating,
        userRatingsTotal,
        types: googleTypes,
        source: "google-places",
      };
      const theme = themeForLead(lead);
      const html = buildMockupHtml(lead, { watermark: watermark ?? false });

      if (format === "html") {
        return { content: [{ type: "text" as const, text: html }] };
      }

      let session: RenderSession;
      try {
        session = await RenderSession.open();
      } catch (error) {
        if (error instanceof ChromiumUnavailableError) {
          // Degradação, não falha: o HTML ainda é entregue e pode ser aberto no navegador.
          return {
            content: [
              {
                type: "text" as const,
                text: `Não foi possível rasterizar a imagem neste ambiente, então segue o HTML do mockup (tema "${theme.label}"). Motivo: ${error.message}`,
              },
              { type: "text" as const, text: html },
            ],
          };
        }
        throw error;
      }

      try {
        let mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
        let buffer = await session.renderLead(lead, {
          watermark: watermark ?? false,
          format: format === "jpeg" ? "jpeg" : "png",
        });
        let note = "";

        if (buffer.length > MAX_BASE64_BYTES && mimeType === "image/png") {
          buffer = await session.renderLead(lead, {
            watermark: watermark ?? false,
            format: "jpeg",
            quality: 80,
          });
          mimeType = "image/jpeg";
          note = " Reencodado em JPEG porque o PNG passava do limite de payload da resposta.";
        }

        return {
          content: [
            {
              type: "image" as const,
              data: buffer.toString("base64"),
              mimeType,
              annotations: { audience: ["user" as const], priority: 1 },
            },
            {
              type: "text" as const,
              text:
                `Mockup de homepage gerado para "${businessName}" — tema "${theme.label}", 1280x800, ` +
                `${Math.round(buffer.length / 1024)} KB (${mimeType}). ` +
                `Renderizado localmente com HTML + Chromium, sem custo de API de imagem.${note}`,
            },
          ],
        };
      } finally {
        await session.close();
      }
    },
  );
}
