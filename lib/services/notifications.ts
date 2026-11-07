import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/lib/types/legal";
import { sendSmtpEmail } from "@/lib/services/email";

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return { success: !error };
}

export async function markAllNotificationsRead(userId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  return { success: !error };
}

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean }> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return { success: false };

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    metadata,
  });

  // Also dispatch email notification via SMTP / Outbox Log
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, notification_preferences")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.email) {
      const prefs = (profile.notification_preferences ?? {}) as Record<string, boolean>;
      const isPayment = type.includes("payment") || type.includes("refund");
      const isAppointment = type.includes("appointment") || type.includes("consultation");
      const allowEmail =
        (isPayment && prefs.email_payments !== false) ||
        (isAppointment && prefs.email_appointments !== false) ||
        (!isPayment && !isAppointment);

      if (allowEmail) {
        await sendSmtpEmail({
          to: profile.email,
          subject: `[LegalEase] ${title}`,
          text: `Assalam-o-Alaikum ${profile.full_name || "User"},\n\n${message}\n\nLog in to your LegalEase dashboard to view details and take action.\n\nRegards,\nLegalEase Pakistan Notification System`,
          userId,
          notificationType: type,
          metadata,
        });
      }
    }
  } catch {
    // Non-blocking: in-app notification is already saved
  }

  return { success: !error };
}
