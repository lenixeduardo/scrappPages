import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";

const MAX_ROWS = 500;

function looksLikeXlsx(url: string, contentType: string | null): boolean {
  if (contentType?.includes("spreadsheetml") || contentType?.includes("ms-excel")) return true;
  return /\.xlsx?(\?|$)/i.test(url);
}

function rowsFromCsv(buffer: Buffer): Record<string, string>[] {
  return parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
}

async function rowsFromXlsx(
  buffer: Buffer,
  sheetName: string | undefined,
): Promise<{ rows: Record<string, unknown>[]; sheetName: string; availableSheets: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  const availableSheets = workbook.worksheets.map((sheet) => sheet.name);

  if (!worksheet) {
    return { rows: [], sheetName: sheetName ?? "", availableSheets };
  }

  const headerRow = worksheet.getRow(1).values as unknown[];
  const headers = headerRow.slice(1).map((value, index) => (value != null ? String(value) : `col${index + 1}`));

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as unknown[];
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = values[index + 1] ?? "";
    });
    rows.push(record);
  });

  return { rows, sheetName: worksheet.name, availableSheets };
}

export function registerReadSpreadsheetTool(server: McpServer): void {
  server.registerTool(
    "read_spreadsheet_data",
    {
      title: "Ler dados de planilha",
      description:
        "Baixa e lê uma planilha (CSV ou XLSX) a partir de uma URL pública e retorna as linhas como JSON, usando a primeira linha como cabeçalho. Para Google Sheets, use o link de exportação CSV (Arquivo > Compartilhar > Publicar na web, ou .../export?format=csv&gid=0).",
      inputSchema: {
        url: z
          .string()
          .url()
          .describe("URL pública do arquivo CSV ou XLSX (ex: link de exportação do Google Sheets)."),
        sheetName: z
          .string()
          .optional()
          .describe("Nome da aba a ler, para arquivos XLSX com múltiplas abas. Padrão: primeira aba."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ url, sheetName }) => {
      let response: Response;
      try {
        response = await fetch(url);
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Falha ao baixar a planilha: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Falha ao baixar a planilha: HTTP ${response.status}.` }],
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type");

      try {
        let rows: Record<string, unknown>[];
        let usedSheetName = "csv";

        if (looksLikeXlsx(url, contentType)) {
          const result = await rowsFromXlsx(buffer, sheetName);
          if (result.rows.length === 0 && sheetName && !result.availableSheets.includes(sheetName)) {
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `Aba "${sheetName}" não encontrada. Abas disponíveis: ${result.availableSheets.join(", ")}.`,
                },
              ],
            };
          }
          rows = result.rows;
          usedSheetName = result.sheetName;
        } else {
          rows = rowsFromCsv(buffer);
        }

        const truncated = rows.length > MAX_ROWS;
        const limitedRows = rows.slice(0, MAX_ROWS);

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Planilha lida: aba "${usedSheetName}", ${rows.length} linha(s)${
                  truncated ? ` (retornando as primeiras ${MAX_ROWS})` : ""
                }.`,
                JSON.stringify(limitedRows, null, 2),
              ].join("\n\n"),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Não foi possível interpretar o arquivo como CSV/XLSX: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
