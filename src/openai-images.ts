import { config } from "./config.js";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

interface OpenAiImagesResponse {
  data?: { b64_json?: string }[];
  error?: { message?: string };
}

export async function generateImages(params: {
  prompt: string;
  size: ImageSize;
  n: number;
}): Promise<GeneratedImage[]> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openaiImageModel,
      prompt: params.prompt,
      size: params.size,
      n: params.n,
    }),
  });

  const body = (await response.json()) as OpenAiImagesResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Falha ao gerar imagem (HTTP ${response.status}).`);
  }

  const images = body.data ?? [];
  if (images.length === 0) {
    throw new Error("A API de imagens não retornou nenhum resultado.");
  }

  return images.map((image) => {
    if (!image.b64_json) {
      throw new Error("A API de imagens retornou um resultado sem dados de imagem.");
    }
    return { base64: image.b64_json, mimeType: "image/png" };
  });
}
