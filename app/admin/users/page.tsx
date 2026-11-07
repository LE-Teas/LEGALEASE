import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users, Search, Shield, User, Scale, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserStatusDialog } from "@/components/admin/user-status-dialog";
import { LoadDemoUsersButton } from "@/components/admin/load-demo-users-button";

export const metadata: Metadata = {
  title: "Platform Users | LegalEase Admin",
  description: "Browse and manage registered citizens, advocates, and administrative staff accounts.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ role?: string; search?: string; status?: string; page?: string }>;
}

interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "citizen" | "lawyer" | "admin";
  city: string | null;
  area: string | null;
  is_active: boolean;
  created_at: string;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { role, search, status, page } = await searchParams;
  const supabase = await createClient();

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = 15;

  let users: AdminUserRow[] = [];
  let totalMatchingUsers = 0;

  const roleCounts = {
    all: 0,
    citizen: 0,
    lawyer: 0,
    admin: 0,
    suspended: 0,
  };

  if (supabase) {
    // 1. Fetch counts across roles
    const { data: allProfiles } = await supabase.from("profiles").select("role, is_active");
    if (allProfiles) {
      roleCounts.all = allProfiles.length;
      allProfiles.forEach((p) => {
        if (p.role in roleCounts) {
          roleCounts[p.role as keyof typeof roleCounts]++;
        }
        if (p.is_active === false) {
          roleCounts.suspended++;
        }
      });
    }

    // 2. Build filtered query
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, city, area, is_active, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (role && role !== "all") {
      query = query.eq("role", role);
    }

    if (status === "suspended") {
      query = query.eq("is_active", false);
    } else if (status === "active") {
      query = query.eq("is_active", true);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`);
    }

    const fromIndex = (currentPage - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { data, count } = await query.range(fromIndex, toIndex);
    users = (data ?? []) as unknown as AdminUserRow[];
    totalMatchingUsers = count || 0;
  }

  const totalPages = Math.ceil(totalMatchingUsers / pageSize) || 1;
  const activeTab = role || (status === "suspended" ? "suspended" : "all");

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "admin":
        return (
          <Badge className="bg-purple-700 text-white text-[10px] font-medium flex items-center gap-1 w-fit">
            <Shield className="size-3" /> Admin
          </Badge>
        );
      case "lawyer":
        return (
          <Badge className="bg-[#0A2843] text-[#10B981] text-[10px] font-medium flex items-center gap-1 w-fit">
            <Scale className="size-3" /> Advocate
          </Badge>
        );
      case "citizen":
        return (
          <Badge className="bg-[#0CA275] text-white text-[10px] font-medium flex items-center gap-1 w-fit">
            <User className="size-3" /> Citizen
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{r}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <Users className="size-6 text-[#0CA275]" />
            Platform Users Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, inspect, and manage accounts for registered Pakistani citizens, legal practitioners, and administrators.
          </p>
        </div>

        {/* Actions & Global Summary */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <LoadDemoUsersButton />
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {roleCounts.all} Total Accounts
          </span>
          <span className="rounded-lg bg-[#ECFDF5] px-3 py-1 font-semibold text-[#0CA275]">
            {roleCounts.lawyer} Advocates
          </span>
        </div>
      </div>

      {/* Role Navigation & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 sm:border-0 sm:pb-0">
          <Link
            href="/admin/users?role=all"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Accounts ({roleCounts.all})
          </Link>
          <Link
            href="/admin/users?role=citizen"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "citizen" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Citizens ({roleCounts.citizen})
          </Link>
          <Link
            href="/admin/users?role=lawyer"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "lawyer" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Advocates ({roleCounts.lawyer})
          </Link>
          <Link
            href="/admin/users?role=admin"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "admin" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Admins ({roleCounts.admin})
          </Link>
          <Link
            href="/admin/users?status=suspended"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "suspended" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Suspended ({roleCounts.suspended})
          </Link>
        </div>

        {/* Search input form */}
        <form method="GET" action="/admin/users" className="flex items-center gap-2">
          {role && <input type="hidden" name="role" value={role} />}
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              name="search"
              defaultValue={search || ""}
              placeholder="Search by name, email, city..."
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User & Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">City / Area</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700">
                          {u.city ? `${u.city}${u.area ? `, ${u.area}` : ""}` : "Pakistan"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <Badge variant="outline" className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                            Suspended
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserStatusDialog user={u} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalMatchingUsers} total)
              </span>
              <div className="flex items-center gap-1">
                {currentPage > 1 && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href={`/admin/users?page=${currentPage - 1}${role ? `&role=${role}` : ""}${search ? `&search=${search}` : ""}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href={`/admin/users?page=${currentPage + 1}${role ? `&role=${role}` : ""}${search ? `&search=${search}` : ""}`}>
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
