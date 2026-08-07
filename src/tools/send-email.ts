import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import nodemailer from "nodemailer";

import { config, isSmtpConfigured } from "../config.js";

const attachmentSchema = z.object({
  filename: z.string().min(1),
  contentBase64: z.string().min(1),
  contentType: z.string().optional(),
});

export function registerSendEmailTool(server: McpServer): void {
  server.registerTool(
    "send_email",
    {
      title: "Enviar e-mail",
      description:
        "Envia um e-mail via SMTP configurado no servidor. Use para notificar o usuário ao final de um lote (ex: resumo de mockups gerados), com anexos opcionais em base64 (ex: imagens).",
      inputSchema: {
        to: z.string().min(1).describe("Destinatário(s). Um e-mail ou vários separados por vírgula."),
        subject: z.string().min(1).describe("Assunto do e-mail."),
        text: z.string().optional().describe("Corpo em texto simples."),
        html: z.string().optional().describe("Corpo em HTML (opcional). Informe 'text' e/ou 'html'."),
        attachments: z
          .array(attachmentSchema)
          .optional()
          .describe("Anexos, cada um com filename, contentBase64 e contentType opcional (ex: image/png)."),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ to, subject, text, html, attachments }) => {
      if (!isSmtpConfigured()) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Envio de e-mail não configurado no servidor. Defina SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM.",
            },
          ],
        };
      }

      if (!text && !html) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Informe 'text' ou 'html' com o corpo do e-mail." }],
        };
      }

      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });

      try {
        const info = await transporter.sendMail({
          from: config.smtp.from,
          to,
          subject,
          text,
          html,
          attachments: attachments?.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.contentBase64, "base64"),
            contentType: att.contentType,
          })),
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `E-mail enviado com sucesso para ${to} (messageId: ${info.messageId}).`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Falha ao enviar e-mail: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
