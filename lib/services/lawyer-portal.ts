import { createClient } from "@/lib/supabase/server";
import type {
  Appointment,
  LawyerProfileRecord,
  LawyerVerification,
  Review,
} from "@/lib/types/legal";
import type { Profile } from "@/lib/auth/types";

export interface LawyerClientSummary {
  citizen_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  consultation_count: number;
  last_consultation_date: string;
  upcoming_consultation_date: string | null;
}

export function calculateProfileCompletion(
  lawyer: Partial<LawyerProfileRecord>,
  profile: Partial<Profile>
): { percentage: number; missingFields: string[] } {
  const checks: { label: string; done: boolean }[] = [
    { label: "Profile Photo", done: Boolean(profile.avatar_url) },
    { label: "Professional Bio", done: Boolean(lawyer.bio && lawyer.bio.length >= 20) },
    {
      label: "Practice Areas",
      done: Boolean(lawyer.specializations && lawyer.specializations.length > 0),
    },
    { label: "Experience Years", done: Boolean(lawyer.years_of_experience && lawyer.years_of_experience > 0) },
    { label: "Bar Council Details", done: Boolean(lawyer.bar_council && lawyer.bar_license_number) },
    { label: "Office Address & City", done: Boolean(lawyer.city && lawyer.office_address) },
    { label: "Consultation Fee", done: Boolean(lawyer.consultation_fee && lawyer.consultation_fee > 0) },
    { label: "Consultation Channels", done: Boolean(lawyer.offers_in_person || lawyer.offers_video || lawyer.offers_phone) },
  ];

  const completed = checks.filter((c) => c.done).length;
  const percentage = Math.round((completed / checks.length) * 100);
  const missingFields = checks.filter((c) => !c.done).map((c) => c.label);

  return { percentage, missingFields };
}

export async function getOrCreateLawyerProfile(
  userId: string
): Promise<LawyerProfileRecord | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("lawyer_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing;

  // Insert default row
  const { data: inserted, error } = await supabase
    .from("lawyer_profiles")
    .insert({
      id: userId,
      professional_title: "Advocate High Court",
      city: "Karachi",
      verification_status: "not_submitted",
      is_published: true,
      consultation_fee: 3000,
      consultation_duration: 30,
    })
    .select("*")
    .single();

  if (error || !inserted) return null;
  return inserted;
}

export async function getLawyerClients(lawyerId: string): Promise<LawyerClientSummary[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: appts, error } = await supabase
    .from("appointments")
    .select(`
      id,
      citizen_id,
      appointment_date,
      status,
      citizen:profiles!appointments_citizen_id_fkey(
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("lawyer_id", lawyerId)
    .order("appointment_date", { ascending: false });

  if (error || !appts) return [];

  const clientMap = new Map<string, LawyerClientSummary>();
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const a of appts) {
    const cit = (a as any).citizen;
    if (!cit) continue;

    if (!clientMap.has(a.citizen_id)) {
      clientMap.set(a.citizen_id, {
        citizen_id: a.citizen_id,
        full_name: cit.full_name || "Citizen",
        email: cit.email || "",
        phone: cit.phone || null,
        avatar_url: cit.avatar_url || null,
        consultation_count: 0,
        last_consultation_date: a.appointment_date,
        upcoming_consultation_date: null,
      });
    }

    const item = clientMap.get(a.citizen_id)!;
    item.consultation_count += 1;

    if (a.appointment_date >= todayStr && (a.status === "confirmed" || a.status === "pending")) {
      if (!item.upcoming_consultation_date || a.appointment_date < item.upcoming_consultation_date) {
        item.upcoming_consultation_date = a.appointment_date;
      }
    }
  }

  return Array.from(clientMap.values());
}
