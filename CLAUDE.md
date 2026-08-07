# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A remote MCP (Model Context Protocol) server in Node.js + TypeScript that exposes three tools:

- `generate_mockup_image` — the server does **not** generate images itself, it only assembles a well-structured prompt and instructs the MCP client (e.g. ChatGPT) to generate the image immediately using the client's own native image generation. This keeps the server free of image-API costs/keys.
- `read_spreadsheet_data` — fetches a CSV or XLSX file from a public URL and returns its rows as JSON.
- `send_email` — sends an email via SMTP, with optional base64 attachments.

Meant to be connected as a **remote connector in ChatGPT** (Developer Mode / Connectors), but speaks standard MCP over Streamable HTTP, so any compatible MCP client works.

## Commands

```sh
npm run dev      # tsx watch src/server.ts — hot-reload dev server
npm run build     # tsc -p tsconfig.json — compiles src/ to dist/
npm start         # node dist/server.js — run compiled build
```

There is no test suite or linter configured in this repo.

Local setup: `cp .env.example .env` and fill in `MCP_SHARED_SECRET` (generate with `openssl rand -hex 32`). `PORT`/`HOST` default to `3000`/`0.0.0.0`. `SMTP_*` vars are optional — only needed for `send_email`; when unset, that tool returns a clean tool-level error instead of failing server startup (see `isSmtpConfigured()` in `config.ts`).

Health check: `curl http://localhost:3000/health`.

## Architecture

Under `src/`:

- **`config.ts`** — loads env vars via `dotenv`; throws at startup if `MCP_SHARED_SECRET` is missing (`required()` helper). SMTP settings are read with an `optional()` helper into `config.smtp` and are **not** required at startup; `isSmtpConfigured()` checks whether host/user/pass/from are all present, used by `send_email` to fail gracefully at call-time instead of crashing the process.
- **`server.ts`** — Express app entry point. Builds a fresh `McpServer` instance per request (no session state carried between HTTP calls — `sessionIdGenerator: undefined`). Registers all three tools. Routes:
  - `GET /health` — no auth, returns `{status:"ok"}`.
  - `POST /mcp` — the MCP Streamable HTTP transport endpoint; requires auth.
  - `GET /mcp`, `DELETE /mcp` — return 405, MCP method not allowed.
  - `requireSharedSecret` middleware enforces `Authorization: Bearer <MCP_SHARED_SECRET>` on all `/mcp` routes, responding with a JSON-RPC-shaped 401 on mismatch.
- **`tools/generate-mockup-image.ts`** — `buildPrompt()` assembles a prompt string from `description`, `platform` (default `web`), `styleNotes`, and `aspectRatio` (default `landscape`). The tool's returned text explicitly instructs the calling model to generate the image immediately without echoing the prompt back to the user first — this directive-in-response-text is the mechanism used to chain client-side image generation, since MCP itself has no server→client "trigger generation" primitive.
- **`tools/read-spreadsheet.ts`** — fetches a URL, sniffs CSV vs. XLSX from the URL/content-type (`looksLikeXlsx()`), and parses with `csv-parse/sync` or `exceljs` accordingly. Returns rows as JSON text (header row as keys), capped at `MAX_ROWS` (500) with a truncation note. All failure modes (fetch error, non-2xx, unparseable file, missing sheet) return `isError: true` tool results rather than throwing.
- **`tools/send-email.ts`** — sends via `nodemailer.createTransport` built from `config.smtp` on every call (no cached transporter). Accepts `to`/`subject` plus `text` and/or `html`, and optional `attachments` (`{filename, contentBase64, contentType?}`, decoded with `Buffer.from(..., "base64")`). Returns `isError: true` if SMTP isn't configured or neither body field is set, rather than throwing.

Note: the `xlsx` (SheetJS) npm package was deliberately avoided for spreadsheet parsing — the npm-registry release has unpatched high-severity advisories (prototype pollution, ReDoS) with no fix published to npm. Use `exceljs` for XLSX and `csv-parse` for CSV instead.

Each `/mcp` POST creates a new `McpServer` + `StreamableHTTPServerTransport`, connects them, handles the single request, and tears both down on response `close` — this is a stateless-per-request design, not a persistent session server.

## Deployment

`render.yaml` defines a Render Blueprint (free tier, Oregon region): `npm install && npm run build` to build, `npm start` to run, health check at `/health`. `MCP_SHARED_SECRET` is a Render secret (`sync: false`), set manually in the dashboard.
