"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileCheck,
  FilePlus2,
  FileText,
  Loader2,
  Printer,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEGAL_DOCUMENT_TEMPLATES } from "@/lib/constants/legal";

export function DocumentGenerator() {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState(LEGAL_DOCUMENT_TEMPLATES[0].id);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const template =
    LEGAL_DOCUMENT_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    LEGAL_DOCUMENT_TEMPLATES[0];

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const generatedText = template.render(formData);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${template.title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.6; margin: 40px; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <pre>${generatedText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSave = async (status: "draft" | "generated") => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const docTitle =
      formData.matter_subject ||
      formData.subject ||
      formData.title ||
      `${template.title} - ${new Date().toLocaleDateString("en-PK")}`;

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: template.id,
          title: docTitle,
          formData,
          generatedContent: generatedText,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save document");

      setSuccessMsg(
        status === "draft"
          ? "Draft successfully saved to your documents."
          : "Document finalized and saved to your account."
      );
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Alert */}
      <Alert className="border-amber-300 bg-amber-50 text-amber-900">
        <AlertTriangle className="size-4 text-amber-600 shrink-0" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>Important Legal Disclaimer:</strong> Standardized document templates are generated based on user input for drafting convenience and do not constitute formal lawyer-approved legal counsel. For high-stakes litigation, consult a verified advocate.
        </AlertDescription>
      </Alert>

      {/* Template Chooser Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {LEGAL_DOCUMENT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => {
              setSelectedTemplateId(tmpl.id);
              setFormData({});
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shrink-0 transition-all ${
              selectedTemplateId === tmpl.id
                ? "bg-navy text-white shadow-sm ring-1 ring-navy"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <FileText className="size-4" />
            <span>{tmpl.title}</span>
          </button>
        ))}
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
          <Check className="size-4 text-emerald-600" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Editor & Preview Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Inputs Card */}
        <Card className="border-border">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs font-medium">
                {template.category}
              </Badge>
            </div>
            <CardTitle className="font-heading text-lg text-navy mt-1">
              {template.title}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {template.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
            {template.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-xs font-semibold text-slate-700">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.key}
                    rows={field.key === "matter_details" || field.key === "statements" ? 4 : 2}
                    value={formData[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className="text-xs leading-relaxed"
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type}
                    value={formData[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    className="text-xs"
                  />
                )}
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="text-xs"
              >
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
                Save Draft
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSave("generated")}
                disabled={saving}
                className="bg-navy text-white hover:bg-navy/90 text-xs"
              >
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileCheck className="mr-1.5 size-3.5" />}
                Finalize Document
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview Card */}
        <Card className="border-border flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-base text-navy">
                Document Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time legal document formatting
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 text-xs"
                title="Copy to clipboard"
              >
                {copied ? <Check className="mr-1 size-3.5 text-emerald-600" /> : <Copy className="mr-1 size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs"
                title="Print or Save as PDF"
              >
                <Printer className="mr-1 size-3.5" />
                Print / PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 overflow-y-auto max-h-[600px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-all">
              {generatedText}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
