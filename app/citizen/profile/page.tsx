import { getAuthState } from "@/lib/auth/profile";
import { CitizenProfileForm } from "@/components/citizen/profile-form";

export const metadata = {
  title: "My Profile | Citizen Portal",
};

export default async function CitizenProfilePage() {
  const { profile } = await getAuthState();
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Citizen Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal details, location, and communication preferences.
        </p>
      </div>

      <CitizenProfileForm initialProfile={profile} />
    </div>
  );
}
