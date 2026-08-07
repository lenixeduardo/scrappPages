# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A remote MCP (Model Context Protocol) server in Node.js + TypeScript that exposes a single tool, `generate_mockup_image`. The server does **not** generate images itself — it only assembles a well-structured prompt and instructs the MCP client (e.g. ChatGPT) to generate the image immediately using the client's own native image generation. This keeps the server free of image-API costs/keys.

Meant to be connected as a **remote connector in ChatGPT** (Developer Mode / Connectors), but speaks standard MCP over Streamable HTTP, so any compatible MCP client works.

## Commands

```sh
npm run dev      # tsx watch src/server.ts — hot-reload dev server
npm run build     # tsc -p tsconfig.json — compiles src/ to dist/
npm start         # node dist/server.js — run compiled build
```

There is no test suite or linter configured in this repo.

Local setup: `cp .env.example .env` and fill in `MCP_SHARED_SECRET` (generate with `openssl rand -hex 32`). `PORT`/`HOST` default to `3000`/`0.0.0.0`.

Health check: `curl http://localhost:3000/health`.

## Architecture

Three files under `src/`:

- **`config.ts`** — loads env vars via `dotenv`; throws at startup if `MCP_SHARED_SECRET` is missing (`required()` helper).
- **`server.ts`** — Express app entry point. Builds a fresh `McpServer` instance per request (no session state carried between HTTP calls — `sessionIdGenerator: undefined`). Registers tools via `registerGenerateMockupImageTool`. Routes:
  - `GET /health` — no auth, returns `{status:"ok"}`.
  - `POST /mcp` — the MCP Streamable HTTP transport endpoint; requires auth.
  - `GET /mcp`, `DELETE /mcp` — return 405, MCP method not allowed.
  - `requireSharedSecret` middleware enforces `Authorization: Bearer <MCP_SHARED_SECRET>` on all `/mcp` routes, responding with a JSON-RPC-shaped 401 on mismatch.
- **`tools/generate-mockup-image.ts`** — defines and registers the one MCP tool. `buildPrompt()` assembles a prompt string from `description`, `platform` (default `web`), `styleNotes`, and `aspectRatio` (default `landscape`). The tool's returned text explicitly instructs the calling model to generate the image immediately without echoing the prompt back to the user first — this directive-in-response-text is the mechanism used to chain client-side image generation, since MCP itself has no server→client "trigger generation" primitive.

Each `/mcp` POST creates a new `McpServer` + `StreamableHTTPServerTransport`, connects them, handles the single request, and tears both down on response `close` — this is a stateless-per-request design, not a persistent session server.

## Deployment

`render.yaml` defines a Render Blueprint (free tier, Oregon region): `npm install && npm run build` to build, `npm start` to run, health check at `/health`. `MCP_SHARED_SECRET` is a Render secret (`sync: false`), set manually in the dashboard.
