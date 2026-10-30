"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Phone,
  Search,
  User,
  Video,
  XCircle,
  Eye,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentDecisionButtons } from "@/components/lawyer/appointment-decision-buttons";
import { JoinVideoButton } from "@/components/video/join-video-button";
import { formatRate } from "@/lib/data/lawyers";
import type { Appointment } from "@/lib/types/legal";

interface AppointmentsListViewProps {
  initialAppointments: Appointment[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "Pending Request", color: "bg-amber-100 text-amber-900 border-amber-300", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-emerald-100 text-emerald-900 border-emerald-300", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-900 border-blue-300", icon: CheckCircle2 },
  rejected: { label: "Declined", color: "bg-rose-100 text-rose-900 border-rose-300", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700 border-slate-300", icon: XCircle },
};

const consultTypeIcons: Record<string, React.ElementType> = {
  in_person: MapPin,
  video: Video,
  phone: Phone,
};

function formatConsultType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type SortBy = "date_desc" | "date_asc";

export function LawyerAppointmentsListView({
  initialAppointments,
}: AppointmentsListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");

  const todayStr = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    return {
      all: initialAppointments.length,
      pending: initialAppointments.filter((a) => a.status === "pending").length,
      confirmed: initialAppointments.filter(
        (a) => a.status === "confirmed" && a.appointment_date >= todayStr
      ).length,
      completed: initialAppointments.filter((a) => a.status === "completed").length,
      cancelled: initialAppointments.filter(
        (a) => a.status === "cancelled" || a.status === "rejected"
      ).length,
    };
  }, [initialAppointments, todayStr]);

  const filteredAppointments = useMemo(() => {
    return initialAppointments
      .filter((appt) => {
        // Status filter
        if (statusFilter === "pending" && appt.status !== "pending") return false;
        if (
          statusFilter === "confirmed" &&
          (appt.status !== "confirmed" || appt.appointment_date < todayStr)
        )
          return false;
        if (statusFilter === "completed" && appt.status !== "completed") return false;
        if (
          statusFilter === "cancelled" &&
          appt.status !== "cancelled" &&
          appt.status !== "rejected"
        )
          return false;

        // Type filter
        if (typeFilter !== "all" && appt.consultation_type !== typeFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCitizen = appt.citizen?.full_name?.toLowerCase().includes(q);
          const matchSubject = appt.subject?.toLowerCase().includes(q);
          const matchId = appt.id?.toLowerCase().includes(q);
          const matchCategory = appt.legal_category?.toLowerCase().includes(q);
          if (!matchCitizen && !matchSubject && !matchId && !matchCategory) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = `${a.appointment_date}T${a.start_time || "00:00"}`;
        const dateB = `${b.appointment_date}T${b.start_time || "00:00"}`;
        return sortBy === "date_desc"
          ? dateB.localeCompare(dateA)
          : dateA.localeCompare(dateB);
      });
  }, [initialAppointments, statusFilter, typeFilter, searchQuery, sortBy, todayStr]);

  return (
    <div className="space-y-6">
      {/* Top Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: "all", label: "All Consultations", count: counts.all },
          { id: "pending", label: "Pending Requests", count: counts.pending, highlight: counts.pending > 0 },
          { id: "confirmed", label: "Upcoming Confirmed", count: counts.confirmed },
          { id: "completed", label: "Completed", count: counts.completed },
          { id: "cancelled", label: "Cancelled / Declined", count: counts.cancelled },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                isActive
                  ? "bg-navy text-white border-navy shadow-sm"
                  : tab.highlight
                  ? "bg-amber-50/60 border-amber-300 text-amber-950 hover:bg-amber-100/60"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className={`font-heading text-2xl font-bold ${isActive ? "text-gold" : tab.highlight ? "text-amber-700" : "text-navy"}`}>
                {tab.count}
              </span>
              <span className={`text-[11px] font-medium mt-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, legal matter, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-1/2 sm:w-36">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-1/2 sm:w-36">
                <Select value={sortBy} onValueChange={(val: string) => setSortBy(val as SortBy)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Sort Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Newest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Calendar className="size-7" />
            </div>
            <h3 className="font-heading text-base font-bold text-navy">No Appointments Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              No consultations match your selected filters. Adjust your search query or status criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredAppointments.map((appt) => {
            const status = statusConfig[appt.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const ConsultIcon = consultTypeIcons[appt.consultation_type] || MapPin;
            const citizen = appt.citizen;

            return (
              <Card
                key={appt.id}
                className={`border transition-all hover:shadow-xs ${
                  appt.status === "pending"
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-border bg-white"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Citizen & Matter Info */}
                    <div className="space-y-1.5 min-w-0 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-sm font-bold text-navy">
                          {citizen?.full_name || "Citizen Client"}
                        </span>
                        {appt.legal_category && (
                          <Badge variant="outline" className="text-[10px] text-teal border-teal/30 bg-teal-soft/30 font-semibold">
                            {appt.legal_category}
                          </Badge>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ID: {appt.id.slice(0, 8)}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-800 line-clamp-1">
                        {appt.subject || "Legal Consultation"}
                      </p>

                      {appt.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {appt.description}
                        </p>
                      )}

                      {/* Schedule, Mode, & Fee Snapshot */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 pt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <Calendar className="size-3.5 text-teal" />
                          {new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-PK", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5 text-teal" />
                          {appt.start_time?.slice(0, 5)} – {appt.end_time?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ConsultIcon className="size-3.5 text-teal" />
                          {formatConsultType(appt.consultation_type)}
                          {appt.consultation_type === "video" && appt.duration_minutes && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              ({appt.duration_minutes}m)
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-navy">
                          {appt.consultation_type === "in_person" ? (
                            <span className="text-[#0fa176]">Free</span>
                          ) : (
                            formatRate(appt.consultation_fee)
                          )}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-medium ${
                            appt.payment_status === "paid"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : appt.payment_status === "waived"
                              ? "bg-slate-50 text-slate-700 border-slate-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          Payment: {appt.payment_status || "unpaid"}
                        </Badge>
                      </div>
                    </div>

                    {/* Status & Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <Badge className={`${status.color} border text-[11px] font-semibold py-0.5`}>
                        <StatusIcon className="mr-1 size-3" />
                        {status.label}
                      </Badge>

                      {appt.status === "confirmed" && appt.consultation_type === "video" && (
                        <JoinVideoButton
                          appointmentId={appt.id}
                          appointmentDate={appt.appointment_date}
                          startTime={appt.start_time}
                          endTime={appt.end_time}
                          href={`/lawyer/video/${appt.id}`}
                          paymentStatus={appt.payment_status}
                        />
                      )}

                      {(appt.status === "pending" || appt.status === "confirmed") && (
                        <AppointmentDecisionButtons
                          appointmentId={appt.id}
                          status={appt.status}
                          consultationType={appt.consultation_type}
                          paymentStatus={appt.payment_status}
                        />
                      )}

                      <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                        <Link href={`/lawyer/appointments/${appt.id}`}>
                          <Eye className="mr-1.5 size-3.5" />
                          Workspace
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
