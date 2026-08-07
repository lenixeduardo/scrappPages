import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  mcpSharedSecret: required("MCP_SHARED_SECRET"),
  openaiApiKey: required("OPENAI_API_KEY"),
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
};
