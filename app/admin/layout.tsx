import { redirect } from "next/navigation";
import { getAuthState, dashboardPathForRole } from "@/lib/auth/profile";
import { isSupabaseConfigured } from "@/lib/config/supabase";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings2 } from "lucide-react";

export const metadata = {
  title: "Admin Portal | LegalEase",
  description: "Centralized platform administration, lawyer verification, platform fee management, and AI settings.",
  robots: { index: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl p-8 mt-12">
        <Alert>
          <Settings2 className="size-4" />
          <AlertTitle>Supabase not configured</AlertTitle>
          <AlertDescription>
            Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { user, profile } = await getAuthState();

  if (!user) {
    redirect("/login");
  }

  if (!profile || profile.role !== "admin") {
    redirect(dashboardPathForRole(profile?.role));
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
