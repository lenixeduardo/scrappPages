import type { BusinessLead } from "../types/lead.js";
import { escapeHtml } from "./mockup-template.js";

export interface SheetItem {
  index: number;
  lead: BusinessLead;
  themeLabel: string;
  /** PNG reduzido do mockup, embutido como data URI. */
  thumb: Buffer;
}

export interface SheetMeta {
  simulated: boolean;
  generatedAt: Date;
  resolvedLocation: string;
  analyzed: number;
  withWebsite: number;
}

export const SHEET_WIDTH = 1280;

/**
 * Monta a folha de contato: todos os mockups em miniatura numa página só,
 * para validar as 20 gerações de uma olhada. Os thumbs entram como data URI,
 * então o HTML é autocontido e não depende dos arquivos em disco.
 */
export function buildContactSheetHtml(items: SheetItem[], meta: SheetMeta): string {
  const cells = items
    .map((item) => {
      const rating =
        item.lead.rating !== undefined ? ` · ★ ${item.lead.rating.toFixed(1)}` : "";
      return `
      <figure>
        <img src="data:image/png;base64,${item.thumb.toString("base64")}" alt="${escapeHtml(item.lead.name)}">
        <figcaption>
          <strong>${String(item.index).padStart(2, "0")} · ${escapeHtml(item.lead.name)}</strong>
          <span>${escapeHtml(item.themeLabel)}${rating}</span>
        </figcaption>
      </figure>`;
    })
    .join("");

  const banner = meta.simulated
    ? `<div class="banner">DADOS SIMULADOS · nenhuma chamada foi feita à Google Places API</div>`
    : `<div class="banner real">DADOS REAIS · Google Places API</div>`;

  const stamp = meta.generatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Índice de mockups gerados</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${SHEET_WIDTH}px; background: #10141A; color: #E7ECF2;
    font-family: "Liberation Sans", "DejaVu Sans", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased; padding-bottom: 30px;
  }
  header { padding: 26px 32px 18px; }
  header h1 { font-size: 23px; letter-spacing: -.5px; }
  header .meta { margin-top: 7px; font-size: 12.5px; color: #93A0AE; line-height: 1.7; }
  header .meta b { color: #E7ECF2; font-weight: 600; }
  .banner {
    margin: 14px 0 0; padding: 9px 14px; border-radius: 7px;
    background: rgba(200, 30, 30, .16); border: 1px solid rgba(220, 60, 60, .45);
    color: #FF9C9C; font-size: 11.5px; font-weight: 700; letter-spacing: 1px;
  }
  .banner.real {
    background: rgba(30, 160, 90, .14); border-color: rgba(50, 190, 110, .4); color: #7FE0A8;
  }
  .grid {
    padding: 22px 32px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px 18px;
  }
  figure { background: #1A1F26; border: 1px solid #262D36; border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; border-bottom: 1px solid #262D36; }
  figcaption { padding: 9px 11px 11px; display: flex; flex-direction: column; gap: 3px; }
  figcaption strong {
    font-size: 12px; font-weight: 600; line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  figcaption span { font-size: 10.5px; color: #8B97A5; }
</style>
</head>
<body>
  <header>
    <h1>Mockups gerados — ${items.length} leads sem site</h1>
    <div class="meta">
      Busca: <b>${escapeHtml(meta.resolvedLocation)}</b><br>
      Analisados: <b>${meta.analyzed}</b> · Descartados por já terem site: <b>${meta.withWebsite}</b> · Mockups gerados: <b>${items.length}</b><br>
      Gerado em ${escapeHtml(stamp)} · HTML + Chromium local, sem API paga de imagem
    </div>
    ${banner}
  </header>
  <div class="grid">${cells}</div>
</body>
</html>`;
}
