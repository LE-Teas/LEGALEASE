import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Construction, Settings2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/config/supabase";
import {
  dashboardPathForRole,
  getAuthState,
} from "@/lib/auth/profile";
import type { Role } from "@/lib/auth/types";
import { DashboardLogoutButton } from "@/components/dashboard/logout-button";

interface ProtectedDashboardProps {
  role: Role;
  heading: string;
  description: string;
  comingSoon: ReactNode;
}

/**
 * Placeholder dashboard shared by citizens and lawyers. Enforces auth +
 * role server-side (in addition to the proxy matcher): unauthenticated users
 * are sent to /login, wrong-role users to their own dashboard.
 */
export async function ProtectedDashboard({
  role,
  heading,
  description,
  comingSoon,
}: ProtectedDashboardProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Alert className="max-w-xl">
          <Settings2 />
          <AlertTitle>Supabase isn&apos;t configured</AlertTitle>
          <AlertDescription>
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            your .env.local file, then run the profile migration (see
            supabase/migrations) and restart the dev server.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { user, profile } = await getAuthState();

  if (!user) {
    redirect("/login");
  }

  if (!profile || profile.role !== role) {
    redirect(dashboardPathForRole(profile?.role));
  }

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            {heading}
          </h1>
        </div>
        <DashboardLogoutButton />
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <Card className="mt-8 overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-navy/[0.03]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy text-white">
              <Construction className="size-5" />
            </span>
            <div>
              <CardTitle className="flex items-center gap-2">
                Your {role} dashboard is being prepared
                <Badge className="bg-gold text-navy-dark" variant="secondary">
                  Coming soon
                </Badge>
              </CardTitle>
              <CardDescription>
                We&apos;re building this section now — these features are next.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">{comingSoon}</CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Questions?{" "}
          <Link href="/contact" className="font-medium text-teal hover:text-navy">
            Contact support
          </Link>
        </p>
        <Button asChild variant="ghost" className="text-navy">
          <Link href="/">
            Back to homepage
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
  );
}