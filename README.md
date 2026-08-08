# scrappPages

Servidor MCP (Model Context Protocol) remoto, em Node.js + TypeScript, que expõe duas ferramentas:

- `generate_mockup_image` — prepara um prompt pronto de mockup de UI (tela web/mobile) a partir de uma descrição em texto.
- `scrape_businesses_without_website` — busca comércios próximos a um endereço (padrão: Avenida Paulista, São Paulo) e retorna os que não têm site cadastrado no Google, como leads para venda de criação de sites.

**Sem custo de API de imagem.** O servidor não gera a imagem: ele só monta um prompt bem estruturado e instrui o cliente MCP a gerar a imagem imediatamente usando a própria capacidade de geração de imagem dele (ex: a geração nativa do ChatGPT, coberta pela assinatura). Pensado para ser conectado como um **connector remoto no ChatGPT**, mas fala o protocolo MCP padrão (Streamable HTTP), então funciona com qualquer cliente MCP compatível que tenha geração de imagem própria.

## Como funciona

- `POST /mcp` implementa o transporte Streamable HTTP do MCP, sem estado entre chamadas (cada requisição cria uma sessão nova).
- Toda chamada precisa do header `Authorization: Bearer <MCP_SHARED_SECRET>`. Sem isso, o servidor responde `401`.
- A ferramenta `generate_mockup_image` recebe uma descrição da tela, plataforma alvo, notas de estilo e proporção, monta um prompt e devolve como texto, junto com uma instrução diretiva pedindo para o cliente gerar a imagem na hora, sem confirmação extra.
- Quem gera os pixels de fato é o cliente MCP (ChatGPT), não este servidor — por isso não há chave de API de imagem nem cobrança por chamada aqui.

## Configuração

```sh
cp .env.example .env
```

Preencha no `.env`:

| Variável | Descrição |
| --- | --- |
| `MCP_SHARED_SECRET` | Segredo que o cliente MCP deve enviar em todo request. Gere com `openssl rand -hex 32`. |
| `PORT` / `HOST` | Opcional. Padrão `3000` / `0.0.0.0`. |
| `GOOGLE_MAPS_API_KEY` | Necessária apenas para `scrape_businesses_without_website`. Chave da Google Cloud com **Places API (New)** e **Geocoding API** habilitadas (e billing ativo — o Google exige cartão, mas dá cota gratuita mensal). |

> **Atenção:** tem que ser a **Places API (New)**, não a "Places API" legada. O Google congelou a API legada em 1º de março de 2025 e ela não pode mais ser ativada em projetos novos — uma chave criada hoje só funciona com a versão nova.

## Rodando localmente

```sh
npm install
npm run dev     # tsx watch, reinicia a cada mudança
```

Ou build + start:

```sh
npm run build
npm start
```

Verifique se subiu com `curl http://localhost:3000/health`.

## Deploy no Render (free tier)

O repo já tem um `render.yaml` (Blueprint) pronto. Passos:

1. No [Render](https://render.com), **New → Blueprint**, conecte este repositório GitHub (`lenixeduardo/scrappPages`).
2. O Render lê o `render.yaml` sozinho: plano `free`, build `npm install && npm run build`, start `npm start`, health check em `/health`.
3. Quando pedir o valor de `MCP_SHARED_SECRET` (fica marcado como secreto, não fica no repo), gere um com `openssl rand -hex 32` e cole.
4. Deploy. Ao terminar, o Render te dá uma URL tipo `https://scrapppages.onrender.com`.
5. Confirme que subiu: `curl https://scrapppages.onrender.com/health` → `{"status":"ok"}`.

**Sobre o free tier:** o serviço dorme após ~15 min sem receber requisição e leva uns 30-50s pra acordar na próxima chamada — normal e sem custo, só afeta a latência da primeira geração de mockup depois de um tempo parado.

## Expondo para o ChatGPT

O ChatGPT (via Developer Mode / Connectors) só alcança servidores MCP remotos publicados na internet — não um `localhost`. Depois do deploy, configure o connector com:

- **URL do servidor:** `https://scrapppages.onrender.com/mcp` (a URL que o Render te deu, com `/mcp` no final).
- **Autenticação:** o mesmo valor de `MCP_SHARED_SECRET` como Bearer token (o ChatGPT permite configurar um header/token fixo por connector).

A automação de ponta a ponta (usuário pede → ChatGPT chama a ferramenta → ChatGPT gera a imagem sozinho) depende do modelo seguir a instrução devolvida pela ferramenta. Isso não é garantido pelo protocolo MCP (que só permite cliente→servidor, sem o servidor "acionar" a geração do cliente), mas modelos GPT-4/5-class costumam encadear a chamada de geração de imagem de forma consistente logo após receber o prompt pronto.

## Ferramentas expostas

### `scrape_businesses_without_website`

Usa a **Places API (New)** (`places:searchText` / `places:searchNearby`) e a Geocoding API para localizar comércios físicos próximos a um endereço e devolver os que **não têm site próprio** — leads para oferecer criação de site.

Um lead entra na lista por um destes três motivos:

| Motivo | O que significa |
| --- | --- |
| `sem_site` | Não tem nenhum site cadastrado no Google. |
| `site_google_desativado` | O "site" é um `business.site`/`negocio.site`, o construtor grátis que o Google **desativou em 2024**. O link está morto e o dono já demonstrou que queria um site. |
| `so_rede_social` | O "site" é só Instagram, Facebook, Linktree, WhatsApp, iFood etc. |

Parâmetros:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `location` | string | não | Endereço/região de referência. Padrão: `Avenida Paulista, São Paulo, Brasil`. |
| `radiusMeters` | number | não | Raio de busca em metros (máx. 50000). Padrão `2000`. |
| `type` | string | não | Tipo do Google Places (ex: `restaurant`, `store`, `beauty_salon`). |
| `keyword` | string | não | Palavra-chave livre (ex: `padaria`, `pet shop`). Se omitida, varre automaticamente ~12 categorias de comércio de bairro. |
| `targetLeads` | number | não | **Quantos leads retornar** (máx. 60). Padrão `10`. A busca continua até atingir esse número. |
| `maxPlacesScanned` | number | não | Teto de estabelecimentos analisados, para limitar custo de API (máx. 400). Padrão `120`. |
| `includeSocialOnly` | boolean | não | Incluir quem só tem rede social como site. Padrão `true`. |
| `requirePhone` | boolean | não | Retornar só leads com telefone público. Padrão `false`. |

Retorna texto formatado **e** `structuredContent` com os leads em JSON. Os leads vêm ordenados por "contactabilidade" (tem telefone, quantidade de avaliações, nota), e comércios permanentemente fechados são descartados. Requer `GOOGLE_MAPS_API_KEY` (ver Configuração).

#### Testando pela linha de comando

Dá pra rodar a prospecção sem subir o servidor MCP:

```sh
npm run prospect -- --location "Avenida Paulista, São Paulo" --leads 10
npm run prospect -- --keyword "pet shop" --radius 3000 --leads 15 --csv
npm run prospect -- --location "Centro, Campinas" --leads 10 --json
```

Flags: `--location`, `--keyword`, `--type`, `--radius`, `--leads`, `--scan`, `--csv`, `--json`.

## Testes

```sh
npm test
```

Cobre a classificação de leads (sem site / site do Google morto / só rede social), os filtros de comércio fechado, deduplicação, ranqueamento e a exportação CSV.

### `generate_mockup_image`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `description` | string | sim | O que a tela/componente deve mostrar. |
| `platform` | `web` \| `mobile` \| `desktop` \| `tablet` | não | Plataforma alvo (padrão `web`). |
| `styleNotes` | string | não | Paleta, tipografia, tom visual, referências de marca. |
| `aspectRatio` | `square` \| `landscape` \| `portrait` | não | Proporção sugerida para a imagem (padrão `landscape`). |

Retorna um texto com o prompt final pronto e a instrução para o cliente gerar a imagem imediatamente.
