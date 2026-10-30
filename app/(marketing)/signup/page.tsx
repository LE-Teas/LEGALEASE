import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupFlow } from "@/components/auth/signup-flow";
import { dashboardPathForRole, getAuthState } from "@/lib/auth/profile";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free LegalEase account.",
  robots: { index: false },
};

export default async function SignupPage() {
  const { user, profile } = await getAuthState();

  if (user && profile) {
    redirect(dashboardPathForRole(profile.role));
  }

  return (
    <div className="bg-grid-light mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <AuthCard
        title="Create your account"
        description="Free to join. Browse verified lawyers, save favourites, and prepare for consultations."
      >
        <SignupFlow />
      </AuthCard>
    </div>
  );
}