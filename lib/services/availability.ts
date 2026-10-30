import { createClient } from "@/lib/supabase/server";
import type { LawyerAvailability, LawyerTimeOff } from "@/lib/types/legal";

export async function getLawyerAvailability(lawyerId: string): Promise<LawyerAvailability[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lawyer_availability")
    .select("*")
    .eq("lawyer_id", lawyerId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function setLawyerAvailability(
  lawyerId: string,
  slots: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  // Delete current availability and replace
  const { error: delError } = await supabase
    .from("lawyer_availability")
    .delete()
    .eq("lawyer_id", lawyerId);

  if (delError) return { success: false, error: delError.message };

  if (slots.length > 0) {
    const { error: insError } = await supabase.from("lawyer_availability").insert(
      slots.map((s) => ({
        lawyer_id: lawyerId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: s.is_active,
      }))
    );
    if (insError) return { success: false, error: insError.message };
  }

  return { success: true };
}

export async function getLawyerTimeOff(lawyerId: string): Promise<LawyerTimeOff[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lawyer_time_off")
    .select("*")
    .eq("lawyer_id", lawyerId)
    .gte("end_datetime", new Date().toISOString())
    .order("start_datetime", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function addLawyerTimeOff(
  lawyerId: string,
  startDatetime: string,
  endDatetime: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { error } = await supabase.from("lawyer_time_off").insert({
    lawyer_id: lawyerId,
    start_datetime: startDatetime,
    end_datetime: endDatetime,
    reason: reason || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteLawyerTimeOff(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from("lawyer_time_off").delete().eq("id", id);
  return { success: !error };
}

/**
 * Computes available booking timeslots on a specific date for a lawyer.
 * Verifies weekly availability MINUS time-off MINUS existing pending/confirmed appointments.
 */
export async function getAvailableSlotsForDate(
  lawyerId: string,
  dateStr: string, // YYYY-MM-DD
  customDurationMinutes?: number
): Promise<{ start_time: string; end_time: string }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const selectedDate = new Date(`${dateStr}T00:00:00Z`);
  const dayOfWeek = selectedDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // 1. Get weekly availability for this day of week
  const { data: availList, error: availError } = await supabase
    .from("lawyer_availability")
    .select("*")
    .eq("lawyer_id", lawyerId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  if (availError || !availList || availList.length === 0) {
    // If lawyer has no explicit custom intervals set, provide default professional business hours (09:00 - 17:00, Mon-Fri)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Closed on weekends by default if no slots
      return [];
    }
  }

  // Use configured slots or default 9-5
  const intervals =
    availList && availList.length > 0
      ? availList
      : [{ start_time: "09:00:00", end_time: "17:00:00" }];

  // 2. Determine slot duration: respect custom requested duration or default to lawyer profile/60 min
  const { data: lawyerProfile } = await supabase
    .from("lawyer_profiles")
    .select("consultation_duration")
    .eq("id", lawyerId)
    .maybeSingle();

  const slotDurationMinutes =
    customDurationMinutes && customDurationMinutes >= 60 && customDurationMinutes <= 180
      ? customDurationMinutes
      : (lawyerProfile?.consultation_duration || 60);

  // 3. Get existing active appointments for this date
  const { data: bookedAppointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("lawyer_id", lawyerId)
    .eq("appointment_date", dateStr)
    .in("status", ["pending", "confirmed"]);

  const bookedSlots = bookedAppointments || [];

  // 4. Get time-off overlapping this date
  const dayStart = `${dateStr}T00:00:00Z`;
  const dayEnd = `${dateStr}T23:59:59Z`;

  const { data: timeOffList } = await supabase
    .from("lawyer_time_off")
    .select("start_datetime, end_datetime")
    .eq("lawyer_id", lawyerId)
    .lte("start_datetime", dayEnd)
    .gte("end_datetime", dayStart);

  // Generate candidate slots in duration increments (30 min step increments for flexibility)
  const availableSlots: { start_time: string; end_time: string }[] = [];
  const stepMinutes = Math.min(slotDurationMinutes, 30);

  for (const interval of intervals) {
    const [startH, startM] = interval.start_time.split(":").map(Number);
    const [endH, endM] = interval.end_time.split(":").map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + slotDurationMinutes <= endMinutes) {
      const slotStartMinutes = currentMinutes;
      const slotEndMinutes = currentMinutes + slotDurationMinutes;

      const sh = String(Math.floor(slotStartMinutes / 60)).padStart(2, "0");
      const sm = String(slotStartMinutes % 60).padStart(2, "0");
      const eh = String(Math.floor(slotEndMinutes / 60)).padStart(2, "0");
      const em = String(slotEndMinutes % 60).padStart(2, "0");

      const slotStart = `${sh}:${sm}`;
      const slotEnd = `${eh}:${em}`;

      // Accurate interval overlap collision check:
      // Overlaps if slotStart < bEnd AND slotEnd > bStart
      const isBooked = bookedSlots.some((b) => {
        const [bsh, bsm] = b.start_time.slice(0, 5).split(":").map(Number);
        const [beh, bem] = b.end_time.slice(0, 5).split(":").map(Number);
        const bStartMinutes = bsh * 60 + bsm;
        const bEndMinutes = beh * 60 + bem;
        return slotStartMinutes < bEndMinutes && slotEndMinutes > bStartMinutes;
      });

      // Check collision with time off
      const slotStartTime = new Date(`${dateStr}T${slotStart}:00Z`).getTime();
      const slotEndTime = new Date(`${dateStr}T${slotEnd}:00Z`).getTime();
      const isTimeOff = (timeOffList || []).some((to) => {
        const toStart = new Date(to.start_datetime).getTime();
        const toEnd = new Date(to.end_datetime).getTime();
        return slotStartTime < toEnd && slotEndTime > toStart;
      });

      if (!isBooked && !isTimeOff) {
        availableSlots.push({ start_time: slotStart, end_time: slotEnd });
      }

      currentMinutes += stepMinutes;
    }
  }

  return availableSlots;
}
