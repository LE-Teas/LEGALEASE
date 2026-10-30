import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getOrCreateLawyerProfile } from "@/lib/services/lawyer-portal";
import { Button } from "@/components/ui/button";
import { LawyerProfileEditor } from "@/components/lawyer/profile-editor";

export const metadata = {
  title: "Edit Chamber Profile | Lawyer Portal",
};

export default async function LawyerProfileEditPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const lawyer = await getOrCreateLawyerProfile(user.id);
  if (!lawyer) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-navy">
          <Link href="/lawyer/profile">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Profile
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Edit Chamber Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your professional bio, practice areas, office location, and consultation options.
        </p>
      </div>

      <LawyerProfileEditor lawyer={lawyer} profile={profile} />
    </div>
  );
}
