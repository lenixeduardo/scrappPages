import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

const platforms = ["web", "mobile", "desktop", "tablet", "responsive"] as const;
const aspectRatios = ["square", "landscape", "portrait"] as const;
const viewModes = ["auto", "single", "mobile-and-desktop"] as const;

const DEFAULT_STYLE =
  "Modern Brazilian small-business website aesthetic: generous whitespace, clear information hierarchy, polished typography, consistent spacing scale, subtle borders, soft shadows, rounded corners, restrained use of cards, line-art icons, strong CTA hierarchy.";

/**
 * Fluxo vertical obrigatório: cada seção ocupa a sua própria linha horizontal.
 * Vale para qualquer mockup de página, em qualquer plataforma.
 */
const SECTION_FLOW_RULES = [
  "MANDATORY PAGE STRUCTURE — the page reads strictly top to bottom as a sequence of FULL-WIDTH horizontal sections:",
  "HEADER → HERO (full-width) → SECTION 02 (new full-width row) → SECTION 03 (new full-width row) → CONTACT / CTA → FOOTER.",
  "Every major section occupies its own horizontal row in the document flow. Columns may exist ONLY INSIDE a single section, never between sections.",
  "FORBIDDEN: placing the section after the Hero beside the Hero; Hero taking ~50% of the width while the next section takes the other ~50%; Hero and Section 02 rendered as sibling columns; Section 02 starting vertically while the Hero is still continuing; content of the next section filling empty space next to the Hero.",
  "SECTION TRANSITION: there must be an unmistakable horizontal breakpoint between Hero and Section 02 — new vertical spacing, its own kicker/heading, its own container/grid, and optionally a subtle divider, border or background change. No component of Section 02 may cross into the Hero's vertical area.",
].join("\n");

const HERO_RULES = [
  "HERO STRUCTURE (desktop): the Hero spans the full available content width as ONE section. Inside it — and only inside it — use a two-column composition: [ HERO TEXT / CTA / RATING ] on the left (42-48%) and [ HERO VISUAL / BUSINESS INFO ] on the right (52-58%).",
  "The right column is NOT another page section — it belongs to the Hero. The Hero container is 100% wide, with a clear visual beginning and end and consistent top/bottom padding, and both internal columns are contained within the same Hero boundary.",
  "The next section may only begin after the lowest point of BOTH Hero columns has ended.",
].join("\n");

const RHYTHM_RULES = [
  "VISUAL RHYTHM — avoid repetitive AI-landing-page patterns: do not build every section as [icon + title + description] × 3, and never place two consecutive sections based on three equal cards. If the Hero already contains informational cards, the next section must use a deliberately different composition.",
  "Prefer, for Section 02 of a service business, an editorial/list composition: KICKER + large section title above a service list with rows of SERVICE — DETAILS — PRICE. Other valid alternatives: menu/catalog rows, asymmetric editorial block, large featured service, timetable, horizontal pricing, gallery, testimonial composition, booking interface, comparison table, numbered process, FAQ, large promotional banner, split content/image section.",
  "AVOID: excessive floating cards, dashboard-like appearance, repeated three-column feature grids, arbitrary section overlaps, masonry layout for primary page sections, Hero/Section 02 side by side, excessive icon + description patterns.",
].join("\n");

const RESPONSIVE_RULES = [
  "TWO VIEWS OF THE SAME WEBSITE, SAME DESIGN SYSTEM, side by side in a single image:",
  "LEFT — MOBILE VIEW (narrow phone viewport). RIGHT — DESKTOP VIEW (wide browser viewport).",
  "The desktop version must NOT be a stretched mobile layout: adapt navigation, typography scale, spacing, grids, content density and component arrangement to a desktop viewport.",
  "MOBILE ADAPTATION — same content hierarchy reorganised into a single-column flow, in this order: HEADER → HERO HEADLINE → DESCRIPTION → PRIMARY CTA → SECONDARY CTA → RATING → HERO VISUAL → BUSINESS INFORMATION → SECTION 02 → OTHER CONTENT → CONTACT CTA. The hero visual and the business information still belong to the Hero on mobile; Section 02 only starts after all Hero content has ended, and content from different sections is never mixed.",
  "RESPONSIVE CONSISTENCY — both views must read as the same product. Keep identical: branding, colors, typography family, copy, icon language, visual assets, button style, border radius and general design system. Change only what responsive adaptation requires: grid, component width, navigation, typography scale, spacing, stacking and information density.",
].join("\n");

function shouldRenderTwoViews(
  platform: (typeof platforms)[number],
  views: (typeof viewModes)[number],
): boolean {
  if (views === "mobile-and-desktop") return true;
  if (views === "single") return false;
  return platform === "responsive";
}

function buildPrompt(input: {
  description: string;
  platform?: (typeof platforms)[number];
  styleNotes?: string;
  aspectRatio?: (typeof aspectRatios)[number];
  views?: (typeof viewModes)[number];
}): string {
  const platform = input.platform ?? "web";
  const views = input.views ?? "auto";
  const twoViews = shouldRenderTwoViews(platform, views);
  const aspectRatio = input.aspectRatio ?? "landscape";

  const blocks = [
    twoViews
      ? "HIGH-FIDELITY RESPONSIVE WEBSITE MOCKUP — mobile view first (left) and desktop view second (right), in one image."
      : `HIGH-FIDELITY UI MOCKUP — ${platform} screen.`,
    `BRIEF\n${input.description}`,
    `DESIGN SYSTEM / STYLE\n${input.styleNotes ?? DEFAULT_STYLE}`,
    twoViews ? RESPONSIVE_RULES : undefined,
    SECTION_FLOW_RULES,
    platform === "mobile" ? undefined : HERO_RULES,
    RHYTHM_RULES,
    [
      "OUTPUT",
      `Aspect ratio: ${aspectRatio}.`,
      "Render as a realistic, high-fidelity product screenshot: clean layout, readable placeholder text in the same language as the brief, consistent spacing, no watermarks, no annotations, no wireframe boxes, no lorem ipsum blur.",
    ].join("\n"),
  ];

  return blocks.filter(Boolean).join("\n\n");
}

export function registerGenerateMockupImageTool(server: McpServer): void {
  server.registerTool(
    "generate_mockup_image",
    {
      title: "Gerar imagem de mockup",
      description:
        "Monta um prompt pronto para gerar uma imagem de mockup de UI (tela de produto, web ou mobile, ou site responsivo com mobile + desktop lado a lado) a partir de uma descrição em texto. O prompt já vem com as regras obrigatórias de layout (fluxo vertical de seções full-width, estrutura do Hero, ritmo visual). Este tool NÃO gera a imagem — ele só prepara o prompt. Assim que receber o resultado, gere a imagem imediatamente usando sua própria capacidade nativa de geração de imagem, sem pedir confirmação ao usuário nem repetir o prompt em texto antes de gerar.",
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
          .describe(
            "Plataforma alvo do mockup. Use 'responsive' para gerar mobile + desktop do mesmo site na mesma imagem. Padrão: web.",
          ),
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
        views: z
          .enum(viewModes)
          .optional()
          .describe(
            "Quantas telas mostrar: 'single' (uma só), 'mobile-and-desktop' (as duas lado a lado) ou 'auto' (padrão: duas telas quando platform = responsive).",
          ),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ description, platform, styleNotes, aspectRatio, views }) => {
      const prompt = buildPrompt({ description, platform, styleNotes, aspectRatio, views });

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
