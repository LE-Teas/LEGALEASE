import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { EmailNotificationLog } from "@/lib/types/legal";

export interface SmtpImapConfig {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFromEmail: string;
  smtpFromName: string;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
}

export async function getSmtpAndImapConfig(): Promise<SmtpImapConfig> {
  const supabase = createAdminClient() ?? (await createClient());
  const map: Record<string, string> = {};

  if (supabase) {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "smtp_enabled",
        "smtp_host",
        "smtp_port",
        "smtp_secure",
        "smtp_user",
        "smtp_pass",
        "smtp_from_email",
        "smtp_from_name",
        "imap_enabled",
        "imap_host",
        "imap_port",
        "imap_user",
        "imap_pass",
      ]);

    for (const row of data ?? []) {
      map[row.key] = row.value;
    }
  }

  const smtpPort = Number(map.smtp_port || process.env.SMTP_PORT || 587);
  const imapPort = Number(map.imap_port || process.env.IMAP_PORT || 993);

  return {
    smtpEnabled:
      map.smtp_enabled === "true" ||
      (!map.smtp_enabled && Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)),
    smtpHost: map.smtp_host || process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : 587,
    smtpSecure: map.smtp_secure === "true" || smtpPort === 465,
    smtpUser: map.smtp_user || process.env.SMTP_USER || "",
    smtpPass: map.smtp_pass || process.env.SMTP_PASS || "",
    smtpFromEmail:
      map.smtp_from_email || process.env.SMTP_FROM_EMAIL || "notifications@legalease.pk",
    smtpFromName:
      map.smtp_from_name || process.env.SMTP_FROM_NAME || "LegalEase Notifications",
    imapEnabled:
      map.imap_enabled === "true" ||
      (!map.imap_enabled && Boolean(process.env.IMAP_USER && process.env.IMAP_PASS)),
    imapHost: map.imap_host || process.env.IMAP_HOST || "imap.gmail.com",
    imapPort: Number.isFinite(imapPort) ? imapPort : 993,
    imapUser: map.imap_user || process.env.IMAP_USER || map.smtp_user || "",
    imapPass: map.imap_pass || process.env.IMAP_PASS || map.smtp_pass || "",
  };
}

function buildHtmlTemplate(subject: string, textBody: string): string {
  const escapedLines = textBody
    .split("\n")
    .map((line) => `<p style="margin: 0 0 12px; color: #334155; font-size: 14px; line-height: 1.6;">${line}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="margin:0;padding:24px;background-color:#F8FAFC;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;">
    <div style="background:#0A2843;padding:20px 24px;border-bottom:3px solid #0CA275;">
      <h1 style="margin:0;color:#FFFFFF;font-size:18px;font-weight:700;">LegalEase Pakistan</h1>
      <p style="margin:4px 0 0;color:#94A3B8;font-size:12px;">Official Platform Notification</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#0F172A;font-size:16px;font-weight:700;">${subject}</h2>
      ${escapedLines}
    </div>
    <div style="padding:16px 24px;background:#F1F5F9;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">
      Sent by LegalEase Platform Notification Engine. Replies to this email are routed to our support inbox.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Low-level RFC 5321 SMTP client over Node.js net/tls supporting port 465 SSL and port 587 STARTTLS.
 */
async function transmitSmtpRaw(params: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { ok: boolean; error?: string }, sock?: net.Socket | tls.TLSSocket) => {
      if (settled) return;
      settled = true;
      try {
        sock?.destroy();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const timeoutMs = 8500;

    const runProtocol = (socket: net.Socket | tls.TLSSocket, isTls: boolean) => {
      let buffer = "";
      let waitResolve: ((line: string) => void) | null = null;
      let waitReject: ((err: Error) => void) | null = null;

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\r\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          // Wait until final line of response (e.g., "250 OK" with space at index 3, not hyphen "250-")
          if (line.length >= 3 && (line.length === 3 || line[3] === " ")) {
            const code = Number(line.slice(0, 3));
            if (waitResolve && waitReject) {
              const r = waitResolve;
              const j = waitReject;
              waitResolve = null;
              waitReject = null;
              if (code >= 400) {
                j(new Error(`SMTP ${line}`));
              } else {
                r(line);
              }
            }
          }
        }
      };

      socket.on("data", onData);
      socket.on("error", (err) => {
        if (waitReject) waitReject(err);
        finish({ ok: false, error: err.message }, socket);
      });

      const readResponse = () =>
        new Promise<string>((res, rej) => {
          waitResolve = res;
          waitReject = rej;
        });

      const sendCommand = async (cmd: string) => {
        socket.write(cmd + "\r\n");
        return readResponse();
      };

      (async () => {
        try {
          if (!isTls) {
            await readResponse(); // 220 banner
            await sendCommand(`EHLO legalease.pk`);
            if (params.port === 587 || !params.secure) {
              await sendCommand("STARTTLS");
              socket.removeListener("data", onData);
              const tlsSocket = tls.connect({
                socket,
                servername: params.host,
                rejectUnauthorized: false,
              });
              tlsSocket.setTimeout(timeoutMs, () =>
                finish({ ok: false, error: "SMTP TLS connection timed out" }, tlsSocket)
              );
              runProtocol(tlsSocket, true);
              return;
            }
          } else if (params.secure) {
            await readResponse(); // 220 banner on direct SSL 465
          }

          await sendCommand(`EHLO legalease.pk`);
          await sendCommand("AUTH LOGIN");
          await sendCommand(Buffer.from(params.user, "utf8").toString("base64"));
          await sendCommand(Buffer.from(params.pass, "utf8").toString("base64"));
          await sendCommand(`MAIL FROM:<${params.fromEmail}>`);
          await sendCommand(`RCPT TO:<${params.toEmail}>`);
          await sendCommand("DATA");

          const boundary = `----=_Part_${crypto.randomBytes(8).toString("hex")}`;
          const mimeMessage = [
            `From: "${params.fromName.replace(/"/g, "")}" <${params.fromEmail}>`,
            `To: <${params.toEmail}>`,
            `Subject: ${params.subject}`,
            `Message-ID: <${params.messageId}>`,
            `Date: ${new Date().toUTCString()}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            ``,
            params.text,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            ``,
            params.html,
            ``,
            `--${boundary}--`,
            `.`,
          ].join("\r\n");

          await sendCommand(mimeMessage);
          await sendCommand("QUIT");
          finish({ ok: true }, socket);
        } catch (err) {
          finish(
            { ok: false, error: err instanceof Error ? err.message : "SMTP error" },
            socket
          );
        }
      })();
    };

    try {
      const initialSocket = params.secure
        ? tls.connect({
            host: params.host,
            port: params.port,
            servername: params.host,
            rejectUnauthorized: false,
          })
        : net.createConnection({ host: params.host, port: params.port });

      initialSocket.setTimeout(timeoutMs, () =>
        finish({ ok: false, error: "SMTP connection timed out" }, initialSocket)
      );
      runProtocol(initialSocket, params.secure);
    } catch (err) {
      finish({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to initialize SMTP socket",
      });
    }
  });
}

export async function sendSmtpEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  userId?: string | null;
  notificationType?: string;
  metadata?: Record<string, unknown>;
  forceLiveSmtp?: boolean;
}): Promise<{
  success: boolean;
  status: "sent" | "failed" | "queued";
  deliveryMode: "smtp_live" | "local_outbox_log";
  error?: string;
  logId?: string;
}> {
  const config = await getSmtpAndImapConfig();
  const supabase = createAdminClient() ?? (await createClient());
  const htmlBody = options.html || buildHtmlTemplate(options.subject, options.text);
  const messageId = `${crypto.randomUUID()}@legalease.pk`;

  let status: "sent" | "failed" | "queued" = "sent";
  let deliveryMode: "smtp_live" | "local_outbox_log" = "local_outbox_log";
  let errorMessage: string | undefined;

  const hasLiveCredentials = Boolean(
    config.smtpHost && config.smtpUser && config.smtpPass
  );

  if ((config.smtpEnabled || options.forceLiveSmtp) && hasLiveCredentials) {
    deliveryMode = "smtp_live";
    const result = await transmitSmtpRaw({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      user: config.smtpUser,
      pass: config.smtpPass,
      fromEmail: config.smtpFromEmail || config.smtpUser,
      fromName: config.smtpFromName,
      toEmail: options.to,
      subject: options.subject,
      text: options.text,
      html: htmlBody,
      messageId,
    });

    if (!result.ok) {
      status = "failed";
      errorMessage = result.error || "SMTP delivery failed";
    }
  } else if (options.forceLiveSmtp && !hasLiveCredentials) {
    // Admin clicked "Send Test Email" before entering live SMTP credentials;
    // record in outbox log so they can preview the rendered email and see the notice.
    deliveryMode = "local_outbox_log";
    status = "sent";
  }

  let logId: string | undefined;
  if (supabase) {
    const { data } = await supabase
      .from("email_notification_logs")
      .insert({
        user_id: options.userId ?? null,
        direction: "outbound",
        from_email: config.smtpFromEmail || config.smtpUser || "notifications@legalease.pk",
        to_email: options.to,
        subject: options.subject,
        body_text: options.text,
        body_html: htmlBody,
        notification_type: options.notificationType || "general",
        status,
        error_message: errorMessage ?? null,
        message_id: messageId,
        metadata: {
          ...(options.metadata ?? {}),
          delivery_mode: deliveryMode,
          smtp_host: config.smtpHost,
        },
      })
      .select("id")
      .maybeSingle();

    logId = data?.id;
  }

  return {
    success: status === "sent",
    status,
    deliveryMode,
    error: errorMessage,
    logId,
  };
}

/**
 * Receives an inbound email (from webhook or IMAP sync), logs it in `email_notification_logs`,
 * and creates an in-app notification for platform administrators (and matched recipient user).
 */
export async function receiveInboundEmail(payload: {
  fromEmail: string;
  toEmail?: string;
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; logId?: string; error?: string }> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) {
    return { success: false, error: "Database unavailable" };
  }

  const config = await getSmtpAndImapConfig();
  const toEmail = payload.toEmail || config.smtpFromEmail || "support@legalease.pk";
  const msgId = payload.messageId || `${crypto.randomUUID()}@inbound.legalease.pk`;

  // Check if message_id already exists
  if (payload.messageId) {
    const { data: existing } = await supabase
      .from("email_notification_logs")
      .select("id")
      .eq("message_id", payload.messageId)
      .maybeSingle();
    if (existing?.id) {
      return { success: true, logId: existing.id };
    }
  }

  // Try matching sender to a known user profile
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .ilike("email", payload.fromEmail.trim())
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("email_notification_logs")
    .insert({
      user_id: senderProfile?.id ?? null,
      direction: "inbound",
      from_email: payload.fromEmail.trim(),
      to_email: toEmail,
      subject: payload.subject.trim() || "(No Subject)",
      body_text: payload.text,
      body_html: payload.html ?? null,
      notification_type: "inbound_email",
      status: "received",
      message_id: msgId,
      metadata: {
        ...(payload.metadata ?? {}),
        sender_name: senderProfile?.full_name ?? null,
        sender_role: senderProfile?.role ?? null,
      },
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  // Notify admins of new inbound email
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  for (const admin of admins ?? []) {
    await supabase.from("notifications").insert({
      user_id: admin.id,
      type: "inbound_email",
      title: `Inbound Email: ${payload.subject.slice(0, 60)}`,
      message: `From ${payload.fromEmail}: ${payload.text.slice(0, 140)}`,
      metadata: {
        email_log_id: inserted?.id,
        from_email: payload.fromEmail,
      },
    });
  }

  return { success: true, logId: inserted?.id };
}

/**
 * Connects to configured IMAP server over SSL (Port 993) to pull recent UNSEEN emails.
 */
export async function syncImapInboundEmails(): Promise<{
  success: boolean;
  fetchedCount: number;
  message: string;
}> {
  const config = await getSmtpAndImapConfig();
  if (!config.imapHost || !config.imapUser || !config.imapPass) {
    return {
      success: false,
      fetchedCount: 0,
      message:
        "IMAP credentials are not configured yet. Configure IMAP Host, User, and Password in Admin Settings or use the Inbound Email Webhook.",
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (
      res: { success: boolean; fetchedCount: number; message: string },
      sock?: tls.TLSSocket
    ) => {
      if (settled) return;
      settled = true;
      try {
        sock?.destroy();
      } catch {
        // ignore
      }
      resolve(res);
    };

    try {
      const socket = tls.connect({
        host: config.imapHost,
        port: config.imapPort,
        servername: config.imapHost,
        rejectUnauthorized: false,
      });

      socket.setTimeout(8000, () =>
        finish(
          { success: false, fetchedCount: 0, message: "IMAP connection timed out" },
          socket
        )
      );

      let step = 0;
      let buffer = "";

      socket.on("error", (err) => {
        finish(
          { success: false, fetchedCount: 0, message: `IMAP error: ${err.message}` },
          socket
        );
      });

      socket.on("data", async (chunk) => {
        buffer += chunk.toString("utf8");
        if (step === 0 && buffer.includes("OK")) {
          step = 1;
          buffer = "";
          socket.write(`A1 LOGIN "${config.imapUser}" "${config.imapPass}"\r\n`);
        } else if (step === 1 && buffer.includes("A1 ")) {
          if (!buffer.includes("A1 OK")) {
            finish(
              { success: false, fetchedCount: 0, message: "IMAP login failed" },
              socket
            );
            return;
          }
          step = 2;
          buffer = "";
          socket.write(`A2 SELECT INBOX\r\n`);
        } else if (step === 2 && buffer.includes("A2 ")) {
          step = 3;
          buffer = "";
          socket.write(`A3 SEARCH UNSEEN\r\n`);
        } else if (step === 3 && buffer.includes("A3 ")) {
          const searchLine = buffer
            .split("\r\n")
            .find((l) => l.startsWith("* SEARCH"));
          const ids = searchLine
            ? searchLine
                .replace("* SEARCH", "")
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(-5)
            : [];
          step = 4;
          buffer = "";
          socket.write(`A4 LOGOUT\r\n`);
          finish(
            {
              success: true,
              fetchedCount: ids.length,
              message:
                ids.length > 0
                  ? `Connected to ${config.imapHost} (${ids.length} unseen messages found).`
                  : `Connected to ${config.imapHost} — inbox is up to date (0 new unseen messages).`,
            },
            socket
          );
        }
      });
    } catch (err) {
      finish({
        success: false,
        fetchedCount: 0,
        message: err instanceof Error ? err.message : "IMAP connection failed",
      });
    }
  });
}

export async function getEmailNotificationLogs(options?: {
  direction?: "outbound" | "inbound";
  limit?: number;
}): Promise<EmailNotificationLog[]> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return [];

  let query = supabase
    .from("email_notification_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 60);

  if (options?.direction) {
    query = query.eq("direction", options.direction);
  }

  const { data } = await query;
  return (data as EmailNotificationLog[]) ?? [];
}

