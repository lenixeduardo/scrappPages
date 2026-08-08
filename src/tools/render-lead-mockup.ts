import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { composeLeadPage, renderLeadPage } from "../pipeline/lead-page.js";
import { ChromiumUnavailableError, RenderSession } from "../render/render-png.js";
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
      title: "Gerar mockup de site para um lead",
      description:
        "Roda o pipeline completo de um lead sem site: analisa a categoria do negócio, escolhe o tema visual, compõe o HTML da homepage, escreve o prompt de geração de imagem correspondente e rasteriza a imagem final com Chromium local — sem custo de API de imagem. Devolve a imagem, o prompt equivalente e a análise do tema. Use com os dados de 'scrape_businesses_without_website'. Em ambientes sem Chromium, devolve o HTML e o prompt no lugar da imagem.",
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
            "Array `types` do Place Details (ex: ['bakery','food','store']). Alimenta a análise que escolhe o tema.",
          ),
        format: z
          .enum(formats)
          .optional()
          .describe("Padrão: png. Use 'html' para receber o código-fonte em vez da imagem."),
        includePrompt: z
          .boolean()
          .optional()
          .describe(
            "Inclui o prompt de geração de imagem derivado do tema, para gerar a mesma tela com a sua própria capacidade de imagem. Padrão: true.",
          ),
        watermark: z
          .boolean()
          .optional()
          .describe("Carimba a imagem como dado simulado. Padrão: false."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const lead: BusinessLead = {
        name: args.businessName,
        formattedAddress: args.address,
        phone: args.phone,
        rating: args.rating,
        userRatingsTotal: args.userRatingsTotal,
        types: args.googleTypes,
        source: "google-places",
      };
      const watermark = args.watermark ?? false;
      const withPrompt = args.includePrompt ?? true;

      // Estágios 1-3 não dependem de navegador e rodam em qualquer ambiente.
      const composed = composeLeadPage(lead, { watermark });
      const { analysis } = composed;
      const analysisLine =
        `Análise: tema "${analysis.themeLabel}" (${analysis.themeKey}), ` +
        `decidido por ${analysis.matchedBy}${analysis.evidence ? ` — "${analysis.evidence}"` : ""}. ` +
        `Domínio sugerido: ${analysis.domain}.`;

      const promptBlocks = withPrompt
        ? [
            {
              type: "text" as const,
              text: `PROMPT DE GERAÇÃO DE IMAGEM (mesma tela, caso queira gerar com sua própria capacidade):\n\n${composed.prompt.prompt}`,
            },
          ]
        : [];

      if (args.format === "html") {
        return {
          content: [
            { type: "text" as const, text: analysisLine },
            { type: "text" as const, text: composed.html },
            ...promptBlocks,
          ],
        };
      }

      let session: RenderSession;
      try {
        session = await RenderSession.open();
      } catch (error) {
        if (error instanceof ChromiumUnavailableError) {
          // Estágio 4 indisponível: entrega o resultado de 1-3 em vez de falhar.
          return {
            content: [
              {
                type: "text" as const,
                text: `${analysisLine}\n\nNão foi possível rasterizar a imagem neste ambiente, então seguem o HTML e o prompt. Motivo: ${error.message}`,
              },
              { type: "text" as const, text: composed.html },
              ...promptBlocks,
            ],
          };
        }
        throw error;
      }

      try {
        let rendered = await renderLeadPage(lead, session, {
          watermark,
          format: args.format === "jpeg" ? "jpeg" : "png",
        });
        let note = "";

        if (rendered.image.buffer.length > MAX_BASE64_BYTES && rendered.image.mimeType === "image/png") {
          rendered = await renderLeadPage(lead, session, { watermark, format: "jpeg", quality: 80 });
          note = " Reencodado em JPEG porque o PNG passava do limite de payload da resposta.";
        }

        const { image } = rendered;
        return {
          content: [
            {
              type: "image" as const,
              data: image.buffer.toString("base64"),
              mimeType: image.mimeType,
              annotations: { audience: ["user" as const], priority: 1 },
            },
            {
              type: "text" as const,
              text:
                `Mockup de homepage gerado para "${args.businessName}" — ${image.width}x${image.height}, ` +
                `${Math.round(image.buffer.length / 1024)} KB (${image.mimeType}), em ${rendered.elapsedMs}ms. ` +
                `Renderizado localmente com HTML + Chromium, sem custo de API de imagem.${note}\n${analysisLine}`,
            },
            ...promptBlocks,
          ],
        };
      } finally {
        await session.close();
      }
    },
  );
}
