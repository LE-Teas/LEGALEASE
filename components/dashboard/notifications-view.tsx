"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NotificationItem } from "@/lib/types/legal";
import { createClient } from "@/lib/supabase/client";

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
}

export function NotificationsView({ initialNotifications }: NotificationsViewProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("realtime:notifications_view")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newItem = payload.new as NotificationItem;
            setNotifications((prev) => [newItem, ...prev.filter((item) => item.id !== newItem.id)]);
          } else if (payload.eventType === "UPDATE") {
            const updatedItem = payload.new as NotificationItem;
            setNotifications((prev) =>
              prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkOne = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-navy text-white text-xs" : "text-xs"}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={filter === "unread" ? "bg-navy text-white text-xs" : "text-xs"}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={markingAll}
            className="text-xs text-teal hover:text-navy"
          >
            {markingAll ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-1.5 size-3.5" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Bell className="size-7" />
          </div>
          <h3 className="mt-4 font-heading text-lg font-bold text-navy">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            You will be alerted here whenever there is an appointment status update, new consultation enquiry, or message.
          </p>
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="divide-y divide-slate-100 p-0">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-4 p-5 transition-colors ${
                  !n.read_at ? "bg-teal-soft/20 font-medium" : "hover:bg-slate-50/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-sm font-bold text-navy">{n.title}</p>
                    {!n.read_at && (
                      <Badge className="bg-teal text-white text-[10px]">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    {new Date(n.created_at).toLocaleDateString("en-PK", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkOne(n.id)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-navy"
                    title="Mark as read"
                  >
                    <Check className="mr-1 size-3.5" />
                    Read
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
