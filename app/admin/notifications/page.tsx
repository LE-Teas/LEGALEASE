import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Bell,
  Megaphone,
  CheckCircle2,
  Clock,
  Search,
  Users,
  ShieldCheck,
  CalendarClock,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BroadcastNotificationDialog } from "@/components/admin/broadcast-notification-dialog";

export const metadata: Metadata = {
  title: "Platform Notifications & Communications | LegalEase Admin",
  description: "Dispatch platform-wide announcements, inspect notification delivery logs, and track user engagement.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ type?: string; search?: string }>;
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  const { type, search } = await searchParams;
  const supabase = await createClient();

  let notifications: any[] = [];
  let totalCount = 0;
  let readCount = 0;
  let broadcastCount = 0;

  if (supabase) {
    let query = supabase
      .from("notifications")
      .select(`
        id,
        user_id,
        type,
        title,
        message,
        read_at,
        created_at,
        recipient:profiles!notifications_user_id_fkey(full_name, email, role)
      `)
      .order("created_at", { ascending: false })
      .limit(60);

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    const { data } = await query;
    if (data) {
      notifications = data;
      totalCount = data.length;
      data.forEach((n) => {
        if (n.read_at) readCount++;
        if (n.type.includes("broadcast") || n.type.includes("announcement")) broadcastCount++;
      });

      if (search && search.trim()) {
        const q = search.toLowerCase();
        notifications = notifications.filter(
          (n) =>
            n.title?.toLowerCase().includes(q) ||
            n.message?.toLowerCase().includes(q) ||
            n.recipient?.full_name?.toLowerCase().includes(q)
        );
      }
    }
  }

  const getTypeBadge = (t: string) => {
    if (t.includes("verification")) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Verification</Badge>;
    }
    if (t.includes("appointment")) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Appointment</Badge>;
    }
    if (t.includes("announcement") || t.includes("broadcast")) {
      return <Badge className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]">Announcement</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] capitalize">{t.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <Megaphone className="size-6 text-[#0CA275]" />
            Platform Communications & Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch announcements to citizens and advocates, and monitor system notification delivery logs.
          </p>
        </div>

        <BroadcastNotificationDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Recent Dispatches</p>
              <p className="font-heading text-2xl font-bold text-[#0A2843] mt-0.5">{totalCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Logged notifications</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-[#0A2843]">
              <Bell className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Announcements Broadcasted</p>
              <p className="font-heading text-2xl font-bold text-[#0CA275] mt-0.5">{broadcastCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Platform-wide messages</p>
            </div>
            <div className="p-3 rounded-xl bg-[#ECFDF5] text-[#0CA275]">
              <Megaphone className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Read Status Rate</p>
              <p className="font-heading text-2xl font-bold text-blue-700 mt-0.5">
                {totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{readCount} notifications marked read</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base text-[#0A2843]">
              Notification Dispatch History
            </CardTitle>
            <CardDescription className="text-xs">
              Delivery records generated by platform events and administrator broadcasts
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Title & Message</th>
                  <th className="px-4 py-3">Dispatched At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                      No notification events recorded yet.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">{getTypeBadge(n.type)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{n.recipient?.full_name || "Platform User"}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{n.recipient?.role || "Citizen"}</div>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="font-semibold text-slate-800">{n.title}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {n.read_at ? (
                          <Badge variant="outline" className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]">
                            Read
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 text-[10px]">
                            Delivered
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
