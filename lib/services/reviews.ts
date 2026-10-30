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

  // 1. Verify appointment is completed and belongs to citizen
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
    return { success: false, error: "You can only submit a review after the consultation is completed." };
  }

  // 2. Check if a review already exists for this appointment
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existingReview) {
    return { success: false, error: "You have already submitted a review for this consultation." };
  }

  // 3. Insert review (mandatory 1-5 rating, optional comment)
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
