"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Scale,
  Search,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";

import { lookupCnicStatusAction } from "@/app/actions/filer";
import type { FilerLookupResult } from "@/lib/services/filer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── CNIC formatting ──────────────────────────────────────────────────────────

function formatCnicInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Status result display ───────────────────────────────────────────────────

function FilerResult({ result }: { result: FilerLookupResult }) {
  const [guidanceOpen, setGuidanceOpen] = useState(true);

  if (result.status === "filer") {
    return (
      <div className="space-y-4">
        {/* Status card */}
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-emerald-800">Filer</h2>
          <p className="mt-2 text-sm text-emerald-700">
            Your CNIC <span className="font-mono font-semibold">{result.cnicFormatted}</span> is
            listed as a <strong>Filer</strong> in the currently active LegalEase taxpayer dataset.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge className="bg-emerald-200 text-emerald-900 border-emerald-400 text-xs">
              ✓ Active Taxpayer
            </Badge>
            {result.taxYear && (
              <Badge variant="outline" className="text-emerald-800 border-emerald-400 text-xs">
                Tax Year: {result.taxYear}
              </Badge>
            )}
          </div>
        </div>

        {/* Dataset metadata */}
        <DatasetDisclaimer result={result} />
      </div>
    );
  }

  if (result.status === "non_filer") {
    const guidance = result.guidance;
    return (
      <div className="space-y-4">
        {/* Status card */}
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-amber-100 text-amber-700">
            <XCircle className="size-8" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-amber-800">Non-Filer</h2>
          <p className="mt-2 text-sm text-amber-700">
            Your CNIC <span className="font-mono font-semibold">{result.cnicFormatted}</span> is
            listed as a <strong>Non-Filer</strong> in the currently active LegalEase taxpayer dataset.
          </p>
          {result.taxYear && (
            <Badge className="mt-3 bg-amber-200 text-amber-900 border-amber-400 text-xs">
              Tax Year: {result.taxYear}
            </Badge>
          )}
        </div>

        {/* Dataset metadata */}
        <DatasetDisclaimer result={result} />

        {/* How to become a filer guidance */}
        {guidance && (
          <Card className="border-navy/20">
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3"
                onClick={() => setGuidanceOpen((v) => !v)}
              >
                <CardTitle className="font-heading text-base text-navy flex items-center gap-2 text-left">
                  <BookOpen className="size-4.5 text-teal shrink-0" />
                  {guidance.title}
                </CardTitle>
                {guidanceOpen ? (
                  <ChevronUp className="size-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="size-4 text-slate-500 shrink-0" />
                )}
              </button>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-2.5 mt-2 text-xs text-blue-800">
                <Info className="size-3.5 mt-0.5 shrink-0 text-blue-600" />
                <span>
                  <strong>Source:</strong> {guidance.legalBasis} — {guidance.authority}.
                  This guidance is based on current published FBR procedures and is not legal advice.
                </span>
              </div>
            </CardHeader>

            {guidanceOpen && (
              <CardContent className="space-y-5">
                <p className="text-sm text-slate-700 leading-relaxed">{guidance.summary}</p>

                {/* Steps */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal">
                    Step-by-Step Process
                  </h3>
                  {guidance.steps.map((step) => (
                    <div
                      key={step.step}
                      className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-white text-xs font-bold font-heading">
                        {step.step}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy text-sm">{step.title}</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {step.description}
                        </p>
                        {step.requirements.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {step.requirements.map((req, i) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="mt-1 size-1.5 rounded-full bg-teal shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Benefits */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                    Benefits of Filing
                  </h3>
                  <ul className="space-y-1">
                    {guidance.benefits.map((b, i) => (
                      <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Penalties */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">
                    Consequences of Not Filing
                  </h3>
                  <ul className="space-y-1">
                    {guidance.penaltiesForNonFiling.map((p, i) => (
                      <li key={i} className="text-xs text-rose-800 flex items-start gap-1.5">
                        <AlertTriangle className="size-3.5 text-rose-600 mt-0.5 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* FBR portal link */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <a
                    href={guidance.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy/90 transition-colors"
                  >
                    <ExternalLink className="size-3.5 text-gold" />
                    Visit FBR Iris Portal
                  </a>
                  <span className="text-xs text-muted-foreground">
                    Register and file returns at <code className="font-mono">iris.fbr.gov.pk</code>
                  </span>
                </div>

                {/* Ask AI follow-up */}
                <div className="rounded-xl border border-teal/30 bg-teal/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-teal shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-navy">Ask LegalEase AI</p>
                      <p className="text-xs text-slate-600">
                        Have questions about filing requirements? Ask our AI for verified guidance from the knowledge base.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-teal hover:bg-teal/90 text-white shrink-0 ml-auto">
                    <Link href="/citizen/ai-assistant">
                      <Sparkles className="mr-1.5 size-3.5" />
                      Open AI Assistant
                    </Link>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    );
  }

  // not_found
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-6 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-slate-100 text-slate-500">
          <HelpCircle className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-700">Not Found</h2>
        <p className="mt-2 text-sm text-slate-600">
          CNIC <span className="font-mono font-semibold">{result.cnicFormatted}</span> was{" "}
          <strong>not found</strong> in the currently active LegalEase taxpayer dataset.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="text-slate-600 text-xs">
            Not Found ≠ Non-Filer
          </Badge>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          This does not necessarily mean you are a non-filer. Your CNIC may not appear because the
          dataset was uploaded before your return was processed, or the dataset may not be fully
          comprehensive. Please verify directly with the official FBR portal.
        </p>
      </div>

      <DatasetDisclaimer result={result} />

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
        <AlertCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-800">Verify officially with FBR</p>
          <p className="text-xs text-blue-700 mt-0.5">
            For authoritative filer status, check your status directly on the{" "}
            <a
              href="https://iris.fbr.gov.pk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              FBR Iris Portal
            </a>{" "}
            or the{" "}
            <a
              href="https://atl.fbr.gov.pk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Active Taxpayers List
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function DatasetDisclaimer({ result }: { result: FilerLookupResult }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <Shield className="size-4 shrink-0 mt-0.5 text-slate-400" />
      <span>
        Status shown is based on the LegalEase dataset
        {result.datasetName ? ` "${result.datasetName}"` : ""}
        {result.datasetUploadedAt ? ` uploaded on ${fmtDate(result.datasetUploadedAt)}` : ""}
        {result.taxYear ? ` (Tax Year: ${result.taxYear})` : ""}
        {result.effectiveDate ? `, effective ${fmtDate(result.effectiveDate)}` : ""}.
        {" "}For official current tax status, verify through the relevant official authority (FBR / iris.fbr.gov.pk).
        This dataset is a snapshot and may not reflect real-time FBR data.
      </span>
    </div>
  );
}

// ─── Main Client Component ───────────────────────────────────────────────────

export function FilerStatusClient() {
  const [cnicInput, setCnicInput] = useState("");
  const [result, setResult] = useState<FilerLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnicInput(e.target.value);
    setCnicInput(formatted);
    if (result || error) {
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawDigits = cnicInput.replace(/[^0-9]/g, "");
    if (rawDigits.length !== 13) {
      setError("Please enter a valid 13-digit CNIC (e.g. 42101-1234567-1).");
      return;
    }
    setError(null);
    setResult(null);

    startTransition(async () => {
      const res = await lookupCnicStatusAction(cnicInput);
      if (res.ok && res.data) {
        setResult(res.data);
      } else {
        setError(res.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  const handleReset = () => {
    setCnicInput("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="p-3 rounded-xl bg-navy text-white">
          <Scale className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            Check Your Filer Status
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter your 13-digit CNIC to check your status in the active LegalEase taxpayer dataset.
            Your CNIC is never sent to any AI service.
          </p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <Shield className="size-4 shrink-0 mt-0.5 text-blue-600" />
        <span>
          <strong>Privacy:</strong> Your CNIC is only used for a direct database lookup on our secure servers.
          It is never logged, shared with third parties, or sent to any external AI service.
        </span>
      </div>

      {/* Lookup form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <label htmlFor="cnic-input" className="text-sm font-semibold text-navy">
              National Identity Card Number (CNIC)
            </label>
            <div className="relative">
              <Input
                id="cnic-input"
                type="text"
                inputMode="numeric"
                value={cnicInput}
                onChange={handleCnicChange}
                placeholder="42101-1234567-1"
                className="h-12 text-base font-mono pr-12 tracking-wide"
                maxLength={15}
                autoComplete="off"
                aria-describedby="cnic-hint"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
            </div>
            <p id="cnic-hint" className="text-xs text-muted-foreground">
              Enter your 13-digit CNIC. Dashes are optional (e.g. 42101-1234567-1 or 4210112345671).
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <AlertTriangle className="size-4 shrink-0 text-rose-500" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={pending || cnicInput.replace(/[^0-9]/g, "").length !== 13}
              className="bg-navy hover:bg-navy/90 text-white gap-2 h-11 px-6"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Checking Status…
                </>
              ) : (
                <>
                  <Search className="size-4 text-gold" />
                  Check Status
                </>
              )}
            </Button>
            {(result || cnicInput) && (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4 text-slate-600"
                onClick={handleReset}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Result */}
      {result && !pending && <FilerResult result={result} />}

      {/* Explanation section (shown when no result yet) */}
      {!result && !pending && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm text-navy flex items-center gap-2">
              <Info className="size-4 text-slate-500" />
              How This Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-slate-600">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              <div className="rounded-lg bg-white border p-3 text-center">
                <div className="mx-auto mb-2 grid size-8 place-items-center rounded-full bg-navy/10 text-navy">
                  <Search className="size-4" />
                </div>
                <p className="font-semibold text-navy text-xs">Enter CNIC</p>
                <p className="text-[11px] text-slate-500 mt-1">Your 13-digit national identity number</p>
              </div>
              <div className="rounded-lg bg-white border p-3 text-center">
                <div className="mx-auto mb-2 grid size-8 place-items-center rounded-full bg-teal/10 text-teal">
                  <Shield className="size-4" />
                </div>
                <p className="font-semibold text-navy text-xs">Exact Lookup</p>
                <p className="text-[11px] text-slate-500 mt-1">Server-side exact match. No AI guessing.</p>
              </div>
              <div className="rounded-lg bg-white border p-3 text-center">
                <div className="mx-auto mb-2 grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                </div>
                <p className="font-semibold text-navy text-xs">Instant Result</p>
                <p className="text-[11px] text-slate-500 mt-1">Filer, Non-Filer, or Not Found</p>
              </div>
            </div>
            <p className="pt-1">
              <strong>Important:</strong> This lookup is based on the active dataset uploaded by LegalEase administrators.
              It may not reflect real-time FBR data. For official verification, always check{" "}
              <a
                href="https://atl.fbr.gov.pk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal underline font-medium"
              >
                atl.fbr.gov.pk
              </a>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
