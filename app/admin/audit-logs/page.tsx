import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileText, ShieldAlert, Clock, Download, Search, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Admin Audit Trail | LegalEase Admin",
  description: "Immutable log of administrator decisions, verification updates, and policy modifications.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ action?: string; search?: string }>;
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const { action, search } = await searchParams;
  const supabase = await createClient();

  let logs: any[] = [];

  if (supabase) {
    let query = supabase
      .from("admin_audit_logs")
      .select(`
        id,
        action,
        target_type,
        target_id,
        changes,
        created_at,
        admin:profiles!admin_audit_logs_admin_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (action && action !== "all") {
      query = query.ilike("action", `%${action}%`);
    }

    const { data } = await query;
    if (data) {
      logs = data;
      if (search && search.trim()) {
        const q = search.toLowerCase();
        logs = logs.filter(
          (l) =>
            l.action?.toLowerCase().includes(q) ||
            l.target_type?.toLowerCase().includes(q) ||
            l.admin?.full_name?.toLowerCase().includes(q)
        );
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <FileText className="size-6 text-[#0CA275]" />
            Administrator Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log recording privileged advocate approvals, account suspensions, policy updates, and system decisions.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200">
          <a href="/api/admin/reports/export?type=audit_logs" download>
            <Download className="size-3.5 text-[#0CA275]" />
            Export Audit Log (CSV)
          </a>
        </Button>
      </div>

      {/* Security Protocol Banner */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
        <ShieldAlert className="size-4 text-[#0CA275] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-900">Security & Privacy Invariant:</strong> Audit logs capture the acting administrator ID, operation category, entity reference, and delta snapshot. Sensitive plaintext passwords, private client documents, and raw unmasked CNIC credentials are never retained in audit records.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 sm:border-0 sm:pb-0">
          <Link
            href="/admin/audit-logs"
            className="rounded-lg bg-[#0A2843] text-white px-3 py-1.5 text-xs font-semibold shadow-xs"
          >
            All Events ({logs.length})
          </Link>
          <Link
            href="/admin/audit-logs?action=verification"
            className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold"
          >
            Verifications
          </Link>
          <Link
            href="/admin/audit-logs?action=user"
            className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold"
          >
            User Accounts
          </Link>
          <Link
            href="/admin/audit-logs?action=setting"
            className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold"
          >
            Platform Policies
          </Link>
        </div>

        <form method="GET" action="/admin/audit-logs" className="flex items-center gap-2">
          {action && <input type="hidden" name="action" value={action} />}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              name="search"
              defaultValue={search || ""}
              placeholder="Search action or actor..."
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Logs Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No audit log entries found matching this search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Changes Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{log.admin?.full_name || "Administrator"}</div>
                        <div className="text-[10px] text-slate-400">{log.admin?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-800 border-slate-300">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 capitalize">{log.target_type}</span>
                        {log.target_id && (
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                            {log.target_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <pre className="font-mono text-[10px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 overflow-x-auto max-h-20">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
