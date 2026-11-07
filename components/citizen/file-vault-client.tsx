"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  FileText,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { CitizenFile } from "@/lib/types/legal";
import { getErrorMessage } from "@/lib/errors";

interface FileVaultClientProps {
  initialFiles: CitizenFile[];
}

export function FileVaultClient({ initialFiles }: FileVaultClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<CitizenFile[]>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState("contract");
  const [extractedText, setExtractedText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      if (fileName.trim()) {
        formData.append("file_name", fileName.trim());
      }
      formData.append("category", category);
      if (extractedText.trim()) {
        formData.append("extracted_text", extractedText.trim());
      }

      const res = await fetch("/api/citizen/files", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload private document.");
      }

      setFiles((prev) => [data.file, ...prev]);
      setSelectedFile(null);
      setFileName("");
      setExtractedText("");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/citizen/files?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        if (previewId === id) setPreviewId(null);
        router.refresh();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left: Upload Form */}
      <div className="lg:col-span-1">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#0d2b43] text-[#0fa176]">
                <Upload className="size-4" />
              </span>
              <div>
                <CardTitle className="font-heading text-base text-[#0d2b43]">
                  Upload Private Document
                </CardTitle>
                <CardDescription className="text-xs">
                  Strictly isolated to your account for File-Based RAG analysis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleUpload} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Select Document (.txt, .pdf, .md, .csv)
                </Label>
                <Input
                  type="file"
                  accept=".txt,.md,.csv,.json,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f && !fileName) setFileName(f.name);
                  }}
                  className="text-xs cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Document Title / Label
                </Label>
                <Input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g., Clifton Tenancy Agreement 2026.pdf"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Document Category
                </Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0fa176] focus:outline-none"
                >
                  <option value="contract">Tenancy / Contract Agreement</option>
                  <option value="notice">Legal Notice / Demand Letter</option>
                  <option value="fir">FIR / Police Complaint Copy</option>
                  <option value="property">Property / Sale Deed / Mutation</option>
                  <option value="family">Family / Nikahnama / Maintenance</option>
                  <option value="other">Other Private Legal File</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Document Text / Key Clauses (Optional or Paste Directly)
                </Label>
                <Textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  rows={5}
                  placeholder="Paste key contract clauses, notice text, or FIR contents here if uploading a scanned file or creating a text record directly..."
                  className="text-xs"
                />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-900 flex items-start gap-2">
                <Lock className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Zero Cross-User Leakage:</strong> Your uploaded files are protected by Row-Level Security (`citizen_id = auth.uid()`) and are never shared with other users or public AI indices.
                </span>
              </div>

              <Button
                type="submit"
                disabled={uploading || (!selectedFile && !extractedText.trim())}
                className="w-full bg-[#0d2b43] hover:bg-[#0d2b43]/90 text-white text-xs h-10"
              >
                {uploading ? (
                  "Encrypting & Indexing Private File..."
                ) : (
                  <>
                    <Plus className="mr-1.5 size-4 text-[#0fa176]" />
                    Save to Private Vault
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: Uploaded Files List */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-lg text-[#0d2b43]">
                Your Private Legal Vault ({files.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Select any document to inspect extracted text or launch File-Based RAG analysis with LegalEase AI
              </CardDescription>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
              <Lock className="mr-1 size-3" />
              User-Scoped RLS
            </Badge>
          </CardHeader>
          <CardContent className="p-5">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileSearch className="size-6" />
                </div>
                <p className="mt-3 font-heading text-sm font-semibold text-[#0d2b43]">
                  No private files uploaded yet
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Upload a tenancy agreement, legal notice, contract, or FIR copy on the left to ask grounded AI questions against your specific document alongside Pakistani statutes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => {
                  const isPreviewOpen = previewId === file.id;
                  const sizeBytes = file.file_size || file.file_size_bytes || 500;
                  const catLabel = file.category || file.summary || "document";
                  return (
                    <div
                      key={file.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-[#0fa176] shrink-0" />
                            <h4 className="font-heading text-sm font-bold text-[#0d2b43] truncate">
                              {file.file_name}
                            </h4>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {catLabel}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Uploaded{" "}
                            {new Date(file.created_at).toLocaleDateString("en-PK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            • {Math.max(1, Math.round(sizeBytes / 1024))} KB •{" "}
                            {(file.extracted_text || "").length.toLocaleString()} chars extracted
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewId(isPreviewOpen ? null : file.id)}
                            className="h-8 text-xs"
                          >
                            {isPreviewOpen ? "Hide Text" : "Inspect Text"}
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            className="h-8 bg-[#0fa176] hover:bg-[#0c8863] text-white text-xs"
                          >
                            <Link href={`/citizen/ai-assistant?fileId=${file.id}`}>
                              <Sparkles className="mr-1.5 size-3.5" />
                              Analyze with Legal AI
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(file.id)}
                            className="size-8 text-slate-400 hover:text-rose-600"
                            title="Delete private file"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {isPreviewOpen && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Extracted Private Document Context (Used for File-Based RAG)
                          </p>
                          <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-slate-700">
                            {file.extracted_text || "No text extracted."}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
