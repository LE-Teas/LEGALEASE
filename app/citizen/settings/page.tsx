import { getAuthState } from "@/lib/auth/profile";
import { SettingsView } from "@/components/dashboard/settings-view";

export const metadata = {
  title: "Settings | Citizen Portal",
  description: "Account settings, password updates, and security preferences.",
};

export default async function CitizenSettingsPage() {
  const { profile } = await getAuthState();
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Account Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your password, account credentials, and privacy options.
        </p>
      </div>

      <SettingsView profile={profile} />
    </div>
  );
}
