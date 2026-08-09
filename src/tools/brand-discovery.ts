import * as z from "zod";

/**
 * Etapa de brand discovery: roda ANTES da camada visual.
 *
 * O servidor não pesquisa nada — ele monta o roteiro de pesquisa que o cliente
 * MCP (que tem busca na web) precisa executar antes de gerar a imagem, para que
 * o mockup use a identidade real do negócio em vez de um template genérico com
 * o nome da empresa colado por cima.
 */
export const businessSchema = z.object({
  name: z.string().min(1).describe("Razão social ou nome fantasia do negócio."),
  category: z
    .string()
    .optional()
    .describe("Categoria do negócio (ex: barbearia, padaria, pet shop, salão de beleza)."),
  address: z.string().optional().describe("Endereço completo, usado para validar a identidade."),
  city: z.string().optional().describe("Cidade/estado do negócio."),
  phone: z.string().optional().describe("Telefone público do negócio."),
  website: z.string().optional().describe("Site oficial, quando existir."),
  socialProfiles: z
    .array(z.string())
    .optional()
    .describe("URLs de perfis oficiais (Instagram, Facebook, Google Maps)."),
  openingHours: z.string().optional().describe("Horário de funcionamento, quando conhecido."),
  rating: z.number().optional().describe("Nota média (ex: 4.7)."),
  reviewCount: z.number().optional().describe("Quantidade de avaliações."),
});

export type Business = z.infer<typeof businessSchema>;

/** Categoria → direção visual, combinada com a identidade real encontrada. */
const CATEGORY_DIRECTIONS: ReadonlyArray<[readonly string[], string]> = [
  [["barbearia", "barber"], "premium, masculine, editorial, precise"],
  [["padaria", "bakery", "confeitaria", "cafeteria", "café", "coffee"], "warm, inviting, artisanal, fresh"],
  [["pet", "veterin"], "friendly, trustworthy, playful but professional"],
  [["salão", "salao", "salon", "beleza", "beauty", "estética", "estetica", "manicure"], "premium, elegant, aspirational"],
  [["restaurante", "restaurant", "lanchonete", "pizzaria", "bar", "food"], "appetizing, atmospheric, direct"],
  [["lavanderia", "laundry"], "clean, organized, practical"],
];

export function categoryDirection(category?: string): string | undefined {
  if (!category) return undefined;
  const normalized = category.toLowerCase();
  const match = CATEGORY_DIRECTIONS.find(([keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  return match?.[1];
}

/** Dossiê com os dados fornecidos — base para validar a identidade encontrada. */
export function businessDossier(business: Business): string {
  const rating =
    business.rating === undefined
      ? undefined
      : business.reviewCount === undefined
        ? `${business.rating}`
        : `${business.rating} (${business.reviewCount} reviews)`;

  const fields: Array<[string, string | undefined]> = [
    ["Name", business.name],
    ["Category", business.category],
    ["Address", business.address],
    ["City", business.city],
    ["Phone", business.phone],
    ["Website", business.website],
    ["Social profiles", business.socialProfiles?.join(", ")],
    ["Opening hours", business.openingHours],
    ["Rating", rating],
  ];

  return [
    "REAL BUSINESS DOSSIER — provided data, treat as ground truth when validating identity:",
    ...fields.filter(([, value]) => value).map(([label, value]) => `- ${label}: ${value}`),
  ].join("\n");
}

/**
 * Roteiro de pesquisa que o cliente executa antes de gerar a imagem.
 * Sai em português porque é instrução para o modelo, não para o gerador de imagem.
 */
export function discoveryBrief(business: Business): string {
  // A categoria costuma já estar no nome ("Barbearia Dom Aristides") — não repita.
  const category =
    business.category && !business.name.toLowerCase().includes(business.category.toLowerCase())
      ? business.category
      : undefined;
  const search = [business.name, category, business.city ?? business.address]
    .filter(Boolean)
    .join(" ");

  return [
    "ETAPA 1 — BRAND DISCOVERY (obrigatória, execute ANTES de gerar qualquer imagem)",
    "",
    businessDossier(business),
    "",
    "1. IDENTIFICAR O NEGÓCIO REAL",
    `Pesquise na web por "${search}". Use endereço, cidade, telefone e categoria para confirmar que os ativos encontrados pertencem a ESTE negócio. Negócios de nome parecido não podem ser confundidos.`,
    "",
    "2. ENCONTRAR A LOGO REAL",
    "Ordem de prioridade das fontes: (1) site oficial, (2) Google Business / Google Maps, (3) Instagram oficial, (4) Facebook oficial, (5) outros perfis claramente oficiais.",
    "Procure: logo principal, símbolo/marca, wordmark, avatar do perfil, logo do cabeçalho, fachada com a identidade oficial. Prefira a versão digital mais limpa disponível.",
    "NÃO use: logo de empresa não relacionada, logo genérico de banco de imagens, logo de negócio com nome parecido, ativo com marca d'água, imagem de baixa confiança, nem aproximação gerada por IA quando a logo real existe.",
    "",
    "3. CONFIANÇA DA LOGO (classifique internamente)",
    "ALTA — a logo aparece em site oficial ou perfil claramente oficial e bate com os dados fornecidos.",
    "MÉDIA — a logo aparece de forma consistente em várias fontes ligadas ao mesmo negócio.",
    "BAIXA — não dá para associar a logo ao negócio com segurança.",
    "Só use como ativo de marca autêntico se a confiança for ALTA ou MÉDIA. Se for BAIXA, ative o fallback.",
    "",
    "4. FALLBACK (apenas quando não há logo real confiável)",
    "Crie uma identidade temporária contida, baseada nas iniciais (ex: Barbearia Dom Aristides → BD; Padaria Aurora do Bexiga → PA). Simples, tipográfica, neutra, adequada à categoria e claramente utilizável como identidade provisória de mockup. Não invente uma marca fictícia elaborada nem apresente a logo inventada como se fosse a real.",
    "",
    "5. PRESERVAR A LOGO REAL",
    "Quando a logo autêntica for encontrada: não redesenhe, não troque o símbolo, não refaça a tipografia, não substitua por iniciais, não acrescente elementos decorativos, não reinterprete em outro estilo visual.",
    "Preserve proporções originais, símbolo, tipografia, cores, composição e características visuais reconhecíveis. Posicione a logo naturalmente na navegação do site. Se precisar de contraste, coloque-a dentro de um container neutro em vez de alterar a logo.",
    "",
    "6. EXTRAIR A LINGUAGEM DE MARCA EXISTENTE",
    "A partir dos ativos autênticos, identifique: cor primária, cor secundária, cor de destaque, neutros, geometria da logo, características tipográficas e personalidade visual.",
    "A identidade real é o INPUT PRIMÁRIO de design; a paleta de template é orientação SECUNDÁRIA. Se houver conflito, a marca autêntica vence — não force um site preto/dourado se a empresa claramente usa azul/branco.",
    "",
    "Ao terminar a etapa 1, aplique o que você confirmou (logo, cores, tipografia, personalidade) ao prompt da ETAPA 2 antes de gerar a imagem.",
  ].join("\n");
}

/** Regras de marca que entram no prompt de imagem, depois da descoberta. */
export function brandDesignRules(business: Business): string {
  const direction = categoryDirection(business.category);

  return [
    "BRAND-DRIVEN DESIGN SYSTEM — apply the identity confirmed in the brand discovery step:",
    "Use the authentic logo exactly as found (original symbol, typography, colors, proportions and composition), placed naturally in the site navigation; if contrast requires it, put it inside a neutral container instead of altering the logo. If no reliable logo was found, use the restrained typographic initials fallback.",
    "Expand the discovered identity into a modern web design system — complementary neutrals, accessible backgrounds, subtle gradients, UI accent shades, border, hover and surface colors — while keeping recognizable continuity with the existing brand. The result must read as \"the professional website this existing business could realistically have\", not as a rebranding.",
    direction
      ? `CATEGORY DIRECTION — ${business.category}: ${direction}. Combine it with the real identity (BRAND IDENTITY + BUSINESS CATEGORY = FINAL VISUAL DIRECTION); the category aesthetic must never erase the company's existing identity.`
      : "CATEGORY DIRECTION — let the nature of the business inform the mood, without erasing the company's existing identity (BRAND IDENTITY + BUSINESS CATEGORY = FINAL VISUAL DIRECTION).",
    "BUSINESS INFORMATION — use the real data from the dossier (name, category, address, phone, opening hours, rating, review count) in the header, hero, contact section and footer. Never invent real-world information that was not supplied or reliably discovered: if something cannot be confirmed, omit it or use clearly neutral placeholder content instead of presenting fabricated facts.",
    "QUALITY TARGET — the page must look like a professional designer researched this company, found its existing visual identity, understood its category, expanded that identity into a modern web design system, designed mobile-first, adapted it intelligently to desktop, preserved clear section boundaries and avoided repetitive template patterns. It must be recognizable as belonging specifically to THIS business.",
  ].join("\n");
}
