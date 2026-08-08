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
| `GOOGLE_MAPS_API_KEY` | Necessária apenas para `scrape_businesses_without_website`. Chave da Google Cloud com **Places API** e **Geocoding API** habilitadas (e billing ativo — o Google exige cartão, mas dá cota gratuita mensal). |

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

Usa a [Google Places API](https://developers.google.com/maps/documentation/places/web-service) (Nearby Search + Place Details) e a Geocoding API para localizar comércios físicos próximos a um endereço e filtrar apenas os que **não têm site cadastrado no Google** — úteis como leads para oferecer criação de site.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `location` | string | não | Endereço/região de referência. Padrão: `Avenida Paulista, São Paulo, Brasil`. |
| `radiusMeters` | number | não | Raio de busca em metros (máx. 5000). Padrão `1500`. |
| `type` | string | não | Tipo de estabelecimento do Google Places (ex: `restaurant`, `store`, `beauty_salon`). |
| `keyword` | string | não | Palavra-chave adicional (ex: `padaria`, `pet shop`). |
| `maxResults` | number | não | Máximo de estabelecimentos analisados (máx. 60). Padrão `20`. |

Retorna a lista de comércios sem site, com nome, endereço, telefone, avaliação e link do Google Maps. Requer `GOOGLE_MAPS_API_KEY` configurada (ver seção de Configuração acima).

### `generate_mockup_image`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `description` | string | sim | O que a tela/componente deve mostrar. |
| `platform` | `web` \| `mobile` \| `desktop` \| `tablet` \| `responsive` | não | Plataforma alvo (padrão `web`). `responsive` gera mobile + desktop do mesmo site na mesma imagem. |
| `styleNotes` | string | não | Paleta, tipografia, tom visual, referências de marca. Se omitido, usa a estética padrão de site de pequeno negócio brasileiro. |
| `aspectRatio` | `square` \| `landscape` \| `portrait` | não | Proporção sugerida para a imagem (padrão `landscape`). |
| `views` | `auto` \| `single` \| `mobile-and-desktop` | não | Quantas telas mostrar. Padrão `auto`: duas telas quando `platform = responsive`, uma só nos demais casos. |

Retorna um texto com o prompt final pronto e a instrução para o cliente gerar a imagem imediatamente.

#### Regras obrigatórias embutidas no prompt

O prompt montado não é só a descrição do usuário — ele já carrega as regras de layout que evitam os erros mais comuns de mockup gerado por IA:

- **Fluxo vertical de seções.** `HEADER → HERO → SEÇÃO 02 → SEÇÃO 03 → CTA/CONTATO → RODAPÉ`, cada seção ocupando a sua própria linha horizontal em largura total. Colunas só existem **dentro** de uma seção, nunca entre seções.
- **Proibição explícita do Hero lado a lado com a Seção 02.** Nada de Hero ocupando ~50% da largura com a próxima seção no outro lado, nem de conteúdo da Seção 02 preenchendo espaço vazio ao lado do Hero.
- **Estrutura do Hero.** O Hero ocupa 100% da largura como uma seção única; internamente usa duas colunas (texto/CTA/avaliação em 42-48% à esquerda, visual/informações do negócio em 52-58% à direita). A coluna direita é parte do Hero, não outra seção.
- **Transição de seção.** Quebra horizontal inequívoca entre Hero e Seção 02: novo espaçamento vertical, kicker/título próprio, container próprio e, opcionalmente, divisor ou mudança de fundo.
- **Ritmo visual.** Proíbe o padrão repetitivo `[ícone + título + descrição] × 3` e duas seções seguidas com três cards iguais; sugere composições editoriais/lista (ex: `SERVIÇO — DETALHES — PREÇO`) para a Seção 02.
- **Consistência responsiva** (quando há duas telas). Mesma marca, cores, tipografia, copy, ícones, botões e raio de borda nas duas; muda só grid, largura, navegação, escala tipográfica, espaçamento, empilhamento e densidade. No mobile, a ordem é `HEADER → TÍTULO → DESCRIÇÃO → CTA PRIMÁRIO → CTA SECUNDÁRIO → AVALIAÇÃO → VISUAL → INFORMAÇÕES DO NEGÓCIO → SEÇÃO 02 → …`, com a Seção 02 começando só depois que todo o conteúdo do Hero termina.

As regras de Hero são omitidas quando `platform = mobile` (tela única de celular), já que não há composição em duas colunas nesse caso.
