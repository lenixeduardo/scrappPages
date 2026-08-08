export interface PlaceRecord {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  primaryType?: string;
  types?: string[];
}

export type LeadReason = "sem_site" | "site_google_desativado" | "so_rede_social";

export interface Lead {
  placeId: string;
  name: string;
  address?: string;
  phone?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  googleMapsUri?: string;
  reason: LeadReason;
  currentUrl?: string;
  score: number;
}

/**
 * Google shut down the Business Profile website builder in March 2024; these
 * domains now just bounce to the Maps listing, so the business is effectively
 * siteless and already had appetite for one.
 */
const DEAD_GOOGLE_SITE_HOSTS = ["business.site", "negocio.site"];

const SOCIAL_ONLY_HOSTS = [
  "facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "linktr.ee",
  "linkr.bio",
  "beacons.ai",
  "wa.me",
  "whatsapp.com",
  "t.me",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "linkedin.com",
  "ifood.com.br",
  "rappi.com.br",
  "goo.gl",
  "maps.app.goo.gl",
  "google.com",
];

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function hostMatches(host: string, candidates: string[]): boolean {
  return candidates.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

/** Returns why this place is a lead, or undefined when it already has a real website. */
export function classifyLead(place: PlaceRecord): LeadReason | undefined {
  if (!place.websiteUri) return "sem_site";

  const host = hostOf(place.websiteUri);
  if (!host) return "sem_site";
  if (hostMatches(host, DEAD_GOOGLE_SITE_HOSTS)) return "site_google_desativado";
  if (hostMatches(host, SOCIAL_ONLY_HOSTS)) return "so_rede_social";

  return undefined;
}

/**
 * Ranks how worth contacting a lead is: reachable by phone and with a real
 * review history means an active business that can actually be sold to.
 */
export function scoreLead(place: PlaceRecord, reason: LeadReason): number {
  let score = 0;
  if (place.nationalPhoneNumber ?? place.internationalPhoneNumber) score += 50;
  if (reason === "site_google_desativado") score += 15;
  score += Math.min(place.userRatingCount ?? 0, 300) / 10;
  if (place.rating !== undefined) score += place.rating * 2;
  if (place.formattedAddress) score += 5;
  return Math.round(score * 10) / 10;
}

export function toLead(place: PlaceRecord, reason: LeadReason): Lead {
  return {
    placeId: place.id,
    name: place.displayName?.text ?? "(sem nome)",
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
    rating: place.rating,
    reviews: place.userRatingCount,
    category: place.primaryTypeDisplayName?.text ?? place.primaryType,
    googleMapsUri: place.googleMapsUri,
    reason,
    currentUrl: reason === "sem_site" ? undefined : place.websiteUri,
    score: scoreLead(place, reason),
  };
}

export interface SelectOptions {
  includeSocialOnly?: boolean;
  requirePhone?: boolean;
  includeClosedTemporarily?: boolean;
}

/** Filters a raw place batch down to ranked, deduped leads. */
export function selectLeads(places: PlaceRecord[], options: SelectOptions = {}): Lead[] {
  const { includeSocialOnly = true, requirePhone = false, includeClosedTemporarily = false } = options;

  const seen = new Set<string>();
  const leads: Lead[] = [];

  for (const place of places) {
    if (!place.id || seen.has(place.id)) continue;
    seen.add(place.id);

    if (place.businessStatus === "CLOSED_PERMANENTLY") continue;
    if (!includeClosedTemporarily && place.businessStatus === "CLOSED_TEMPORARILY") continue;

    const reason = classifyLead(place);
    if (!reason) continue;
    if (!includeSocialOnly && reason === "so_rede_social") continue;
    if (requirePhone && !(place.nationalPhoneNumber ?? place.internationalPhoneNumber)) continue;

    leads.push(toLead(place, reason));
  }

  return leads.sort((a, b) => b.score - a.score);
}

const REASON_LABELS: Record<LeadReason, string> = {
  sem_site: "sem site nenhum",
  site_google_desativado: "só tinha site do Google (desativado em 2024)",
  so_rede_social: "só rede social/marketplace",
};

export function formatLead(lead: Lead, index: number): string {
  const lines = [`${index}. ${lead.name}  —  ${REASON_LABELS[lead.reason]}`];
  if (lead.category) lines.push(`   Categoria: ${lead.category}`);
  if (lead.address) lines.push(`   Endereço: ${lead.address}`);
  lines.push(`   Telefone: ${lead.phone ?? "não informado"}`);
  if (lead.rating !== undefined) {
    lines.push(`   Avaliação: ${lead.rating} (${lead.reviews ?? 0} avaliações)`);
  }
  if (lead.currentUrl) lines.push(`   Link atual: ${lead.currentUrl}`);
  if (lead.googleMapsUri) lines.push(`   Google Maps: ${lead.googleMapsUri}`);
  return lines.join("\n");
}

export function toCsv(leads: Lead[]): string {
  const escape = (value: string | number | undefined): string => {
    if (value === undefined) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = "nome,motivo,telefone,endereco,categoria,avaliacao,avaliacoes,link_atual,google_maps";
  const rows = leads.map((lead) =>
    [
      lead.name,
      REASON_LABELS[lead.reason],
      lead.phone,
      lead.address,
      lead.category,
      lead.rating,
      lead.reviews,
      lead.currentUrl,
      lead.googleMapsUri,
    ]
      .map(escape)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
