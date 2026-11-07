import crypto from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/services/notifications";
import type { Payment, PaymentWebhookEvent } from "@/lib/types/legal";

export interface StripeConfig {
  enabled: boolean;
  sandboxMode: boolean;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  currency: string;
}

export async function getStripeConfig(): Promise<StripeConfig> {
  const supabase = createAdminClient() ?? (await createClient());
  const map: Record<string, string> = {};

  if (supabase) {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "stripe_enabled",
        "stripe_sandbox_mode",
        "stripe_publishable_key",
        "stripe_secret_key",
        "stripe_webhook_secret",
        "stripe_currency",
      ]);

    for (const row of data ?? []) {
      map[row.key] = row.value;
    }
  }

  const dbWebhookSecret =
    map.stripe_webhook_secret &&
    map.stripe_webhook_secret !== "whsec_test_legalease_sandbox_secret" &&
    map.stripe_webhook_secret !== "whsec_legalease_stripe_sandbox_secret"
      ? map.stripe_webhook_secret
      : "";

  return {
    enabled: map.stripe_enabled !== "false",
    sandboxMode: map.stripe_sandbox_mode !== "false",
    publishableKey:
      map.stripe_publishable_key ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      "",
    secretKey: map.stripe_secret_key || process.env.STRIPE_SECRET_KEY || "",
    webhookSecret:
      dbWebhookSecret ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      "whsec_legalease_stripe_sandbox_secret",
    currency: (map.stripe_currency || process.env.STRIPE_CURRENCY || "pkr").toLowerCase(),
  };
}

/**
 * Verifies the `Stripe-Signature` header (`t=<timestamp>,v1=<hex_hmac>`) using HMAC-SHA256.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",").map((part) => part.trim());
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t" && v) {
      timestamp = v;
    } else if (k === "v1" && v) {
      signatures.push(v);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expectedHmac, "utf8");

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  });
}

/**
 * Generates a valid `Stripe-Signature` header (`t=<timestamp>,v1=<hex_hmac>`) for Stripe webhook payloads.
 */
export function signStripePayload(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const signedPayload = `${timestamp}.${rawBody}`;
  const v1 = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

/**
 * Creates a Stripe Sandbox / Test Mode Checkout Session via Stripe API v1 (`POST https://api.stripe.com/v1/checkout/sessions`).
 */
export async function createStripeCheckoutSession(params: {
  appointmentId: string;
  citizenId: string;
  citizenEmail: string;
  citizenName: string;
  lawyerId: string;
  lawyerName: string;
  amountPkr: number;
  durationMinutes: number;
  subject: string;
  redirectUrl: string;
}): Promise<{
  ok: boolean;
  isLiveCheckout: boolean;
  checkoutId?: string;
  checkoutUrl?: string;
  error?: string;
}> {
  const config = await getStripeConfig();

  // If no Stripe secret key (`sk_test_...`) is configured yet, fall back to
  // signed Stripe Sandbox Webhook simulation so sandbox testing works out-of-the-box.
  if (!config.secretKey || !config.secretKey.startsWith("sk_")) {
    return {
      ok: true,
      isLiveCheckout: false,
    };
  }

  try {
    const unitAmount = Math.max(100, Math.round(params.amountPkr * 100));
    const currency = config.currency || "pkr";
    const baseCancelUrl = params.redirectUrl.split("?")[0];

    const form = new URLSearchParams();
    form.append("mode", "payment");
    form.append("billing_address_collection", "auto");
    form.append("phone_number_collection[enabled]", "false");
    form.append("automatic_tax[enabled]", "false");
    form.append("allow_promotion_codes", "false");
    form.append("submit_type", "auto");
    form.append("client_reference_id", String(params.appointmentId));
    if (params.citizenEmail) {
      form.append("customer_email", params.citizenEmail);
    }
    form.append(
      "success_url",
      `${params.redirectUrl}&session_id={CHECKOUT_SESSION_ID}`
    );
    form.append("cancel_url", `${baseCancelUrl}?payment=cancelled`);
    form.append("line_items[0][quantity]", "1");
    form.append("line_items[0][price_data][currency]", currency);
    form.append("line_items[0][price_data][unit_amount]", String(unitAmount));
    form.append(
      "line_items[0][price_data][product_data][name]",
      `LegalEase Video Consultation (${params.durationMinutes} mins)`
    );
    form.append(
      "line_items[0][price_data][product_data][description]",
      `Consultation with ${params.lawyerName} — ${params.subject}`
    );
    form.append("metadata[appointment_id]", String(params.appointmentId));
    form.append("metadata[citizen_id]", String(params.citizenId));
    form.append("metadata[lawyer_id]", String(params.lawyerId));
    form.append("metadata[sandbox_mode]", String(config.sandboxMode));

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        ok: false,
        isLiveCheckout: true,
        error: `Stripe API error (${res.status}): ${errBody.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const checkoutId = String(json?.id || "");
    const checkoutUrl = String(json?.url || "");

    if (!checkoutUrl) {
      return {
        ok: false,
        isLiveCheckout: true,
        error: "Stripe did not return a checkout session URL.",
      };
    }

    return {
      ok: true,
      isLiveCheckout: true,
      checkoutId,
      checkoutUrl,
    };
  } catch (err) {
    return {
      ok: false,
      isLiveCheckout: true,
      error:
        err instanceof Error
          ? err.message
          : "Failed to create Stripe Sandbox checkout session",
    };
  }
}

/**
 * Verifies and processes an incoming Stripe webhook payload idempotently (`checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`).
 */
export async function processStripeWebhookEvent(
  rawBody: string,
  signatureHeader: string | null
): Promise<{
  success: boolean;
  status: number;
  eventId?: string;
  eventName?: string;
  payment?: Payment;
  error?: string;
}> {
  const config = await getStripeConfig();

  const isValidSignature = verifyStripeSignature(
    rawBody,
    signatureHeader,
    config.webhookSecret
  );

  if (!isValidSignature) {
    return {
      success: false,
      status: 401,
      error: "Invalid Stripe-Signature header",
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      status: 400,
      error: "Invalid JSON webhook payload",
    };
  }

  const eventName = String(parsed.type || "checkout.session.completed");
  const dataWrapper = (parsed.data ?? {}) as Record<string, unknown>;
  const obj = (dataWrapper.object ?? {}) as Record<string, unknown>;
  const metadata = (obj.metadata ?? {}) as Record<string, unknown>;

  const sessionId = String(
    obj.id || obj.payment_intent || `cs_test_${crypto.randomUUID().slice(0, 12)}`
  );
  const appointmentId = String(
    metadata.appointment_id || obj.client_reference_id || ""
  );
  const eventId = String(
    parsed.id || `evt_test_${sessionId}_${appointmentId || "na"}`
  );

  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) {
    return { success: false, status: 500, error: "Database unavailable" };
  }

  // Idempotency check
  const { data: existingEvent } = await supabase
    .from("payment_webhook_events")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent && existingEvent.processed) {
    return {
      success: true,
      status: 200,
      eventId,
      eventName,
    };
  }

  // Record webhook event
  if (!existingEvent) {
    await supabase.from("payment_webhook_events").insert({
      provider: "stripe",
      event_name: eventName,
      event_id: eventId,
      appointment_id: appointmentId || null,
      payload: parsed,
      processed: false,
    });
  }

  if (!appointmentId) {
    await supabase
      .from("payment_webhook_events")
      .update({
        processed: true,
        processing_error: "No appointment_id in Stripe metadata",
      })
      .eq("event_id", eventId);

    return {
      success: true,
      status: 200,
      eventId,
      eventName,
    };
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) {
    await supabase
      .from("payment_webhook_events")
      .update({
        processed: false,
        processing_error: `Appointment ${appointmentId} not found`,
      })
      .eq("event_id", eventId);

    return {
      success: false,
      status: 404,
      error: "Appointment not found for Stripe webhook event",
    };
  }

  const payableAmount =
    Number(appt.total_amount) || Number(appt.consultation_fee) || 0;
  const txRef = `STRIPE-${sessionId.slice(-10).toUpperCase()}`;

  if (
    eventName === "checkout.session.completed" ||
    eventName === "payment_intent.succeeded"
  ) {
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let savedPayment: Payment | undefined;

    if (existingPayment) {
      const { data: updatedPayment } = await supabase
        .from("payments")
        .update({
          status: "paid",
          provider: "stripe",
          provider_order_id: sessionId,
          transaction_reference: txRef,
          webhook_event_id: eventId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(existingPayment.metadata ?? {}),
            stripe_event: eventName,
            stripe_session_id: sessionId,
            sandbox_mode: parsed.livemode === false,
          },
        })
        .eq("id", existingPayment.id)
        .select("*")
        .single();
      savedPayment = updatedPayment as unknown as Payment;
    } else {
      const { data: insertedPayment } = await supabase
        .from("payments")
        .insert({
          appointment_id: appointmentId,
          citizen_id: appt.citizen_id,
          lawyer_id: appt.lawyer_id,
          amount: payableAmount,
          currency: "PKR",
          payment_method: String(metadata.payment_method || "stripe_card"),
          provider: "stripe",
          provider_order_id: sessionId,
          transaction_reference: txRef,
          webhook_event_id: eventId,
          paid_at: new Date().toISOString(),
          status: "paid",
          metadata: {
            stripe_event: eventName,
            stripe_session_id: sessionId,
            sandbox_mode: parsed.livemode === false,
          },
        })
        .select("*")
        .single();
      savedPayment = insertedPayment as unknown as Payment;
    }

    await supabase
      .from("appointments")
      .update({
        payment_status: "paid",
        settlement_status: "pending",
        settlement_reference: txRef,
        stripe_session_id: sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    await supabase
      .from("payment_webhook_events")
      .update({ processed: true, processing_error: null })
      .eq("event_id", eventId);

    // Notify lawyer and citizen (also dispatches SMTP email notifications)
    await sendNotification(
      appt.lawyer_id,
      "payment_received",
      "Stripe Sandbox Escrow Payment Confirmed",
      `Client payment of Rs. ${payableAmount.toLocaleString()} for the consultation on ${appt.appointment_date} at ${appt.start_time} has been verified via Stripe Sandbox (Session ${sessionId}). Video chamber access is now unlocked.`,
      {
        appointment_id: appointmentId,
        transaction_ref: txRef,
        provider: "stripe",
      }
    );

    await sendNotification(
      appt.citizen_id,
      "payment_receipt",
      "Stripe Sandbox Payment Receipt Confirmed",
      `Your payment of Rs. ${payableAmount.toLocaleString()} has been verified via Stripe Sandbox (Ref: ${txRef}). Your video consultation room is unlocked for the scheduled slot.`,
      {
        appointment_id: appointmentId,
        transaction_ref: txRef,
        provider: "stripe",
      }
    );

    return {
      success: true,
      status: 200,
      eventId,
      eventName,
      payment: savedPayment,
    };
  }

  if (eventName === "charge.refunded" || eventName === "payment_intent.canceled") {
    await supabase
      .from("payments")
      .update({
        status: "refunded",
        webhook_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq("appointment_id", appointmentId);

    await supabase
      .from("appointments")
      .update({
        payment_status: "refunded",
        settlement_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    await supabase
      .from("payment_webhook_events")
      .update({ processed: true, processing_error: null })
      .eq("event_id", eventId);

    await sendNotification(
      appt.citizen_id,
      "payment_refunded",
      "Consultation Payment Refunded",
      `Your consultation payment of Rs. ${payableAmount.toLocaleString()} (Ref: ${txRef}) has been refunded via Stripe Sandbox.`,
      { appointment_id: appointmentId, transaction_ref: txRef }
    );

    return {
      success: true,
      status: 200,
      eventId,
      eventName,
    };
  }

  await supabase
    .from("payment_webhook_events")
    .update({ processed: true })
    .eq("event_id", eventId);

  return {
    success: true,
    status: 200,
    eventId,
    eventName,
  };
}

export async function verifyStripeCheckoutSessionOnReturn(
  sessionId: string,
  appointmentId: string
): Promise<boolean> {
  if (!sessionId || !sessionId.startsWith("cs_")) return false;
  const config = await getStripeConfig();
  if (!config.secretKey || !config.secretKey.startsWith("sk_")) return false;

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return false;
    const session = (await res.json()) as Record<string, unknown>;
    if (session.payment_status !== "paid") return false;

    const payloadObj = {
      id: `evt_return_${sessionId}`,
      object: "event",
      type: "checkout.session.completed",
      livemode: session.livemode ?? false,
      data: {
        object: {
          ...session,
          id: sessionId,
          client_reference_id: session.client_reference_id || appointmentId,
          metadata: {
            ...((session.metadata as Record<string, unknown>) ?? {}),
            appointment_id:
              ((session.metadata as Record<string, unknown>)
                ?.appointment_id as string) || appointmentId,
          },
        },
      },
    };
    const rawBody = JSON.stringify(payloadObj);
    const sig = signStripePayload(rawBody, config.webhookSecret);
    const result = await processStripeWebhookEvent(rawBody, sig);
    return result.success;
  } catch {
    return false;
  }
}

export async function getWebhookEvents(limit = 30): Promise<PaymentWebhookEvent[]> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return [];

  const { data } = await supabase
    .from("payment_webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as PaymentWebhookEvent[]) ?? [];
}

