import { existsSync } from "node:fs";
import path from "node:path";

import type { Browser, BrowserContext, Page } from "playwright-core";

import type { BusinessLead } from "../types/lead.js";
import {
  buildMockupHtml,
  MOCKUP_HEIGHT,
  MOCKUP_WIDTH,
  type MockupOptions,
} from "./mockup-template.js";

/** Escala dos thumbnails usados na folha de contato. */
const THUMB_SCALE = 0.35;

/** Erro de ambiente sem Chromium, para o tool MCP degradar com elegância. */
export class ChromiumUnavailableError extends Error {
  constructor(cause: string) {
    super(
      `Não há Chromium disponível para rasterizar o mockup (${cause}). ` +
        "Instale com 'npx playwright install chromium' ou aponte CHROMIUM_EXECUTABLE_PATH para um binário existente. " +
        "Sem Chromium ainda é possível obter o HTML do mockup e abri-lo no navegador.",
    );
    this.name = "ChromiumUnavailableError";
  }
}

/**
 * Descobre o executável do Chromium. Respeita CHROMIUM_EXECUTABLE_PATH e o
 * layout do PLAYWRIGHT_BROWSERS_PATH; `undefined` deixa o playwright-core
 * resolver o caminho padrão dele.
 */
export function resolveChromiumPath(): string | undefined {
  const explicit = process.env.CHROMIUM_EXECUTABLE_PATH;
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new ChromiumUnavailableError(
        `CHROMIUM_EXECUTABLE_PATH aponta para ${explicit}, que não existe`,
      );
    }
    return explicit;
  }

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsersPath) {
    const candidate = path.join(browsersPath, "chromium");
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

export interface RenderOptions extends MockupOptions {
  /** Altura do viewport. Padrão: 800 (a dobra do mockup). */
  height?: number;
  /** Formato do bitmap. Padrão: png. */
  format?: "png" | "jpeg";
  /** Qualidade do JPEG (1-100). Ignorado em PNG. Padrão: 82. */
  quality?: number;
}

/**
 * Sessão de render: um único Chromium reaproveitado entre vários leads.
 * Subir o browser custa ~300ms, então renderizar 20 mockups com uma instância
 * só é bem mais rápido do que abrir e fechar por lead.
 */
export class RenderSession {
  private constructor(
    private readonly browser: Browser,
    private readonly full: BrowserContext,
    private readonly thumbs: BrowserContext,
  ) {}

  static async open(): Promise<RenderSession> {
    let chromium: typeof import("playwright-core").chromium;
    try {
      ({ chromium } = await import("playwright-core"));
    } catch {
      throw new ChromiumUnavailableError("o pacote 'playwright-core' não está instalado");
    }

    const executablePath = resolveChromiumPath();
    let browser: Browser;
    try {
      browser = await chromium.launch({
        executablePath,
        args: [
          // O container roda como root: sem --no-sandbox o Chromium não sobe.
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--hide-scrollbars",
          "--force-color-profile=srgb",
          "--font-render-hinting=none",
        ],
      });
    } catch (error) {
      throw new ChromiumUnavailableError(error instanceof Error ? error.message : String(error));
    }

    const common = {
      viewport: { width: MOCKUP_WIDTH, height: MOCKUP_HEIGHT },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      colorScheme: "light" as const,
      reducedMotion: "reduce" as const,
    };

    return new RenderSession(
      browser,
      await browser.newContext({ ...common, deviceScaleFactor: 1 }),
      await browser.newContext({ ...common, deviceScaleFactor: THUMB_SCALE }),
    );
  }

  /** Bitmap do mockup de um lead, em 1280x800. */
  async renderLead(lead: BusinessLead, options: RenderOptions = {}): Promise<Buffer> {
    return this.shot(this.full, buildMockupHtml(lead, options), options);
  }

  /** Versão reduzida do mesmo mockup, para montar a folha de contato. */
  async renderLeadThumb(lead: BusinessLead, options: RenderOptions = {}): Promise<Buffer> {
    return this.shot(this.thumbs, buildMockupHtml(lead, options), options);
  }

  /** Bitmap de um HTML arbitrário — usado pela folha de contato, que é mais alta. */
  async renderHtml(
    html: string,
    options: RenderOptions & { fullPage?: boolean } = {},
  ): Promise<Buffer> {
    return this.shot(this.full, html, options);
  }

  private async shot(
    context: BrowserContext,
    html: string,
    options: RenderOptions & { fullPage?: boolean },
  ): Promise<Buffer> {
    const page: Page = await context.newPage();
    try {
      await page.setViewportSize({ width: MOCKUP_WIDTH, height: options.height ?? MOCKUP_HEIGHT });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const format = options.format ?? "png";
      return await page.screenshot({
        fullPage: options.fullPage ?? false,
        ...(format === "jpeg"
          ? { type: "jpeg" as const, quality: options.quality ?? 82 }
          : { type: "png" as const }),
      });
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}

/** Verifica se dá para rasterizar neste ambiente, sem lançar exceção. */
export async function probeRenderer(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const session = await RenderSession.open();
    await session.close();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Renderiza um único lead abrindo e fechando o browser. Use RenderSession para lotes. */
export async function renderMockupPng(
  lead: BusinessLead,
  options: RenderOptions = {},
): Promise<Buffer> {
  const session = await RenderSession.open();
  try {
    return await session.renderLead(lead, options);
  } finally {
    await session.close();
  }
}
