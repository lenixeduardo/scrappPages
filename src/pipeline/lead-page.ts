/**
 * O pipeline do produto, em quatro estágios explícitos:
 *
 *   1. LEAD      — o comércio sem site, vindo da extração
 *   2. ANÁLISE   — decide o tema a partir do nome e dos tipos do Google
 *   3. COMPOSIÇÃO— gera o HTML E escreve o prompt, ambos a partir do mesmo tema
 *   4. RENDER    — rasteriza o HTML em imagem
 *
 * Os estágios 2 e 3 são síncronos e não precisam de navegador: dá para compor
 * a página e o prompt em qualquer ambiente, e só o estágio 4 exige Chromium.
 * É por isso que o `render_lead_mockup` consegue degradar com elegância — ele
 * entrega o resultado de 1-3 quando o 4 não é possível.
 */

import { buildLeadImagePrompt, type LeadImagePrompt } from "../render/lead-prompt.js";
import {
  buildMockupHtml,
  initials,
  MOCKUP_HEIGHT,
  MOCKUP_WIDTH,
  suggestDomain,
} from "../render/mockup-template.js";
import type { RenderOptions, RenderSession } from "../render/render-png.js";
import { matchTheme, type CategoryTheme, type ThemeMatchReason } from "../render/theme.js";
import type { BusinessLead } from "../types/lead.js";

/** Estágio 2: o que a análise concluiu sobre o lead. */
export interface LeadAnalysis {
  theme: CategoryTheme;
  themeKey: string;
  themeLabel: string;
  /** Se o tema veio do nome, do tipo do Places, ou do fallback genérico. */
  matchedBy: ThemeMatchReason;
  /** O sinal concreto que decidiu o tema. */
  evidence?: string;
  /** Domínio sugerido, exibido na barra de endereço do mockup. */
  domain: string;
  /** Monograma da marca. */
  monogram: string;
}

/** Estágios 2 + 3, sem navegador. */
export interface ComposedLeadPage {
  lead: BusinessLead;
  analysis: LeadAnalysis;
  html: string;
  prompt: LeadImagePrompt;
}

/** Estágios 2 + 3 + 4. */
export interface RenderedLeadPage extends ComposedLeadPage {
  image: {
    buffer: Buffer;
    mimeType: "image/png" | "image/jpeg";
    width: number;
    height: number;
  };
  elapsedMs: number;
}

/** Estágio 2 — análise. */
export function analyzeLead(lead: BusinessLead): LeadAnalysis {
  const { theme, matchedBy, evidence } = matchTheme(lead);
  return {
    theme,
    themeKey: theme.key,
    themeLabel: theme.label,
    matchedBy,
    evidence,
    domain: suggestDomain(lead.name),
    monogram: initials(lead.name),
  };
}

/**
 * Estágio 3 — composição. HTML e prompt saem juntos, do mesmo objeto de tema:
 * é o que impede a imagem e o prompt de descreverem páginas diferentes.
 */
export function composeLeadPage(
  lead: BusinessLead,
  options: { watermark?: boolean } = {},
): ComposedLeadPage {
  const analysis = analyzeLead(lead);
  return {
    lead,
    analysis,
    html: buildMockupHtml(lead, { ...options, theme: analysis.theme }),
    prompt: buildLeadImagePrompt(lead, analysis.theme),
  };
}

/** Estágio 4 — render. Recebe a sessão de fora para reaproveitar o browser num lote. */
export async function renderLeadPage(
  lead: BusinessLead,
  session: RenderSession,
  options: RenderOptions = {},
): Promise<RenderedLeadPage> {
  const started = Date.now();
  const composed = composeLeadPage(lead, { watermark: options.watermark });
  const buffer = await session.renderHtml(composed.html, options);

  return {
    ...composed,
    image: {
      buffer,
      mimeType: options.format === "jpeg" ? "image/jpeg" : "image/png",
      width: MOCKUP_WIDTH,
      height: options.height ?? MOCKUP_HEIGHT,
    },
    elapsedMs: Date.now() - started,
  };
}
