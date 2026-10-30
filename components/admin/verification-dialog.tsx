"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
  MapPin,
  Briefcase,
  Award,
  Ban,
  RefreshCcw,
  Scale,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { updateLawyerVerificationAction } from "@/app/actions/admin";
import type { VerificationStatus } from "@/lib/types/legal";
import { formatRate } from "@/lib/data/lawyers";

interface LawyerVerificationRecord {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  bar_council?: string | null;
  license_number?: string | null;
  license_issue_date?: string | null;
  verification_status: VerificationStatus;
  is_published: boolean;
  city?: string | null;
  office_address?: string | null;
  primary_specialization?: string | null;
  specializations?: string[] | null;
  years_of_experience?: number | null;
  consultation_fee?: number | null;
  license_document_path?: string | null;
  additional_document_path?: string | null;
}

interface VerificationDialogProps {
  lawyer: LawyerVerificationRecord;
  triggerVariant?: "default" | "outline" | "ghost";
}

export function VerificationDialog({
  lawyer,
  triggerVariant = "default",
}: VerificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [lawyerNote, setLawyerNote] = useState("");

  const handleUpdate = async (status: VerificationStatus) => {
    if ((status === "rejected" || status === "suspended") && !adminNote.trim() && !lawyerNote.trim()) {
      setError("Please provide a note explaining the reason for rejection or suspension.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateLawyerVerificationAction(lawyer.id, status, adminNote, lawyerNote);
      setOpen(false);
      setAdminNote("");
      setLawyerNote("");
    } catch (err: any) {
      setError(err?.message || "Failed to update verification status.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-[#0CA275] text-white text-[10px]">Verified & Eligible</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white text-[10px]">Pending Review</Badge>;
      case "needs_info":
        return <Badge className="bg-blue-600 text-white text-[10px]">Needs Information</Badge>;
      case "rejected":
        return <Badge className="bg-rose-600 text-white text-[10px]">Rejected</Badge>;
      case "suspended":
        return <Badge className="bg-slate-700 text-white text-[10px]">Suspended</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} className="text-xs h-7 border-slate-200">
          Review Application
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(lawyer.verification_status)}
              <Badge
                variant="outline"
                className={
                  lawyer.is_published
                    ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]"
                    : "bg-slate-100 text-slate-600 text-[10px]"
                }
              >
                {lawyer.is_published ? "Published in Directory" : "Unpublished / Private"}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">ID: {lawyer.id.slice(0, 8)}</span>
          </div>

          <DialogTitle className="font-heading text-lg text-[#0A2843] flex items-center gap-2 pt-1">
            <Scale className="size-5 text-[#0CA275]" />
            {lawyer.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Validate Bar Council credentials, practice experience, and submitted documentation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Advocate Details Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 text-[11px] block">Bar Council</span>
                <span className="font-semibold text-slate-800">
                  {lawyer.bar_council || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">License Roll Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  {lawyer.license_number || "Not provided"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Specialization</span>
                <span className="font-medium text-slate-800">
                  {lawyer.primary_specialization || "General Practice"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Experience</span>
                <span className="font-medium text-slate-800">
                  {lawyer.years_of_experience ? `${lawyer.years_of_experience} Years` : "1 Year"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Consultation Rate</span>
                <span className="font-bold text-[#0A2843]">
                  {formatRate(lawyer.consultation_fee || 3000)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Jurisdiction / Location</span>
                <span className="font-medium text-slate-800">
                  {lawyer.city || "Pakistan"}
                </span>
              </div>
            </div>

            {lawyer.office_address && (
              <div className="border-t border-slate-200 pt-2 text-[11px]">
                <span className="text-slate-400 block">Office Chamber Address</span>
                <span className="text-slate-700">{lawyer.office_address}</span>
              </div>
            )}

            {/* Document Verification Section */}
            <div className="border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-semibold text-[11px] block mb-1.5">
                Submitted Verification Documents
              </span>
              <div className="flex flex-wrap gap-2">
                {lawyer.license_document_path ? (
                  <a
                    href={`/api/documents/${lawyer.license_document_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:text-[#0CA275] text-[11px]"
                  >
                    <FileText className="size-3 text-[#0CA275]" />
                    Bar License Document
                    <ExternalLink className="size-2.5 text-slate-400" />
                  </a>
                ) : (
                  <span className="text-slate-400 text-[11px] italic">No license upload uploaded</span>
                )}

                {lawyer.additional_document_path && (
                  <a
                    href={`/api/documents/${lawyer.additional_document_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:text-[#0CA275] text-[11px]"
                  >
                    <FileText className="size-3 text-[#0CA275]" />
                    Additional Certificate
                    <ExternalLink className="size-2.5 text-slate-400" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Lawyer Communication */}
          <div className="space-y-1.5">
            <Label htmlFor="lawyerNote" className="text-xs font-semibold text-slate-800">
              Notice to Advocate (Delivered in Lawyer Dashboard)
            </Label>
            <Textarea
              id="lawyerNote"
              rows={2}
              placeholder="e.g. Your credentials with the High Court Bar Council have been approved."
              value={lawyerNote}
              onChange={(e) => setLawyerNote(e.target.value)}
              className="text-xs bg-white"
            />
          </div>

          {/* Confidential Internal Audit Note */}
          <div className="space-y-1.5">
            <Label htmlFor="adminNote" className="text-xs font-semibold text-slate-800">
              Confidential Internal Admin Note (Stored in Audit Log)
            </Label>
            <Textarea
              id="adminNote"
              rows={2}
              placeholder="e.g. Verified with Bar Council roll ledger. Verified by admin staff."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="text-xs bg-white"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>

          <div className="flex flex-wrap items-center gap-1.5">
            {lawyer.verification_status !== "needs_info" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handleUpdate("needs_info")}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs h-8"
              >
                <AlertCircle className="size-3.5 mr-1" />
                Request Info
              </Button>
            )}

            {lawyer.verification_status !== "rejected" && lawyer.verification_status !== "suspended" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handleUpdate("rejected")}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-8"
              >
                <XCircle className="size-3.5 mr-1" />
                Reject
              </Button>
            ) : null}

            {lawyer.verification_status === "verified" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handleUpdate("suspended")}
                className="border-slate-400 text-slate-700 hover:bg-slate-100 text-xs h-8"
              >
                <Ban className="size-3.5 mr-1" />
                Suspend Advocate
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => handleUpdate("verified")}
                className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs h-8"
              >
                {loading ? (
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5 mr-1" />
                )}
                {lawyer.verification_status === "suspended" || lawyer.verification_status === "rejected"
                  ? "Reinstate & Publish"
                  : "Approve & Publish"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
