# scrappPages

Servidor MCP (Model Context Protocol) remoto, em Node.js + TypeScript, que expõe três ferramentas:

- `scrape_businesses_without_website` — busca comércios próximos a um endereço (padrão: Avenida Paulista, São Paulo) e retorna os que não têm site cadastrado no Google, como leads para venda de criação de sites.
- `render_lead_mockup` — **gera de verdade** a imagem (PNG/JPEG) de uma homepage de demonstração para um desses leads, renderizada localmente com HTML + Chromium.
- `generate_mockup_image` — prepara um prompt pronto de mockup de UI a partir de uma descrição em texto, para o cliente MCP gerar a imagem com a capacidade nativa dele.

**Sem custo de API de imagem.** As duas rotas de geração são gratuitas, por caminhos diferentes: `render_lead_mockup` rasteriza um template HTML no Chromium local (determinístico, sempre o mesmo resultado para o mesmo lead), e `generate_mockup_image` delega a geração ao cliente MCP (ex: a geração nativa do ChatGPT, coberta pela assinatura). Nenhuma chave de API de imagem é necessária.

Pensado para ser conectado como um **connector remoto no ChatGPT**, mas fala o protocolo MCP padrão (Streamable HTTP), então funciona com qualquer cliente MCP compatível.

## Como funciona

O produto é uma cadeia de quatro estágios, e o código está organizado nela (`src/pipeline/lead-page.ts`):

```
LEAD                ANÁLISE              COMPOSIÇÃO            RENDER
comércio sem   ->   escolhe o tema  ->   HTML + prompt    ->   Chromium
site                pelo nome/tipo       do mesmo tema         rasteriza
```

- **Análise** (`analyzeLead`) decide o tema pelo nome do negócio, com os `types` do Places como segunda opção e um tema genérico como fallback. A decisão é auditável: o resultado carrega `matchedBy` e a evidência que a motivou.
- **Composição** (`composeLeadPage`) produz o HTML **e** o prompt de geração de imagem no mesmo passe, a partir do mesmo objeto de tema. Não são caminhos paralelos que podem divergir: o prompt descreve literalmente a página que o HTML monta.
- **Render** (`renderLeadPage`) é o único estágio que precisa de navegador. Por isso os anteriores rodam em qualquer ambiente, e o `render_lead_mockup` consegue entregar HTML e prompt mesmo onde não há Chromium.

Sobre o transporte:

- `POST /mcp` implementa o Streamable HTTP do MCP, sem estado entre chamadas (cada requisição cria uma sessão nova).
- Toda chamada precisa do header `Authorization: Bearer <MCP_SHARED_SECRET>`. Sem isso, o servidor responde `401`.
- `scrape_businesses_without_website` devolve os leads em JSON estruturado (`structuredContent`), e cada lead alimenta uma chamada de `render_lead_mockup`, que roda os estágios 2 a 4 e devolve imagem, análise e prompt de uma vez.

## Configuração

```sh
cp .env.example .env
```

Preencha no `.env`:

| Variável | Descrição |
| --- | --- |
| `MCP_SHARED_SECRET` | Segredo que o cliente MCP deve enviar em todo request. Gere com `openssl rand -hex 32`. Obrigatório: o servidor não sobe sem ele. |
| `PORT` / `HOST` | Opcional. Padrão `3000` / `0.0.0.0`. |
| `GOOGLE_MAPS_API_KEY` | Necessária apenas para `scrape_businesses_without_website`. Chave da Google Cloud com **Places API** e **Geocoding API** habilitadas (e billing ativo — o Google exige cartão, mas dá cota gratuita mensal). |
| `CHROMIUM_EXECUTABLE_PATH` | Opcional. Caminho de um Chromium específico para o `render_lead_mockup`. Se vazio, o `playwright-core` resolve sozinho (respeitando `PLAYWRIGHT_BROWSERS_PATH`). |

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

Para gerar imagens localmente é preciso ter o Chromium do Playwright instalado uma vez:

```sh
npx playwright install chromium
```

## Teste de fluxo completo

O script `scripts/test-fluxo-completo.ts` roda a cadeia inteira — extração de leads → geração das imagens — e grava tudo em `out/mockups/`.

```sh
npm run fluxo:teste           # dados simulados, não precisa de chave nenhuma
npm run fluxo:teste:real      # extração real via Google Places API
```

Saída em `out/mockups/`:

| Arquivo | O que é |
| --- | --- |
| `NN-<slug>-<tema>.png` | O mockup renderizado, 1280x800, um por lead. |
| `html/NN-<slug>-<tema>.html` | O HTML autocontido que originou aquele PNG. |
| `prompts/NN-<slug>-<tema>.txt` | O prompt orientativo de geração de imagem daquele lead. |
| `prompts/00-prompts.md` | Os 20 prompts num documento só, com tema e nome do lead. |
| `00-indice.png` | Folha de contato com todas as miniaturas numa página só. |
| `html/00-indice.html` | O fonte da folha de contato. |

O HTML é o entregável tanto quanto a imagem: é ele que vira o site de verdade quando o lead fecha, e é ele que permite auditar de onde veio cada pixel. Cada arquivo é autocontido — sem webfont, CDN ou imagem externa —, então abre offline em qualquer navegador. Use `--no-html` para pular essa gravação.

Os **prompts** são a rota alternativa de geração: o mesmo mockup descrito em texto, no formato que `generate_mockup_image` devolve, para clientes MCP que preferem gerar a imagem com a capacidade nativa deles em vez de depender do Chromium. Saem do `buildLeadImagePrompt` (`src/render/lead-prompt.ts`), que reaproveita o `buildPrompt` do tool — um só lugar define o formato, então os dois caminhos nunca divergem. Use `--no-prompts` para pular.

No fim, uma tabela com tema escolhido, tamanho e tempo de cada mockup; o script sai com código 1 se algum render falhar ou se vierem menos de 20 leads.

Amostras versionadas ficam em [`docs/exemplos/`](docs/exemplos/).

Flags úteis: `--limit=24` (quantos estabelecimentos analisar), `--out=caminho`, `--html-out=caminho`, `--prompts-out=caminho`, `--no-html`, `--no-prompts`, `--samples=6`.

### Dados simulados

Sem `GOOGLE_MAPS_API_KEY`, o script usa a fixture de `src/fixtures/places-paulista.ts`: 24 estabelecimentos **fictícios** da região da Paulista, dos quais 4 têm site (para o filtro ter o que descartar) e 20 viram leads.

A fixture não é um atalho que pula a extração: ela injeta um `fetch` falso que responde aos três endpoints do Google, **inclusive a paginação por `next_page_token`**. Os dois modos passam pelo mesmo `extractLeadsWithoutWebsite`.

Três marcadores impedem confundir simulação com dado real:

1. todo `place_id` começa com `FIXTURE_` (o real do Google começa com `ChIJ`);
2. todo telefone está na faixa fictícia `(11) 5555-0xxx`;
3. todo lead sai com `source: "fixture"`, e as imagens saem carimbadas com `MOCKUP · DADOS SIMULADOS`.

O script também imprime um banner vermelho em toda execução simulada. **Não use a fixture para prospecção.**

## Deploy no Render (free tier)

O repo já tem um `render.yaml` (Blueprint) pronto. Passos:

1. No [Render](https://render.com), **New → Blueprint**, conecte este repositório GitHub (`lenixeduardo/scrappPages`).
2. O Render lê o `render.yaml` sozinho: plano `free`, build `npm install && npm run build`, start `npm start`, health check em `/health`.
3. Quando pedir o valor de `MCP_SHARED_SECRET` (fica marcado como secreto, não fica no repo), gere um com `openssl rand -hex 32` e cole.
4. Deploy. Ao terminar, o Render te dá uma URL tipo `https://scrapppages.onrender.com`.
5. Confirme que subiu: `curl https://scrapppages.onrender.com/health` → `{"status":"ok"}`.

**Sobre o free tier:** o serviço dorme após ~15 min sem receber requisição e leva uns 30-50s pra acordar na próxima chamada — normal e sem custo, só afeta a latência da primeira chamada depois de um tempo parado.

**O free tier não rasteriza imagem.** A dependência instalada é o `playwright-core` (8 MB, não baixa navegador nenhum), então o build passa normalmente — mas o binário do Chromium não existe lá, e os 512 MB de RAM do plano não comportariam um Chromium headless de qualquer forma. Nesse ambiente o `render_lead_mockup` **degrada**: em vez de erro, devolve o HTML completo do mockup, que abre em qualquer navegador. Para PNG em produção é preciso uma instância paga com Chromium instalado, ou um worker de render separado. Os outros dois tools funcionam igual no free tier.

## Expondo para o ChatGPT

O ChatGPT (via Developer Mode / Connectors) só alcança servidores MCP remotos publicados na internet — não um `localhost`. Depois do deploy, configure o connector com:

- **URL do servidor:** `https://scrapppages.onrender.com/mcp` (a URL que o Render te deu, com `/mcp` no final).
- **Autenticação:** o mesmo valor de `MCP_SHARED_SECRET` como Bearer token (o ChatGPT permite configurar um header/token fixo por connector).

## Ferramentas expostas

### `scrape_businesses_without_website`

Usa a [Google Places API](https://developers.google.com/maps/documentation/places/web-service) (Nearby Search + Place Details) e a Geocoding API para localizar comércios físicos próximos a um endereço e filtrar apenas os que **não têm site cadastrado no Google**.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `location` | string | não | Endereço/região de referência. Padrão: `Avenida Paulista, São Paulo, Brasil`. |
| `radiusMeters` | number | não | Raio de busca em metros (máx. 5000). Padrão `1500`. |
| `type` | string | não | Tipo de estabelecimento do Google Places (ex: `restaurant`, `store`, `beauty_salon`). |
| `keyword` | string | não | Palavra-chave adicional (ex: `padaria`, `pet shop`). |
| `maxResults` | number | não | Máximo de estabelecimentos analisados (máx. 60). Padrão `20`. |

Retorna o texto legível de sempre **e** um `structuredContent` com `leads[]` (nome, endereço, telefone, avaliação, link do Maps, tipos) mais a contagem de analisados, descartados por já terem site e sem detalhe disponível. Requer `GOOGLE_MAPS_API_KEY`.

### `render_lead_mockup`

Roda os estágios 2 a 4 do pipeline num único call: analisa a categoria, compõe HTML e prompt, e rasteriza a imagem. O tema visual — paleta, textos, ícones — sai da categoria do negócio (padaria, barbearia, pet shop, ótica, floricultura, doceria, academia, chaveiro, e mais uma dúzia), com fallback genérico.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `businessName` | string | sim | Nome do estabelecimento. |
| `address` | string | não | Endereço completo. |
| `phone` | string | não | Telefone de contato. |
| `rating` | number | não | Nota do Google, de 0 a 5. |
| `userRatingsTotal` | number | não | Quantidade de avaliações. |
| `googleTypes` | string[] | não | Array `types` do Place Details, usado para escolher o tema. |
| `format` | `png` \| `jpeg` \| `html` | não | Padrão `png`. `html` devolve o código-fonte em vez da imagem. |
| `includePrompt` | boolean | não | Inclui o prompt de geração de imagem derivado do tema. Padrão `true`. |
| `watermark` | boolean | não | Carimba a imagem como dado simulado. Padrão `false`. |

Retorna três blocos: a `image` em base64, um texto com a análise (tema escolhido, por que foi escolhido, domínio sugerido, dimensões e tempo) e o prompt equivalente. PNGs acima de ~750 KB são reencodados em JPEG automaticamente, para não estourar o payload da resposta JSON-RPC.

O mockup usa **apenas dados reais do lead** — nome, endereço, telefone, avaliação do Google. Não inventa depoimento, ano de fundação nem preço: é uma peça que vai ser mostrada ao dono do negócio, e texto fabricado sobre ele custa credibilidade. O resto do conteúdo é copy genérica da categoria.

### `generate_mockup_image`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `description` | string | sim | O que a tela/componente deve mostrar. |
| `platform` | `web` \| `mobile` \| `desktop` \| `tablet` | não | Plataforma alvo (padrão `web`). |
| `styleNotes` | string | não | Paleta, tipografia, tom visual, referências de marca. |
| `aspectRatio` | `square` \| `landscape` \| `portrait` | não | Proporção sugerida (padrão `landscape`). |

Retorna um texto com o prompt final pronto e a instrução para o cliente gerar a imagem imediatamente. Diferente do `render_lead_mockup`, este tool não produz pixels — quem gera é o cliente MCP.

## Estrutura

```
src/
  config.ts                 variáveis de ambiente
  server.ts                 express + transporte MCP
  types/lead.ts             BusinessLead, o contrato entre extração e render
  pipeline/lead-page.ts     os 4 estágios: análise -> composição -> render
  fixtures/                 dados simulados + fetch falso do Google
  render/
    theme.ts                temas por categoria (paleta, copy, ícones)
    mockup-template.ts      HTML autocontido do mockup
    lead-prompt.ts          lead -> prompt de geração de imagem
    render-png.ts           Chromium via playwright-core
    contact-sheet.ts        folha de contato com todas as miniaturas
  tools/                    os três tools MCP
scripts/
  test-fluxo-completo.ts    extração -> imagens, ponta a ponta
docs/exemplos/              amostras versionadas
```
