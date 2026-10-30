"use client";

import { useState } from "react";
import { Users, CalendarClock, ShieldCheck, Sparkles, TrendingUp, BarChart2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface MonthlyTrend {
  month: string;
  users: number;
  appointments: number;
  completed: number;
}

export interface VerificationBreakdown {
  verified: number;
  pending: number;
  needs_info: number;
  rejected: number;
  suspended: number;
  not_submitted: number;
}

interface DashboardChartsProps {
  monthlyTrends: MonthlyTrend[];
  verificationBreakdown: VerificationBreakdown;
  aiQueryCount: number;
  totalAppointments: number;
  totalUsers: number;
}

export function DashboardCharts({
  monthlyTrends,
  verificationBreakdown,
  aiQueryCount,
  totalAppointments,
  totalUsers,
}: DashboardChartsProps) {
  const [activeMetric, setActiveMetric] = useState<"appointments" | "users">("appointments");

  const totalLawyersInBreakdown =
    verificationBreakdown.verified +
    verificationBreakdown.pending +
    verificationBreakdown.needs_info +
    verificationBreakdown.rejected +
    verificationBreakdown.suspended +
    verificationBreakdown.not_submitted;

  const maxVal = Math.max(
    ...monthlyTrends.map((t) => (activeMetric === "appointments" ? t.appointments : t.users)),
    1
  );

  const verificationItems = [
    {
      label: "Verified",
      count: verificationBreakdown.verified,
      color: "bg-[#0CA275]",
      textColor: "text-[#0CA275]",
    },
    {
      label: "Pending Review",
      count: verificationBreakdown.pending,
      color: "bg-amber-500",
      textColor: "text-amber-600",
    },
    {
      label: "Needs Info",
      count: verificationBreakdown.needs_info,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      label: "Rejected",
      count: verificationBreakdown.rejected,
      color: "bg-rose-500",
      textColor: "text-rose-600",
    },
    {
      label: "Suspended",
      count: verificationBreakdown.suspended,
      color: "bg-slate-500",
      textColor: "text-slate-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Platform Activity Trends */}
      <Card className="lg:col-span-2 border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="font-heading text-base font-semibold text-[#0A2843] flex items-center gap-2">
              <TrendingUp className="size-4 text-[#0CA275]" />
              Platform Trends & Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Aggregate growth and consultation volume over recent months
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setActiveMetric("appointments")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                activeMetric === "appointments"
                  ? "bg-[#0A2843] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Consultations
            </button>
            <button
              onClick={() => setActiveMetric("users")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                activeMetric === "users"
                  ? "bg-[#0A2843] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Registrations
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyTrends.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No historical trend records found in database.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-6 gap-2 h-44 items-end border-b border-slate-100 pb-2">
                {monthlyTrends.map((item, idx) => {
                  const val = activeMetric === "appointments" ? item.appointments : item.users;
                  const heightPercent = Math.max(Math.round((val / maxVal) * 100), 8);
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-bold text-slate-700 opacity-80 group-hover:opacity-100 transition-opacity">
                        {val}
                      </span>
                      <div className="w-full max-w-[38px] rounded-t-md bg-slate-100 overflow-hidden flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            activeMetric === "appointments"
                              ? "bg-[#0CA275] group-hover:bg-[#098862]"
                              : "bg-[#0A2843] group-hover:bg-[#071D31]"
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 truncate w-full text-center">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#0CA275]" />
                  Total Platform Consultations: <strong className="text-slate-800">{totalAppointments}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#0A2843]" />
                  Total Registered Users: <strong className="text-slate-800">{totalUsers}</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advocate Verification Status Breakdown */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base font-semibold text-[#0A2843] flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#0CA275]" />
            Advocate Verification Status
          </CardTitle>
          <CardDescription className="text-xs">
            Distribution across Bar Council credential verification stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-2">
            {/* Visual ratio bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
              {verificationItems.map((item, idx) => {
                if (totalLawyersInBreakdown === 0 || item.count === 0) return null;
                const widthPercent = (item.count / totalLawyersInBreakdown) * 100;
                return (
                  <div
                    key={idx}
                    style={{ width: `${widthPercent}%` }}
                    className={`${item.color} h-full transition-all duration-300`}
                    title={`${item.label}: ${item.count}`}
                  />
                );
              })}
            </div>

            {/* List breakdown */}
            <div className="space-y-2.5">
              {verificationItems.map((item, idx) => {
                const pct =
                  totalLawyersInBreakdown > 0
                    ? Math.round((item.count / totalLawyersInBreakdown) * 100)
                    : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${item.color}`} />
                      <span className="text-slate-600 font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.count}</span>
                      <span className="text-[11px] text-slate-400">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-3.5 text-[#0CA275]" />
                AI Assistant Queries Answered
              </span>
              <Badge variant="outline" className="font-bold border-slate-300 text-slate-800">
                {aiQueryCount}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
