import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  FileCheck2,
  Layers,
  Play,
  Settings,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/profile";
import { getAiConfig } from "@/lib/ai/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AI & RAG Management | Admin Portal",
  description: "Centralized legal knowledge base, pgvector retrieval, and OpenRouter AI engine management.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAiDashboardPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const cfg = getAiConfig();

  // Load real metrics in parallel
  const [docsResult, chunksResult, aiSettingsResult, filerDatasetsResult, routingConfigResult] = await Promise.all([
    supabase ? supabase.from("legal_documents").select("verification_status, processing_status, is_active, is_repealed") : Promise.resolve({ data: [] }),
    supabase ? supabase.from("legal_chunks").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 0 }),
    supabase ? supabase.from("platform_ai_settings").select("*").maybeSingle() : Promise.resolve({ data: null }),
    supabase ? supabase.from("filer_datasets").select("id, status, record_count, filer_count, non_filer_count, tax_year, file_name") : Promise.resolve({ data: [] }),
    supabase ? supabase.from("ai_routing_config").select("*").eq("id", "default").maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const allDocs = (docsResult && "data" in docsResult ? docsResult.data : []) ?? [];
  const totalChunks = (chunksResult && "count" in chunksResult ? chunksResult.count : 0) ?? 0;
  const dbAiSettings = (aiSettingsResult && "data" in aiSettingsResult ? aiSettingsResult.data : null) as any;
  const filerDatasets = (filerDatasetsResult && "data" in filerDatasetsResult ? filerDatasetsResult.data : []) ?? [];
  const dbRoutingConfig = (routingConfigResult && "data" in routingConfigResult ? routingConfigResult.data : null) as any;

  const activeDataset = filerDatasets.find((d: any) => d.status === "active");
  const primaryRoutingModel = dbRoutingConfig?.primary_model || cfg.openRouterModel;
  const routingMode = dbRoutingConfig?.routing_mode || "auto_free";

  const stats = {
    totalDocs: allDocs.length,
    verifiedDocs: allDocs.filter((d: any) => d.verification_status === "verified").length,
    pendingDocs: allDocs.filter((d: any) => d.verification_status === "pending").length,
    needsReviewDocs: allDocs.filter((d: any) => d.verification_status === "needs_review").length,
    processingDocs: allDocs.filter((d: any) => d.processing_status === "extracting" || d.processing_status === "chunking" || d.processing_status === "embedding").length,
    failedDocs: allDocs.filter((d: any) => d.processing_status === "failed" || d.verification_status === "rejected").length,
    activeDocs: allDocs.filter((d: any) => d.is_active && !d.is_repealed && d.verification_status === "verified").length,
    totalChunks,
  };

  const generationModel = dbAiSettings?.generation_model || cfg.openRouterModel;
  const embeddingModel = dbAiSettings?.embedding_model || cfg.embeddingModel;
  const ragEnabled = dbAiSettings?.rag_enabled ?? true;
  const maintenanceMode = dbAiSettings?.maintenance_mode ?? false;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-teal/10 text-teal">
              <BrainCircuit className="size-6" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-navy">
              Legal AI & Knowledge Base Management
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Grounded RAG architecture, verified Pakistani statutes, vector index health, and OpenRouter gateway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild variant="outline" size="sm" className="text-xs border-slate-300">
            <Link href="/admin/ai/testing">
              <Play className="mr-1.5 size-3.5 text-teal" />
              Test RAG Queries
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="text-xs border-slate-300">
            <Link href="/admin/ai/settings">
              <Settings className="mr-1.5 size-3.5 text-slate-600" />
              Model & RAG Config
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-navy hover:bg-navy/90 text-white text-xs">
            <Link href="/admin/knowledge-base/upload">
              <Upload className="mr-1.5 size-3.5 text-gold" />
              Upload Legal PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* RAG Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">RAG Pipeline Mode</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-heading font-bold text-sm text-navy">
                  {ragEnabled ? "Active (Grounded)" : "Disabled"}
                </span>
                <Badge variant="outline" className={ragEnabled ? "bg-emerald-50 text-emerald-700 text-[10px]" : "bg-rose-50 text-rose-700 text-[10px]"}>
                  {ragEnabled ? "Verified Only" : "Off"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <Cpu className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Generation Model</p>
              <p className="font-heading font-bold text-sm text-navy truncate" title={generationModel}>
                {generationModel}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Layers className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Embedding Vector Dim</p>
              <p className="font-heading font-bold text-sm text-navy">
                {cfg.embeddingDimensions}d <span className="text-[11px] font-normal text-muted-foreground font-mono">({embeddingModel.split("/").pop()})</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-teal/10 flex items-center justify-center text-teal">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Active Taxpayer List</p>
              <p className="font-heading font-bold text-sm text-navy truncate">
                {activeDataset ? `${activeDataset.record_count.toLocaleString()} Records` : "No Active Dataset"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary Metrics Grid */}
      <div>
        <h2 className="font-heading text-lg font-bold text-navy mb-3 flex items-center gap-2">
          <BookOpen className="size-4 text-teal" />
          Legal Knowledge Base Index
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Total Laws</span>
            <p className="text-2xl font-bold font-heading text-navy mt-1">{stats.totalDocs}</p>
            <span className="text-[11px] text-muted-foreground">in database</span>
          </Card>

          <Card className="p-3.5 border-emerald-200 bg-emerald-50/30">
            <span className="text-xs text-emerald-800 font-medium">Verified Laws</span>
            <p className="text-2xl font-bold font-heading text-emerald-700 mt-1">{stats.verifiedDocs}</p>
            <span className="text-[11px] text-emerald-600 font-medium">Eligible for citizen RAG</span>
          </Card>

          <Card className="p-3.5 border-amber-200 bg-amber-50/30">
            <span className="text-xs text-amber-800 font-medium">Pending Verification</span>
            <p className="text-2xl font-bold font-heading text-amber-700 mt-1">{stats.pendingDocs}</p>
            <span className="text-[11px] text-amber-600">Awaiting admin review</span>
          </Card>

          <Card className="p-3.5 border-orange-200 bg-orange-50/30">
            <span className="text-xs text-orange-800 font-medium">Needs Review</span>
            <p className="text-2xl font-bold font-heading text-orange-700 mt-1">{stats.needsReviewDocs}</p>
            <span className="text-[11px] text-orange-600">Version conflicts / OCR</span>
          </Card>

          <Card className="p-3.5 border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Active in RAG</span>
            <p className="text-2xl font-bold font-heading text-teal mt-1">{stats.activeDocs}</p>
            <span className="text-[11px] text-muted-foreground">Unrepealed & Active</span>
          </Card>

          <Card className="p-3.5 border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Indexed Chunks</span>
            <p className="text-2xl font-bold font-heading text-navy mt-1">{stats.totalChunks}</p>
            <span className="text-[11px] text-muted-foreground">pgvector embeddings</span>
          </Card>
        </div>
      </div>

      {/* Feature Modules Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Knowledge Base Management */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-2">
              <BookOpen className="size-5" />
            </div>
            <CardTitle className="font-heading text-base text-navy">Legal Knowledge Base</CardTitle>
            <CardDescription className="text-xs">
              Manage statutes, ordinances, and case law PDFs. View extracted sections, verify documents, and inspect duplicate detection.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Pending verification</span>
              <span className="font-bold text-amber-600">{stats.pendingDocs}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Requires review / Conflict</span>
              <span className="font-bold text-orange-600">{stats.needsReviewDocs}</span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <Button asChild size="sm" className="w-full bg-navy hover:bg-navy/90 text-xs">
                <Link href="/admin/knowledge-base">Open Knowledge Base</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI & RAG Configuration */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-2">
              <Sparkles className="size-5" />
            </div>
            <CardTitle className="font-heading text-base text-navy">AI Settings & Testing</CardTitle>
            <CardDescription className="text-xs">
              Configure OpenRouter generation models, retrieval top-k, similarity thresholds, and test queries in the live diagnostic workbench.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Free model router</span>
              <span className="font-semibold text-emerald-600 text-[11px] capitalize">{routingMode.replace(/_/g, " ")}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Active model</span>
              <span className="font-mono font-medium text-navy text-[11px] truncate max-w-[150px]" title={primaryRoutingModel}>
                {primaryRoutingModel}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Similarity threshold</span>
              <span className="font-mono font-medium text-navy text-[11px]">{dbAiSettings?.similarity_threshold ?? cfg.similarityThreshold}</span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="w-1/2 text-xs">
                <Link href="/admin/ai/settings">Settings</Link>
              </Button>
              <Button asChild size="sm" className="w-1/2 bg-teal hover:bg-teal/90 text-white text-xs">
                <Link href="/admin/ai/testing">Test Queries</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filer Dataset */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-2">
              <FileCheck2 className="size-5" />
            </div>
            <CardTitle className="font-heading text-base text-navy">Filer / Non-Filer Datasets</CardTitle>
            <CardDescription className="text-xs">
              Upload and activate structured ATL spreadsheets (CSV / XLSX). Exact CNIC lookups with verified guidance for non-filers.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Active dataset</span>
              <span className="font-medium text-navy truncate max-w-[140px]" title={activeDataset?.file_name}>
                {activeDataset?.file_name || "None active"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-muted-foreground">Total datasets</span>
              <span className="font-bold text-navy">{filerDatasets.length}</span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <Button asChild size="sm" className="w-full bg-navy hover:bg-navy/90 text-xs">
                <Link href="/admin/filer-status">Manage Tax Datasets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
