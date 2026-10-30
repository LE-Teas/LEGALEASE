import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/lib/types/legal";

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
  const supabase = await createClient();
  if (!supabase) return { success: false };

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    metadata,
  });

  return { success: !error };
}
