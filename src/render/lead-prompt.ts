import { buildPrompt, type PromptInput } from "../tools/generate-mockup-image.js";
import type { BusinessLead } from "../types/lead.js";
import { themeForLead } from "./theme.js";

export interface LeadImagePrompt {
  /** A descrição da tela, campo `description` de `generate_mockup_image`. */
  description: string;
  /** As notas de estilo, campo `styleNotes`. */
  styleNotes: string;
  /** O prompt final montado — é isto que o cliente MCP recebe para gerar a imagem. */
  prompt: string;
}

function initials(name: string): string {
  const ignore = new Set(["de", "da", "do", "das", "dos", "e", "&", "-"]);
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0 && !ignore.has(word.toLowerCase()));
  return words.slice(0, 2).map((word) => word[0]!.toUpperCase()).join("") || name.slice(0, 2).toUpperCase();
}

/**
 * Traduz um lead no prompt orientativo de geração de imagem.
 *
 * É a ponte que faltava entre a extração e o `generate_mockup_image`: descreve
 * a mesma homepage que o renderizador HTML produz, para que um cliente MCP com
 * geração de imagem própria (ex: ChatGPT) chegue a um resultado equivalente.
 */
export function buildLeadImagePrompt(lead: BusinessLead): LeadImagePrompt {
  const theme = themeForLead(lead);
  const p = theme.palette;

  const rating =
    lead.rating !== undefined
      ? `a Google rating badge showing ${lead.rating.toFixed(1)} stars${
          lead.userRatingsTotal ? ` from ${lead.userRatingsTotal} reviews` : ""
        }`
      : "no rating badge";

  const description = [
    `Homepage of a small local business website for "${lead.name}", a ${theme.label.toLowerCase()} in São Paulo, Brazil`,
    lead.formattedAddress ? `located at ${lead.formattedAddress}` : undefined,
    ". The page is shown inside a browser window frame with traffic-light dots and an address bar.",
    `Sticky top navigation: a rounded square logo mark with the monogram "${initials(lead.name)}",`,
    `the business name "${lead.name}" with the kicker "${theme.label}",`,
    `the menu links ${theme.nav.map((item) => `"${item}"`).join(", ")}, and a primary button "${theme.primaryCta}".`,
    `Hero section split in two columns: on the left the headline "${theme.headline}",`,
    `a supporting paragraph "${theme.subhead}", a primary button "${theme.primaryCta}" next to an outlined "Como chegar" button, and ${rating}.`,
    "On the right a rounded gradient panel with a large translucent line-art icon and floating white info cards showing",
    `the address${lead.phone ? `, the phone ${lead.phone}` : ""} and the opening hours.`,
    `Below the hero, a section titled "Por que escolher a ${lead.name}" with three cards:`,
    theme.services.map((service, index) => `(${index + 1}) "${service.title}" — ${service.text}`).join(" "),
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
