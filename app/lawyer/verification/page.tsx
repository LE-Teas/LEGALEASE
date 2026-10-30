import { getAuthState } from "@/lib/auth/profile";
import { getOrCreateLawyerProfile } from "@/lib/services/lawyer-portal";
import { getLawyerVerification } from "@/lib/services/verifications";
import { LawyerVerificationForm } from "@/components/lawyer/verification-form";

export const metadata = {
  title: "Advocate Verification | Lawyer Portal",
  description: "Submit and track your Bar Council licensing credentials and verification status.",
};

export default async function LawyerVerificationPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const [lawyer, verification] = await Promise.all([
    getOrCreateLawyerProfile(user.id),
    getLawyerVerification(user.id),
  ]);

  if (!lawyer) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Bar Council Verification
        </h2>
        <p className="text-sm text-muted-foreground">
          Earn the verified advocate badge to appear in public searches and build trust with prospective clients.
        </p>
      </div>

      <LawyerVerificationForm lawyer={lawyer} verification={verification} />
    </div>
  );
}
