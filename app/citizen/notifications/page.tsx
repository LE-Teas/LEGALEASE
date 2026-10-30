import { getAuthState } from "@/lib/auth/profile";
import { getUserNotifications } from "@/lib/services/notifications";
import { NotificationsView } from "@/components/dashboard/notifications-view";

export const metadata = {
  title: "Notifications | Citizen Portal",
  description: "Stay updated on your consultation requests, advocate confirmations, and legal notices.",
};

export default async function CitizenNotificationsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const notifications = await getUserNotifications(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Notifications & Alerts
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time updates regarding your consultation requests and advocate responses.
        </p>
      </div>

      <NotificationsView initialNotifications={notifications} />
    </div>
  );
}
