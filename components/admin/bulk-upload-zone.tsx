"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileCheck2,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { autoBulkIngestAction, type BulkUploadSummary } from "@/app/actions/auto-bulk-ingest";

export function BulkUploadZone() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkUploadSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const array = Array.from(files).filter((f) => {
      const lower = f.name.toLowerCase();
      return lower.endsWith(".pdf") || lower.endsWith(".xlsx") || lower.endsWith(".csv");
    });
    setSelectedFiles((prev) => [...prev, ...array]);
    setSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleStartIngest = async () => {
    if (selectedFiles.length === 0) return;
    setProcessing(true);
    setProgressMsg(`Processing ${selectedFiles.length} files into vector chunks with Gemini...`);
    setSummary(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await autoBulkIngestAction(formData);
      setSummary(res);
      if (res.ok) {
        setSelectedFiles([]);
      }
    } catch (err) {
      setSummary({
        ok: false,
        error: err instanceof Error ? err.message : "Bulk ingestion failed.",
        totalFiles: selectedFiles.length,
        successful: 0,
        skipped: 0,
        failed: selectedFiles.length,
        totalChunks: 0,
        results: [],
      });
    } finally {
      setProcessing(false);
      setProgressMsg(null);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-teal-soft text-teal">
              <UploadCloud className="size-5" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
                1-Click Bulk File Ingestion
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  Zero Config · Gemini Auto Chunking
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Drag and drop all your laws, constitution, and ATL spreadsheets. No manual data entry required.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-teal rounded-xl p-8 text-center transition-colors bg-slate-50/50 hover:bg-teal-soft/20"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            accept=".pdf,.xlsx,.csv"
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="grid size-12 place-items-center rounded-full bg-teal-soft text-teal">
              <Layers className="size-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Click or drag files here to bulk upload
            </p>
            <p className="text-xs text-slate-500">
              Supports <strong>PDF laws</strong>, <strong>Constitution</strong>, and <strong>ATL (.xlsx / .csv)</strong> spreadsheets
            </p>
          </div>
        </div>

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>{selectedFiles.length} file(s) selected for auto-ingestion</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
                className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                disabled={processing}
              >
                Clear all
              </Button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-slate-50/50">
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1 px-2.5 rounded bg-white border text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{f.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {(f.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleStartIngest}
              disabled={processing}
              className="w-full bg-teal hover:bg-teal-dark text-white font-semibold py-2.5 text-xs shadow-sm flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {progressMsg}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Auto-Extract, Chunk & Ingest All Files ({selectedFiles.length})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Summary output */}
        {summary && (
          <div className="space-y-3 pt-2">
            {summary.ok ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertTitle className="text-xs font-bold">Bulk Ingestion Complete!</AlertTitle>
                <AlertDescription className="text-xs text-emerald-700 mt-1">
                  Successfully processed <strong>{summary.successful}</strong> of {summary.totalFiles} files. Created{" "}
                  <strong>{summary.totalChunks}</strong> vector chunks with Gemini. (Skipped: {summary.skipped}, Failed: {summary.failed})
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle className="text-xs font-bold">Ingestion Error</AlertTitle>
                <AlertDescription className="text-xs mt-1">{summary.error}</AlertDescription>
              </Alert>
            )}

            {summary.results && summary.results.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 text-xs">
                {summary.results.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1 px-2 rounded border bg-white"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {r.status === "success" && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                      {r.status === "skipped" && <FileCheck2 className="size-3.5 text-amber-500" />}
                      {r.status === "failed" && <XCircle className="size-3.5 text-rose-500" />}
                      <span className="truncate">{r.fileName}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

