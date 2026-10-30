import { createClient } from "@/lib/supabase/server";
import type { Appointment, AppointmentStatus, ConsultationType } from "@/lib/types/legal";
import { sendNotification } from "@/lib/services/notifications";

export interface BookAppointmentInput {
  citizenId: string;
  lawyerId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  consultationType: ConsultationType;
  durationMinutes?: number; // 60 - 180 min
  legalCategory?: string;
  subject: string;
  description?: string;
  citizenNotes?: string;
  agreementVersion?: string;
  ipAddress?: string;
}

export async function createAppointment(
  input: BookAppointmentInput
): Promise<{ success: boolean; appointmentId?: string; appointment?: Appointment; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database connection failed" };

  const durationMinutes = Math.min(Math.max(input.durationMinutes || 60, 60), 180);

  // 1. Try atomic RPC first
  const { data: rpcData, error: rpcErr } = await supabase.rpc("create_appointment_atomic", {
    p_citizen_id: input.citizenId,
    p_lawyer_id: input.lawyerId,
    p_appointment_date: input.appointmentDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_consultation_type: input.consultationType,
    p_legal_category: input.legalCategory || null,
    p_subject: input.subject,
    p_description: input.description || null,
    p_citizen_notes: input.citizenNotes || null,
    p_citizen_ip: input.ipAddress || null,
    p_duration_minutes: durationMinutes,
  });

  if (!rpcErr && rpcData && rpcData.appointment_id) {
    const appointmentId = rpcData.appointment_id;
    // Fetch full appointment object
    const { data: createdAppt } = await supabase
      .from("appointments")
      .select(`
        *,
        citizen:profiles!appointments_citizen_id_fkey(
          id, full_name, email, phone, avatar_url, city
        ),
        lawyer:profiles!appointments_lawyer_id_fkey(
          id, full_name, email, phone, avatar_url, city
        ),
        lawyer_profile:lawyer_profiles!appointments_lawyer_id_fkey(
          professional_title, primary_specialization, office_address, consultation_fee
        )
      `)
      .eq("id", appointmentId)
      .single();

    return {
      success: true,
      appointmentId,
      appointment: (createdAppt as unknown as Appointment) || ({ id: appointmentId } as unknown as Appointment),
    };
  }

  // If RPC returned an error that is a validation message, return it directly
  if (rpcErr && !rpcErr.message.includes("does not exist") && !rpcErr.message.includes("could not find")) {
    return { success: false, error: rpcErr.message };
  }

  // Fallback: direct insert if RPC not yet created in Supabase
  const { data: lawyerProfile, error: lawyerErr } = await supabase
    .from("lawyer_profiles")
    .select("consultation_fee, verification_status, is_published, profiles(full_name)")
    .eq("id", input.lawyerId)
    .single();

  if (lawyerErr || !lawyerProfile) {
    return { success: false, error: "Lawyer not found" };
  }

  if (lawyerProfile.verification_status !== "verified" || !lawyerProfile.is_published) {
    return { success: false, error: "This lawyer is not currently verified or accepting bookings." };
  }

  // Server-side conflict check to prevent race-condition double bookings
  const { data: existingBookings } = await supabase
    .from("appointments")
    .select("id")
    .eq("lawyer_id", input.lawyerId)
    .eq("appointment_date", input.appointmentDate)
    .eq("start_time", input.startTime)
    .in("status", ["pending", "confirmed"]);

  if (existingBookings && existingBookings.length > 0) {
    return { success: false, error: "This time slot is no longer available. Please select another slot." };
  }

  const isPhysical = input.consultationType === "in_person";
  const fee = isPhysical ? 0 : (lawyerProfile.consultation_fee || 0);
  const platformFee = isPhysical ? 0 : Math.round(fee * 0.1);
  const taxAmount = 0;
  const totalAmount = fee + platformFee + taxAmount;
  const lawyerReceivable = fee;
  const paymentStatus = isPhysical ? "waived" : "unpaid";
  const settlementStatus = isPhysical ? "waived" : "pending";

  const { data: appointment, error: insertErr } = await supabase
    .from("appointments")
    .insert({
      citizen_id: input.citizenId,
      lawyer_id: input.lawyerId,
      appointment_date: input.appointmentDate,
      start_time: input.startTime,
      end_time: input.endTime,
      consultation_type: input.consultationType,
      legal_category: input.legalCategory || null,
      subject: input.subject,
      description: input.description || null,
      citizen_notes: input.citizenNotes || null,
      consultation_fee: fee,
      platform_fee: platformFee,
      platform_fee_type: "percentage",
      tax_amount: taxAmount,
      total_amount: totalAmount,
      lawyer_receivable: lawyerReceivable,
      duration_minutes: durationMinutes,
      status: "pending",
      payment_status: paymentStatus,
      settlement_status: settlementStatus,
    })
    .select(`
      *,
      citizen:profiles!appointments_citizen_id_fkey(
        id, full_name, email, phone, avatar_url, city
      ),
      lawyer:profiles!appointments_lawyer_id_fkey(
        id, full_name, email, phone, avatar_url, city
      ),
      lawyer_profile:lawyer_profiles!appointments_lawyer_id_fkey(
        professional_title, primary_specialization, office_address, consultation_fee
      )
    `)
    .single();

  if (insertErr || !appointment) {
    return { success: false, error: insertErr?.message || "Failed to create appointment" };
  }

  // Record agreement acceptance
  try {
    await supabase.from("appointment_agreements").insert({
      appointment_id: appointment.id,
      citizen_id: input.citizenId,
      lawyer_id: input.lawyerId,
      consultation_fee: fee,
      platform_fee: platformFee,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      lawyer_receivable: lawyerReceivable,
      currency: "PKR",
      agreement_version: input.agreementVersion || "v1.0",
      ip_address: input.ipAddress || null,
    });
  } catch {
    // Non-fatal if table not migrated yet
  }

  // Send notification to the lawyer
  await sendNotification(
    input.lawyerId,
    "appointment_request",
    "New Consultation Request",
    `A citizen has requested a ${input.consultationType.replace("_", " ")} consultation on ${input.appointmentDate} at ${input.startTime}.`,
    { appointment_id: appointment.id }
  );

  return { success: true, appointmentId: appointment.id, appointment: appointment as unknown as Appointment };
}

export async function getCitizenAppointments(citizenId: string): Promise<Appointment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      lawyer:profiles!appointments_lawyer_id_fkey(
        id, full_name, email, phone, avatar_url, city
      ),
      lawyer_profile:lawyer_profiles!appointments_lawyer_id_fkey(
        professional_title, primary_specialization, office_address
      )
    `)
    .eq("citizen_id", citizenId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Appointment[];
}

export async function getLawyerAppointments(lawyerId: string): Promise<Appointment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      citizen:profiles!appointments_citizen_id_fkey(
        id, full_name, email, phone, avatar_url, city
      )
    `)
    .eq("lawyer_id", lawyerId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Appointment[];
}

export async function getAppointmentById(
  id: string,
  userId: string
): Promise<Appointment | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      citizen:profiles!appointments_citizen_id_fkey(
        id, full_name, email, phone, avatar_url, city
      ),
      lawyer:profiles!appointments_lawyer_id_fkey(
        id, full_name, email, phone, avatar_url, city
      ),
      lawyer_profile:lawyer_profiles!appointments_lawyer_id_fkey(
        professional_title, primary_specialization, office_address, consultation_fee
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Authorization check
  if (data.citizen_id !== userId && data.lawyer_id !== userId) {
    return null;
  }

  return data as unknown as Appointment;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  actorId: string,
  actorRole: "citizen" | "lawyer",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  // Fetch current appointment
  const { data: appt, error: fetchErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (fetchErr || !appt) {
    return { success: false, error: "Appointment not found" };
  }

  // Authorization and State Transition Validation
  if (actorRole === "lawyer" && appt.lawyer_id !== actorId) {
    return { success: false, error: "Unauthorized" };
  }
  if (actorRole === "citizen" && appt.citizen_id !== actorId) {
    return { success: false, error: "Unauthorized" };
  }

  // Allowed state transitions:
  // Lawyer can:
  // - pending -> confirmed
  // - pending -> rejected
  // - confirmed -> completed
  // Citizen can:
  // - pending -> cancelled
  // - confirmed -> cancelled
  if (actorRole === "citizen") {
    if (newStatus !== "cancelled") {
      return { success: false, error: "Citizens can only cancel appointments." };
    }
    if (appt.status === "completed" || appt.status === "rejected") {
      return { success: false, error: `Cannot cancel a ${appt.status} appointment.` };
    }
  }

  if (actorRole === "lawyer") {
    if (appt.status === "pending" && !["confirmed", "rejected"].includes(newStatus)) {
      return { success: false, error: "Invalid status transition for pending request." };
    }
    if (appt.status === "confirmed" && !["completed", "cancelled"].includes(newStatus)) {
      return { success: false, error: "Invalid status transition for confirmed appointment." };
    }

    // Validation for completion
    if (newStatus === "completed") {
      if (appt.consultation_type === "video" && appt.payment_status !== "paid") {
        return {
          success: false,
          error: "Video consultation cannot be marked completed until client payment has been confirmed.",
        };
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    if (actorRole === "lawyer") {
      updatePayload.lawyer_notes = notes;
    } else {
      updatePayload.citizen_notes = notes;
    }
  }

  if (newStatus === "completed") {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = actorRole;
    updatePayload.settlement_status = appt.consultation_type === "video" ? "eligible" : "waived";
    if (notes) {
      updatePayload.early_completion_reason = notes;
    }
  }

  const { error: updateErr } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", appointmentId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // If completed, close active consultation session if one exists
  if (newStatus === "completed") {
    try {
      await supabase
        .from("consultation_sessions")
        .update({
          status: "ended",
          session_ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("appointment_id", appointmentId);
    } catch {
      // Non-fatal
    }
  }

  // Send notification to the other party
  const targetUserId = actorRole === "lawyer" ? appt.citizen_id : appt.lawyer_id;
  const statusTitles: Record<string, string> = {
    confirmed: appt.consultation_type === "video" 
      ? "Consultation Accepted — Payment Required" 
      : "Consultation Request Confirmed",
    rejected: "Consultation Request Declined",
    cancelled: "Consultation Cancelled",
    completed: "Consultation Marked Completed",
  };

  const notificationMessage =
    newStatus === "confirmed" && appt.consultation_type === "video"
      ? `Advocate confirmed your video appointment on ${appt.appointment_date} at ${appt.start_time}. Please complete payment to unlock your consultation room.`
      : `Your appointment for ${appt.appointment_date} at ${appt.start_time} has been marked as ${newStatus}.`;

  await sendNotification(
    targetUserId,
    `appointment_${newStatus}`,
    statusTitles[newStatus] || "Appointment Update",
    notificationMessage,
    { appointment_id: appointmentId, new_status: newStatus }
  );

  return { success: true };
}
