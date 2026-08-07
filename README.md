# scrappPages

Servidor MCP (Model Context Protocol) remoto, em Node.js + TypeScript, que expõe uma única ferramenta — `generate_mockup_image` — para gerar imagens de mockup de UI (telas web/mobile) a partir de uma descrição em texto, usando a API de imagens da OpenAI.

Pensado para ser conectado como um **connector remoto no ChatGPT**, mas fala o protocolo MCP padrão (Streamable HTTP), então funciona com qualquer cliente MCP compatível (Claude, Cursor, etc).

## Como funciona

- `POST /mcp` implementa o transporte Streamable HTTP do MCP, sem estado entre chamadas (cada requisição cria uma sessão nova).
- Toda chamada precisa do header `Authorization: Bearer <MCP_SHARED_SECRET>`. Sem isso, o servidor responde `401`.
- A ferramenta `generate_mockup_image` recebe uma descrição da tela, plataforma alvo, notas de estilo e tamanho/quantidade de imagens, monta um prompt e chama `POST https://api.openai.com/v1/images/generations` (modelo `gpt-image-1` por padrão). A imagem volta em base64 dentro do resultado da ferramenta.

## Configuração

```sh
cp .env.example .env
```

Preencha no `.env`:

| Variável | Descrição |
| --- | --- |
| `MCP_SHARED_SECRET` | Segredo que o cliente MCP deve enviar em todo request. Gere com `openssl rand -hex 32`. |
| `OPENAI_API_KEY` | Chave da API da OpenAI usada para gerar as imagens. |
| `OPENAI_IMAGE_MODEL` | Opcional. Padrão `gpt-image-1`. |
| `PORT` / `HOST` | Opcional. Padrão `3000` / `0.0.0.0`. |

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

## Expondo para o ChatGPT

O ChatGPT (via Developer Mode / Connectors) só alcança servidores MCP remotos publicados na internet — não um `localhost`. Faça o deploy do servidor (Railway, Render, Fly.io, um VPS, etc.) e configure o connector com:

- **URL do servidor:** `https://seu-dominio.com/mcp`
- **Autenticação:** o valor de `MCP_SHARED_SECRET` como Bearer token (o ChatGPT permite configurar um header/token fixo por connector).

## Ferramenta exposta

### `generate_mockup_image`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `description` | string | sim | O que a tela/componente deve mostrar. |
| `platform` | `web` \| `mobile` \| `desktop` \| `tablet` | não | Plataforma alvo (padrão `web`). |
| `styleNotes` | string | não | Paleta, tipografia, tom visual, referências de marca. |
| `size` | `1024x1024` \| `1536x1024` \| `1024x1536` \| `auto` | não | Dimensão da imagem (padrão `1536x1024`). |
| `count` | number (1–4) | não | Quantas variações gerar (padrão 1). |

Retorna o prompt final usado (texto) seguido de uma ou mais imagens em base64 (`image/png`).
