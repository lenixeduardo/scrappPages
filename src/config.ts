import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  mcpSharedSecret: process.env.MCP_SHARED_SECRET,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  chromiumExecutablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
};

/**
 * Segredo compartilhado do MCP. Continua sendo obrigatório para o servidor,
 * mas a checagem virou explícita: importar `config` não pode derrubar scripts
 * (como o de teste de fluxo) que nem falam com o transporte MCP.
 */
export function requireMcpSharedSecret(): string {
  if (!config.mcpSharedSecret) {
    throw new Error("Variável de ambiente MCP_SHARED_SECRET não configurada.");
  }
  return config.mcpSharedSecret;
}
