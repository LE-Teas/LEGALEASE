import { createClient } from "@/lib/supabase/server";
import type { CitizenDocument } from "@/lib/types/legal";

export async function getCitizenDocuments(citizenId: string): Promise<CitizenDocument[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("citizen_documents")
    .select("*")
    .eq("citizen_id", citizenId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function getCitizenDocumentById(
  id: string,
  citizenId: string
): Promise<CitizenDocument | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("citizen_documents")
    .select("*")
    .eq("id", id)
    .eq("citizen_id", citizenId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function saveCitizenDocument(input: {
  id?: string;
  citizenId: string;
  templateType: string;
  title: string;
  formData: Record<string, string>;
  generatedContent: string;
  status: "draft" | "generated" | "finalized";
}): Promise<{ success: boolean; document?: CitizenDocument; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  if (input.id) {
    const { data, error } = await supabase
      .from("citizen_documents")
      .update({
        title: input.title,
        template_type: input.templateType,
        form_data: input.formData,
        generated_content: input.generatedContent,
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("citizen_id", input.citizenId)
      .select("*")
      .single();

    if (error || !data) return { success: false, error: error?.message };
    return { success: true, document: data };
  }

  const { data, error } = await supabase
    .from("citizen_documents")
    .insert({
      citizen_id: input.citizenId,
      template_type: input.templateType,
      title: input.title,
      form_data: input.formData,
      generated_content: input.generatedContent,
      status: input.status,
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message };
  return { success: true, document: data };
}

export async function deleteCitizenDocument(
  id: string,
  citizenId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { error } = await supabase
    .from("citizen_documents")
    .delete()
    .eq("id", id)
    .eq("citizen_id", citizenId);

  return { success: !error };
}
