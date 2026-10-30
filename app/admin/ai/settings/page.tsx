import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Cpu, Key, ShieldCheck, Sparkles } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { PlatformAiSettingsForm } from "@/components/admin/settings-forms";
import { ModelRouterSettingsClient } from "@/components/admin/model-router-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformAiSetting } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "AI Model & RAG Settings | Admin Portal",
  description: "Configure OpenRouter gateway, LLM models, vector retrieval thresholds, and safety policies.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAiSettingsPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  let aiSettings: PlatformAiSetting | null = null;
  let routingConfig = {
    routing_mode: "auto_free" as const,
    primary_model: "meta-llama/llama-3.3-70b-instruct:free",
    fallback_model_1: "google/gemini-2.0-flash-exp:free",
    fallback_model_2: "mistralai/mistral-small-24b-instruct-2501:free",
    streaming_enabled: true,
    model_cache_ttl_hours: 4,
    last_refreshed_at: null as string | null,
  };
  let registryModels: any[] = [];
  let recommendationSettings = {
    enabled: true,
    max_recommendations: 3,
    relevance_weight: 50,
    rating_weight: 20,
    experience_weight: 15,
    fee_weight: 10,
    location_weight: 5,
    min_relevance_threshold: 0.35,
  };

  if (supabase) {
    const [settingsRes, routingRes, modelsRes, recRes] = await Promise.all([
      supabase.from("platform_ai_settings").select("*").maybeSingle(),
      supabase.from("ai_routing_config").select("*").eq("id", "default").maybeSingle(),
      supabase.from("openrouter_model_registry").select("*").order("rank_score", { ascending: false }).limit(60),
      supabase.from("ai_recommendation_settings").select("*").eq("id", "default").maybeSingle(),
    ]);

    if (settingsRes.data) {
      aiSettings = settingsRes.data as PlatformAiSetting;
    }
    if (routingRes.data) {
      routingConfig = {
        routing_mode: (routingRes.data.routing_mode as any) || "auto_free",
        primary_model: routingRes.data.primary_model || "meta-llama/llama-3.3-70b-instruct:free",
        fallback_model_1: routingRes.data.fallback_model_1 || "google/gemini-2.0-flash-exp:free",
        fallback_model_2: routingRes.data.fallback_model_2 || "mistralai/mistral-small-24b-instruct-2501:free",
        streaming_enabled: routingRes.data.streaming_enabled ?? true,
        model_cache_ttl_hours: routingRes.data.model_cache_ttl_hours ?? 4,
        last_refreshed_at: routingRes.data.last_refreshed_at ?? null,
      };
    }
    if (modelsRes.data) {
      registryModels = modelsRes.data;
    }
    if (recRes.data) {
      recommendationSettings = {
        enabled: recRes.data.enabled ?? true,
        max_recommendations: recRes.data.max_recommendations ?? 3,
        relevance_weight: recRes.data.relevance_weight ?? 50,
        rating_weight: recRes.data.rating_weight ?? 20,
        experience_weight: recRes.data.experience_weight ?? 15,
        fee_weight: recRes.data.fee_weight ?? 10,
        location_weight: recRes.data.location_weight ?? 5,
        min_relevance_threshold: Number(recRes.data.min_relevance_threshold ?? 0.35),
      };
    }
  }

  const openRouterKeyConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  const embeddingKeyConfigured = Boolean(
    process.env.EMBEDDING_API_KEY || process.env.OPENROUTER_API_KEY
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
              <Link href="/admin/ai">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
              <Sparkles className="size-6 text-teal" />
              AI Model & RAG Architecture Settings
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-10">
            Control the OpenRouter gateway, LLM parameters, pgvector cosine similarity cutoff, and prompt configurations.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link href="/admin/ai/testing">Go to Diagnostic Test Workbench</Link>
        </Button>
      </div>

      {/* Security Notice: Server-Side Secrets */}
      <Card className="border-border bg-slate-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-teal" />
              <CardTitle className="font-heading text-sm text-navy">
                Server Environment API Security
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">
              Server-Side Only
            </Badge>
          </div>
          <CardDescription className="text-xs">
            OpenRouter and embedding credentials are kept strictly in server-side environment secrets and are never sent to the browser or stored in public database tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-white rounded border border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">OPENROUTER_API_KEY</p>
              <p className="text-[11px] text-muted-foreground">Gateway for all LLM chat completions</p>
            </div>
            <div className="text-right">
              {openRouterKeyConfigured ? (
                <span className="font-mono text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> sk-or-••••••••
                </span>
              ) : (
                <span className="font-mono text-xs text-rose-600 font-semibold">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-white rounded border border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">EMBEDDING_API_KEY</p>
              <p className="text-[11px] text-muted-foreground">Vector dimension embeddings (1536d)</p>
            </div>
            <div className="text-right">
              {embeddingKeyConfigured ? (
                <span className="font-mono text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> Configured
                </span>
              ) : (
                <span className="font-mono text-xs text-rose-600 font-semibold">
                  Not Configured
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OpenRouter Free Model Router & Lawyer Recommendation Policies */}
      <ModelRouterSettingsClient
        initialRoutingConfig={routingConfig}
        initialModels={registryModels}
        initialRecommendationSettings={recommendationSettings}
      />

      {/* Main Settings Form */}
      <PlatformAiSettingsForm initialAiSettings={aiSettings} />
    </div>
  );
}
