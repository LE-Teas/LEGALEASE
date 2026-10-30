import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getAuthState } from "@/lib/auth/profile";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Create a new password for your LegalEase account.",
  robots: { index: false },
};

export default async function ResetPasswordPage() {
  const { user } = await getAuthState();

  // This page is only reachable from a valid password-reset link
  // (the auth callback exchanges the code and creates a session first).
  if (!user) {
    redirect("/auth/error?error=invalid_link");
  }

  return (
    <div className="bg-grid-light mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <AuthCard
        title="Choose a new password"
        description="Pick something you haven't used before. You'll log in with it next time."
      >
        <ResetPasswordForm />
      </AuthCard>
    </div>
  );
}