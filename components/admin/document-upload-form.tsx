"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { uploadDocumentAction } from "@/app/actions/knowledge-base";
import { LEGAL_CATEGORIES, LEGAL_CATEGORY_LABELS } from "@/lib/rag/document-catalog";

export function DocumentUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("statute");
  const [category, setCategory] = useState("other");
  const [jurisdictionLevel, setJurisdictionLevel] = useState("Federal");
  const [province, setProvince] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [sourceAuthority, setSourceAuthority] = useState("");
  const [officialSourceUrl, setOfficialSourceUrl] = useState("");
  const [versionLabel, setVersionLabel] = useState("");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported for legal knowledge base ingestion.");
        return;
      }
      setFile(selected);
      setError(null);
      if (!title) {
        // Auto-populate title from clean filename
        const cleanName = selected.name
          .replace(/\.pdf$/i, "")
          .replace(/[_-]+/g, " ")
          .trim();
        setTitle(cleanName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a PDF file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setWarning(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("document_type", documentType);
    formData.append("category", category);
    formData.append("jurisdiction_level", jurisdictionLevel);
    if (province) formData.append("province", province);
    if (year) formData.append("year", year);
    if (sourceAuthority) formData.append("source_authority", sourceAuthority);
    if (officialSourceUrl) formData.append("official_source_url", officialSourceUrl);
    if (versionLabel) formData.append("version_label", versionLabel);

    try {
      const res = await uploadDocumentAction(formData);
      if (!res.ok) {
        setError(res.error || "Failed to upload document.");
      } else {
        setSuccess(`Document "${title}" uploaded and processed successfully!`);
        if (res.warning) {
          setWarning(res.warning);
        }
        setTimeout(() => {
          if (res.documentId) {
            router.push(`/admin/knowledge-base/${res.documentId}`);
          } else {
            router.push("/admin/knowledge-base");
          }
        }, 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload processing failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="font-heading text-lg text-navy">Legal Document Details</CardTitle>
        <CardDescription className="text-xs">
          Upload an official statute or code. The system will compute SHA-256 for duplicate protection, extract legal text, create section-aware chunks, and compute vector embeddings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs font-bold">Upload Rejected</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {warning && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-900">
              <AlertCircle className="size-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold">Review Notice</AlertTitle>
              <AlertDescription className="text-xs">{warning}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertDescription className="text-xs font-medium">{success}</AlertDescription>
            </Alert>
          )}

          {/* File Dropzone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Select Legal PDF Document <span className="text-rose-500">*</span>
            </Label>
            <div className="border-2 border-dashed border-slate-200 hover:border-teal rounded-xl p-6 text-center transition-colors bg-slate-50/50">
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="size-12 rounded-full bg-teal/10 flex items-center justify-center text-teal">
                  <FileUp className="size-6" />
                </div>
                {file ? (
                  <div>
                    <p className="font-semibold text-xs text-navy">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for ingestion
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-xs text-navy">
                      Click to browse or drag and drop legal PDF
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Maximum 50MB per PDF. Text-based PDFs recommended for high-accuracy chunking.
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="title" className="text-xs font-semibold text-slate-800">
                Official Law / Act Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pakistan Penal Code, 1860"
                className="text-xs"
                required
                disabled={uploading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="documentType" className="text-xs font-semibold text-slate-800">
                Document Type
              </Label>
              <select
                id="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
                disabled={uploading}
              >
                <option value="statute">Statute / Act</option>
                <option value="code">Code</option>
                <option value="constitution">Constitution</option>
                <option value="ordinance">Ordinance</option>
                <option value="rules">Rules & Regulations</option>
                <option value="notification">Gazette / Notification</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold text-slate-800">
                Legal Category <span className="text-rose-500">*</span>
              </Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
                disabled={uploading}
              >
                {LEGAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {LEGAL_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jurisdictionLevel" className="text-xs font-semibold text-slate-800">
                Jurisdiction Level
              </Label>
              <select
                id="jurisdictionLevel"
                value={jurisdictionLevel}
                onChange={(e) => {
                  setJurisdictionLevel(e.target.value);
                  if (e.target.value === "Federal") setProvince("");
                }}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
                disabled={uploading}
              >
                <option value="Federal">Federal (All Pakistan)</option>
                <option value="Provincial">Provincial</option>
                <option value="Local">Local (Karachi / City)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="province" className="text-xs font-semibold text-slate-800">
                Province (if Provincial or Local)
              </Label>
              <select
                id="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                disabled={jurisdictionLevel === "Federal" || uploading}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">None / Federal</option>
                <option value="Sindh">Sindh (Karachi)</option>
                <option value="Punjab">Punjab</option>
                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                <option value="Balochistan">Balochistan</option>
                <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-xs font-semibold text-slate-800">
                Enactment / Publication Year
              </Label>
              <Input
                id="year"
                type="number"
                min="1800"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1860"
                className="text-xs"
                disabled={uploading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="versionLabel" className="text-xs font-semibold text-slate-800">
                Version / Amendment Label
              </Label>
              <Input
                id="versionLabel"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="e.g. As amended 2024"
                className="text-xs"
                disabled={uploading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sourceAuthority" className="text-xs font-semibold text-slate-800">
                Source Authority
              </Label>
              <Input
                id="sourceAuthority"
                value={sourceAuthority}
                onChange={(e) => setSourceAuthority(e.target.value)}
                placeholder="e.g. National Assembly / Sindh Provincial Assembly"
                className="text-xs"
                disabled={uploading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="officialSourceUrl" className="text-xs font-semibold text-slate-800">
                Official Source URL
              </Label>
              <Input
                id="officialSourceUrl"
                type="url"
                value={officialSourceUrl}
                onChange={(e) => setOfficialSourceUrl(e.target.value)}
                placeholder="https://pakistancode.gov.pk/..."
                className="text-xs"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => router.back()}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="bg-navy hover:bg-navy/90 text-white text-xs px-5"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin text-gold" />
                  Extracting & Embedding...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-3.5 text-gold" />
                  Upload & Ingest PDF
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
