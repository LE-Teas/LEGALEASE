"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/profile";
import { sendNotification } from "@/lib/services/notifications";
import type { VerificationStatus } from "@/lib/types/legal";

async function assertAdmin() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    throw new Error("Unauthorized. Administrator privileges required.");
  }
  return { user, profile };
}

async function logAdminAudit(params: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminClient() ?? (await createClient());
    if (!supabase) return;
    await supabase.from("admin_audit_logs").insert({
      admin_id: params.adminId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Admin action to approve, reject, or request info for a lawyer's verification.
 * Automatically synchronizes is_published (verified = true, otherwise false) and logs to admin_audit_logs.
 */
export async function updateLawyerVerificationAction(
  lawyerId: string,
  status: VerificationStatus,
  adminNote?: string,
  lawyerVisibleNote?: string
) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database connection unavailable.");

  // 1. Try atomic admin RPC
  const { error: rpcErr } = await supabase.rpc("admin_update_lawyer_verification", {
    p_lawyer_id: lawyerId,
    p_status: status,
    p_admin_note: adminNote || null,
    p_lawyer_visible_note: lawyerVisibleNote || null,
  });

  const isPublished = status === "verified";

  if (rpcErr) {
    await supabase
      .from("lawyer_verifications")
      .update({
        status,
        admin_note: adminNote || null,
        lawyer_visible_note: lawyerVisibleNote || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("lawyer_id", lawyerId);

    const { error: profErr } = await supabase
      .from("lawyer_profiles")
      .update({
        verification_status: status,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lawyerId);

    if (profErr) {
      throw new Error(profErr.message);
    }

    await logAdminAudit({
      adminId: user.id,
      action: `lawyer_verification_${status}`,
      entityType: "lawyer_profile",
      entityId: lawyerId,
      newValues: { status, is_published: isPublished, admin_note: adminNote },
    });
  }

  // Ensure lawyer_profiles is synced even after RPC
  await supabase
    .from("lawyer_profiles")
    .update({
      verification_status: status,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lawyerId);

  const statusTitles: Record<string, string> = {
    verified: "Your Advocate Verification Has Been Approved!",
    rejected: "Verification Application Update",
    needs_info: "Additional Information Needed for Verification",
    suspended: "Advocate Verification Suspended",
  };

  await sendNotification(
    lawyerId,
    `verification_${status}`,
    statusTitles[status] || "Verification Status Updated",
    lawyerVisibleNote ||
      (status === "verified"
        ? "Congratulations! Your profile is verified and now visible to citizens for booking."
        : "Your verification request has been updated by the administration."),
    { status, admin_note: adminNote }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/lawyers");
  revalidatePath("/lawyer/verification");
  revalidatePath("/citizen/lawyers");

  return { success: true };
}

/**
 * Admin action to update a single platform setting.
 */
export async function updatePlatformSettingAction(key: string, value: string) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { error } = await supabase
    .from("platform_settings")
    .upsert(
      {
        key,
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) throw new Error(error.message);

  await logAdminAudit({
    adminId: user.id,
    action: "update_platform_setting",
    entityType: "platform_settings",
    entityId: key,
    newValues: { key, value: key.includes("pass") || key.includes("secret") || key.includes("key") ? "***" : value },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/notifications");
  return { success: true };
}

/**
 * Admin action to update multiple platform settings in one batch (SMTP, IMAP, Stripe Sandbox, General).
 */
export async function updatePlatformSettingsBatchAction(entries: Record<string, string>) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const nowIso = new Date().toISOString();
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_by: user.id,
    updated_at: nowIso,
  }));

  const { error } = await supabase
    .from("platform_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) throw new Error(error.message);

  const redacted: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) {
    redacted[k] =
      k.includes("pass") || k.includes("secret") || k.includes("api_key")
        ? v ? "***configured***" : ""
        : v;
  }

  await logAdminAudit({
    adminId: user.id,
    action: "update_platform_settings_batch",
    entityType: "platform_settings",
    entityId: Object.keys(entries).join(","),
    newValues: redacted,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/payments");
  return { success: true };
}

/**
 * Admin action to update AI & RAG settings.
 */
export async function updatePlatformAiSettingsAction(settings: {
  provider?: string;
  model: string;
  embedding_model?: string;
  temperature: number;
  max_tokens: number;
  rag_enabled: boolean;
  similarity_threshold: number;
  match_count: number;
  maintenance_mode?: boolean;
  system_prompt_override?: string | null;
}) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { error: rpcErr } = await supabase.rpc("admin_update_ai_settings", {
    p_generation_model: settings.model,
    p_embedding_model: settings.embedding_model || "text-embedding-3-small",
    p_temperature: settings.temperature,
    p_max_tokens: settings.max_tokens,
    p_retrieval_top_k: settings.match_count,
    p_similarity_threshold: settings.similarity_threshold,
    p_rag_enabled: settings.rag_enabled,
    p_maintenance_mode: settings.maintenance_mode ?? false,
  });

  if (rpcErr) {
    const { data: firstRow } = await supabase
      .from("platform_ai_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (firstRow?.id) {
      const { error } = await supabase
        .from("platform_ai_settings")
        .update({
          generation_model: settings.model,
          embedding_model: settings.embedding_model || "text-embedding-3-small",
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          rag_enabled: settings.rag_enabled,
          similarity_threshold: settings.similarity_threshold,
          retrieval_top_k: settings.match_count,
          maintenance_mode: settings.maintenance_mode ?? false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", firstRow.id);

      if (error) throw new Error(error.message);
    } else {
      await supabase.from("platform_ai_settings").insert({
        generation_model: settings.model,
        embedding_model: settings.embedding_model || "text-embedding-3-small",
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        rag_enabled: settings.rag_enabled,
        similarity_threshold: settings.similarity_threshold,
        retrieval_top_k: settings.match_count,
        maintenance_mode: settings.maintenance_mode ?? false,
        updated_by: user.id,
      });
    }
  }

  await logAdminAudit({
    adminId: user.id,
    action: "update_ai_settings",
    entityType: "platform_ai_settings",
    entityId: "singleton",
    newValues: settings as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/ai-models");
  return { success: true };
}

/**
 * Admin action to suspend or reactivate a citizen or advocate account.
 */
export async function toggleUserStatusAction(
  userId: string,
  isActive: boolean,
  reason?: string
) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profErr) throw new Error(profErr.message);

  if (!isActive) {
    await supabase
      .from("lawyer_profiles")
      .update({
        is_published: false,
        verification_status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  await logAdminAudit({
    adminId: user.id,
    action: isActive ? "user_account_reactivated" : "user_account_suspended",
    entityType: "profile",
    entityId: userId,
    newValues: { is_active: isActive, reason: reason || null },
  });

  await sendNotification(
    userId,
    isActive ? "account_reactivated" : "account_suspended",
    isActive ? "Account Reactivated" : "Account Suspended by Administration",
    isActive
      ? "Your LegalEase account has been reactivated. You may now access all features."
      : reason || "Your account has been temporarily restricted by the administration.",
    { reason }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/lawyers");
  return { success: true };
}

/**
 * Admin action to resolve or cancel an appointment with clear reason.
 */
export async function adminCancelAppointmentAction(
  appointmentId: string,
  reason: string
) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database connection unavailable.");

  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select("citizen_id, lawyer_id, status, payment_status")
    .eq("id", appointmentId)
    .single();

  if (fetchErr || !appt) throw new Error("Appointment not found.");

  const updateData: Record<string, unknown> = {
    status: "cancelled",
    cancelled_by: "admin",
    cancellation_reason: reason,
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (appt.payment_status === "paid") {
    updateData.payment_status = "refunded";
    updateData.settlement_status = "failed";
    await supabase
      .from("payments")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("appointment_id", appointmentId);
  }

  const { error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);

  await logAdminAudit({
    adminId: user.id,
    action: "appointment_cancelled_by_admin",
    entityType: "appointment",
    entityId: appointmentId,
    oldValues: { status: appt.status },
    newValues: { status: "cancelled", reason },
  });

  await sendNotification(
    appt.citizen_id,
    "appointment_cancelled",
    "Consultation Cancelled by Administration",
    `Your booking was cancelled by the platform administrator: ${reason}`,
    { appointment_id: appointmentId, reason }
  );

  await sendNotification(
    appt.lawyer_id,
    "appointment_cancelled",
    "Consultation Cancelled by Administration",
    `Consultation was cancelled by the administrator: ${reason}`,
    { appointment_id: appointmentId, reason }
  );

  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Admin action to moderate reviews (hide/restore).
 */
export async function moderateReviewAction(
  reviewId: string,
  isVisible: boolean,
  reason?: string
) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { data: rev, error: fetchErr } = await supabase
    .from("reviews")
    .select("lawyer_id, is_visible")
    .eq("id", reviewId)
    .single();

  if (fetchErr || !rev) throw new Error("Review not found.");

  const { error } = await supabase
    .from("reviews")
    .update({
      is_visible: isVisible,
      moderated_at: new Date().toISOString(),
      moderated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (error) throw new Error(error.message);

  await logAdminAudit({
    adminId: user.id,
    action: isVisible ? "review_restored" : "review_hidden",
    entityType: "review",
    entityId: reviewId,
    newValues: { is_visible: isVisible, reason },
  });

  revalidatePath("/admin/reviews");
  return { success: true };
}

/**
 * Admin action to broadcast notification announcements (in-app + SMTP email).
 */
export async function broadcastNotificationAction(
  targetRole: "all" | "citizen" | "lawyer",
  title: string,
  message: string
) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  let query = supabase.from("profiles").select("id, email, full_name");
  if (targetRole !== "all") {
    query = query.eq("role", targetRole);
  }

  const { data: recipients, error } = await query;
  if (error || !recipients) throw new Error("Failed to fetch notification recipients.");

  for (const r of recipients) {
    await sendNotification(r.id, "platform_announcement", title, message, {
      broadcast_by: user.id,
      target_role: targetRole,
    });
  }

  await logAdminAudit({
    adminId: user.id,
    action: "platform_notification_broadcast",
    entityType: "notifications",
    entityId: targetRole,
    newValues: { recipient_count: recipients.length, title, message },
  });

  revalidatePath("/admin/notifications");
  return { success: true, count: recipients.length };
}

/**
 * Admin action to settle lawyer commission payout for completed video consultations.
 */
export async function adminSettleAppointmentAction(
  appointmentId: string,
  notes?: string
) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select(
      "id, lawyer_id, citizen_id, status, payment_status, settlement_status, lawyer_receivable, total_amount, consultation_fee, platform_fee"
    )
    .eq("id", appointmentId)
    .single();

  if (fetchErr || !appt) throw new Error("Appointment not found.");

  if (appt.status !== "completed") {
    throw new Error("Only completed consultations can be settled.");
  }

  if (appt.settlement_status === "transferred") {
    throw new Error("This consultation payout has already been transferred.");
  }

  const payoutRef = `PAYOUT-1LINK-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase()}`;

  const { error: updateErr } = await supabase
    .from("appointments")
    .update({
      settlement_status: "transferred",
      settlement_reference: payoutRef,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (updateErr) throw new Error(updateErr.message);

  await logAdminAudit({
    adminId: user.id,
    action: "consultation_payout_settled",
    entityType: "appointment",
    entityId: appointmentId,
    newValues: {
      payout_reference: payoutRef,
      lawyer_receivable: appt.lawyer_receivable,
      platform_fee: appt.platform_fee,
      notes: notes || null,
    },
  });

  await sendNotification(
    appt.lawyer_id,
    "payout_transferred",
    "Consultation Payout Transferred",
    `Your net consultation earnings of Rs. ${Number(appt.lawyer_receivable).toLocaleString()} (Ref: ${payoutRef}) have been settled and routed to your bank account.`,
    { appointment_id: appointmentId, payout_reference: payoutRef }
  );

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { success: true, payoutRef };
}

/**
 * Admin action to refund a payment and update the linked appointment.
 */
export async function adminRefundPaymentAction(paymentId: string, reason: string) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (fetchErr || !payment) throw new Error("Payment record not found.");

  const { error } = await supabase
    .from("payments")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) throw new Error(error.message);

  if (payment.appointment_id) {
    await supabase
      .from("appointments")
      .update({
        payment_status: "refunded",
        settlement_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.appointment_id);
  }

  await logAdminAudit({
    adminId: user.id,
    action: "payment_refunded_by_admin",
    entityType: "payment",
    entityId: paymentId,
    newValues: {
      amount: payment.amount,
      reason,
      appointment_id: payment.appointment_id,
    },
  });

  await sendNotification(
    payment.citizen_id,
    "payment_refunded",
    "Payment Refund Issued",
    `Your consultation payment of Rs. ${Number(payment.amount).toLocaleString()} (Ref: ${payment.transaction_reference || payment.id.slice(0, 8)}) has been refunded by LegalEase Administration. Reason: ${reason}`,
    { payment_id: paymentId, reason }
  );

  revalidatePath("/admin/payments");
  revalidatePath("/admin/appointments");
  return { success: true };
}

/**
 * Admin action to create or update a public legal resource guide.
 */
export async function upsertLegalResourceAction(input: {
  id?: string;
  title: string;
  category: string;
  reading_time: string;
  summary: string;
  content: string;
  jurisdiction: string;
}) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const slug =
    input.id ||
    input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const { error } = await supabase.from("legal_resources").upsert(
    {
      id: slug,
      slug,
      title: input.title.trim(),
      category: input.category.trim(),
      reading_time: input.reading_time.trim() || "5 min read",
      summary: input.summary.trim(),
      content: input.content.trim(),
      jurisdiction: input.jurisdiction.trim() || "Federal & Provincial",
      updated_date: new Date().getFullYear().toString(),
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);

  await logAdminAudit({
    adminId: user.id,
    action: "upsert_legal_resource",
    entityType: "legal_resources",
    entityId: slug,
    newValues: { title: input.title, category: input.category },
  });

  revalidatePath("/admin/resources");
  revalidatePath("/citizen/resources");
  revalidatePath("/resources");
  return { success: true, id: slug };
}

export async function deleteLegalResourceAction(resourceId: string) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { error } = await supabase
    .from("legal_resources")
    .delete()
    .eq("id", resourceId);

  if (error) throw new Error(error.message);

  await logAdminAudit({
    adminId: user.id,
    action: "delete_legal_resource",
    entityType: "legal_resources",
    entityId: resourceId,
  });

  revalidatePath("/admin/resources");
  revalidatePath("/citizen/resources");
  revalidatePath("/resources");
  return { success: true };
}

/**
 * Admin action to respond to a Citizen or Lawyer support ticket.
 */
export async function respondSupportTicketAction(params: {
  ticketId: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminResponse: string;
}) {
  const { user } = await assertAdmin();
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) throw new Error("Database unavailable.");

  const { data: ticket, error: fetchErr } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", params.ticketId)
    .single();

  if (fetchErr || !ticket) throw new Error("Support ticket not found.");

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: params.status,
      admin_response: params.adminResponse.trim(),
      responded_by: user.id,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.ticketId);

  if (error) throw new Error(error.message);

  await logAdminAudit({
    adminId: user.id,
    action: "respond_support_ticket",
    entityType: "support_tickets",
    entityId: params.ticketId,
    newValues: { status: params.status, admin_response: params.adminResponse },
  });

  await sendNotification(
    ticket.user_id,
    "support_ticket_update",
    `Support Ticket Updated: ${ticket.subject}`,
    `LegalEase Support responded to your ticket (${params.status.replace("_", " ")}): ${params.adminResponse}`,
    { ticket_id: params.ticketId, status: params.status }
  );

  revalidatePath("/admin/support");
  revalidatePath("/citizen/support");
  revalidatePath("/lawyer/support");
  return { success: true };
}

/**
 * Admin action to seed realistic demo test users (citizens, advocates, staff).
 * All test users use the default testing password: Password123!
 */
export async function seedDemoUsersAction(): Promise<{
  success: boolean;
  message: string;
  createdCount: number;
}> {
  const { user: currentAdmin } = await assertAdmin();
  const adminClient = createAdminClient();

  const demoUsers = [
    {
      email: "citizen.ali@legalease.pk",
      password: "Password123!",
      role: "citizen" as const,
      fullName: "Ali Raza Khan",
      phone: "+92 300 1234567",
      city: "Karachi",
      area: "Clifton Block 5",
      language: "Urdu",
    },
    {
      email: "citizen.fatima@legalease.pk",
      password: "Password123!",
      role: "citizen" as const,
      fullName: "Fatima Noor",
      phone: "+92 321 9876543",
      city: "Lahore",
      area: "Gulberg III",
      language: "English",
    },
    {
      email: "citizen.bilal@legalease.pk",
      password: "Password123!",
      role: "citizen" as const,
      fullName: "Bilal Ahmed",
      phone: "+92 333 4567890",
      city: "Islamabad",
      area: "Sector F-7/2",
      language: "Urdu",
    },
    {
      email: "staff.support@legalease.pk",
      password: "Password123!",
      role: "admin" as const,
      fullName: "LegalEase Operations Desk",
      phone: "+92 345 1122334",
      city: "Islamabad",
      area: "Blue Area",
      language: "English",
    },
  ];

  let createdCount = 0;

  if (adminClient) {
    for (const demo of demoUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await adminClient
          .from("profiles")
          .select("id")
          .eq("email", demo.email)
          .maybeSingle();

        if (existingUser) continue;

        const { data: authData, error: authErr } =
          await adminClient.auth.admin.createUser({
            email: demo.email,
            password: demo.password,
            email_confirm: true,
            user_metadata: {
              full_name: demo.fullName,
              role: demo.role,
            },
          });

        if (authErr || !authData.user) continue;

        await adminClient.from("profiles").upsert({
          id: authData.user.id,
          role: demo.role,
          full_name: demo.fullName,
          email: demo.email,
          phone: demo.phone,
          city: demo.city,
          area: demo.area,
          preferred_language: demo.language,
          is_active: true,
        });

        createdCount++;
      } catch (e) {
        console.error("Failed to seed demo user:", demo.email, e);
      }
    }
  }

  await logAdminAudit({
    adminId: currentAdmin.id,
    action: "seed_demo_users",
    entityType: "profiles",
    newValues: { createdCount, defaultPassword: "Password123!" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return {
    success: true,
    message:
      createdCount > 0
        ? `Successfully created ${createdCount} demo test users! Default password for all demo accounts is Password123!`
        : "Demo users already loaded and up to date.",
    createdCount,
  };
}
