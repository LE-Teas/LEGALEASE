import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Upload } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
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
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b pb-5 border-slate-200">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
          <Link href="/admin/knowledge-base">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
            <Upload className="size-6 text-teal" />
            Upload Legal PDF to Knowledge Base
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingest Pakistani federal and provincial statutes into the vector knowledge base with duplicate protection.
          </p>
        </div>
      </div>

      <DocumentUploadForm />
    </div>
  );
}
