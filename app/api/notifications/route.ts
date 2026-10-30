import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/notifications";

export async function GET() {
  try {
    const { user } = await getAuthState();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await getUserNotifications(user.id);
    return NextResponse.json({ notifications });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await getAuthState();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      const res = await markAllNotificationsRead(user.id);
      return NextResponse.json({ success: res.success });
    }

    if (notificationId) {
      const res = await markNotificationRead(notificationId, user.id);
      return NextResponse.json({ success: res.success });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
