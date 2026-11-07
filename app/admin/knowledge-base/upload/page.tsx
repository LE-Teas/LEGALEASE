import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Upload } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
import { BulkUploadZone } from "@/components/admin/bulk-upload-zone";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Upload Legal Document | Admin Portal",
  description: "Upload and verify legal documents into the LegalEase RAG Knowledge Base.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDocumentUploadPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b pb-5 border-slate-200">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
          <Link href="/admin/knowledge-base">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
            <Upload className="size-6 text-teal" />
            Upload Legal Files to Knowledge Base
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingest Pakistani federal laws, provincial statutes, Constitution, and FBR ATL files into vector RAG.
          </p>
        </div>
      </div>

      {/* 1-Click Zero Config Bulk Upload */}
      <BulkUploadZone />

      {/* Single Document Upload with Custom Metadata */}
      <div className="pt-2">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Or Upload Single Document With Custom Metadata</h2>
        <DocumentUploadForm />
      </div>
    </div>
  );
}
