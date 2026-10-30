import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/profile";
import { FilerStatusClient } from "@/components/citizen/filer-status-client";

export const metadata: Metadata = {
  title: "Check Filer Status | LegalEase",
  description:
    "Check whether your CNIC is listed as a filer or non-filer in the active LegalEase taxpayer dataset.",
  robots: { index: false },
};

export default async function CitizenFilerStatusPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  return <FilerStatusClient />;
}
