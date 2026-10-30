import { redirect } from "next/navigation";
import { getAuthState, dashboardPathForRole } from "@/lib/auth/profile";
import { isSupabaseConfigured } from "@/lib/config/supabase";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings2 } from "lucide-react";

export const metadata = {
  title: "Lawyer Portal | LegalEase",
  description: "Professional dashboard for lawyers in Pakistan to manage consultations, schedule, and verification.",
  robots: { index: false },
};

export default async function LawyerLayout({
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

  if (!profile || profile.role !== "lawyer") {
    redirect(dashboardPathForRole(profile?.role));
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
