import crypto from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Payment } from "@/lib/types/legal";
import {
  createStripeCheckoutSession,
  getStripeConfig,
  processStripeWebhookEvent,
  signStripePayload,
} from "@/lib/services/stripe";

export interface LawyerEarningsSummary {
  totalEarnings: number;
  grossAmount: number;
  platformCommission: number;
  pendingAmount: number;
  paidAmount: number;
  payments: Payment[];
}

export async function getCitizenPayments(citizenId: string): Promise<Payment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      lawyer:profiles!payments_lawyer_id_fkey(full_name, avatar_url),
      appointment:appointments!payments_appointment_id_fkey(
        appointment_date, consultation_type, subject, consultation_fee, platform_fee, total_amount, settlement_status
      )
    `)
    .eq("citizen_id", citizenId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Payment[];
}

export async function getLawyerEarnings(lawyerId: string): Promise<LawyerEarningsSummary> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      totalEarnings: 0,
      grossAmount: 0,
      platformCommission: 0,
      pendingAmount: 0,
      paidAmount: 0,
      payments: [],
    };
  }

  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      citizen:profiles!payments_citizen_id_fkey(full_name, avatar_url),
      appointment:appointments!payments_appointment_id_fkey(
        appointment_date, consultation_type, subject, consultation_fee, platform_fee, total_amount, lawyer_receivable, settlement_status, status
      )
    `)
    .eq("lawyer_id", lawyerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      totalEarnings: 0,
      grossAmount: 0,
      platformCommission: 0,
      pendingAmount: 0,
      paidAmount: 0,
      payments: [],
    };
  }

  const payments = data as unknown as Payment[];
  let paidAmount = 0;
  let pendingAmount = 0;
  let grossAmount = 0;
  let platformCommission = 0;

  for (const p of payments) {
    const totalAmt = Number(p.amount) || 0;
    const appt = p.appointment;
    const netLawyerShare =
      Number(appt?.lawyer_receivable) ||
      Number(appt?.consultation_fee) ||
      Math.round(totalAmt / 1.1);
    const feeCommission =
      Number(appt?.platform_fee) || Math.max(0, totalAmt - netLawyerShare);

    if (p.status === "paid") {
      grossAmount += totalAmt;
      platformCommission += feeCommission;
      if (
        appt?.settlement_status === "transferred" ||
        appt?.settlement_status === "eligible" ||
        appt?.status === "completed"
      ) {
        paidAmount += netLawyerShare;
      } else {
        pendingAmount += netLawyerShare;
      }
    } else if (p.status === "pending") {
      pendingAmount += netLawyerShare;
    }
  }

  return {
    totalEarnings: paidAmount + pendingAmount,
    grossAmount,
    platformCommission,
    pendingAmount,
    paidAmount,
    payments,
  };
}

export async function createPaymentRecord(input: {
  appointmentId?: string;
  citizenId: string;
  lawyerId: string;
  amount: number;
  paymentMethod?: string;
  transactionReference?: string;
  status?: "pending" | "paid";
}): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data, error } = await supabase
    .from("payments")
    .insert({
      appointment_id: input.appointmentId || null,
      citizen_id: input.citizenId,
      lawyer_id: input.lawyerId,
      amount: input.amount,
      currency: "PKR",
      payment_method: input.paymentMethod || "stripe_card",
      provider: "stripe",
      transaction_reference: input.transactionReference || null,
      status: input.status || "pending",
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message };
  return { success: true, payment: data as unknown as Payment };
}

/**
 * Initiates a Stripe Sandbox Checkout Session (or processes a signed Stripe Sandbox `checkout.session.completed`
 * webhook when live `sk_test_...` credentials are not set) for a confirmed video consultation.
 */
export async function processAppointmentPayment(
  appointmentId: string,
  citizenId: string,
  paymentMethod: string = "stripe_card",
  originUrl: string = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
): Promise<{
  success: boolean;
  payment?: Payment;
  checkoutUrl?: string;
  mode?: "live_checkout" | "webhook_verified_sandbox";
  error?: string;
}> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      "*, lawyer:profiles!appointments_lawyer_id_fkey(full_name, email), citizen:profiles!appointments_citizen_id_fkey(full_name, email)"
    )
    .eq("id", appointmentId)
    .single();

  if (apptErr || !appt) {
    return { success: false, error: "Appointment not found" };
  }

  if (appt.citizen_id !== citizenId) {
    return {
      success: false,
      error: "Unauthorized: this appointment does not belong to your account.",
    };
  }

  if (appt.status !== "confirmed") {
    return {
      success: false,
      error: "Payment can only be processed after the advocate accepts the consultation.",
    };
  }

  if (appt.payment_status === "paid") {
    return {
      success: false,
      error: "This consultation has already been paid and secured in escrow.",
    };
  }

  if (appt.consultation_type === "in_person") {
    return {
      success: false,
      error: "Physical consultations are free of charge. No payment required.",
    };
  }

  const payableAmount = Number(appt.total_amount) || Number(appt.consultation_fee) || 0;
  if (payableAmount <= 0) {
    return { success: false, error: "Invalid payment amount for video consultation." };
  }

  const citizenProfile = appt.citizen as { full_name?: string; email?: string } | null;
  const lawyerProfile = appt.lawyer as { full_name?: string; email?: string } | null;
  const redirectUrl = `${originUrl.replace(/\/$/, "")}/citizen/appointments/${appointmentId}?payment=success`;

  const checkoutSession = await createStripeCheckoutSession({
    appointmentId,
    citizenId,
    citizenEmail: citizenProfile?.email || "citizen@legalease.pk",
    citizenName: citizenProfile?.full_name || "Citizen",
    lawyerId: appt.lawyer_id,
    lawyerName: lawyerProfile?.full_name || "Advocate",
    amountPkr: payableAmount,
    durationMinutes: Number(appt.duration_minutes) || 60,
    subject: appt.subject || "Legal Consultation",
    redirectUrl,
  });

  if (!checkoutSession.ok) {
    return {
      success: false,
      error: checkoutSession.error || "Failed to initialize Stripe Sandbox checkout",
    };
  }

  // Hosted Stripe Sandbox Checkout Mode (when `sk_test_...` is configured)
  if (checkoutSession.isLiveCheckout && checkoutSession.checkoutUrl) {
    const txRef = `STRIPE-${(checkoutSession.checkoutId || Date.now().toString()).slice(-10).toUpperCase()}`;
    const { data: pendingPayment } = await supabase
      .from("payments")
      .insert({
        appointment_id: appointmentId,
        citizen_id: citizenId,
        lawyer_id: appt.lawyer_id,
        amount: payableAmount,
        currency: "PKR",
        payment_method: paymentMethod || "stripe_card",
        provider: "stripe",
        provider_checkout_id: checkoutSession.checkoutId || null,
        checkout_url: checkoutSession.checkoutUrl,
        transaction_reference: txRef,
        status: "pending",
      })
      .select("*")
      .single();

    await supabase
      .from("appointments")
      .update({
        stripe_checkout_url: checkoutSession.checkoutUrl,
        stripe_session_id: checkoutSession.checkoutId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    return {
      success: true,
      payment: pendingPayment as unknown as Payment,
      checkoutUrl: checkoutSession.checkoutUrl,
      mode: "live_checkout",
    };
  }

  // Stripe Sandbox Mode: construct a signed `checkout.session.completed` webhook event
  // and verify it through the exact same `Stripe-Signature` HMAC-SHA256 webhook processor.
  const config = await getStripeConfig();
  const sessionId = `cs_test_${Date.now().toString().slice(-6)}${crypto.randomInt(1000, 9999)}`;
  const paymentIntentId = `pi_test_${Date.now().toString().slice(-6)}${crypto.randomInt(1000, 9999)}`;
  const webhookPayload = JSON.stringify({
    id: `evt_test_${appointmentId.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_intent: paymentIntentId,
        client_reference_id: appointmentId,
        customer_email: citizenProfile?.email || "citizen@legalease.pk",
        currency: config.currency || "pkr",
        amount_total: Math.round(payableAmount * 100),
        payment_status: "paid",
        status: "complete",
        metadata: {
          appointment_id: appointmentId,
          citizen_id: citizenId,
          lawyer_id: appt.lawyer_id,
          payment_method: paymentMethod,
          sandbox_mode: "true",
        },
      },
    },
  });

  const signature = signStripePayload(webhookPayload, config.webhookSecret);
  const webhookRes = await processStripeWebhookEvent(webhookPayload, signature);

  if (!webhookRes.success) {
    return {
      success: false,
      error: webhookRes.error || "Stripe Sandbox webhook verification failed",
    };
  }

  return {
    success: true,
    payment: webhookRes.payment,
    mode: "webhook_verified_sandbox",
  };
}
