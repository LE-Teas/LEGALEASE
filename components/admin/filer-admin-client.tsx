"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Database,
  FileSpreadsheet,
  Info,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  activateFilerDatasetAction,
  deactivateFilerDatasetAction,
  deleteFilerDatasetAction,
} from "@/app/actions/filer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DatasetRow {
  id: string;
  file_name: string;
  file_type: string;
  source: string;
  tax_year: string | null;
  effective_date: string | null;
  record_count: number;
  filer_count: number;
  non_filer_count: number;
  status: string;
  uploaded_by: string | null;
  uploaded_at: string;
  activated_at: string | null;
  metadata: Record<string, unknown>;
}

interface ParsePreview {
  fileName: string;
  fileType: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  sampleRecords: Array<{ cnic: string; status: string }>;
  sampleInvalid: Array<{ row: number; reason: string }>;
}

interface Props {
  datasets: DatasetRow[];
  activeDataset: DatasetRow | null;
  totalRecords: number;
  filerCount: number;
  nonFilerCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
          Active
        </Badge>
      );
    case "ready":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
          Ready
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
          Processing
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px]">
          Inactive
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {status}
        </Badge>
      );
  }
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FilerAdminClient({
  datasets: initialDatasets,
  activeDataset: initialActive,
  totalRecords,
  filerCount,
  nonFilerCount,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetRow[]>(initialDatasets);
  const [activeDataset, setActiveDataset] = useState<DatasetRow | null>(initialActive);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [source, setSource] = useState("FBR Active Taxpayers List (ATL)");
  const [taxYear, setTaxYear] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Parse preview state
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);
  const [parsePending, startParsing] = useTransition();
  const [commitPending, startCommit] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dataset action state
  const [actionPending, setActionPending] = useState<Record<string, boolean>>({});

  // ── File selection ────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (file: File | null) => {
      setSelectedFile(file);
      setPreview(null);
      setParseError(null);
      setCommitError(null);
      setSuccessMsg(null);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileChange(file);
    },
    [handleFileChange]
  );

  // ── Parse / Preview ───────────────────────────────────────────────────────

  const handlePreview = useCallback(() => {
    if (!selectedFile) return;
    setParseError(null);
    setPreview(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    startParsing(async () => {
      try {
        const res = await fetch("/api/admin/filer/parse", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.ok && result.data) {
          setPreview(result.data);
        } else {
          setParseError(result.error ?? "Failed to parse file.");
        }
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : "Failed to parse file.");
      }
    });
  }, [selectedFile]);

  // ── Commit Import ─────────────────────────────────────────────────────────

  const handleCommit = useCallback(() => {
    if (!selectedFile || !preview) return;
    setCommitError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("source", source);
    formData.append("taxYear", taxYear);
    formData.append("effectiveDate", effectiveDate);
    formData.append("activateImmediately", String(activateImmediately));

    startCommit(async () => {
      try {
        const res = await fetch("/api/admin/filer/commit", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.ok && result.data) {
          setSuccessMsg(
            `Dataset imported successfully! ${result.data.importedCount.toLocaleString()} records added.`
          );
          setSelectedFile(null);
          setPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          // Refresh page data
          window.location.reload();
        } else {
          setCommitError(result.error ?? "Import failed.");
        }
      } catch (err: unknown) {
        setCommitError(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }, [selectedFile, preview, source, taxYear, effectiveDate, activateImmediately]);

  // ── Dataset Actions ───────────────────────────────────────────────────────

  const setLoading = (id: string, val: boolean) =>
    setActionPending((prev) => ({ ...prev, [id]: val }));

  const handleActivate = async (id: string) => {
    setLoading(id, true);
    const result = await activateFilerDatasetAction(id);
    if (result.ok) {
      window.location.reload();
    } else {
      alert(result.error ?? "Failed to activate dataset.");
    }
    setLoading(id, false);
  };

  const handleDeactivate = async (id: string) => {
    setLoading(id, true);
    const result = await deactivateFilerDatasetAction(id);
    if (result.ok) {
      window.location.reload();
    } else {
      alert(result.error ?? "Failed to deactivate dataset.");
    }
    setLoading(id, false);
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (
      !confirm(
        `Delete dataset "${fileName}"?\n\nThis will permanently remove all ${datasets.find((d) => d.id === id)?.record_count?.toLocaleString() ?? ""} records. This cannot be undone.`
      )
    )
      return;
    setLoading(id, true);
    const result = await deleteFilerDatasetAction(id);
    if (result.ok) {
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      if (activeDataset?.id === id) setActiveDataset(null);
    } else {
      alert(result.error ?? "Failed to delete dataset.");
    }
    setLoading(id, false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-teal/10 text-teal">
              <FileSpreadsheet className="size-6" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-navy">
              Filer / Non-Filer Dataset Management
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-11">
            Upload FBR Active Taxpayers List CSV/XLSX files for citizen CNIC status lookup. Exact structured matching — no AI involved in status determination.
          </p>
        </div>
      </div>

      {/* Active Dataset Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="size-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Active Dataset Records</p>
              <p className="text-2xl font-bold font-heading text-emerald-800">
                {totalRecords.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600">
                {activeDataset ? activeDataset.file_name : "No active dataset"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Filers (ATL)</p>
              <p className="text-2xl font-bold font-heading text-blue-800">
                {filerCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-600">Active taxpayers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-amber-700 font-medium">Non-Filers</p>
              <p className="text-2xl font-bold font-heading text-amber-800">
                {nonFilerCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-600">Not on active list</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="size-4 shrink-0 mt-0.5 text-blue-600" />
        <span>
          <strong>Security:</strong> CNIC data is stored server-side and never sent to external AI or exposed to citizens in bulk.
          Citizens may query one CNIC at a time through a server-enforced lookup only.
          Dataset records are never downloadable from the browser.
        </span>
      </div>

      {/* Upload Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
            <CloudUpload className="size-5 text-teal" />
            Upload New Dataset
          </CardTitle>
          <CardDescription className="text-xs">
            Upload a CSV or XLSX file with at minimum a <code>CNIC</code> and <code>Status</code> column.
            Status values are normalized to <code>filer</code> or <code>non_filer</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Drag-and-drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-teal bg-teal/5"
                : selectedFile
                ? "border-navy/40 bg-navy/5"
                : "border-slate-300 hover:border-teal/60 hover:bg-teal/5"
            }`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <FileSpreadsheet className="mx-auto size-10 text-slate-400 mb-3" />
            {selectedFile ? (
              <div>
                <p className="font-semibold text-navy text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Drag &amp; drop a CSV or XLSX file, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expected columns: <code>CNIC</code>, <code>Status</code> (and optionally <code>Tax_Year</code>, <code>Source</code>)
                </p>
              </div>
            )}
          </div>

          {/* Metadata fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filer-source" className="text-xs font-medium">
                Source / Authority
              </Label>
              <Input
                id="filer-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="FBR Active Taxpayers List (ATL)"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filer-taxyear" className="text-xs font-medium">
                Tax Year (optional)
              </Label>
              <Input
                id="filer-taxyear"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                placeholder="e.g. 2025-26"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filer-effdate" className="text-xs font-medium">
                Effective Date (optional)
              </Label>
              <Input
                id="filer-effdate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Activate immediately toggle */}
          <div className="flex items-center gap-2">
            <input
              id="activate-immediately"
              type="checkbox"
              checked={activateImmediately}
              onChange={(e) => setActivateImmediately(e.target.checked)}
              className="size-4 rounded"
            />
            <Label htmlFor="activate-immediately" className="text-xs cursor-pointer">
              Activate immediately after import (will deactivate current active dataset)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedFile || parsePending}
              onClick={handlePreview}
              className="gap-2"
            >
              {parsePending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 text-teal" />
              )}
              Preview &amp; Validate
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!preview || commitPending || parsePending}
              onClick={handleCommit}
              className="gap-2 bg-navy hover:bg-navy/90"
            >
              {commitPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CloudUpload className="size-3.5 text-gold" />
              )}
              Confirm &amp; Import Dataset
            </Button>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Commit error */}
          {commitError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{commitError}</span>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Preview panel */}
          {preview && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <h3 className="font-heading font-semibold text-navy text-sm flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-teal" />
                Import Preview — {preview.fileName}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-white border p-3">
                  <p className="text-xl font-bold text-navy">{preview.totalRows.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total Rows</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xl font-bold text-emerald-700">{preview.validCount.toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Will Import</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xl font-bold text-amber-700">{preview.duplicateCount.toLocaleString()}</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Duplicates Skipped</p>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                  <p className="text-xl font-bold text-rose-700">{preview.invalidCount.toLocaleString()}</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">Invalid Rows</p>
                </div>
              </div>

              {/* Sample records */}
              {preview.sampleRecords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Sample Valid Records</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white">
                          <th className="py-1.5 px-3 text-left font-semibold text-slate-600">CNIC</th>
                          <th className="py-1.5 px-3 text-left font-semibold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleRecords.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 even:bg-slate-50/50">
                            <td className="py-1.5 px-3 font-mono text-slate-700">
                              {row.cnic.replace(/\D/g, "").length === 13
                                ? `${row.cnic.slice(0, 5)}-*******-${row.cnic.slice(-1)}`
                                : row.cnic.replace(/.(?=.{3})/g, "*")}
                            </td>
                            <td className="py-1.5 px-3">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  row.status === "filer"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invalid rows toggle */}
              {preview.sampleInvalid.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-rose-700 font-medium hover:underline"
                    onClick={() => setShowInvalid((v) => !v)}
                  >
                    {showInvalid ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    {showInvalid ? "Hide" : "Show"} {preview.sampleInvalid.length} invalid rows
                  </button>
                  {showInvalid && (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-rose-200">
                            <th className="py-1.5 px-3 text-left text-rose-700 font-semibold">Row</th>
                            <th className="py-1.5 px-3 text-left text-rose-700 font-semibold">Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.sampleInvalid.map((row, i) => (
                            <tr key={i} className="border-b border-rose-100">
                              <td className="py-1.5 px-3 font-mono text-rose-800">{row.row}</td>
                              <td className="py-1.5 px-3 text-rose-700">{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dataset History */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
            <Database className="size-5 text-teal" />
            Dataset History
          </CardTitle>
          <CardDescription className="text-xs">
            All imported filer datasets. Only one dataset should be active at a time.
            Citizens check their status against the active dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {datasets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No datasets imported yet. Upload a CSV or XLSX file above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4 text-left font-semibold text-slate-600">File / Source</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-600">Tax Year</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-600">Records</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-600">Filers</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-600">Non-Filers</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-600">Uploaded</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => {
                    const loading = actionPending[d.id] ?? false;
                    return (
                      <tr
                        key={d.id}
                        className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${
                          d.status === "active" ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-navy truncate max-w-[180px]" title={d.file_name}>
                            {d.file_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{d.source}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{d.tax_year || "—"}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-navy">
                          {d.record_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          {d.filer_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700">
                          {d.non_filer_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{statusBadge(d.status)}</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {fmt(d.uploaded_at)}
                          {d.activated_at && (
                            <p className="text-[10px] text-emerald-600">
                              Activated: {fmt(d.activated_at)}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {d.status !== "active" && d.status !== "processing" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                disabled={loading}
                                onClick={() => handleActivate(d.id)}
                              >
                                {loading ? <Loader2 className="size-3 animate-spin" /> : "Activate"}
                              </Button>
                            )}
                            {d.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 border-slate-300 text-slate-600 hover:bg-slate-100"
                                disabled={loading}
                                onClick={() => handleDeactivate(d.id)}
                              >
                                {loading ? <Loader2 className="size-3 animate-spin" /> : "Deactivate"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                              disabled={loading}
                              onClick={() => handleDelete(d.id, d.file_name)}
                            >
                              {loading ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Trash2 className="size-3" />
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

      {/* Expected file format */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-sm text-navy flex items-center gap-2">
            <Info className="size-4 text-slate-500" />
            Expected File Format
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-slate-600">
          <p><strong>Required columns:</strong> <code>CNIC</code>, <code>Status</code></p>
          <p><strong>Optional columns:</strong> <code>Tax_Year</code>, <code>Source</code></p>
          <p><strong>Accepted status values:</strong> <code>Filer</code>, <code>FILER</code>, <code>filer</code>, <code>Active</code>, <code>ATL</code> → normalized to <code>filer</code></p>
          <p><strong>Non-filer:</strong> <code>Non-Filer</code>, <code>Non Filer</code>, <code>NON FILER</code>, <code>Inactive</code> → normalized to <code>non_filer</code></p>
          <p><strong>CNIC format:</strong> <code>4210112345671</code> (13 digits) or <code>42101-1234567-1</code> (dashes OK)</p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px]">
            <p className="font-semibold text-navy mb-1">Example CSV:</p>
            <p>CNIC,Status</p>
            <p>4210112345671,Filer</p>
            <p>42101-9876543-2,Non-Filer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
