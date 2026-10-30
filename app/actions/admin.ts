"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/profile";
import type { VerificationStatus } from "@/lib/types/legal";

async function assertAdmin() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    throw new Error("Unauthorized. Administrator privileges required.");
  }
  return { user, profile };
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

  if (!rpcErr) {
    revalidatePath("/admin");
    revalidatePath("/admin/lawyers");
    revalidatePath("/lawyer/verification");
    revalidatePath("/citizen/lawyers");
    return { success: true };
  }

  // Fallback: Direct database updates if RPC is not yet loaded in Supabase
  const isPublished = status === "verified";

  // Update verification record
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

  // Update lawyer profile status & publication visibility
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

  // Audit log fallback
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: `lawyer_verification_${status}`,
      target_type: "lawyer_profile",
      target_id: lawyerId,
      changes: { status, is_published: isPublished, admin_note: adminNote },
    });
  } catch {
    // Non-fatal
  }

  // Notify lawyer
  const statusTitles: Record<string, string> = {
    verified: "Your Advocate Verification Has Been Approved!",
    rejected: "Verification Application Update",
    needs_info: "Additional Information Needed for Verification",
  };

  try {
    await supabase.from("notifications").insert({
      user_id: lawyerId,
      type: `verification_${status}`,
      title: statusTitles[status] || "Verification Status Updated",
      message:
        lawyerVisibleNote ||
        (status === "verified"
          ? "Congratulations! Your profile is verified and now visible to citizens for booking."
          : "Your verification request has been updated by the administration."),
      metadata: { status, admin_note: adminNote },
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin");
  revalidatePath("/admin/lawyers");
  revalidatePath("/lawyer/verification");
  revalidatePath("/citizen/lawyers");

  return { success: true };
}

/**
 * Admin action to update platform settings (fees, tax, terms).
 */
export async function updatePlatformSettingAction(key: string, value: string) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  // Try RPC
  const { error: rpcErr } = await supabase.rpc("admin_update_platform_setting", {
    p_key: key,
    p_value: value,
  });

  if (!rpcErr) {
    revalidatePath("/admin/settings");
    return { success: true };
  }

  // Fallback direct upsert
  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key,
      value,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) throw new Error(error.message);

  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "update_platform_setting",
      target_type: "platform_settings",
      target_id: key,
      changes: { key, value },
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Admin action to update AI & RAG settings.
 */
export async function updatePlatformAiSettingsAction(settings: {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  rag_enabled: boolean;
  similarity_threshold: number;
  match_count: number;
  system_prompt_override?: string | null;
}) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  // Try RPC
  const { error: rpcErr } = await supabase.rpc("admin_update_ai_settings", {
    p_provider: settings.provider,
    p_model: settings.model,
    p_temperature: settings.temperature,
    p_max_tokens: settings.max_tokens,
    p_rag_enabled: settings.rag_enabled,
    p_similarity_threshold: settings.similarity_threshold,
    p_match_count: settings.match_count,
    p_system_prompt_override: settings.system_prompt_override || null,
  });

  if (!rpcErr) {
    revalidatePath("/admin/settings");
    return { success: true };
  }

  // Fallback: update active row
  const { error } = await supabase
    .from("platform_ai_settings")
    .update({
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
      rag_enabled: settings.rag_enabled,
      similarity_threshold: settings.similarity_threshold,
      match_count: settings.match_count,
      system_prompt_override: settings.system_prompt_override || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "update_ai_settings",
      target_type: "platform_ai_settings",
      target_id: "active",
      changes: settings,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Admin action to suspend or reactivate a citizen or advocate account.
 * Automatically depublishes lawyer if suspended, and logs audit trail.
 */
export async function toggleUserStatusAction(
  userId: string,
  isActive: boolean,
  reason?: string
) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  // 1. Update profiles table
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profErr) throw new Error(profErr.message);

  // 2. If user is a lawyer, ensure publication status matches active state
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

  // 3. Log to audit trail
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: isActive ? "user_account_reactivated" : "user_account_suspended",
      target_type: "profile",
      target_id: userId,
      changes: { is_active: isActive, reason: reason || null },
    });
  } catch {
    // Non-fatal
  }

  // 4. Notify user if feasible
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: isActive ? "account_reactivated" : "account_suspended",
      title: isActive ? "Account Reactivated" : "Account Suspended by Administration",
      message: isActive
        ? "Your LegalEase account has been reactivated. You may now access all features."
        : reason || "Your account has been temporarily restricted by the administration.",
      metadata: { reason },
    });
  } catch {
    // Non-fatal
  }

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
  const supabase = await createClient();
  if (!supabase) throw new Error("Database connection unavailable.");

  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select("citizen_id, lawyer_id, status")
    .eq("id", appointmentId)
    .single();

  if (fetchErr || !appt) throw new Error("Appointment not found.");

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: "admin",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);

  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "appointment_cancelled_by_admin",
      target_type: "appointment",
      target_id: appointmentId,
      changes: { previous_status: appt.status, reason },
    });

    // Notify citizen & lawyer
    const notifyPayload = [
      {
        user_id: appt.citizen_id,
        type: "appointment_cancelled",
        title: "Consultation Cancelled by Administration",
        message: `Your booking was cancelled by the platform administrator: ${reason}`,
        metadata: { appointment_id: appointmentId, reason },
      },
      {
        user_id: appt.lawyer_id,
        type: "appointment_cancelled",
        title: "Consultation Cancelled by Administration",
        message: `Consultation was cancelled by the administrator: ${reason}`,
        metadata: { appointment_id: appointmentId, reason },
      },
    ];
    await supabase.from("notifications").insert(notifyPayload);
  } catch {
    // Non-fatal
  }

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
  const supabase = await createClient();
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

  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: isVisible ? "review_restored" : "review_hidden",
      target_type: "review",
      target_id: reviewId,
      changes: { is_visible: isVisible, reason },
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/reviews");
  return { success: true };
}

/**
 * Admin action to broadcast notification announcements.
 */
export async function broadcastNotificationAction(
  targetRole: "all" | "citizen" | "lawyer",
  title: string,
  message: string
) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  let query = supabase.from("profiles").select("id");
  if (targetRole !== "all") {
    query = query.eq("role", targetRole);
  }

  const { data: recipients, error } = await query;
  if (error || !recipients) throw new Error("Failed to fetch notification recipients.");

  const records = recipients.map((r) => ({
    user_id: r.id,
    type: "platform_announcement",
    title,
    message,
    metadata: { broadcast_by: user.id, target_role: targetRole },
  }));

  if (records.length > 0) {
    // Insert in batches of 200
    for (let i = 0; i < records.length; i += 200) {
      const batch = records.slice(i, i + 200);
      await supabase.from("notifications").insert(batch);
    }
  }

  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "platform_notification_broadcast",
      target_type: "notifications",
      target_id: targetRole,
      changes: { recipient_count: records.length, title, message },
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/notifications");
  return { success: true, count: records.length };
}

/**
 * Admin action to settle lawyer commission payout for completed video consultations.
 */
export async function adminSettleAppointmentAction(
  appointmentId: string,
  notes?: string
) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select("id, lawyer_id, citizen_id, status, payment_status, settlement_status, lawyer_receivable, total_amount, consultation_fee, platform_fee")
    .eq("id", appointmentId)
    .single();

  if (fetchErr || !appt) throw new Error("Appointment not found.");

  if (appt.status !== "completed") {
    throw new Error("Only completed consultations can be settled.");
  }

  if (appt.settlement_status === "transferred") {
    throw new Error("This consultation payout has already been transferred.");
  }

  const payoutRef = `PAYOUT-1LINK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const { error: updateErr } = await supabase
    .from("appointments")
    .update({
      settlement_status: "transferred",
      settlement_reference: payoutRef,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (updateErr) throw new Error(updateErr.message);

  // Audit log
  try {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "consultation_payout_settled",
      target_type: "appointment",
      target_id: appointmentId,
      changes: {
        payout_reference: payoutRef,
        lawyer_receivable: appt.lawyer_receivable,
        platform_fee: appt.platform_fee,
        notes: notes || null,
      },
    });

    // Notify lawyer
    await supabase.from("notifications").insert({
      user_id: appt.lawyer_id,
      type: "payout_transferred",
      title: "Consultation Payout Transferred",
      message: `Your net consultation earnings of Rs. ${Number(appt.lawyer_receivable).toLocaleString()} (Ref: ${payoutRef}) have been settled and routed to your bank account.`,
      metadata: { appointment_id: appointmentId, payout_reference: payoutRef },
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  return { success: true, payoutRef };
}

