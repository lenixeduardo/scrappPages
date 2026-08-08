/**
 * Formato canônico de um lead — um comércio que NÃO tem site cadastrado
 * e por isso é alvo da oferta de criação de site.
 *
 * É o contrato compartilhado entre a extração (`scrape_businesses_without_website`)
 * e a geração de mockup (`render_lead_mockup`).
 */
export interface BusinessLead {
  /** `place_id` do Google Places, quando o lead veio da extração real. */
  placeId?: string;
  name: string;
  formattedAddress?: string;
  /** Telefone já formatado para exibição (nacional ou internacional). */
  phone?: string;
  /** Link do lead no Google Maps. */
  googleMapsUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  /** Tipos do Google Places (ex: `["bakery", "food", "store"]`). */
  types?: string[];
  /**
   * Origem do dado. `google-places` = extraído de verdade da API;
   * `fixture` = dado SIMULADO, usado quando não há GOOGLE_MAPS_API_KEY.
   */
  source: LeadSource;
}

export type LeadSource = "google-places" | "fixture";

/** Rótulo humano da origem, para banners e cabeçalhos de relatório. */
export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  "google-places": "Google Places API (dados reais)",
  fixture: "FIXTURE — DADOS SIMULADOS (sem GOOGLE_MAPS_API_KEY)",
};

/** Primeiro tipo do Places que não seja um rótulo genérico, usado para tematizar o mockup. */
export function primaryType(lead: BusinessLead): string | undefined {
  const generic = new Set(["point_of_interest", "establishment", "store", "food"]);
  return lead.types?.find((type) => !generic.has(type)) ?? lead.types?.[0];
}
