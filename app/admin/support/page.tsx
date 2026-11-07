import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HelpCircle, CheckCircle2, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportTicketDialog } from "@/components/admin/support-ticket-dialog";
import type { SupportTicket } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "Support Tickets & Help Desk | LegalEase Admin",
  description: "Review and respond to Citizen and Advocate support tickets.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminSupportTicketsPage({
  searchParams,
}: PageProps) {
  const { status = "all" } = await searchParams;
  const supabase = await createClient();

  let tickets: SupportTicket[] = [];

  if (supabase) {
    let query = supabase
      .from("support_tickets")
      .select(
        "*, user:profiles!support_tickets_user_id_fkey(full_name, email, role)"
      )
      .order("created_at", { ascending: false })
      .limit(80);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data } = await query;
    if (data) {
      tickets = data as unknown as SupportTicket[];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <HelpCircle className="size-6 text-[#0CA275]" />
            Platform Support Desk & Ticket Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage and resolve Citizen and Advocate support inquiries with automatic
            SMTP email notifications.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <Link
            key={s}
            href={`/admin/support?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              status === s
                ? "bg-[#0A2843] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base text-[#0A2843]">
            Support Tickets ({tickets.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Tickets submitted from Citizen and Lawyer Support Portals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User & Role</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Subject & Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No support tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {t.user?.full_name || "User"}
                        </div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {t.role} • {t.user?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {t.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="font-semibold text-slate-800">{t.subject}</div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {t.description}
                        </p>
                        {t.admin_response && (
                          <p className="text-[10px] text-[#0CA275] mt-1 font-medium">
                            Admin Reply: {t.admin_response}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            t.status === "resolved" || t.status === "closed"
                              ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px] capitalize"
                              : "bg-amber-50 text-amber-800 border-amber-200 text-[10px] capitalize"
                          }
                        >
                          {t.status === "resolved" ? (
                            <CheckCircle2 className="size-3 mr-1" />
                          ) : (
                            <Clock className="size-3 mr-1" />
                          )}
                          {t.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SupportTicketDialog ticket={t} />
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

