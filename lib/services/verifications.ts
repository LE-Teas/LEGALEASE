import { createClient } from "@/lib/supabase/server";
import type { LawyerVerification } from "@/lib/types/legal";
import { sendNotification } from "@/lib/services/notifications";

export async function getLawyerVerification(
  lawyerId: string
): Promise<LawyerVerification | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("lawyer_verifications")
    .select("*")
    .eq("lawyer_id", lawyerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as LawyerVerification;
}

export async function submitLawyerVerification(input: {
  lawyerId: string;
  barCouncil: string;
  licenseNumber: string;
  licenseDocumentPath?: string;
  additionalDocumentPath?: string;
}): Promise<{ success: boolean; verification?: LawyerVerification; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data, error } = await supabase
    .from("lawyer_verifications")
    .insert({
      lawyer_id: input.lawyerId,
      bar_council: input.barCouncil,
      license_number: input.licenseNumber,
      license_document_path: input.licenseDocumentPath || null,
      additional_document_path: input.additionalDocumentPath || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message };

  // Explicitly update lawyer_profiles for resilience
  await supabase
    .from("lawyer_profiles")
    .update({
      verification_status: "pending",
      is_published: false,
      bar_council: input.barCouncil,
      bar_license_number: input.licenseNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.lawyerId);

  // Notify lawyer of submission receipt
  await sendNotification(
    input.lawyerId,
    "verification_submitted",
    "Verification Documents Submitted",
    "Your bar license credentials have been received and are pending administrator verification."
  );

  return { success: true, verification: data as unknown as LawyerVerification };
}
