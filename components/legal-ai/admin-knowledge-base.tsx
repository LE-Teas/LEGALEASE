"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  verifyDocument,
  markDocumentNeedsReview,
  deleteDocument,
  reprocessDocument,
  type AdminActionResult,
} from "@/app/actions/knowledge-base";
import type { AdminDocumentRow } from "@/app/admin/knowledge-base/page";

export interface KnowledgeBaseStats {
  total: number;
  verified: number;
  pending: number;
  needs_review: number;
  failed: number;
  ready: number;
  chunksIndexed: number;
}

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-teal-soft text-teal",
  pending: "bg-gold/20 text-navy-dark",
  needs_review: "bg-orange-100 text-orange-700",
  failed: "bg-destructive/10 text-destructive",
  ready: "bg-teal-soft text-teal",
  chunking: "bg-blue-100 text-blue-700",
  embedding: "bg-blue-100 text-blue-700",
};

const PROCESSING_LABELS: Record<string, string> = {
  ready: "Ready",
  pending: "Pending",
  chunking: "Chunking",
  embedding: "Embedding",
  failed: "Failed",
};

export function AdminKnowledgeBase({
  documents,
  stats,
}: {
  documents: AdminDocumentRow[];
  stats: KnowledgeBaseStats;
}) {
  const [busy, setBusy] = useState<{ id: string; kind: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    id: string,
    kind: string,
    action: (id: string) => Promise<AdminActionResult>,
    confirmMessage?: string
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy({ id, kind });
    setError(null);
    try {
      const result = await action(id);
      if (!result.ok) setError(result.error ?? "Action failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const isBusy = (id: string, kind: string) =>
    busy?.id === id && busy.kind === kind;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#0A2843]">
              Legal Knowledge Base & Statutes
            </h1>
            <Badge className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-xs">
              pgvector RAG
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Inspect, upload, and human-verify Pakistani federal and provincial statutes. Only documents approved as{" "}
            <strong className="text-[#0A2843] font-semibold">verified</strong> and{" "}
            <strong className="text-[#0A2843] font-semibold">ready</strong> are retrieved for citizen AI legal queries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5 shadow-xs">
            <a href="/admin/knowledge-base/upload">
              <FileText className="size-3.5" />
              Upload Legal Document
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Stat label="Total documents" value={stats.total} />
        <Stat label="Verified" value={stats.verified} tone="teal" />
        <Stat label="Pending" value={stats.pending} tone="gold" />
        <Stat label="Needs review" value={stats.needs_review} tone="orange" />
        <Stat label="Failed" value={stats.failed} tone="red" />
        <Stat label="Chunks indexed" value={stats.chunksIndexed} tone="teal" />
        <Stat label="Ready for search" value={stats.ready} tone="teal" />
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle data-icon="start" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader className="border-b border-border/70 bg-navy/[0.03]">
          <CardTitle className="text-base text-navy">
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-navy/[0.05] text-navy">
                <FileText className="size-6" data-icon="inline" />
              </span>
              <p className="max-w-md text-sm text-muted-foreground">
                No documents yet. Run the ingestion script
                (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  npm run ingest:legal -- &quot;C:\path\to\knowledge-base&quot;
                </code>
                ) to load laws, then verify them here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-border/70 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Jurisdiction</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">Verification</th>
                    <th className="px-4 py-3 font-medium">Processing</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {documents.map((doc) => {
                    const needsReviewFlag = doc.requires_review;
                    return (
                      <tr key={doc.id} className="hover:bg-muted/30">
                        <td className="max-w-[260px] px-4 py-3">
                          <p className="truncate font-medium text-navy" title={doc.title}>
                            {doc.title}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            {doc.year && <span>{doc.year}</span>}
                            {doc.version_label && <span>{doc.version_label}</span>}
                            <span className="font-mono">{doc.document_type}</span>
                            {needsReviewFlag && (
                              <Badge
                                variant="outline"
                                className="border-orange-300 text-orange-700"
                              >
                                version review
                              </Badge>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="font-normal">
                            {doc.category.replace(/_/g, "-")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.jurisdiction_level}
                          {doc.province ? ` · ${doc.province}` : ""}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.page_count ?? "—"} pp · {doc.chunk_count ?? 0} chunks
                        </td>
                        <td className="px-4 py-3">
                          <VerifiedBadge status={doc.verification_status} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={`font-normal ${
                              STATUS_STYLES[doc.processing_status] ?? ""
                            }`}
                          >
                            {PROCESSING_LABELS[doc.processing_status] ?? doc.processing_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs"
                              disabled={busy !== null}
                              onClick={() =>
                                run(doc.id, "verify", verifyDocument)
                              }
                            >
                              {isBusy(doc.id, "verify") ? (
                                <Loader2 className="size-3.5 animate-spin" data-icon="inline" />
                              ) : (
                                <CheckCircle2 className="size-3.5" data-icon="inline" />
                              )}
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs text-foreground/70"
                              disabled={busy !== null}
                              onClick={() =>
                                run(doc.id, "review", markDocumentNeedsReview)
                              }
                            >
                              {isBusy(doc.id, "review") ? (
                                <Loader2 className="size-3.5 animate-spin" data-icon="inline" />
                              ) : (
                                <Eye className="size-3.5" data-icon="inline" />
                              )}
                              Needs review
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs"
                              disabled={busy !== null}
                              onClick={() =>
                                run(doc.id, "reprocess", reprocessDocument)
                              }
                            >
                              {isBusy(doc.id, "reprocess") ? (
                                <Loader2 className="size-3.5 animate-spin" data-icon="inline" />
                              ) : (
                                <RefreshCw className="size-3.5" data-icon="inline" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                              disabled={busy !== null}
                              onClick={() =>
                                run(
                                  doc.id,
                                  "delete",
                                  deleteDocument,
                                  `Delete "${doc.title}" and all of its chunks? This cannot be undone.`
                                )
                              }
                            >
                              {isBusy(doc.id, "delete") ? (
                                <Loader2 className="size-3.5 animate-spin" data-icon="inline" />
                              ) : (
                                <Trash2 className="size-3.5" data-icon="inline" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "teal" | "gold" | "orange" | "red";
}) {
  const tones: Record<string, string> = {
    teal: "text-teal",
    gold: "text-navy-dark",
    orange: "text-orange-600",
    red: "text-destructive",
  };
  return (
    <div className="rounded-xl border border-border/70 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-heading text-2xl font-bold ${tone ? tones[tone] : "text-navy"}`}>
        {value}
      </p>
    </div>
  );
}

function VerifiedBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
    verified: { label: "Verified", icon: CheckCircle2, tone: "bg-teal-soft text-teal" },
    pending: { label: "Pending", icon: Clock, tone: "bg-gold/20 text-navy-dark" },
    needs_review: { label: "Needs review", icon: AlertCircle, tone: "bg-orange-100 text-orange-700" },
    failed: { label: "Failed", icon: XCircle, tone: "bg-destructive/10 text-destructive" },
  };
  const item = map[status] ?? { label: status, icon: Clock, tone: "bg-muted text-muted-foreground" };
  const Icon = item.icon;
  return (
    <Badge variant="secondary" className={`gap-1 font-normal ${item.tone}`}>
      <Icon className="size-3" data-icon="inline" />
      {item.label}
    </Badge>
  );
}