"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Hash,
  Layers,
  Loader2,
  Power,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  verifyDocument,
  markDocumentNeedsReview,
  toggleDocumentActive,
  deleteDocument,
  reprocessDocument,
} from "@/app/actions/knowledge-base";

interface ChunkRow {
  id: string;
  chunk_index: number;
  section_number: string | null;
  section_title: string | null;
  article_number: string | null;
  page_number: number | null;
  token_count: number | null;
  content: string;
}

interface DocumentDetailProps {
  document: {
    id: string;
    title: string;
    normalized_title: string;
    short_title: string | null;
    document_type: string;
    category: string;
    jurisdiction_level: string;
    province: string | null;
    city: string | null;
    country: string;
    year: number | null;
    official_source_url: string | null;
    source_authority: string | null;
    storage_path: string | null;
    file_hash: string;
    verification_status: string;
    processing_status: string;
    version_label: string | null;
    is_active: boolean;
    is_repealed: boolean;
    requires_review: boolean;
    page_count: number | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    created_by_profile?: { full_name: string; email: string } | null;
    verified_by_profile?: { full_name: string; email: string } | null;
    verified_at?: string | null;
  };
  chunks: ChunkRow[];
  downloadUrl: string | null;
}

export function DocumentDetailClient({
  document: doc,
  chunks,
  downloadUrl,
}: DocumentDetailProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chunks" | "metadata">("chunks");

  const runAction = async (actionName: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyAction(actionName);
    setError(null);
    setSuccess(null);
    try {
      const res = await fn();
      if (!res.ok) {
        setError(res.error || `Failed to perform ${actionName}`);
      } else {
        setSuccess(`Action ${actionName} completed successfully.`);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.title}" and all its vector chunks? This cannot be undone.`)) {
      return;
    }
    setBusyAction("delete");
    try {
      const res = await deleteDocument(doc.id);
      if (!res.ok) {
        setError(res.error || "Failed to delete document.");
      } else {
        router.push("/admin/knowledge-base");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
            <Link href="/admin/knowledge-base">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-navy">{doc.title}</h1>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${
                  doc.verification_status === "verified"
                    ? "bg-teal/10 text-teal border-teal/20"
                    : doc.verification_status === "needs_review"
                    ? "bg-orange-100 text-orange-800 border-orange-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }`}
              >
                {doc.verification_status.replace(/_/g, " ")}
              </Badge>
              {!doc.is_active && (
                <Badge variant="outline" className="bg-slate-100 text-slate-600 text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doc.document_type.toUpperCase()} • {doc.category} • {doc.jurisdiction_level}
              {doc.province ? ` (${doc.province})` : ""} • Enacted {doc.year || "N/A"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {downloadUrl && (
            <Button asChild variant="outline" size="sm" className="text-xs h-8">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-1.5 size-3.5 text-slate-600" />
                Download PDF
              </a>
            </Button>
          )}

          {doc.verification_status !== "verified" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold"
              disabled={Boolean(busyAction)}
              onClick={() => runAction("verify", () => verifyDocument(doc.id))}
            >
              {busyAction === "verify" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              Verify Law
            </Button>
          )}

          {doc.verification_status !== "needs_review" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-orange-700 border-orange-300 hover:bg-orange-50"
              disabled={Boolean(busyAction)}
              onClick={() => runAction("needs_review", () => markDocumentNeedsReview(doc.id))}
            >
              {busyAction === "needs_review" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="mr-1.5 size-3.5" />
              )}
              Mark Needs Review
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={Boolean(busyAction)}
            onClick={() => runAction("toggle_active", () => toggleDocumentActive(doc.id))}
          >
            <Power className="mr-1.5 size-3.5 text-slate-500" />
            {doc.is_active ? "Deactivate" : "Activate"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={Boolean(busyAction)}
            onClick={() => runAction("reprocess", () => reprocessDocument(doc.id))}
          >
            {busyAction === "reprocess" ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Reprocess
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 text-rose-600 hover:bg-rose-50 border-rose-200"
            disabled={Boolean(busyAction)}
            onClick={handleDelete}
          >
            {busyAction === "delete" ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertDescription className="text-xs font-medium">{success}</AlertDescription>
        </Alert>
      )}

      {/* Warning / Conflict Alert if requires_review */}
      {doc.requires_review && doc.metadata?.review_reason && (
        <Alert className="bg-orange-50 border-orange-200 text-orange-950">
          <ShieldAlert className="size-4 text-orange-600" />
          <AlertTitle className="text-xs font-bold">Document Requires Review</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {doc.metadata.review_reason}
          </AlertDescription>
        </Alert>
      )}

      {/* Metadata & Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm text-navy">Document Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Normalized Identifier</span>
              <span className="font-mono font-medium text-slate-800 break-all">{doc.normalized_title}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Jurisdiction</span>
              <span className="font-medium text-slate-800">{doc.jurisdiction_level} {doc.province ? `• ${doc.province}` : ""}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Version Label</span>
              <span className="font-medium text-slate-800">{doc.version_label || "Initial statutory release"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Source Authority</span>
              <span className="font-medium text-slate-800">{doc.source_authority || "Official Gazette of Pakistan"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Enactment Year</span>
              <span className="font-medium text-slate-800">{doc.year || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Page Count</span>
              <span className="font-medium text-slate-800">{doc.page_count || "N/A"} pages</span>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-muted-foreground block text-[11px]">Official Source Link</span>
              {doc.official_source_url ? (
                <a
                  href={doc.official_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal hover:underline flex items-center gap-1 font-mono text-[11px] truncate"
                >
                  <ExternalLink className="size-3" />
                  {doc.official_source_url}
                </a>
              ) : (
                <span className="text-slate-400">None provided</span>
              )}
            </div>
            <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-100">
              <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                <Hash className="size-3 text-slate-400" /> SHA-256 Digest (Duplicate Protection)
              </span>
              <span className="font-mono text-[10px] text-slate-700 break-all bg-slate-50 px-2 py-1 rounded border border-slate-200 block mt-0.5">
                {doc.file_hash}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm text-navy">Pipeline & Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-muted-foreground">Processing Status</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {doc.processing_status}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-muted-foreground">Vector Chunks</span>
              <span className="font-bold text-navy">{chunks.length} chunks</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-muted-foreground">Citizen RAG Eligible</span>
              <span className="font-bold text-emerald-600">
                {doc.verification_status === "verified" && doc.is_active && !doc.is_repealed
                  ? "Yes (Active)"
                  : "No (Excluded)"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-muted-foreground">Uploaded At</span>
              <span className="text-slate-700 font-mono text-[11px]">
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
            {doc.storage_path && (
              <div className="pt-2">
                <span className="text-[11px] text-muted-foreground block mb-1">Storage Path</span>
                <span className="font-mono text-[10px] text-slate-600 break-all bg-slate-50 p-1.5 rounded border border-slate-200 block">
                  {doc.storage_path}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Extracted Chunks Inspector */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
              <Layers className="size-4 text-teal" />
              Extracted Legal Chunks ({chunks.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Legal-aware splits with section, article, and page metadata for exact citation grounding.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {chunks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No chunks indexed for this document yet. Click &quot;Reprocess&quot; to extract and embed.
            </div>
          ) : (
            chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-navy text-white">
                      Chunk #{chunk.chunk_index + 1}
                    </span>
                    {chunk.section_number && (
                      <Badge variant="outline" className="text-[10px] bg-white font-medium">
                        Section {chunk.section_number}
                        {chunk.section_title ? `: ${chunk.section_title}` : ""}
                      </Badge>
                    )}
                    {chunk.article_number && (
                      <Badge variant="outline" className="text-[10px] bg-white font-medium">
                        Article {chunk.article_number}
                      </Badge>
                    )}
                    {chunk.page_number && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Page {chunk.page_number}
                      </span>
                    )}
                  </div>
                  {chunk.token_count && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      ~{chunk.token_count} tokens
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-800 font-mono bg-white p-3 rounded border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
