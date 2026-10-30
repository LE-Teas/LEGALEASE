"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  Clock,
  FileCheck,
  FileUp,
  Loader2,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BAR_COUNCILS } from "@/lib/constants/legal";
import type { LawyerProfileRecord, LawyerVerification } from "@/lib/types/legal";

interface VerificationFormProps {
  lawyer: LawyerProfileRecord;
  verification: LawyerVerification | null;
}

export function LawyerVerificationForm({ lawyer, verification }: VerificationFormProps) {
  const router = useRouter();
  const [barCouncil, setBarCouncil] = useState(
    verification?.bar_council || lawyer.bar_council || BAR_COUNCILS[0]
  );
  const [licenseNumber, setLicenseNumber] = useState(
    verification?.license_number || lawyer.bar_license_number || ""
  );

  const [licenseDocPath, setLicenseDocPath] = useState(verification?.license_document_path || "");
  const [additionalDocPath, setAdditionalDocPath] = useState(verification?.additional_document_path || "");
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const status = lawyer.verification_status;

  const handleUpload = async (
    file: File,
    type: "license" | "additional"
  ) => {
    const isLicense = type === "license";
    if (isLicense) setUploadingLicense(true);
    else setUploadingAdditional(true);

    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Database unavailable");

      const fileExt = file.name.split(".").pop();
      const filePath = `${lawyer.id}/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("verifications")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      if (isLicense) setLicenseDocPath(filePath);
      else setAdditionalDocPath(filePath);
    } catch (err: any) {
      setError(err?.message || `Failed to upload ${type} document.`);
    } finally {
      if (isLicense) setUploadingLicense(false);
      else setUploadingAdditional(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim()) {
      setError("Please provide your official Bar license / enrolment number.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/lawyer/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barCouncil,
          licenseNumber: licenseNumber.trim(),
          licenseDocumentPath: licenseDocPath || null,
          additionalDocumentPath: additionalDocPath || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit verification");

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to submit verification documents.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Privacy Notice Card */}
      <Alert className="border-teal/30 bg-teal-soft/20 text-teal-dark">
        <Lock className="size-4 text-teal shrink-0" />
        <AlertDescription className="text-xs leading-relaxed text-slate-800">
          <strong>Private & Confidential:</strong> Verification documents are stored in private Supabase encrypted storage. They are never published on your public profile or shared with citizens.
        </AlertDescription>
      </Alert>

      {/* Verification State Banner */}
      {status === "verified" && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <BadgeCheck className="size-7" />
              </span>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-emerald-950">
                  You are a Verified LegalEase Advocate
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your credentials have been validated by LegalEase Compliance. You are enrolled with{" "}
                  <strong>{lawyer.bar_council}</strong> under license <strong>{lawyer.bar_license_number}</strong>.
                </p>
                <div className="pt-2">
                  <Badge className="bg-emerald-600 text-white text-xs">
                    Verified Advocate Badge Active
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "pending" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-amber-600 text-white">
                <Clock className="size-7" />
              </span>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-amber-950">
                  Verification Pending Administrator Review
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Your Bar license credentials for <strong>{barCouncil}</strong> (Lic. #{licenseNumber}) have been received. Review typically takes 24–48 business hours. You will receive a notification as soon as verification is complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "needs_info" && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-orange-600 text-white">
                <AlertCircle className="size-7" />
              </span>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-orange-950">
                  Additional Information Required
                </h3>
                {verification?.lawyer_visible_note ? (
                  <p className="text-xs text-orange-900 bg-white/70 p-3 rounded-lg border border-orange-200 mt-2">
                    <strong>Admin Note:</strong> {verification.lawyer_visible_note}
                  </p>
                ) : (
                  <p className="text-xs text-orange-900 leading-relaxed">
                    Please upload an updated scan of your Bar Council enrolment certificate or Bar Association card.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "rejected" && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-rose-600 text-white">
                <ShieldAlert className="size-7" />
              </span>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-rose-950">
                  Verification Rejected
                </h3>
                {verification?.lawyer_visible_note && (
                  <p className="text-xs text-rose-900 bg-white/70 p-3 rounded-lg border border-rose-200 mt-2">
                    <strong>Reason:</strong> {verification.lawyer_visible_note}
                  </p>
                )}
                <p className="text-xs text-rose-900 pt-1">
                  You may correct your bar council details and re-submit below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Form (Shown if not verified, or if resubmission needed) */}
      {status !== "verified" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-navy">
              {status === "not_submitted" ? "Submit Bar Council Credentials" : "Update & Resubmit Credentials"}
            </CardTitle>
            <CardDescription className="text-xs">
              Provide your official bar enrolment details to earn the verified advocate badge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
                  <Check className="size-4 text-emerald-600" />
                  <AlertDescription className="text-xs">
                    Verification documents submitted successfully.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="barCouncil" className="text-xs font-semibold">
                    Enrolling Bar Council *
                  </Label>
                  <Select value={barCouncil} onValueChange={setBarCouncil}>
                    <SelectTrigger id="barCouncil">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BAR_COUNCILS.map((bc) => (
                        <SelectItem key={bc} value={bc}>{bc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="licenseNumber" className="text-xs font-semibold">
                    Bar License / Enrolment Number *
                  </Label>
                  <Input
                    id="licenseNumber"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. SBC/HC-12345"
                    required
                  />
                </div>
              </div>

              {/* Document Uploads */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Bar Enrolment Certificate / License Scan
                  </Label>
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center bg-slate-50/50">
                    <FileUp className="mx-auto size-6 text-slate-400" />
                    <label
                      htmlFor="license-doc"
                      className="mt-2 block cursor-pointer text-xs font-semibold text-teal hover:underline"
                    >
                      {uploadingLicense ? "Uploading..." : "Click to upload document"}
                      <input
                        id="license-doc"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="sr-only"
                        disabled={uploadingLicense}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, "license");
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG up to 5MB</p>
                    {licenseDocPath && (
                      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-semibold">
                        <Check className="size-3" /> Uploaded successfully
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Supporting ID / Bar Card (Optional)
                  </Label>
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center bg-slate-50/50">
                    <FileUp className="mx-auto size-6 text-slate-400" />
                    <label
                      htmlFor="additional-doc"
                      className="mt-2 block cursor-pointer text-xs font-semibold text-teal hover:underline"
                    >
                      {uploadingAdditional ? "Uploading..." : "Click to upload document"}
                      <input
                        id="additional-doc"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="sr-only"
                        disabled={uploadingAdditional}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, "additional");
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-1">Bar association card or CNIC</p>
                    {additionalDocPath && (
                      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-semibold">
                        <Check className="size-3" /> Uploaded successfully
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={submitting || uploadingLicense || uploadingAdditional}
                  className="bg-navy text-white hover:bg-navy/90 text-xs font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Submitting for Verification...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 size-4" />
                      Submit for Verification
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
