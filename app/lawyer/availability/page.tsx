"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarOff,
  Check,
  Clock,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface TimeOff {
  id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function LawyerAvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [timeOffList, setTimeOffList] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Time-off form
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [toStartDate, setToStartDate] = useState("");
  const [toEndDate, setToEndDate] = useState("");
  const [toReason, setToReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/lawyer/availability");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSlots(data.availability || []);
      setTimeOffList(data.timeOff || []);
    } catch {
      setError("Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Slot management helpers ----
  function getDaySlots(day: number) {
    return slots.filter((s) => s.day_of_week === day);
  }

  function addSlot(day: number) {
    setSlots((prev) => [
      ...prev,
      { day_of_week: day, start_time: "09:00", end_time: "17:00", is_active: true },
    ]);
    setSaved(false);
  }

  function removeSlot(day: number, index: number) {
    const daySlotsCount = slots.filter((s) => s.day_of_week === day).length;
    let matchIndex = 0;
    setSlots((prev) =>
      prev.filter((s) => {
        if (s.day_of_week !== day) return true;
        const keep = matchIndex !== index;
        matchIndex++;
        return keep;
      })
    );
    setSaved(false);
  }

  function updateSlot(
    day: number,
    index: number,
    field: "start_time" | "end_time" | "is_active",
    value: string | boolean
  ) {
    let matchIndex = 0;
    setSlots((prev) =>
      prev.map((s) => {
        if (s.day_of_week !== day) return s;
        if (matchIndex === index) {
          matchIndex++;
          return { ...s, [field]: value };
        }
        matchIndex++;
        return s;
      })
    );
    setSaved(false);
  }

  async function saveAvailability() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/lawyer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_availability", slots }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTimeOff() {
    if (!toStartDate || !toEndDate) return;
    setAddingTimeOff(true);
    setError("");
    try {
      const res = await fetch("/api/lawyer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_time_off",
          start_datetime: new Date(toStartDate).toISOString(),
          end_datetime: new Date(toEndDate).toISOString(),
          reason: toReason || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add time off");
      setShowTimeOffForm(false);
      setToStartDate("");
      setToEndDate("");
      setToReason("");
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingTimeOff(false);
    }
  }

  async function handleDeleteTimeOff(id: string) {
    try {
      await fetch("/api/lawyer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_time_off", id }),
      });
      fetchData();
    } catch {
      setError("Failed to delete time off");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-navy">
            Availability Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure your weekly schedule and blocked dates.
          </p>
        </div>
        <Button
          onClick={saveAvailability}
          disabled={saving}
          className="bg-navy hover:bg-navy/90 text-white"
        >
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 size-4" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saved ? "Saved!" : "Save Schedule"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="size-5 text-gold" />
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Define your recurring weekly schedule. Clients can only book
            consultations during your available hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const daySlots = getDaySlots(dayIndex);
            const hasSlots = daySlots.length > 0;
            return (
              <div key={dayIndex} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={hasSlots ? "default" : "outline"}
                      className={
                        hasSlots
                          ? "bg-navy text-white"
                          : "text-slate-400"
                      }
                    >
                      {DAY_SHORT[dayIndex]}
                    </Badge>
                    <span className="font-medium text-slate-700">
                      {dayName}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot(dayIndex)}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add Slot
                  </Button>
                </div>

                {daySlots.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    No availability set — clients cannot book on this day.
                  </p>
                )}

                <div className="space-y-2">
                  {daySlots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="flex flex-wrap items-center gap-3 rounded-md bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground shrink-0">
                          From
                        </Label>
                        <Input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) =>
                            updateSlot(dayIndex, slotIndex, "start_time", e.target.value)
                          }
                          className="h-8 w-[120px] text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground shrink-0">
                          To
                        </Label>
                        <Input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) =>
                            updateSlot(dayIndex, slotIndex, "end_time", e.target.value)
                          }
                          className="h-8 w-[120px] text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slot.is_active}
                          onCheckedChange={(checked: boolean) =>
                            updateSlot(dayIndex, slotIndex, "is_active", checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {slot.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeSlot(dayIndex, slotIndex)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Time-Off / Blocked Dates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarOff className="size-5 text-gold" />
                Blocked Dates / Time Off
              </CardTitle>
              <CardDescription>
                Block specific dates when you're unavailable.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeOffForm(!showTimeOffForm)}
            >
              <Plus className="mr-1 size-3.5" />
              Add Time Off
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showTimeOffForm && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={toStartDate}
                    onChange={(e) => setToStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={toEndDate}
                    onChange={(e) => setToEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason (optional)</Label>
                <Textarea
                  value={toReason}
                  onChange={(e) => setToReason(e.target.value)}
                  placeholder="e.g. Court hearing, Vacation, Holiday"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimeOffForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddTimeOff}
                  disabled={addingTimeOff || !toStartDate || !toEndDate}
                  className="bg-navy hover:bg-navy/90 text-white"
                >
                  {addingTimeOff && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                  Add
                </Button>
              </div>
            </div>
          )}

          {timeOffList.length === 0 && !showTimeOffForm && (
            <div className="text-center py-10">
              <CalendarOff className="mx-auto size-10 text-slate-300 mb-3" />
              <p className="text-sm text-muted-foreground">
                No blocked dates. Add time off for vacations, holidays, or court
                hearings.
              </p>
            </div>
          )}

          {timeOffList.length > 0 && (
            <div className="space-y-2">
              {timeOffList.map((to) => {
                const startDate = new Date(to.start_datetime);
                const endDate = new Date(to.end_datetime);
                return (
                  <div
                    key={to.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {startDate.toLocaleDateString("en-PK", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        —{" "}
                        {endDate.toLocaleDateString("en-PK", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {to.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {to.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTimeOff(to.id)}
                      className="size-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
