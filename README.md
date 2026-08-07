# scrappPages

Servidor MCP (Model Context Protocol) remoto, em Node.js + TypeScript, que expõe três ferramentas:

- `generate_mockup_image` — prepara um prompt pronto de mockup de UI (tela web/mobile) a partir de uma descrição em texto.
- `read_spreadsheet_data` — baixa e lê uma planilha (CSV ou XLSX) a partir de uma URL pública, retornando as linhas como JSON.
- `send_email` — envia um e-mail via SMTP, com anexos opcionais em base64 (ex: imagens de mockup geradas).

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
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Opcionais, só necessários para usar a tool `send_email`. Sem eles configurados, a tool responde com erro explicando o que falta — o resto do servidor funciona normalmente. |

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

### `generate_mockup_image`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `description` | string | sim | O que a tela/componente deve mostrar. |
| `platform` | `web` \| `mobile` \| `desktop` \| `tablet` | não | Plataforma alvo (padrão `web`). |
| `styleNotes` | string | não | Paleta, tipografia, tom visual, referências de marca. |
| `aspectRatio` | `square` \| `landscape` \| `portrait` | não | Proporção sugerida para a imagem (padrão `landscape`). |

Retorna um texto com o prompt final pronto e a instrução para o cliente gerar a imagem imediatamente.

### `read_spreadsheet_data`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `url` | string | sim | URL pública do arquivo CSV ou XLSX (ex: link de exportação CSV do Google Sheets). |
| `sheetName` | string | não | Aba a ler em arquivos XLSX com múltiplas abas. Padrão: primeira aba. |

Baixa o arquivo, detecta CSV ou XLSX pela URL/content-type e devolve as linhas (cabeçalho na primeira linha) como JSON, limitado a 500 linhas.

### `send_email`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `to` | string | sim | Destinatário(s), um e-mail ou vários separados por vírgula. |
| `subject` | string | sim | Assunto do e-mail. |
| `text` / `html` | string | ao menos um | Corpo do e-mail. |
| `attachments` | array | não | Lista de `{ filename, contentBase64, contentType? }`. |

Envia via SMTP usando as credenciais do `.env`. Se `SMTP_*` não estiver configurado, a tool responde com erro em vez de falhar o servidor.
