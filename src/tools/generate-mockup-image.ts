import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { generateImages } from "../openai-images.js";

const platforms = ["web", "mobile", "desktop", "tablet"] as const;
const sizes = ["1024x1024", "1536x1024", "1024x1536", "auto"] as const;

function buildPrompt(input: {
  description: string;
  platform?: (typeof platforms)[number];
  styleNotes?: string;
}): string {
  const parts = [
    `UI mockup design for a ${input.platform ?? "web"} screen.`,
    input.description,
    input.styleNotes ? `Design style / brand guidelines: ${input.styleNotes}.` : undefined,
    "Render as a realistic, high-fidelity product screenshot: clean layout, readable placeholder text, consistent spacing, no watermarks.",
  ];
  return parts.filter(Boolean).join(" ");
}

export function registerGenerateMockupImageTool(server: McpServer): void {
  server.registerTool(
    "generate_mockup_image",
    {
      title: "Gerar imagem de mockup",
      description:
        "Gera uma imagem de mockup de UI (tela de produto, web ou mobile) a partir de uma descrição em texto, usando a API de imagens da OpenAI. Use para visualizar telas, componentes ou fluxos antes de implementá-los.",
      inputSchema: {
        description: z
          .string()
          .min(1)
          .describe(
            "Descrição da tela ou componente a ser gerado (ex: 'tela de login com campo de e-mail, senha e botão verde').",
          ),
        platform: z
          .enum(platforms)
          .optional()
          .describe("Plataforma alvo do mockup. Padrão: web."),
        styleNotes: z
          .string()
          .optional()
          .describe(
            "Notas de estilo/design system a seguir: paleta de cores, tipografia, tom visual, referências de marca.",
          ),
        size: z
          .enum(sizes)
          .optional()
          .describe("Dimensão da imagem gerada. Padrão: 1536x1024 (paisagem, boa para telas)."),
        count: z
          .number()
          .int()
          .min(1)
          .max(4)
          .optional()
          .describe("Quantidade de variações a gerar (1 a 4). Padrão: 1."),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ description, platform, styleNotes, size, count }) => {
      const prompt = buildPrompt({ description, platform, styleNotes });

      try {
        const images = await generateImages({
          prompt,
          size: size ?? "1536x1024",
          n: count ?? 1,
        });

        return {
          content: [
            { type: "text" as const, text: `Prompt usado: ${prompt}` },
            ...images.map((image) => ({
              type: "image" as const,
              data: image.base64,
              mimeType: image.mimeType,
            })),
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : "Falha ao gerar o mockup.",
            },
          ],
        };
      }
    },
  );
}
