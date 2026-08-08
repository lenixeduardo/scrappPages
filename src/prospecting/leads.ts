/** Provider-neutral business record. Both OSM and Google providers map into this. */
export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  /** Social/marketplace profiles declared separately from a website. */
  socialUrls?: string[];
  rating?: number;
  reviews?: number;
  category?: string;
  mapUri?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
}

export type LeadReason = "sem_site" | "site_google_desativado" | "so_rede_social";

export interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  mapUri?: string;
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
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const host = new URL(candidate).hostname.replace(/^www\./, "").toLowerCase();
    return host.includes(".") ? host : undefined;
  } catch {
    return undefined;
  }
}

function hostMatches(host: string, candidates: string[]): boolean {
  return candidates.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

/** Returns why this business is a lead, or undefined when it already has a real website. */
export function classifyLead(business: Business): LeadReason | undefined {
  if (!business.website) {
    return business.socialUrls?.length ? "so_rede_social" : "sem_site";
  }

  const host = hostOf(business.website);
  if (!host) return "sem_site";
  if (hostMatches(host, DEAD_GOOGLE_SITE_HOSTS)) return "site_google_desativado";
  if (hostMatches(host, SOCIAL_ONLY_HOSTS)) return "so_rede_social";

  return undefined;
}

/**
 * Ranks how worth contacting a lead is: reachable by phone and with a real
 * review history means an active business that can actually be sold to.
 */
export function scoreLead(business: Business, reason: LeadReason): number {
  let score = 0;
  if (business.phone) score += 50;
  if (reason === "site_google_desativado") score += 15;
  if (reason === "so_rede_social") score += 10;
  score += Math.min(business.reviews ?? 0, 300) / 10;
  if (business.rating !== undefined) score += business.rating * 2;
  if (business.address) score += 5;
  return Math.round(score * 10) / 10;
}

export function toLead(business: Business, reason: LeadReason): Lead {
  return {
    id: business.id,
    name: business.name,
    address: business.address,
    phone: business.phone,
    rating: business.rating,
    reviews: business.reviews,
    category: business.category,
    mapUri: business.mapUri,
    reason,
    currentUrl: business.website ?? business.socialUrls?.[0],
    score: scoreLead(business, reason),
  };
}

export interface SelectOptions {
  includeSocialOnly?: boolean;
  requirePhone?: boolean;
  includeClosedTemporarily?: boolean;
}

/** Filters a raw business batch down to ranked, deduped leads. */
export function selectLeads(businesses: Business[], options: SelectOptions = {}): Lead[] {
  const { includeSocialOnly = true, requirePhone = false, includeClosedTemporarily = false } = options;

  const seen = new Set<string>();
  const leads: Lead[] = [];

  for (const business of businesses) {
    if (!business.id || seen.has(business.id)) continue;
    seen.add(business.id);

    if (!business.name) continue;
    if (business.permanentlyClosed) continue;
    if (!includeClosedTemporarily && business.temporarilyClosed) continue;

    const reason = classifyLead(business);
    if (!reason) continue;
    if (!includeSocialOnly && reason === "so_rede_social") continue;
    if (requirePhone && !business.phone) continue;

    leads.push(toLead(business, reason));
  }

  return leads.sort((a, b) => b.score - a.score);
}

const REASON_LABELS: Record<LeadReason, string> = {
  sem_site: "sem site nenhum",
  site_google_desativado: "só tinha site do Google (desativado em 2024)",
  so_rede_social: "só rede social/marketplace",
};

export function reasonLabel(reason: LeadReason): string {
  return REASON_LABELS[reason];
}

export function formatLead(lead: Lead, index: number): string {
  const lines = [`${index}. ${lead.name}  —  ${REASON_LABELS[lead.reason]}`];
  if (lead.category) lines.push(`   Categoria: ${lead.category}`);
  if (lead.address) lines.push(`   Endereço: ${lead.address}`);
  lines.push(`   Telefone: ${lead.phone ?? "não informado"}`);
  if (lead.rating !== undefined) {
    lines.push(`   Avaliação: ${lead.rating} (${lead.reviews ?? 0} avaliações)`);
  }
  if (lead.currentUrl) lines.push(`   Link atual: ${lead.currentUrl}`);
  if (lead.mapUri) lines.push(`   Mapa: ${lead.mapUri}`);
  return lines.join("\n");
}

export function toCsv(leads: Lead[]): string {
  const escape = (value: string | number | undefined): string => {
    if (value === undefined) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = "nome,motivo,telefone,endereco,categoria,avaliacao,avaliacoes,link_atual,mapa";
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
      lead.mapUri,
    ]
      .map(escape)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
