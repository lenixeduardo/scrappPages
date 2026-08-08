/**
 * Teste de fluxo completo: extração de leads -> geração de imagem.
 *
 *   npm run fluxo:teste          # usa a fixture simulada (não precisa de chave)
 *   npm run fluxo:teste -- --real  # usa a Google Places API de verdade
 *
 * Os dois modos passam pelo MESMO caminho de código de extração
 * (`extractLeadsWithoutWebsite`); o que muda é só a camada de HTTP injetada.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { config } from "../src/config.js";
import {
  createFixturePlacesFetch,
  FIXTURE_DISCLAIMER,
  FIXTURE_LOCATION,
} from "../src/fixtures/places-paulista.js";
import { buildContactSheetHtml, type SheetItem } from "../src/render/contact-sheet.js";
import { renderLeadPage } from "../src/pipeline/lead-page.js";
import { type LeadImagePrompt } from "../src/render/lead-prompt.js";
import { RenderSession } from "../src/render/render-png.js";
import { themeForLead } from "../src/render/theme.js";
import {
  extractLeadsWithoutWebsite,
  type PlacesDeps,
} from "../src/tools/scrape-businesses-without-website.js";
import type { BusinessLead } from "../src/types/lead.js";

/** Abaixo disso um PNG é quase certamente uma página em branco. */
const MIN_PNG_BYTES = 5_000;

/** Meta do teste de fluxo: pelo menos 20 leads sem site. */
const MIN_EXPECTED_LEADS = 20;

interface Args {
  real: boolean;
  limit: number;
  outDir: string;
  htmlDir: string;
  promptsDir: string;
  samplesDir: string;
  samples: number;
  html: boolean;
  prompts: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined =>
    argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];

  const outDir = path.resolve(get("out") ?? "out/mockups");

  return {
    real: argv.includes("--real"),
    // 24 analisados, porque 4 da fixture têm site e são descartados pelo filtro:
    // o resultado é exatamente 20 leads, com o filtro de fato exercitado.
    limit: Number(get("limit") ?? 24),
    outDir,
    htmlDir: path.resolve(get("html-out") ?? path.join(outDir, "html")),
    promptsDir: path.resolve(get("prompts-out") ?? path.join(outDir, "prompts")),
    samplesDir: path.resolve(get("samples-dir") ?? "docs/exemplos"),
    samples: Number(get("samples") ?? 6),
    html: !argv.includes("--no-html"),
    prompts: !argv.includes("--no-prompts"),
  };
}

function banner(lines: string[], color: "red" | "green"): void {
  const code = color === "red" ? "\x1b[31m" : "\x1b[32m";
  const rule = "═".repeat(72);
  console.log(`${code}${rule}`);
  for (const line of lines) console.log(`  ${line}`);
  console.log(`${rule}\x1b[0m`);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function maskKey(key: string): string {
  return key.length <= 8 ? "****" : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // --- 1. modo de operação -------------------------------------------------
  if (args.real && !config.googleMapsApiKey) {
    banner(
      [
        "ERRO: --real exige GOOGLE_MAPS_API_KEY configurada.",
        "Configure a chave no .env ou rode sem --real para usar a fixture.",
      ],
      "red",
    );
    process.exitCode = 1;
    return;
  }

  const simulated = !args.real;
  const deps: PlacesDeps = simulated
    ? {
        apiKey: "FIXTURE",
        fetchImpl: createFixturePlacesFetch(),
        pageDelayMs: 0,
        source: "fixture",
      }
    : { apiKey: config.googleMapsApiKey! };

  if (simulated) {
    banner(
      [
        "MODO: DADOS SIMULADOS (FIXTURE)",
        FIXTURE_DISCLAIMER,
        "Origem: src/fixtures/places-paulista.ts",
        'Todo place_id começa com "FIXTURE_" e os telefones são fictícios.',
      ],
      "red",
    );
  } else {
    banner(
      [
        "MODO: GOOGLE PLACES (DADOS REAIS)",
        `Chave: ${maskKey(config.googleMapsApiKey!)}`,
      ],
      "green",
    );
  }

  // --- 2. extração ---------------------------------------------------------
  console.log("\n▸ Extraindo leads...");
  const extraction = await extractLeadsWithoutWebsite(
    { location: simulated ? FIXTURE_LOCATION : undefined, maxResults: args.limit },
    deps,
  );

  console.log(
    `  Local: ${extraction.resolvedLocation} (raio ${extraction.radiusMeters}m)\n` +
      `  Analisados: ${extraction.analyzed} · ` +
      `Com site (descartados): ${extraction.withWebsite} · ` +
      `Sem detalhe: ${extraction.detailsFailed} · ` +
      `\x1b[1mLeads sem site: ${extraction.leads.length}\x1b[0m`,
  );

  if (extraction.leads.length === 0) {
    console.error("\n✗ Nenhum lead extraído — nada para renderizar.");
    process.exitCode = 1;
    return;
  }
  if (extraction.leads.length < MIN_EXPECTED_LEADS) {
    console.warn(
      `\n⚠ Foram extraídos ${extraction.leads.length} leads, menos que os ${MIN_EXPECTED_LEADS} esperados. ` +
        "Aumente --limit ou o raio da busca.",
    );
  }

  // --- 3. renderização -----------------------------------------------------
  await rm(args.outDir, { recursive: true, force: true });
  await mkdir(args.outDir, { recursive: true });
  if (args.html) await mkdir(args.htmlDir, { recursive: true });
  if (args.prompts) await mkdir(args.promptsDir, { recursive: true });

  console.log("\n▸ Rodando o pipeline por lead (análise → HTML + prompt → render)...");
  const session = await RenderSession.open();

  const rows: Array<Record<string, string | number>> = [];
  const sheetItems: SheetItem[] = [];
  const failures: Array<{ lead: BusinessLead; error: string }> = [];
  const promptEntries: Array<
    LeadImagePrompt & { index: number; lead: BusinessLead; themeLabel: string }
  > = [];

  try {
    for (const [position, lead] of extraction.leads.entries()) {
      const index = position + 1;

      try {
        // Um passe só: análise, HTML, prompt e imagem saem do mesmo tema.
        const page = await renderLeadPage(lead, session);
        const { analysis, image } = page;
        const baseName = `${String(index).padStart(2, "0")}-${slugify(lead.name)}-${analysis.themeKey}`;

        if (image.buffer.length < MIN_PNG_BYTES) {
          throw new Error(`PNG suspeito de página em branco (${image.buffer.length} bytes)`);
        }
        await writeFile(path.join(args.outDir, `${baseName}.png`), image.buffer);

        // O HTML que originou o PNG: é o que vira site de verdade quando o
        // lead fecha, e o que permite auditar de onde veio cada pixel.
        if (args.html) {
          await writeFile(path.join(args.htmlDir, `${baseName}.html`), page.html);
        }

        // O prompt do MESMO tema, para clientes MCP que geram a imagem com a
        // capacidade própria em vez de usar o Chromium.
        if (args.prompts) {
          promptEntries.push({ index, lead, themeLabel: analysis.themeLabel, ...page.prompt });
          await writeFile(path.join(args.promptsDir, `${baseName}.txt`), `${page.prompt.prompt}\n`);
        }

        sheetItems.push({
          index,
          lead,
          themeLabel: analysis.themeLabel,
          thumb: await session.renderLeadThumb(lead, { theme: analysis.theme }),
        });

        rows.push({
          "#": index,
          negócio: lead.name,
          tema: analysis.themeKey,
          "decidido por": `${analysis.matchedBy}${analysis.evidence ? `: ${analysis.evidence}` : ""}`,
          KB: Math.round(image.buffer.length / 1024),
          ms: page.elapsedMs,
        });
        console.log(
          `  [${String(index).padStart(2, "0")}/${extraction.leads.length}] ${lead.name.padEnd(38)} ` +
            `${analysis.themeKey.padEnd(24)} ${String(Math.round(image.buffer.length / 1024)).padStart(4)} KB  ${page.elapsedMs}ms`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ lead, error: message });
        console.error(`  [${String(index).padStart(2, "0")}] ✗ ${lead.name}: ${message}`);
      }
    }

    // --- 4. folha de contato ----------------------------------------------
    if (sheetItems.length > 0) {
      console.log("\n▸ Montando folha de contato...");
      const sheetHtml = buildContactSheetHtml(sheetItems, {
        simulated,
        generatedAt: new Date(),
        resolvedLocation: extraction.resolvedLocation,
        analyzed: extraction.analyzed,
        withWebsite: extraction.withWebsite,
      });
      const sheet = await session.renderHtml(sheetHtml, { fullPage: true });
      await writeFile(path.join(args.outDir, "00-indice.png"), sheet);
      console.log(`  00-indice.png · ${Math.round(sheet.length / 1024)} KB`);

      if (args.html) {
        await writeFile(path.join(args.htmlDir, "00-indice.html"), sheetHtml);
        console.log(
          `  ${sheetItems.length + 1} arquivos .html em ${path.relative(process.cwd(), args.htmlDir)}/`,
        );
      }

      // --- 5. amostras versionadas ------------------------------------------
      await rm(args.samplesDir, { recursive: true, force: true });
      await mkdir(args.samplesDir, { recursive: true });
      await writeFile(path.join(args.samplesDir, "00-indice.png"), sheet);

      const seenThemes = new Set<string>();
      let copied = 0;
      for (const item of sheetItems) {
        if (copied >= args.samples) break;
        const theme = themeForLead(item.lead);
        if (seenThemes.has(theme.key)) continue;
        seenThemes.add(theme.key);

        // JPEG nas amostras versionadas: mesma leitura visual, ~40% do peso no repo.
        const name = `${String(item.index).padStart(2, "0")}-${slugify(item.lead.name)}-${theme.key}.jpg`;
        await writeFile(
          path.join(args.samplesDir, name),
          await session.renderLead(item.lead, { format: "jpeg", quality: 88 }),
        );
        copied += 1;
      }
      console.log(`  ${copied} amostras + índice copiados para ${path.relative(process.cwd(), args.samplesDir)}/`);
    }

    // --- 6. prompts de geração de imagem -------------------------------------
    if (promptEntries.length > 0) {
      const doc = [
        "# Prompts de geração de imagem por lead",
        "",
        simulated
          ? `> ${FIXTURE_DISCLAIMER}`
          : "> Leads reais extraídos da Google Places API.",
        "",
        "Cada prompt abaixo é o que `generate_mockup_image` devolveria para o lead —",
        "o texto que um cliente MCP com geração de imagem própria (ex: ChatGPT) usa",
        "para produzir o mockup sem depender do Chromium.",
        "",
        ...promptEntries.flatMap((entry) => [
          `## ${String(entry.index).padStart(2, "0")} · ${entry.lead.name}`,
          "",
          `**Tema:** ${entry.themeLabel}`,
          "",
          "```text",
          entry.prompt,
          "```",
          "",
        ]),
      ].join("\n");

      console.log("\n▸ Montando prompts de geração de imagem...");
      await writeFile(path.join(args.promptsDir, "00-prompts.md"), doc);
      console.log(
        `  ${promptEntries.length} prompts (+ índice) em ${path.relative(process.cwd(), args.promptsDir)}/`,
      );
    }
  } finally {
    await session.close();
  }

  // --- 6. resumo -----------------------------------------------------------
  console.log("");
  console.table(rows);

  const totalKb = rows.reduce((sum, row) => sum + Number(row.KB), 0);
  console.log(
    `\nResumo: ${rows.length} mockups gerados · ${failures.length} falhas · ` +
      `${totalKb} KB no total · saída em ${path.relative(process.cwd(), args.outDir)}/`,
  );

  if (failures.length > 0) {
    console.error("\nFalhas:");
    for (const failure of failures) console.error(`  - ${failure.lead.name}: ${failure.error}`);
  }

  if (simulated) {
    console.log(
      "\n\x1b[31mLembrete: todos os leads acima são FICTÍCIOS. " +
        "Configure GOOGLE_MAPS_API_KEY e rode com --real para dados verdadeiros.\x1b[0m",
    );
  }

  process.exitCode = failures.length > 0 || rows.length < MIN_EXPECTED_LEADS ? 1 : 0;
}

await main();
