# scrappPages

Servidor MCP (Model Context Protocol) remoto, em Node.js + TypeScript, que expõe uma única ferramenta — `generate_mockup_image` — para preparar um prompt pronto de mockup de UI (tela web/mobile) a partir de uma descrição em texto.

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

A automação de ponta a ponta (usuário pede → ChatGPT chama a ferramenta → ChatGPT gera a imagem sozinho) depende do modelo seguir a instrução devolvida pela ferramenta. Isso não é garantido pelo protocolo MCP (que só permite cliente→servidor, sem o servidor "acionar" a geração do cliente), mas modelos GPT-4/5-class costumam encadear a chamada de geração de imagem de forma consistente logo após receber o prompt pronto.

## Ferramenta exposta

### `generate_mockup_image`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `description` | string | sim | O que a tela/componente deve mostrar. |
| `platform` | `web` \| `mobile` \| `desktop` \| `tablet` | não | Plataforma alvo (padrão `web`). |
| `styleNotes` | string | não | Paleta, tipografia, tom visual, referências de marca. |
| `aspectRatio` | `square` \| `landscape` \| `portrait` | não | Proporção sugerida para a imagem (padrão `landscape`). |

Retorna um texto com o prompt final pronto e a instrução para o cliente gerar a imagem imediatamente.
