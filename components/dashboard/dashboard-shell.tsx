"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  Database,
  FileSearch,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { UserDropdown } from "@/components/dashboard/user-dropdown";
import type { Profile } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  category?: string;
}

const citizenNav: NavItem[] = [
  { title: "Dashboard", href: "/citizen/dashboard", icon: Home },
  { title: "AI Assistant", href: "/citizen/ai-assistant", icon: Sparkles, badge: "RAG" },
  { title: "Action Navigator", href: "/citizen/navigator", icon: Compass, badge: "Navigator" },
  { title: "Find Lawyers", href: "/citizen/lawyers", icon: Search },
  { title: "Appointments", href: "/citizen/appointments", icon: CalendarClock },
  { title: "Documents", href: "/citizen/documents", icon: FileText },
  { title: "Legal Resources", href: "/citizen/resources", icon: BookOpen },
  { title: "Notifications", href: "/citizen/notifications", icon: Bell },
  { title: "Profile", href: "/citizen/profile", icon: User },
  { title: "Settings", href: "/citizen/settings", icon: Settings },
];

const lawyerNav: NavItem[] = [
  { title: "Dashboard", href: "/lawyer/dashboard", icon: LayoutDashboard },
  { title: "My Profile", href: "/lawyer/profile", icon: User },
  { title: "Verification", href: "/lawyer/verification", icon: ShieldCheck, badge: "SBC" },
  { title: "Availability", href: "/lawyer/availability", icon: Clock },
  { title: "Appointments", href: "/lawyer/appointments", icon: CalendarClock },
  { title: "Clients", href: "/lawyer/clients", icon: Users },
  { title: "Documents", href: "/lawyer/documents", icon: FileText },
  { title: "Earnings & Fees", href: "/lawyer/earnings", icon: Wallet },
  { title: "Reviews", href: "/lawyer/reviews", icon: Star },
  { title: "Notifications", href: "/lawyer/notifications", icon: Bell },
  { title: "Support & Help", href: "/lawyer/support", icon: HelpCircle },
  { title: "Settings", href: "/lawyer/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard },
  { title: "Lawyer Verifications", href: "/admin/lawyers", icon: ShieldCheck, badge: "Queue" },
  { title: "Platform Users", href: "/admin/users", icon: Users },
  { title: "Consultations & Bookings", href: "/admin/appointments", icon: CalendarClock },
  { title: "Legal Knowledge Base", href: "/admin/knowledge-base", icon: BookOpen, badge: "RAG" },
  { title: "AI Engine & Routing", href: "/admin/ai", icon: Sparkles },
  { title: "AI Testing & Debug", href: "/admin/ai/testing", icon: Search },
  { title: "Filer Status (ATL)", href: "/admin/filer-status", icon: Database },
  { title: "Legal Resources", href: "/admin/resources", icon: FileText },
  { title: "Payments & Fees", href: "/admin/payments", icon: Wallet },
  { title: "Reviews Moderation", href: "/admin/reviews", icon: Star },
  { title: "Platform Notifications", href: "/admin/notifications", icon: Megaphone },
  { title: "Reports & Analytics", href: "/admin/reports", icon: BarChart3 },
  { title: "Platform Settings", href: "/admin/settings", icon: Settings },
  { title: "Audit Trail", href: "/admin/audit-logs", icon: FileText },
];

interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    profile.role === "admin"
      ? adminNav
      : profile.role === "lawyer"
      ? lawyerNav
      : citizenNav;

  const currentItem = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== `/${profile.role}/dashboard` &&
        item.href !== "/admin" &&
        pathname.startsWith(item.href))
  );

  const pageTitle = currentItem?.title || "Dashboard";

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* ----------------- DESKTOP SIDEBAR ----------------- */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand & Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <Logo href={`/${profile.role}/dashboard`} mode="full" />
            </div>
          ) : (
            <Logo href={`/${profile.role}/dashboard`} mode="icon" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="size-7 text-muted-foreground hover:text-[#0A2843]"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* User Role Indicator */}
        {!collapsed && (
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {profile.role === "admin" ? "Administration Portal" : `${profile.role} Portal`}
            </span>
            <Badge variant="outline" className="border-[#0CA275]/30 bg-[#ECFDF5] text-[10px] font-medium text-[#0CA275]">
              Production
            </Badge>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== `/${profile.role}/dashboard` &&
                item.href !== "/admin" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#0A2843] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                } ${collapsed ? "justify-center px-2 py-2.5" : ""}`}
                title={collapsed ? item.title : undefined}
              >
                <Icon
                  className={`size-4 shrink-0 transition-colors ${
                    isActive ? "text-[#10B981]" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                  <Badge
                    variant="secondary"
                    className={`ml-auto text-[10px] px-1.5 py-0 font-medium ${
                      isActive
                        ? "bg-[#10B981] text-[#0A2843]"
                        : "bg-[#ECFDF5] text-[#0CA275] border border-[#0CA275]/20"
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile summary */}
        <div className="border-t border-slate-200 p-3">
          {!collapsed ? (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {profile.full_name}
                </p>
                <p className="truncate text-[11px] text-slate-500">{profile.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="size-8 text-slate-400 hover:text-destructive"
                title="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="mx-auto flex size-9 text-slate-400 hover:text-destructive"
              title="Log out"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* ----------------- MOBILE DRAWER NAVIGATION ----------------- */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <Logo href={`/${profile.role}/dashboard`} mode="full" />
          </div>
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0CA275]">
              {profile.role} Portal
            </span>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== `/${profile.role}/dashboard` &&
                  item.href !== "/admin" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#0A2843] text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 ${isActive ? "text-[#10B981]" : "text-slate-400"}`}
                  />
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="bg-[#ECFDF5] text-[#0CA275] text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ----------------- MAIN APPLICATION AREA ----------------- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-700"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs">
              <Link href={profile.role === "admin" ? "/admin" : `/${profile.role}/dashboard`} className="font-semibold text-slate-500 hover:text-[#0A2843]">
                {profile.role === "admin" ? "LegalEase Admin" : "LegalEase"}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-heading font-bold text-[#0A2843] text-sm">
                {pageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search trigger for Admin */}
            {profile.role === "admin" && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex items-center gap-2 h-8 text-xs text-slate-500 border-slate-200 bg-slate-50 hover:bg-slate-100"
              >
                <Link href="/admin/users">
                  <Search className="size-3.5 text-slate-400" />
                  <span>Search users & advocates...</span>
                  <kbd className="pointer-events-none hidden h-4 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[9px] font-medium text-slate-500 sm:flex">
                    ⌘K
                  </kbd>
                </Link>
              </Button>
            )}

            {/* Realtime Notification Bell */}
            <NotificationBell userId={profile.id} role={profile.role === "lawyer" ? "lawyer" : "citizen"} />

            {/* Profile Dropdown */}
            <UserDropdown profile={profile} />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
