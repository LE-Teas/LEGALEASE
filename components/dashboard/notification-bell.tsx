"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItem } from "@/lib/types/legal";

interface NotificationBellProps {
  userId: string;
  role: "citizen" | "lawyer";
}

export function NotificationBell({ userId, role }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    const supabase = createClient();
    if (!supabase) return;

    // Supabase Realtime listener
    const channel = supabase
      .channel(`realtime:notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationItem, ...prev.slice(0, 9)]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const notificationsUrl = `/${role}/notifications`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-navy hover:bg-navy/5">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy-dark">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between p-3">
          <DropdownMenuLabel className="p-0 font-heading text-sm font-bold text-navy">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-gold/20 text-xs font-semibold text-navy">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-3 p-3 transition-colors hover:bg-navy/[0.02] ${
                  !n.read_at ? "bg-teal-soft/30 font-medium" : ""
                }`}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-navy">{n.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground/80">
                    {new Date(n.created_at).toLocaleDateString("en-PK", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-navy"
                    onClick={(e) => handleMarkAsRead(n.id, e)}
                    title="Mark as read"
                  >
                    <Check className="size-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="p-2.5 text-center justify-center cursor-pointer">
          <Link
            href={notificationsUrl}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-navy"
          >
            <span>View all notifications</span>
            <ExternalLink className="size-3" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
