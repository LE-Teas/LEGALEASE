import { getAuthState } from "@/lib/auth/profile";
import { getOrCreateLawyerProfile } from "@/lib/services/lawyer-portal";
import { LawyerSettingsView } from "@/components/lawyer/lawyer-settings-view";

export const metadata = {
  title: "Settings | Lawyer Portal",
  description: "Account settings, consultation preferences, notifications, and security.",
};

export default async function LawyerSettingsPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const lawyerProfile = await getOrCreateLawyerProfile(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Lawyer Portal Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your credentials, professional preferences, notifications, and security.
        </p>
      </div>

      <LawyerSettingsView profile={profile} lawyerProfile={lawyerProfile} />
    </div>
  );
}
