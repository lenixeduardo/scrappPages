import type { BusinessLead } from "../types/lead.js";
import { primaryType } from "../types/lead.js";

export interface Palette {
  /** Fundo da página. */
  bg: string;
  /** Fundo de cartões e superfícies elevadas. */
  surface: string;
  /** Texto principal. */
  ink: string;
  /** Texto secundário. */
  muted: string;
  /** Cor de marca / botões. */
  accent: string;
  /** Texto sobre a cor de marca. */
  onAccent: string;
  /** Gradiente do bloco hero. */
  heroFrom: string;
  heroTo: string;
}

export interface CategoryTheme {
  key: string;
  /** Rótulo da categoria mostrado como sobrelinha no hero. */
  label: string;
  /** Frase de efeito do hero (complementa o nome do negócio). */
  headline: string;
  /** Parágrafo de apoio do hero. */
  subhead: string;
  /** Texto do botão principal. */
  primaryCta: string;
  /** Itens de menu da navegação. */
  nav: [string, string, string];
  /** Três cartões de serviço/diferencial. */
  services: Array<{ title: string; text: string }>;
  palette: Palette;
  /** Ícone em `path` de SVG, desenhado em viewBox 0 0 24 24, traço. */
  icon: string;
}

const ICONS = {
  bread:
    "M4 10c0-3.3 3.6-5 8-5s8 1.7 8 5c0 1.2-.7 2-2 2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5c-1.3 0-2-.8-2-2Zm5 2v5m3-5v5m3-5v5",
  scissors:
    "M6 4 18 18M18 4 6 18M7.5 20a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm9 0a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z",
  paw: "M12 13c2.8 0 5 2 5 4.2 0 1.6-1.2 2.6-2.8 2.4-1.5-.2-2.9-.2-4.4 0C8.2 19.8 7 18.8 7 17.2 7 15 9.2 13 12 13Zm-4.6-2.4a1.9 2.4 0 1 1 0-4.8 1.9 2.4 0 0 1 0 4.8Zm9.2 0a1.9 2.4 0 1 1 0-4.8 1.9 2.4 0 0 1 0 4.8ZM4 15.4a1.7 2.1 0 1 1 0-4.2 1.7 2.1 0 0 1 0 4.2Zm16 0a1.7 2.1 0 1 1 0-4.2 1.7 2.1 0 0 1 0 4.2Z",
  fork: "M7 3v7a2 2 0 0 0 4 0V3M9 12v9M15 3c-1.5 1.5-2 3-2 5s.7 3 2 3v10",
  glass:
    "M5 4h14l-6 8v6h3v2H8v-2h3v-6L5 4Z",
  washer:
    "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-4.5-3h.01M11 6h.01",
  glasses:
    "M3 12h4.5l1.5 4a2.5 2.5 0 0 0 5 0l1.5-4H21M6 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  flower:
    "M12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0-5c1.7 0 2.6 1.5 2 3.2M12 3c-1.7 0-2.6 1.5-2 3.2m9 1.3c.9 1.5.2 3.1-1.5 3.6M19 7.5c-.9-1.5-2.6-1.7-3.8-.6M5 7.5c-.9 1.5-.2 3.1 1.5 3.6M5 7.5c.9-1.5 2.6-1.7 3.8-.6M12 13v8m-3 0h6",
  dumbbell:
    "M3 9v6m3-8v10m12-10v10m3-8v6M6 12h12",
  key: "M15 4a5 5 0 1 0-4.6 7L9 12.4V15H6.5l-2 2 2 2H9l1-1v-2h2v-2h2l1-1v-2.4A5 5 0 0 0 15 4Zm1.5 3.5h.01",
  bike: "M5.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM9 15.5 12 8h4m-4 0-2.5-3H7m5.5 3L15.5 15",
  book: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm2 14h12M9 7h6",
  shoe: "M3 16v-6h4l2.5 2H14c3 0 6 1.3 7 3v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm4-6V8",
  printer:
    "M7 8V4h10v4M7 17H5a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v6H7v-6Zm10-3h.01",
  tooth:
    "M8 3c1.5 0 2.2 1 4 1s2.5-1 4-1a3.5 3.5 0 0 1 3.5 3.5c0 3-1.4 4-2 7.5-.5 3-.7 6-2.5 6s-1.6-4-3-4-1.2 4-3 4-2-3-2.5-6C5.9 10.5 4.5 9.5 4.5 6.5A3.5 3.5 0 0 1 8 3Z",
  phone:
    "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h4",
  basket:
    "M4 9h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 9Zm4 0 2-5m6 5-2-5M9 13v3m6-3v3",
  coffee:
    "M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm13 1h1.5a2.5 2.5 0 0 1 0 5H17M7 3v2m3-2v2m3-2v2",
  storefront:
    "M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Zm0 0 1.5-5h13L20 9M9 20v-6h6v6",
  cake: "M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6Zm0-3.5c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5M12 11V7m0-4v1.5",
} as const;

const THEMES: CategoryTheme[] = [
  {
    key: "bakery",
    label: "Padaria & Confeitaria",
    headline: "Pão quentinho todo dia, do jeito que o bairro gosta",
    subhead:
      "Fornada de hora em hora, confeitaria artesanal e um cafezinho que faz você voltar. Peça pelo WhatsApp e retire sem fila.",
    primaryCta: "Ver cardápio do dia",
    nav: ["Fornadas", "Confeitaria", "Encomendas"],
    services: [
      { title: "Fornada de hora em hora", text: "Pão francês saindo quente das 6h às 20h, todos os dias." },
      { title: "Bolos e doces sob encomenda", text: "Aniversário, chá de bebê ou café da firma — a gente monta." },
      { title: "Café da manhã completo", text: "Combo de pão na chapa, suco natural e café coado no salão." },
    ],
    palette: {
      bg: "#FFF9F0", surface: "#FFFFFF", ink: "#2B1A0E", muted: "#7A6552",
      accent: "#C2622A", onAccent: "#FFFFFF", heroFrom: "#F6C177", heroTo: "#C2622A",
    },
    icon: ICONS.bread,
  },
  {
    key: "cafe",
    label: "Cafeteria",
    headline: "O café que abre o seu dia na Paulista",
    subhead:
      "Grãos torrados na semana, métodos filtrados na hora e um balcão feito pra conversa. Wi-Fi liberado e tomada em toda mesa.",
    primaryCta: "Conhecer o menu",
    nav: ["Menu", "Grãos", "Reservas"],
    services: [
      { title: "Torra própria", text: "Microlotes brasileiros torrados toda semana, com data na embalagem." },
      { title: "Métodos filtrados", text: "V60, prensa e aeropress preparados na sua frente pelo barista." },
      { title: "Espaço pra trabalhar", text: "Wi-Fi rápido, tomadas e mesas grandes — sem tempo mínimo." },
    ],
    palette: {
      bg: "#F7F3EE", surface: "#FFFFFF", ink: "#241C16", muted: "#71645A",
      accent: "#6F4A2F", onAccent: "#FFFFFF", heroFrom: "#B08968", heroTo: "#4A2F1D",
    },
    icon: ICONS.coffee,
  },
  {
    key: "doceria",
    label: "Doceria & Confeitaria",
    headline: "Doce feito à mão, do jeito que a vovó fazia",
    subhead:
      "Bolos, tortas e docinhos montados no dia, com encomenda para festa e entrega na região. Sem gordura hidrogenada, sem atalho.",
    primaryCta: "Encomendar bolo",
    nav: ["Bolos", "Docinhos", "Encomendas"],
    services: [
      { title: "Encomenda para festa", text: "Cento de docinhos e bolo temático com 48h de antecedência." },
      { title: "Feito no dia", text: "Nada de vitrine de véspera: a produção sai de manhã, todo dia." },
      { title: "Entrega na região", text: "Levamos o bolo montado até a festa, sem risco no transporte." },
    ],
    palette: {
      bg: "#FFF5F7", surface: "#FFFFFF", ink: "#33141F", muted: "#8A6270",
      accent: "#C43D63", onAccent: "#FFFFFF", heroFrom: "#F6B8C8", heroTo: "#8E2244",
    },
    icon: ICONS.cake,
  },
  {
    key: "hair_care",
    label: "Barbearia",
    headline: "Corte no ponto, barba no capricho",
    subhead:
      "Cadeira reservada pelo WhatsApp, sem espera. Corte na tesoura, barba na navalha e aquele acabamento que dura a semana toda.",
    primaryCta: "Agendar horário",
    nav: ["Serviços", "Equipe", "Agenda"],
    services: [
      { title: "Corte + barba", text: "Combo completo em 50 minutos, com toalha quente e finalização." },
      { title: "Agendamento online", text: "Escolha o barbeiro e o horário direto pelo site, 24h por dia." },
      { title: "Clube do assinante", text: "Plano mensal com corte toda semana por um valor fixo." },
    ],
    palette: {
      bg: "#111417", surface: "#1A1F24", ink: "#F5F2EC", muted: "#9BA5AE",
      accent: "#C9A227", onAccent: "#141414", heroFrom: "#2B3238", heroTo: "#0B0D0F",
    },
    icon: ICONS.scissors,
  },
  {
    key: "beauty_salon",
    label: "Salão de Beleza",
    headline: "Seu cabelo do jeito que você imaginou",
    subhead:
      "Coloração, tratamento e escova com profissionais que ouvem antes de cortar. Agende online e chegue na hora marcada.",
    primaryCta: "Agendar avaliação",
    nav: ["Serviços", "Portfólio", "Agenda"],
    services: [
      { title: "Coloração e mechas", text: "Avaliação de fio gratuita antes de qualquer química." },
      { title: "Tratamento capilar", text: "Cronograma personalizado com produtos profissionais." },
      { title: "Noivas e eventos", text: "Pacote de penteado e maquiagem com teste incluso." },
    ],
    palette: {
      bg: "#FDF6F8", surface: "#FFFFFF", ink: "#2A1B23", muted: "#8A6C79",
      accent: "#B5476B", onAccent: "#FFFFFF", heroFrom: "#F2A6BE", heroTo: "#8E2E52",
    },
    icon: ICONS.scissors,
  },
  {
    key: "pet_store",
    label: "Pet Shop & Banho e Tosa",
    headline: "Cuidado de verdade para quem não sabe pedir",
    subhead:
      "Banho e tosa com hora marcada, produtos selecionados e leva-e-traz no bairro. Seu pet sai limpo, calmo e cheiroso.",
    primaryCta: "Agendar banho e tosa",
    nav: ["Banho & Tosa", "Produtos", "Leva e traz"],
    services: [
      { title: "Banho e tosa com hora marcada", text: "Sem gaiola de espera: seu pet entra e sai no horário." },
      { title: "Leva e traz no bairro", text: "Buscamos e devolvemos em casa dentro de 3 km, sem custo." },
      { title: "Ração e acessórios", text: "Marcas premium com entrega no mesmo dia pelo WhatsApp." },
    ],
    palette: {
      bg: "#F1FAF8", surface: "#FFFFFF", ink: "#0F2B28", muted: "#5A7B77",
      accent: "#0E8A78", onAccent: "#FFFFFF", heroFrom: "#68D3BF", heroTo: "#0B6455",
    },
    icon: ICONS.paw,
  },
  {
    key: "restaurant",
    label: "Restaurante",
    headline: "Comida de verdade, feita na hora",
    subhead:
      "Prato do dia servido no capricho, ambiente pra receber bem e delivery na região. Reserve sua mesa pelo site.",
    primaryCta: "Reservar mesa",
    nav: ["Cardápio", "Ambiente", "Reservas"],
    services: [
      { title: "Prato do dia", text: "Menu executivo servido das 11h30 às 15h, com sobremesa inclusa." },
      { title: "Delivery próprio", text: "Entrega na região sem taxa de aplicativo, direto com a casa." },
      { title: "Eventos e confraternizações", text: "Salão reservado para grupos de até 40 pessoas." },
    ],
    palette: {
      bg: "#FBF6F3", surface: "#FFFFFF", ink: "#2A1512", muted: "#7E6058",
      accent: "#A32B2B", onAccent: "#FFFFFF", heroFrom: "#E8A87C", heroTo: "#7A1F1F",
    },
    icon: ICONS.fork,
  },
  {
    key: "bar",
    label: "Bar & Petiscaria",
    headline: "A parada certa depois do expediente",
    subhead:
      "Chope sempre gelado, petisco que sai rápido e mesa na calçada. Tem jogo na TV e música sem precisar gritar.",
    primaryCta: "Ver a carta",
    nav: ["Carta", "Petiscos", "Agenda"],
    services: [
      { title: "Chope no ponto", text: "Chopeira higienizada toda semana — a diferença aparece no copo." },
      { title: "Cozinha até tarde", text: "Petiscos saindo até 1h da manhã, de quinta a sábado." },
      { title: "Reserva de mesa", text: "Garanta a mesa da calçada pelo site nos dias de jogo." },
    ],
    palette: {
      bg: "#14161C", surface: "#1D212A", ink: "#F2EFE9", muted: "#98A0AE",
      accent: "#E0A526", onAccent: "#17181C", heroFrom: "#333A48", heroTo: "#0D0F14",
    },
    icon: ICONS.glass,
  },
  {
    key: "laundry",
    label: "Lavanderia",
    headline: "Sua roupa pronta em 24 horas",
    subhead:
      "Lavagem, secagem e passadoria com controle de peça. Deixe de manhã, retire no dia seguinte — ou peça a coleta em casa.",
    primaryCta: "Pedir coleta",
    nav: ["Serviços", "Preços", "Coleta"],
    services: [
      { title: "Entrega em 24h", text: "Peças lavadas, secas e dobradas prontas no dia seguinte." },
      { title: "Coleta e entrega", text: "Buscamos e devolvemos em casa ou no escritório, na região." },
      { title: "Roupa delicada", text: "Lavagem a seco para ternos, vestidos e peças de festa." },
    ],
    palette: {
      bg: "#F2F7FD", surface: "#FFFFFF", ink: "#0F2036", muted: "#5F7590",
      accent: "#1D6FD1", onAccent: "#FFFFFF", heroFrom: "#7CB6F2", heroTo: "#134A8F",
    },
    icon: ICONS.washer,
  },
  {
    key: "optician",
    label: "Ótica",
    headline: "Enxergar bem também é sobre se sentir bem",
    subhead:
      "Exame de vista sem custo, armações para todo rosto e lentes com garantia. Ajuste e manutenção sempre gratuitos.",
    primaryCta: "Agendar exame",
    nav: ["Armações", "Lentes", "Exame"],
    services: [
      { title: "Exame de vista grátis", text: "Optometrista na loja, com hora marcada e laudo na hora." },
      { title: "Lentes com garantia", text: "Antirreflexo e multifocais com um ano de garantia real." },
      { title: "Ajuste vitalício", text: "Regulagem e limpeza gratuitas sempre que precisar." },
    ],
    palette: {
      bg: "#F4F5FB", surface: "#FFFFFF", ink: "#161A33", muted: "#666C8C",
      accent: "#3B3F9E", onAccent: "#FFFFFF", heroFrom: "#9AA0E8", heroTo: "#262B75",
    },
    icon: ICONS.glasses,
  },
  {
    key: "florist",
    label: "Floricultura",
    headline: "Flores que dizem o que é difícil escrever",
    subhead:
      "Arranjos montados no dia, entrega em toda a região e cartão escrito à mão. Peça hoje, chega hoje.",
    primaryCta: "Montar meu arranjo",
    nav: ["Arranjos", "Assinatura", "Entrega"],
    services: [
      { title: "Entrega no mesmo dia", text: "Pedidos até 15h chegam no mesmo dia na região da Paulista." },
      { title: "Assinatura mensal", text: "Flores frescas na sua casa ou recepção toda semana." },
      { title: "Casamentos e eventos", text: "Projeto floral completo, do buquê à decoração de mesa." },
    ],
    palette: {
      bg: "#F6FAF3", surface: "#FFFFFF", ink: "#18291A", muted: "#5E7460",
      accent: "#3F7D46", onAccent: "#FFFFFF", heroFrom: "#F0A9C4", heroTo: "#2F6B39",
    },
    icon: ICONS.flower,
  },
  {
    key: "gym",
    label: "Studio & Academia",
    headline: "Treino que cabe na sua agenda",
    subhead:
      "Turmas pequenas, avaliação individual e professor olhando cada série. Experimente uma aula sem compromisso.",
    primaryCta: "Agendar aula experimental",
    nav: ["Modalidades", "Planos", "Horários"],
    services: [
      { title: "Turmas de até 6 alunos", text: "Atenção individual em toda aula, sem espera por aparelho." },
      { title: "Avaliação física inclusa", text: "Reavaliação a cada 3 meses acompanhando sua evolução." },
      { title: "Horários flexíveis", text: "Aulas das 6h às 21h, com remarcação pelo site." },
    ],
    palette: {
      bg: "#101214", surface: "#191D21", ink: "#F4F6F7", muted: "#98A2AA",
      accent: "#A8E10C", onAccent: "#12160A", heroFrom: "#2C3338", heroTo: "#0A0C0E",
    },
    icon: ICONS.dumbbell,
  },
  {
    key: "locksmith",
    label: "Chaveiro 24h",
    headline: "Ficou pra fora? A gente chega em 20 minutos",
    subhead:
      "Atendimento 24 horas, abertura sem danificar a porta e cópia de chave codificada na hora. Orçamento antes de começar.",
    primaryCta: "Chamar agora",
    nav: ["Serviços", "Cobertura", "Orçamento"],
    services: [
      { title: "Atendimento 24h", text: "Sete dias por semana, inclusive feriado e madrugada." },
      { title: "Chegada em 20 minutos", text: "Cobertura em toda a região central de São Paulo." },
      { title: "Chave codificada", text: "Cópia de chave de carro e controle de portão feita na hora." },
    ],
    palette: {
      bg: "#F5F6F7", surface: "#FFFFFF", ink: "#14181C", muted: "#616B75",
      accent: "#D4761A", onAccent: "#FFFFFF", heroFrom: "#4C565F", heroTo: "#14181C",
    },
    icon: ICONS.key,
  },
  {
    key: "bicycle_store",
    label: "Bicicletaria",
    headline: "Sua bike rodando melhor que nova",
    subhead:
      "Revisão completa com teste de rua, peças de reposição em estoque e conserto expresso enquanto você espera.",
    primaryCta: "Agendar revisão",
    nav: ["Oficina", "Peças", "Revisão"],
    services: [
      { title: "Revisão completa", text: "Freio, câmbio, roda e transmissão ajustados com teste de rua." },
      { title: "Conserto expresso", text: "Câmara, pneu e corrente resolvidos em até 30 minutos." },
      { title: "Peças em estoque", text: "Componentes das principais marcas sem tempo de espera." },
    ],
    palette: {
      bg: "#F3F8F6", surface: "#FFFFFF", ink: "#10231F", muted: "#5A7570",
      accent: "#127A5C", onAccent: "#FFFFFF", heroFrom: "#6FC3A5", heroTo: "#0C4F3C",
    },
    icon: ICONS.bike,
  },
  {
    key: "book_store",
    label: "Papelaria & Livraria",
    headline: "Tudo o que falta na sua mesa",
    subhead:
      "Material escolar, papelaria criativa e impressão na hora. Lista de escola montada e separada pra retirar.",
    primaryCta: "Enviar minha lista",
    nav: ["Papelaria", "Impressão", "Listas"],
    services: [
      { title: "Lista escolar pronta", text: "Mande a lista e retire tudo separado e conferido." },
      { title: "Impressão e cópia", text: "Colorida, encadernação e plastificação enquanto espera." },
      { title: "Papelaria criativa", text: "Cadernos, canetas e adesivos que você não acha em rede." },
    ],
    palette: {
      bg: "#FAF7F0", surface: "#FFFFFF", ink: "#221E14", muted: "#6F6754",
      accent: "#8A5A16", onAccent: "#FFFFFF", heroFrom: "#DDBE84", heroTo: "#5E3D0E",
    },
    icon: ICONS.book,
  },
  {
    key: "shoe_store",
    label: "Sapataria",
    headline: "Aquele sapato bom merece mais uma temporada",
    subhead:
      "Troca de solado, costura, tingimento e limpeza profunda. Conserto com prazo combinado e garantia de 90 dias.",
    primaryCta: "Pedir orçamento",
    nav: ["Consertos", "Prazos", "Orçamento"],
    services: [
      { title: "Troca de solado", text: "Couro ou borracha, com acabamento igual ao de fábrica." },
      { title: "Limpeza profunda", text: "Tênis e sapatos de couro recuperados sem agredir o material." },
      { title: "Garantia de 90 dias", text: "Se o conserto soltar, refazemos sem cobrar nada." },
    ],
    palette: {
      bg: "#F8F5F1", surface: "#FFFFFF", ink: "#241C15", muted: "#71655A",
      accent: "#7A4B23", onAccent: "#FFFFFF", heroFrom: "#C89B6E", heroTo: "#4B2C12",
    },
    icon: ICONS.shoe,
  },
  {
    key: "print_shop",
    label: "Gráfica Rápida",
    headline: "Do arquivo ao impresso no mesmo dia",
    subhead:
      "Cartão de visita, banner, adesivo e material de evento com prova digital antes de imprimir. Envie a arte pelo site.",
    primaryCta: "Enviar arquivo",
    nav: ["Produtos", "Prazos", "Orçamento"],
    services: [
      { title: "Produção no mesmo dia", text: "Pedidos aprovados até 11h saem no fim da tarde." },
      { title: "Prova digital", text: "Você aprova o resultado antes de a máquina rodar." },
      { title: "Arte inclusa", text: "Ajuste de arquivo e diagramação simples sem custo extra." },
    ],
    palette: {
      bg: "#F4F6FA", surface: "#FFFFFF", ink: "#131A26", muted: "#5E6B80",
      accent: "#E0483C", onAccent: "#FFFFFF", heroFrom: "#7E8CA6", heroTo: "#1B2434",
    },
    icon: ICONS.printer,
  },
  {
    key: "dentist",
    label: "Clínica Odontológica",
    headline: "Um sorriso cuidado sem susto no orçamento",
    subhead:
      "Avaliação com raio-x digital, plano de tratamento por escrito e parcelamento. Atendimento de urgência no mesmo dia.",
    primaryCta: "Agendar avaliação",
    nav: ["Tratamentos", "Convênios", "Agenda"],
    services: [
      { title: "Avaliação com raio-x", text: "Diagnóstico e orçamento fechado por escrito na primeira visita." },
      { title: "Urgência no mesmo dia", text: "Dor de dente atendida sem agendamento prévio." },
      { title: "Parcelamento sem juros", text: "Tratamentos longos divididos em até 12 vezes." },
    ],
    palette: {
      bg: "#F2F9FB", surface: "#FFFFFF", ink: "#0E2530", muted: "#57737F",
      accent: "#0E7C99", onAccent: "#FFFFFF", heroFrom: "#7FCDE0", heroTo: "#0A5468",
    },
    icon: ICONS.tooth,
  },
  {
    key: "electronics_store",
    label: "Assistência Técnica",
    headline: "Celular consertado hoje, com garantia",
    subhead:
      "Troca de tela, bateria e conector com peças de qualidade e teste na sua frente. Orçamento gratuito em 15 minutos.",
    primaryCta: "Pedir orçamento",
    nav: ["Serviços", "Garantia", "Orçamento"],
    services: [
      { title: "Conserto em 1 hora", text: "Troca de tela e bateria feita enquanto você aguarda." },
      { title: "Garantia de 6 meses", text: "Toda peça trocada sai com garantia registrada na nota." },
      { title: "Orçamento gratuito", text: "Diagnóstico sem custo, mesmo que você não autorize o reparo." },
    ],
    palette: {
      bg: "#F1F4F8", surface: "#FFFFFF", ink: "#111A24", muted: "#5B6B7C",
      accent: "#1F63C4", onAccent: "#FFFFFF", heroFrom: "#6E93C7", heroTo: "#14283F",
    },
    icon: ICONS.phone,
  },
  {
    key: "grocery_or_supermarket",
    label: "Hortifruti & Mercearia",
    headline: "Feira fresca sem sair de casa",
    subhead:
      "Frutas, verduras e legumes escolhidos de manhã na Ceagesp. Monte sua cesta pelo site e receba no mesmo dia.",
    primaryCta: "Montar minha cesta",
    nav: ["Cestas", "Hortifruti", "Entrega"],
    services: [
      { title: "Colhido no dia", text: "Reposição diária direto do produtor, sem estoque parado." },
      { title: "Cesta personalizada", text: "Você escolhe item por item e a gente separa e entrega." },
      { title: "Entrega em 2 horas", text: "Pedidos na região da Paulista chegam no mesmo turno." },
    ],
    palette: {
      bg: "#F5FAF0", surface: "#FFFFFF", ink: "#16250F", muted: "#5F7554",
      accent: "#4C8B21", onAccent: "#FFFFFF", heroFrom: "#A8D672", heroTo: "#33601A",
    },
    icon: ICONS.basket,
  },
];

const DEFAULT_THEME: CategoryTheme = {
  key: "store",
  label: "Comércio Local",
  headline: "O seu negócio finalmente encontrado no Google",
  subhead:
    "Um site simples, rápido e no ar 24 horas: quem procura pelo seu serviço na região acha você primeiro — e fala direto no WhatsApp.",
  primaryCta: "Falar no WhatsApp",
  nav: ["Serviços", "Sobre", "Contato"],
  services: [
    { title: "Encontrado no Google", text: "Página otimizada para quem busca pelo seu serviço no bairro." },
    { title: "Contato em um toque", text: "Telefone, WhatsApp e rota no mapa sempre visíveis." },
    { title: "No ar 24 horas", text: "Seu horário, endereço e serviços disponíveis mesmo com a loja fechada." },
  ],
  palette: {
    bg: "#F5F6F8", surface: "#FFFFFF", ink: "#15181D", muted: "#5F6874",
    accent: "#2F6BE4", onAccent: "#FFFFFF", heroFrom: "#8FA8D8", heroTo: "#1D2A44",
  },
  icon: ICONS.storefront,
};

/** Tipos do Places que devem cair num tema já existente. */
const TYPE_ALIASES: Record<string, string> = {
  meal_takeaway: "restaurant",
  meal_delivery: "restaurant",
  food: "restaurant",
  night_club: "bar",
  liquor_store: "bar",
  veterinary_care: "pet_store",
  hardware_store: "locksmith",
  physiotherapist: "gym",
  spa: "beauty_salon",
  doctor: "dentist",
  pharmacy: "dentist",
  supermarket: "grocery_or_supermarket",
  convenience_store: "grocery_or_supermarket",
  clothing_store: "shoe_store",
  home_goods_store: "store",
  health: "dentist",
};

/**
 * Escolhe o tema visual do mockup a partir dos tipos do Google Places.
 * A ótica não tem tipo próprio no Places, então o nome também é considerado.
 */
export function themeForLead(lead: BusinessLead): CategoryTheme {
  const byName = themeFromName(lead.name);
  if (byName) return byName;

  const candidates = lead.types ?? [];
  for (const type of candidates) {
    const key = TYPE_ALIASES[type] ?? type;
    const match = THEMES.find((theme) => theme.key === key);
    if (match) return match;
  }

  const fallbackKey = primaryType(lead);
  return THEMES.find((theme) => theme.key === fallbackKey) ?? DEFAULT_THEME;
}

const NAME_HINTS: Array<[RegExp, string]> = [
  [/ótica|otica|oculos|óculos/i, "optician"],
  [/barbearia|barber/i, "hair_care"],
  [/padaria|panificadora/i, "bakery"],
  [/doceria|confeitaria|bolo|docinho/i, "doceria"],
  [/caf[eé]|coffee|torra/i, "cafe"],
  [/pet\s?shop|veterin/i, "pet_store"],
  [/lavanderia/i, "laundry"],
  [/floricultura|flores/i, "florist"],
  [/pilates|academia|crossfit|studio/i, "gym"],
  [/chaveiro/i, "locksmith"],
  [/bicicletaria|bike/i, "bicycle_store"],
  [/papelaria|livraria/i, "book_store"],
  [/sapataria|calçados|calcados/i, "shoe_store"],
  [/gráfica|grafica/i, "print_shop"],
  [/odonto|dentista|sorriso/i, "dentist"],
  [/assist[êe]ncia|celular|tela/i, "electronics_store"],
  [/hortifruti|mercearia|quitanda|feira/i, "grocery_or_supermarket"],
  [/salão|salao|beleza|cabelo/i, "beauty_salon"],
  [/^bar\b|boteco|petisc/i, "bar"],
  [/cantina|restaurante|rotisseria/i, "restaurant"],
];

function themeFromName(name: string): CategoryTheme | undefined {
  for (const [pattern, key] of NAME_HINTS) {
    if (pattern.test(name)) {
      return THEMES.find((theme) => theme.key === key);
    }
  }
  return undefined;
}

export { DEFAULT_THEME, THEMES };
