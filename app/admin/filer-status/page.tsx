import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { FilerAdminClient } from "@/components/admin/filer-admin-client";

export const metadata: Metadata = {
  title: "Filer Dataset Management | Admin Portal",
  description: "Upload and manage FBR Active Taxpayers List datasets for citizen CNIC status checks.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminFilerStatusPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    redirect("/");
  }

  const admin = createAdminClient();
  let datasets: Array<{
    id: string;
    file_name: string;
    file_type: string;
    source: string;
    tax_year: string | null;
    effective_date: string | null;
    record_count: number;
    filer_count: number;
    non_filer_count: number;
    status: string;
    uploaded_by: string | null;
    uploaded_at: string;
    activated_at: string | null;
    metadata: Record<string, unknown>;
  }> = [];

  if (admin) {
    const { data } = await admin
      .from("filer_datasets")
      .select(
        "id, file_name, file_type, source, tax_year, effective_date, record_count, filer_count, non_filer_count, status, uploaded_by, uploaded_at, activated_at, metadata"
      )
      .order("uploaded_at", { ascending: false });
    datasets = data ?? [];
  }

  const activeDataset = datasets.find((d) => d.status === "active") ?? null;
  const totalRecords = activeDataset?.record_count ?? 0;
  const filerCount = activeDataset?.filer_count ?? 0;
  const nonFilerCount = activeDataset?.non_filer_count ?? 0;

  return (
    <FilerAdminClient
      datasets={datasets}
      activeDataset={activeDataset}
      totalRecords={totalRecords}
      filerCount={filerCount}
      nonFilerCount={nonFilerCount}
    />
  );
}
