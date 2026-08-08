/**
 * ============================================================================
 *  DADOS SIMULADOS — NENHUM REGISTRO AQUI VEIO DO GOOGLE
 * ============================================================================
 *
 * 24 estabelecimentos FICTÍCIOS da região da Av. Paulista, usados para rodar o
 * fluxo completo (extração -> geração de mockup) em ambientes sem
 * `GOOGLE_MAPS_API_KEY`.
 *
 * Três marcadores tornam impossível confundir isto com dado real:
 *   1. todo `place_id` começa com `FIXTURE_` (place_id real do Google começa com `ChIJ`);
 *   2. todo telefone está na faixa fictícia `(11) 5555-0xxx`, que não toca em ninguém;
 *   3. todo lead derivado daqui sai com `source: "fixture"`.
 *
 * Quatro registros têm `website` preenchido de propósito: são eles que fazem o
 * filtro `!website` ser exercitado de verdade, deixando exatamente 20 leads.
 *
 * NÃO use esta lista para prospecção comercial.
 */

import type { FetchLike, PlaceDetailsResult } from "../tools/scrape-businesses-without-website.js";

export const FIXTURE_DISCLAIMER =
  "DADOS SIMULADOS — nenhuma chamada foi feita à Google Places API. Estabelecimentos, telefones e notas são fictícios.";

export const FIXTURE_LOCATION = "Avenida Paulista, São Paulo, Brasil";

export const FIXTURE_RESOLVED_ADDRESS =
  "Av. Paulista - Bela Vista, São Paulo - SP, Brasil [SIMULADO]";

interface FixturePlace extends PlaceDetailsResult {
  place_id: string;
}

/** Os 24 registros no formato bruto do Place Details, como o Google devolveria. */
export const FIXTURE_PLACES: FixturePlace[] = [
  {
    place_id: "FIXTURE_paulista_001",
    name: "Padaria Aurora do Bexiga",
    formatted_address: "R. Frei Caneca, 812 - Consolação, São Paulo - SP, 01307-001",
    formatted_phone_number: "(11) 5555-0101",
    international_phone_number: "+55 11 5555-0101",
    url: "https://maps.google.com/?cid=FIXTURE001",
    rating: 4.5,
    user_ratings_total: 312,
    types: ["bakery", "cafe", "food", "store", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_002",
    name: "Barbearia Dom Aristides",
    formatted_address: "R. Augusta, 2145 - Cerqueira César, São Paulo - SP, 01413-000",
    formatted_phone_number: "(11) 5555-0102",
    international_phone_number: "+55 11 5555-0102",
    url: "https://maps.google.com/?cid=FIXTURE002",
    rating: 4.8,
    user_ratings_total: 189,
    types: ["hair_care", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_003",
    name: "Pet Shop Focinho Feliz",
    formatted_address: "Al. Santos, 1470 - Jardim Paulista, São Paulo - SP, 01418-100",
    formatted_phone_number: "(11) 5555-0103",
    international_phone_number: "+55 11 5555-0103",
    url: "https://maps.google.com/?cid=FIXTURE003",
    rating: 4.6,
    user_ratings_total: 241,
    types: ["pet_store", "veterinary_care", "store", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_004",
    name: "Cantina Nonna Rosália",
    formatted_address: "R. Pamplona, 337 - Jardim Paulista, São Paulo - SP, 01405-000",
    formatted_phone_number: "(11) 5555-0104",
    international_phone_number: "+55 11 5555-0104",
    url: "https://maps.google.com/?cid=FIXTURE004",
    rating: 4.4,
    user_ratings_total: 526,
    types: ["restaurant", "food", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_005",
    name: "Lavanderia Água Clara",
    formatted_address: "R. Bela Cintra, 1023 - Consolação, São Paulo - SP, 01415-000",
    formatted_phone_number: "(11) 5555-0105",
    international_phone_number: "+55 11 5555-0105",
    url: "https://maps.google.com/?cid=FIXTURE005",
    rating: 4.2,
    user_ratings_total: 97,
    types: ["laundry", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_006",
    name: "Ótica Visão Paulista",
    formatted_address: "Av. Paulista, 1499 - Bela Vista, São Paulo - SP, 01311-200",
    formatted_phone_number: "(11) 5555-0106",
    international_phone_number: "+55 11 5555-0106",
    url: "https://maps.google.com/?cid=FIXTURE006",
    rating: 4.7,
    user_ratings_total: 148,
    types: ["store", "health", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_007",
    name: "Floricultura Jardim de Vidro",
    formatted_address: "Al. Casa Branca, 622 - Jardim Paulista, São Paulo - SP, 01408-001",
    formatted_phone_number: "(11) 5555-0107",
    international_phone_number: "+55 11 5555-0107",
    url: "https://maps.google.com/?cid=FIXTURE007",
    rating: 4.9,
    user_ratings_total: 76,
    types: ["florist", "store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_008",
    name: "Studio Pilates Corpo & Eixo",
    formatted_address: "R. Haddock Lobo, 1408 - Cerqueira César, São Paulo - SP, 01414-003",
    formatted_phone_number: "(11) 5555-0108",
    international_phone_number: "+55 11 5555-0108",
    url: "https://maps.google.com/?cid=FIXTURE008",
    rating: 4.8,
    user_ratings_total: 134,
    types: ["gym", "health", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_009",
    name: "Chaveiro 24h Peixoto Gomide",
    formatted_address: "R. Peixoto Gomide, 941 - Jardim Paulista, São Paulo - SP, 01409-001",
    formatted_phone_number: "(11) 5555-0109",
    international_phone_number: "+55 11 5555-0109",
    url: "https://maps.google.com/?cid=FIXTURE009",
    rating: 4.1,
    user_ratings_total: 203,
    types: ["locksmith", "hardware_store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_010",
    name: "Doceria Colher de Prata",
    formatted_address: "Al. Lorena, 1755 - Jardim Paulista, São Paulo - SP, 01424-002",
    formatted_phone_number: "(11) 5555-0110",
    international_phone_number: "+55 11 5555-0110",
    url: "https://maps.google.com/?cid=FIXTURE010",
    rating: 4.7,
    user_ratings_total: 388,
    types: ["bakery", "cafe", "food", "store", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_011",
    name: "Salão Beleza de Esquina",
    formatted_address: "R. Padre João Manuel, 480 - Cerqueira César, São Paulo - SP, 01411-000",
    formatted_phone_number: "(11) 5555-0111",
    international_phone_number: "+55 11 5555-0111",
    url: "https://maps.google.com/?cid=FIXTURE011",
    rating: 4.5,
    user_ratings_total: 162,
    types: ["beauty_salon", "hair_care", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_012",
    name: "Bicicletaria Roda Livre",
    formatted_address: "R. da Consolação, 3179 - Cerqueira César, São Paulo - SP, 01416-001",
    formatted_phone_number: "(11) 5555-0112",
    international_phone_number: "+55 11 5555-0112",
    url: "https://maps.google.com/?cid=FIXTURE012",
    rating: 4.6,
    user_ratings_total: 118,
    types: ["bicycle_store", "store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_013",
    name: "Papelaria Traço Fino",
    formatted_address: "R. Maria Antônia, 294 - Vila Buarque, São Paulo - SP, 01222-010",
    formatted_phone_number: "(11) 5555-0113",
    international_phone_number: "+55 11 5555-0113",
    url: "https://maps.google.com/?cid=FIXTURE013",
    rating: 4.3,
    user_ratings_total: 84,
    types: ["book_store", "store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_014",
    name: "Bar do Seu Otávio",
    formatted_address: "R. Antônio Carlos, 611 - Consolação, São Paulo - SP, 01309-011",
    formatted_phone_number: "(11) 5555-0114",
    international_phone_number: "+55 11 5555-0114",
    url: "https://maps.google.com/?cid=FIXTURE014",
    rating: 4.4,
    user_ratings_total: 671,
    types: ["bar", "restaurant", "food", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_015",
    name: "Sapataria Sola de Ouro",
    formatted_address: "Al. Campinas, 1074 - Jardim Paulista, São Paulo - SP, 01404-001",
    formatted_phone_number: "(11) 5555-0115",
    international_phone_number: "+55 11 5555-0115",
    url: "https://maps.google.com/?cid=FIXTURE015",
    rating: 4.8,
    user_ratings_total: 59,
    types: ["shoe_store", "store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_016",
    name: "Gráfica Rápida Ponto Zero",
    formatted_address: "R. Carlos Sampaio, 205 - Bela Vista, São Paulo - SP, 01333-020",
    formatted_phone_number: "(11) 5555-0116",
    international_phone_number: "+55 11 5555-0116",
    url: "https://maps.google.com/?cid=FIXTURE016",
    rating: 4.2,
    user_ratings_total: 141,
    types: ["print_shop", "store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_017",
    name: "Café Torra Manhã",
    formatted_address: "Al. Jaú, 1301 - Jardim Paulista, São Paulo - SP, 01420-002",
    formatted_phone_number: "(11) 5555-0117",
    international_phone_number: "+55 11 5555-0117",
    url: "https://maps.google.com/?cid=FIXTURE017",
    rating: 4.9,
    user_ratings_total: 425,
    types: ["cafe", "food", "store", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_018",
    name: "Clínica Odonto Sorriso Bela Vista",
    formatted_address: "R. Santo Antônio, 458 - Bela Vista, São Paulo - SP, 01314-000",
    formatted_phone_number: "(11) 5555-0118",
    international_phone_number: "+55 11 5555-0118",
    url: "https://maps.google.com/?cid=FIXTURE018",
    rating: 4.7,
    user_ratings_total: 96,
    types: ["dentist", "health", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_019",
    name: "Assistência Técnica TelaJá",
    formatted_address: "R. Augusta, 1508 - Consolação, São Paulo - SP, 01304-001",
    formatted_phone_number: "(11) 5555-0119",
    international_phone_number: "+55 11 5555-0119",
    url: "https://maps.google.com/?cid=FIXTURE019",
    rating: 4.0,
    user_ratings_total: 233,
    types: ["electronics_store", "store", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_020",
    name: "Hortifruti Feira da Al. Rio Claro",
    formatted_address: "Al. Rio Claro, 190 - Bela Vista, São Paulo - SP, 01332-010",
    formatted_phone_number: "(11) 5555-0120",
    international_phone_number: "+55 11 5555-0120",
    url: "https://maps.google.com/?cid=FIXTURE020",
    rating: 4.6,
    user_ratings_total: 178,
    types: ["grocery_or_supermarket", "store", "food", "point_of_interest"],
  },

  // --- Os quatro abaixo TÊM site: existem para o filtro `!website` ter o que descartar. ---
  {
    place_id: "FIXTURE_paulista_021",
    name: "Rede Café Central (com site)",
    formatted_address: "Av. Paulista, 900 - Bela Vista, São Paulo - SP, 01310-100",
    formatted_phone_number: "(11) 5555-0121",
    website: "https://exemplo-rede-cafe.test",
    url: "https://maps.google.com/?cid=FIXTURE021",
    rating: 4.3,
    user_ratings_total: 1204,
    types: ["cafe", "food", "store", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_022",
    name: "Drogaria Rede Paulista (com site)",
    formatted_address: "Av. Paulista, 2064 - Bela Vista, São Paulo - SP, 01310-200",
    formatted_phone_number: "(11) 5555-0122",
    website: "https://exemplo-drogaria.test",
    url: "https://maps.google.com/?cid=FIXTURE022",
    rating: 4.1,
    user_ratings_total: 890,
    types: ["pharmacy", "health", "store", "point_of_interest"],
  },
  {
    place_id: "FIXTURE_paulista_023",
    name: "Academia Rede Fit (com site)",
    formatted_address: "R. Haddock Lobo, 595 - Cerqueira César, São Paulo - SP, 01414-001",
    formatted_phone_number: "(11) 5555-0123",
    website: "https://exemplo-academia.test",
    url: "https://maps.google.com/?cid=FIXTURE023",
    rating: 4.0,
    user_ratings_total: 640,
    types: ["gym", "health", "point_of_interest", "establishment"],
  },
  {
    place_id: "FIXTURE_paulista_024",
    name: "Livraria Rede Cultura (com site)",
    formatted_address: "Av. Paulista, 2073 - Bela Vista, São Paulo - SP, 01311-300",
    formatted_phone_number: "(11) 5555-0124",
    website: "https://exemplo-livraria.test",
    url: "https://maps.google.com/?cid=FIXTURE024",
    rating: 4.6,
    user_ratings_total: 2310,
    types: ["book_store", "store", "point_of_interest", "establishment"],
  },
];

const FIXTURE_PAGE_SIZE = 12;
const FIXTURE_PAGE_TOKEN = "FIXTURE_PAGE_2";

/**
 * `fetch` falso que responde aos três endpoints do Google usados pela extração,
 * inclusive a paginação por `next_page_token`. Serve para rodar
 * `extractLeadsWithoutWebsite` de ponta a ponta sem chave e sem rede — o mesmo
 * caminho de código do modo real.
 */
export function createFixturePlacesFetch(): FetchLike {
  return async (url: URL) => {
    const respond = (payload: unknown) => ({ json: async () => payload });

    if (url.pathname.endsWith("/geocode/json")) {
      return respond({
        status: "OK",
        results: [
          {
            geometry: { location: { lat: -23.5614, lng: -46.6559 } },
            formatted_address: FIXTURE_RESOLVED_ADDRESS,
          },
        ],
      });
    }

    if (url.pathname.endsWith("/nearbysearch/json")) {
      const isSecondPage = url.searchParams.get("pagetoken") === FIXTURE_PAGE_TOKEN;
      const slice = isSecondPage
        ? FIXTURE_PLACES.slice(FIXTURE_PAGE_SIZE)
        : FIXTURE_PLACES.slice(0, FIXTURE_PAGE_SIZE);

      return respond({
        status: "OK",
        results: slice.map((place) => ({
          place_id: place.place_id,
          name: place.name,
          vicinity: place.formatted_address,
        })),
        ...(isSecondPage ? {} : { next_page_token: FIXTURE_PAGE_TOKEN }),
      });
    }

    if (url.pathname.endsWith("/details/json")) {
      const placeId = url.searchParams.get("place_id");
      const place = FIXTURE_PLACES.find((entry) => entry.place_id === placeId);
      if (!place) return respond({ status: "NOT_FOUND" });

      const { place_id: _ignored, ...details } = place;
      return respond({ status: "OK", result: details });
    }

    return respond({ status: "UNKNOWN_ENDPOINT" });
  };
}
