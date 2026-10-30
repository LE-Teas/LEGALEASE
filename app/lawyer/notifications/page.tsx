import { getAuthState } from "@/lib/auth/profile";
import { getUserNotifications } from "@/lib/services/notifications";
import { NotificationsView } from "@/components/dashboard/notifications-view";

export const metadata = {
  title: "Notifications | Lawyer Portal",
  description: "Stay updated on appointment requests, client reviews, and account verifications.",
};

export default async function LawyerNotificationsPage() {
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
          Real-time updates regarding consultation requests, client reviews, and bar council verification.
        </p>
      </div>

      <NotificationsView initialNotifications={notifications} />
    </div>
  );
}
