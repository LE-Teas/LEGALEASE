"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { Check, Edit3, Loader2, Lock, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ConsultationNotesCardProps {
  appointmentId: string;
  initialNotes: string | null;
}

export function ConsultationNotesCard({
  appointmentId,
  initialNotes,
}: ConsultationNotesCardProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || "");
  const [isEditing, setIsEditing] = useState(!initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/appointments/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          lawyerNotes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save notes");
      }

      setSaved(true);
      setIsEditing(false);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to save private notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
            <Lock className="size-4 text-teal" />
            Advocate&apos;s Private Consultation Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Protected work product. These notes are visible ONLY to you and never shared with the citizen.
          </CardDescription>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-xs text-teal hover:text-navy"
          >
            <Edit3 className="mr-1 size-3.5" />
            Edit Notes
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-xs text-rose-600">{error}</p>}

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record legal advice given, citations/statutes discussed, key client admissions, or agreed subsequent steps..."
              rows={4}
              className="text-xs leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="size-3 text-slate-400" />
                Confidential Lawyer Work Product
              </span>
              <div className="flex items-center gap-2">
                {initialNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotes(initialNotes);
                      setIsEditing(false);
                    }}
                    disabled={saving}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-navy text-white hover:bg-navy/90 text-xs font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-emerald-400" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 size-3.5" />
                      Save Private Notes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-navy/5 p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {notes || "No private notes recorded for this consultation session yet."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
