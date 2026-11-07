import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import {
  sendSmtpEmail,
  syncImapInboundEmails,
  receiveInboundEmail,
} from "@/lib/services/email";

export async function POST(request: Request) {
  const { profile } = await getAuthState();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body.action || "send_test");

    if (action === "sync_imap") {
      const syncResult = await syncImapInboundEmails();
      return NextResponse.json(syncResult);
    }

    if (action === "simulate_inbound") {
      const fromEmail = String(body.fromEmail || "citizen.inquiry@example.pk").trim();
      const subject = String(
        body.subject || "Consultation Payment & Verification Inquiry"
      ).trim();
      const text = String(
        body.text ||
          "Assalam-o-Alaikum LegalEase Support, I have completed my consultation payment and would like confirmation of my video session schedule."
      ).trim();

      const res = await receiveInboundEmail({
        fromEmail,
        subject,
        text,
        metadata: { source: "admin_inbound_test", triggered_by: profile.id },
      });

      return NextResponse.json({
        success: res.success,
        logId: res.logId,
        message: res.success
          ? "Inbound notification email received and logged."
          : res.error || "Failed to log inbound email.",
      });
    }

    // Default: send_test outbound email
    const toEmail = String(body.toEmail || profile.email).trim();
    const subject = String(
      body.subject || "LegalEase SMTP Configuration Test"
    ).trim();
    const text = String(
      body.text ||
        `This is a test notification email dispatched from the LegalEase Admin Dashboard by ${profile.full_name} (${profile.email}) at ${new Date().toLocaleString()}.`
    ).trim();

    const result = await sendSmtpEmail({
      to: toEmail,
      subject,
      text,
      userId: profile.id,
      notificationType: "smtp_test",
      forceLiveSmtp: true,
      metadata: { triggered_by: profile.id },
    });

    return NextResponse.json({
      success: result.success,
      deliveryMode: result.deliveryMode,
      status: result.status,
      logId: result.logId,
      message: result.success
        ? result.deliveryMode === "smtp_live"
          ? `Test email transmitted via live SMTP server to ${toEmail}.`
          : `Test email recorded in Outbox Log for ${toEmail} (enter SMTP Username & App Password to transmit over live SMTP).`
        : `SMTP delivery failed: ${result.error}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run SMTP action" },
      { status: 500 }
    );
  }
}
