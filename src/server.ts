import type { NextFunction, Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { config } from "./config.js";
import { registerGenerateMockupImageTool } from "./tools/generate-mockup-image.js";
import { registerReadSpreadsheetTool } from "./tools/read-spreadsheet.js";
import { registerSendEmailTool } from "./tools/send-email.js";

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "scrapppages",
    version: "1.0.0",
  });

  registerGenerateMockupImageTool(server);
  registerReadSpreadsheetTool(server);
  registerSendEmailTool(server);

  return server;
}

function requireSharedSecret(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;

  if (token !== config.mcpSharedSecret) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Não autorizado. Envie Authorization: Bearer <chave>." },
      id: null,
    });
    return;
  }

  next();
}

const app = createMcpExpressApp({ host: config.host });

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/mcp", requireSharedSecret, async (req, res) => {
  const server = buildMcpServer();

  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Erro ao processar requisição MCP:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Erro interno do servidor." },
        id: null,
      });
    }
  }
});

app.get("/mcp", requireSharedSecret, (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
  );
});

app.delete("/mcp", requireSharedSecret, (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
  );
});

app.listen(config.port, () => {
  console.log(`Servidor MCP ouvindo em http://${config.host}:${config.port}/mcp`);
});

process.on("SIGINT", () => {
  process.exit(0);
});
