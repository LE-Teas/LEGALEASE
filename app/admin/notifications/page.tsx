import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Bell,
  Megaphone,
  CheckCircle2,
  Search,
  Mail,
  Inbox,
  Send,
  Settings,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BroadcastNotificationDialog } from "@/components/admin/broadcast-notification-dialog";
import { EmailInboxControls } from "@/components/admin/email-inbox-controls";
import { getEmailNotificationLogs } from "@/lib/services/email";

export const metadata: Metadata = {
  title: "Platform Notifications & SMTP Email Center | LegalEase Admin",
  description:
    "Dispatch platform-wide announcements, inspect outbound SMTP delivery logs, and receive inbound notification emails.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string; type?: string; search?: string }>;
}

interface AdminNotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  recipient?: { full_name: string | null; email: string | null; role: string | null } | null;
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  const { tab = "in_app", type = "all", search = "" } = await searchParams;
  const supabase = await createClient();

  let notifications: AdminNotificationRow[] = [];
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
      .limit(80);

    if (type && type !== "all") {
      query = query.ilike("type", `%${type}%`);
    }

    const { data } = await query;
    if (data) {
      notifications = data as unknown as AdminNotificationRow[];
      totalCount = data.length;
      data.forEach((n) => {
        if (n.read_at) readCount++;
        if (n.type.includes("broadcast") || n.type.includes("announcement")) {
          broadcastCount++;
        }
      });

      if (search && search.trim()) {
        const q = search.toLowerCase();
        notifications = notifications.filter(
          (n) =>
            n.title?.toLowerCase().includes(q) ||
            n.message?.toLowerCase().includes(q) ||
            n.recipient?.full_name?.toLowerCase().includes(q) ||
            n.recipient?.email?.toLowerCase().includes(q)
        );
      }
    }
  }

  const outboundEmails = await getEmailNotificationLogs({
    direction: "outbound",
    limit: 60,
  });
  const inboundEmails = await getEmailNotificationLogs({
    direction: "inbound",
    limit: 60,
  });

  const getTypeBadge = (t: string) => {
    if (t.includes("verification")) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
          Verification
        </Badge>
      );
    }
    if (t.includes("appointment")) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
          Appointment
        </Badge>
      );
    }
    if (t.includes("payment") || t.includes("refund")) {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
          Payment
        </Badge>
      );
    }
    if (t.includes("announcement") || t.includes("broadcast")) {
      return (
        <Badge className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]">
          Announcement
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] capitalize">
        {t.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <Megaphone className="size-6 text-[#0CA275]" />
            Platform Notifications & SMTP Email Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast announcements, inspect outbound SMTP delivery logs, and receive
            inbound notification emails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <Link href="/admin/settings">
              <Settings className="size-3.5 text-[#0CA275]" />
              Configure SMTP / IMAP
            </Link>
          </Button>
          <BroadcastNotificationDialog />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">In-App Notifications</p>
              <p className="font-heading text-2xl font-bold text-[#0A2843] mt-0.5">
                {totalCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {readCount} read ({totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0}%)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-[#0A2843]">
              <Bell className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Outbound SMTP Emails</p>
              <p className="font-heading text-2xl font-bold text-[#0CA275] mt-0.5">
                {outboundEmails.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dispatched via SMTP / Outbox
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#ECFDF5] text-[#0CA275]">
              <Send className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Inbound Emails</p>
              <p className="font-heading text-2xl font-bold text-blue-700 mt-0.5">
                {inboundEmails.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Received via IMAP / Webhook
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
              <Inbox className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Broadcasts Sent</p>
              <p className="font-heading text-2xl font-bold text-amber-700 mt-0.5">
                {broadcastCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Platform announcements</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
              <Megaphone className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/admin/notifications?tab=in_app"
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === "in_app"
                ? "bg-[#0A2843] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            In-App Notifications ({notifications.length})
          </Link>
          <Link
            href="/admin/notifications?tab=smtp_outbound"
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              tab === "smtp_outbound"
                ? "bg-[#0A2843] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Mail className="size-3.5" />
            Outbound SMTP Logs ({outboundEmails.length})
          </Link>
          <Link
            href="/admin/notifications?tab=inbound_inbox"
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              tab === "inbound_inbox"
                ? "bg-[#0A2843] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Inbox className="size-3.5" />
            Inbound Email Inbox ({inboundEmails.length})
          </Link>
        </div>

        {tab === "in_app" ? (
          <form method="GET" action="/admin/notifications" className="flex items-center gap-2">
            <input type="hidden" name="tab" value="in_app" />
            <select
              name="type"
              defaultValue={type}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="appointment">Appointments</option>
              <option value="payment">Payments</option>
              <option value="verification">Verifications</option>
              <option value="announcement">Announcements</option>
            </select>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search title or recipient..."
                className="pl-8 text-xs h-9 bg-white"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
              Filter
            </Button>
          </form>
        ) : (
          <EmailInboxControls />
        )}
      </div>

      {/* Tab Content */}
      {tab === "smtp_outbound" ? (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base text-[#0A2843]">
              Outbound SMTP Email Delivery Logs
            </CardTitle>
            <CardDescription className="text-xs">
              Every email notification dispatched by the platform via SMTP / Outbox
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Recipient (To)</th>
                    <th className="px-4 py-3">Subject & Body</th>
                    <th className="px-4 py-3">Delivery Mode</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outboundEmails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                        No outbound emails logged yet.
                      </td>
                    </tr>
                  ) : (
                    outboundEmails.map((mail) => (
                      <tr key={mail.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          {getTypeBadge(mail.notification_type || "general")}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {mail.to_email}
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="font-semibold text-slate-800">{mail.subject}</div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {mail.body_text}
                          </p>
                          {mail.error_message && (
                            <p className="text-[10px] text-rose-600 mt-1">
                              Error: {mail.error_message}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {String(mail.metadata?.delivery_mode || "smtp")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(mail.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              mail.status === "sent"
                                ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]"
                                : "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                            }
                          >
                            {mail.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : tab === "inbound_inbox" ? (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base text-[#0A2843]">
              Inbound Notification Emails (IMAP & Webhook Inbox)
            </CardTitle>
            <CardDescription className="text-xs">
              Emails received via IMAP sync or <code className="font-mono">POST /api/webhooks/email-inbound</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3">Subject & Message</th>
                    <th className="px-4 py-3">Received At</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inboundEmails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                        No inbound emails received yet. Click &ldquo;Receive Test Inbound Email&rdquo; or &ldquo;Sync IMAP Inbox&rdquo; above.
                      </td>
                    </tr>
                  ) : (
                    inboundEmails.map((mail) => (
                      <tr key={mail.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {mail.from_email}
                          </div>
                          {Boolean(mail.metadata?.sender_name) && (
                            <div className="text-[10px] text-slate-500">
                              {String(mail.metadata.sender_name)} ({String(mail.metadata.sender_role || "user")})
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{mail.to_email}</td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="font-semibold text-slate-800">{mail.subject}</div>
                          <p className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-line">
                            {mail.body_text}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(mail.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                            Received
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
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
                          <div className="font-semibold text-slate-900">
                            {n.recipient?.full_name || "Platform User"}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            {n.recipient?.role || "Citizen"}
                          </div>
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
                            <Badge
                              variant="outline"
                              className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]"
                            >
                              Read
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-500 text-[10px]"
                            >
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
      )}
    </div>
  );
}
