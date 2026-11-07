import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/types/legal";
import { sendNotification } from "@/lib/services/notifications";

export async function submitReview(
  appointmentId: string,
  citizenId: string,
  rating: number,
  comment?: string | null
): Promise<{ success: boolean; review?: Review; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  if (rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5 stars." };
  }

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (apptErr || !appt) {
    return { success: false, error: "Appointment not found." };
  }

  if (appt.citizen_id !== citizenId) {
    return { success: false, error: "You can only review your own appointments." };
  }

  if (appt.status !== "completed") {
    return {
      success: false,
      error: "You can only submit a review after the consultation is completed.",
    };
  }

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existingReview) {
    return {
      success: false,
      error: "You have already submitted a review for this consultation.",
    };
  }

  const { data: review, error: insertErr } = await supabase
    .from("reviews")
    .insert({
      appointment_id: appointmentId,
      citizen_id: citizenId,
      lawyer_id: appt.lawyer_id,
      rating,
      comment: comment?.trim() || "",
    })
    .select("*")
    .single();

  if (insertErr || !review) {
    return { success: false, error: insertErr?.message || "Failed to submit review." };
  }

  // Mark rating_submitted on appointment
  await supabase
    .from("appointments")
    .update({ rating_submitted: true, updated_at: new Date().toISOString() })
    .eq("id", appointmentId);

  // Notify lawyer of new review
  await sendNotification(
    appt.lawyer_id,
    "new_review",
    "New Client Review Received",
    `A client gave you a ${rating}-star review for consultation on ${appt.appointment_date}.`,
    { review_id: review.id, rating }
  );

  return { success: true, review };
}

export async function respondOrFlagReview(params: {
  reviewId: string;
  lawyerId: string;
  lawyerResponse?: string;
  isFlagged?: boolean;
  flagReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data: existing } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", params.reviewId)
    .eq("lawyer_id", params.lawyerId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Review not found or unauthorized." };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof params.lawyerResponse === "string") {
    updates.lawyer_response = params.lawyerResponse.trim() || null;
    updates.lawyer_responded_at = params.lawyerResponse.trim()
      ? new Date().toISOString()
      : null;
  }

  if (typeof params.isFlagged === "boolean") {
    updates.is_flagged = params.isFlagged;
    updates.flag_reason = params.flagReason?.trim() || null;
  }

  const { error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", params.reviewId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getLawyerReviews(lawyerId: string): Promise<Review[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      citizen:profiles!reviews_citizen_id_fkey(
        full_name,
        avatar_url
      )
    `)
    .eq("lawyer_id", lawyerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Review[];
}
