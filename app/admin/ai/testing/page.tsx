import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { RagTestingClient } from "@/components/admin/rag-testing-client";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "RAG Diagnostic Testing | Admin Portal",
  description: "Test query classification, vector chunk retrieval, and grounded OpenRouter completions.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAiTestingPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
              <Link href="/admin/ai">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
              <Play className="size-6 text-teal" />
              Live RAG Diagnostic Workbench
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-10">
            Real-time interactive workbench for testing legal query classification, vector similarity distances, and citation grounding.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link href="/admin/ai/settings">Configure Model Parameters</Link>
        </Button>
      </div>

      <RagTestingClient />
    </div>
  );
}
