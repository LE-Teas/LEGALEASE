import { NextResponse } from "next/server";
import { receiveInboundEmail } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fromEmail = "";
    let toEmail = "";
    let subject = "";
    let text = "";
    let html = "";
    let messageId = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      fromEmail = String(body.from || body.fromEmail || body.sender || "").trim();
      toEmail = String(body.to || body.toEmail || body.recipient || "").trim();
      subject = String(body.subject || "(No Subject)").trim();
      text = String(body.text || body.body_text || body["body-plain"] || "").trim();
      html = String(body.html || body.body_html || body["body-html"] || "").trim();
      messageId = String(body.messageId || body["Message-Id"] || "").trim();
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      fromEmail = String(formData.get("from") || formData.get("sender") || "").trim();
      toEmail = String(formData.get("to") || formData.get("recipient") || "").trim();
      subject = String(formData.get("subject") || "(No Subject)").trim();
      text = String(
        formData.get("text") || formData.get("body-plain") || ""
      ).trim();
      html = String(formData.get("html") || formData.get("body-html") || "").trim();
      messageId = String(formData.get("Message-Id") || "").trim();
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 400 }
      );
    }

    if (!fromEmail || !text) {
      return NextResponse.json(
        { error: "from and text fields are required" },
        { status: 400 }
      );
    }

    const result = await receiveInboundEmail({
      fromEmail,
      toEmail: toEmail || undefined,
      subject,
      text,
      html: html || undefined,
      messageId: messageId || undefined,
      metadata: { source: "webhook" },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to process inbound email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logId: result.logId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse inbound email" },
      { status: 500 }
    );
  }
}

