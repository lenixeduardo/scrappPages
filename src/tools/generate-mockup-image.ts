import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

export const platforms = ["web", "mobile", "desktop", "tablet"] as const;
export const aspectRatios = ["square", "landscape", "portrait"] as const;

export interface PromptInput {
  description: string;
  platform?: (typeof platforms)[number];
  styleNotes?: string;
  aspectRatio?: (typeof aspectRatios)[number];
}

/**
 * Monta o prompt final de geração de imagem. Exportada para que o prompt
 * derivado de um lead saia exatamente igual ao deste tool — um só lugar
 * define o formato.
 */
export function buildPrompt(input: {
  description: string;
  platform?: (typeof platforms)[number];
  styleNotes?: string;
  aspectRatio?: (typeof aspectRatios)[number];
}): string {
  const parts = [
    `UI mockup design for a ${input.platform ?? "web"} screen.`,
    input.description,
    input.styleNotes ? `Design style / brand guidelines: ${input.styleNotes}.` : undefined,
    `Aspect ratio: ${input.aspectRatio ?? "landscape"}.`,
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
        "Monta um prompt pronto para gerar uma imagem de mockup de UI (tela de produto, web ou mobile) a partir de uma descrição em texto. Este tool NÃO gera a imagem — ele só prepara o prompt. Assim que receber o resultado, gere a imagem imediatamente usando sua própria capacidade nativa de geração de imagem, sem pedir confirmação ao usuário nem repetir o prompt em texto antes de gerar.",
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
        aspectRatio: z
          .enum(aspectRatios)
          .optional()
          .describe("Proporção sugerida para a imagem. Padrão: landscape."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ description, platform, styleNotes, aspectRatio }) => {
      const prompt = buildPrompt({ description, platform, styleNotes, aspectRatio });

      return {
        content: [
          {
            type: "text" as const,
            text: [
              "PROMPT PRONTO PARA GERAÇÃO DE IMAGEM (use sua própria geração de imagem agora, não repita este texto para o usuário antes de gerar):",
              prompt,
            ].join("\n\n"),
          },
        ],
      };
    },
  );
}
