import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FileVaultClient } from "@/components/citizen/file-vault-client";
import type { CitizenFile } from "@/lib/types/legal";

export const metadata = {
  title: "My Legal Files & RAG Vault | Citizen Portal",
  description:
    "Upload private contracts, tenancy agreements, notices, and FIRs for confidential File-Based RAG legal analysis.",
};

export default async function CitizenFilesPage() {
  const { user } = await getAuthState();
  if (!user) redirect("/login");

  const supabase = createAdminClient() ?? (await createClient());
  let files: CitizenFile[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("citizen_files")
      .select("*")
      .eq("citizen_id", user.id)
      .order("created_at", { ascending: false });
    if (data) files = data as CitizenFile[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-[#0d2b43]">
          Private Legal File Vault (File-Based RAG)
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload personal legal documents (tenancy agreements, contracts, legal notices, FIRs) to run confidential, user-scoped AI legal analysis alongside verified Pakistani statutes.
        </p>
      </div>

      <FileVaultClient initialFiles={files} />
    </div>
  );
}

