import { NextResponse } from "next/server";
import { processStripeWebhookEvent } from "@/lib/services/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("stripe-signature") ||
      request.headers.get("Stripe-Signature");

    const result = await processStripeWebhookEvent(rawBody, signature);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Webhook processing failed" },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      received: true,
      eventId: result.eventId,
      eventName: result.eventName,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal error processing Stripe webhook",
      },
      { status: 500 }
    );
  }
}

