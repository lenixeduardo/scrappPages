import { buildPrompt, type PromptInput } from "../tools/generate-mockup-image.js";
import type { BusinessLead } from "../types/lead.js";
import { initials } from "./mockup-template.js";
import { themeForLead, type CategoryTheme } from "./theme.js";

export interface LeadImagePrompt {
  /** A descrição da tela, campo `description` de `generate_mockup_image`. */
  description: string;
  /** As notas de estilo, campo `styleNotes`. */
  styleNotes: string;
  /** O prompt final montado — é isto que o cliente MCP recebe para gerar a imagem. */
  prompt: string;
}

/**
 * Traduz um lead no prompt orientativo de geração de imagem.
 *
 * Descreve a MESMA homepage que `buildMockupHtml` monta, a partir do MESMO
 * tema — por isso o tema é um parâmetro, não algo recalculado aqui. É a rota
 * para clientes MCP que geram a imagem com a capacidade própria em vez de
 * usar o Chromium.
 */
export function buildLeadImagePrompt(lead: BusinessLead, theme?: CategoryTheme): LeadImagePrompt {
  const resolved = theme ?? themeForLead(lead);
  const p = resolved.palette;

  const rating =
    lead.rating !== undefined
      ? `a Google rating badge showing ${lead.rating.toFixed(1)} stars${
          lead.userRatingsTotal ? ` from ${lead.userRatingsTotal} reviews` : ""
        }`
      : "no rating badge";

  const description = [
    `Homepage of a small local business website for "${lead.name}", a ${resolved.label.toLowerCase()} in São Paulo, Brazil`,
    lead.formattedAddress ? `located at ${lead.formattedAddress}` : undefined,
    ". The page is shown inside a browser window frame with traffic-light dots and an address bar.",
    `Sticky top navigation: a rounded square logo mark with the monogram "${initials(lead.name)}",`,
    `the business name "${lead.name}" with the kicker "${resolved.label}",`,
    `the menu links ${resolved.nav.map((item) => `"${item}"`).join(", ")}, and a primary button "${resolved.primaryCta}".`,
    `Hero section split in two columns: on the left the headline "${resolved.headline}",`,
    `a supporting paragraph "${resolved.subhead}", a primary button "${resolved.primaryCta}" next to an outlined "Como chegar" button, and ${rating}.`,
    "On the right a rounded gradient panel with a large translucent line-art icon and floating white info cards showing",
    `the address${lead.phone ? `, the phone ${lead.phone}` : ""} and the opening hours.`,
    `Below the hero, a section titled "Por que escolher a ${lead.name}" with three cards:`,
    resolved.services.map((service, index) => `(${index + 1}) "${service.title}" — ${service.text}`).join(" "),
    "At the bottom, a full-width contact bar in the brand color with address, phone, opening hours and a call-to-action button.",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+\./g, ".");

  const styleNotes = [
    `brand accent ${p.accent}, page background ${p.bg}, text ${p.ink}, hero gradient from ${p.heroFrom} to ${p.heroTo}`,
    "modern and clean Brazilian small-business web design, generous whitespace, rounded corners between 10 and 18 pixels",
    "soft shadows, sans-serif typography, line-art stroke icons, no photographs of people",
    "all copy in Brazilian Portuguese, exactly as written in the description",
  ].join("; ");

  const input: PromptInput = {
    description,
    platform: "web",
    styleNotes,
    aspectRatio: "landscape",
  };

  return { description, styleNotes, prompt: buildPrompt(input) };
}
