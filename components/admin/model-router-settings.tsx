"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import {
  AlertCircle,
  Award,
  Bot,
  CheckCircle2,
  Cpu,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Scale,
  ShieldAlert,
  Sparkles,
  Sliders,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  refreshOpenRouterModelsAction,
  evaluateModelAction,
  updateAiRoutingConfigAction,
  toggleModelExclusionAction,
  updateAiRecommendationSettingsAction,
} from "@/app/actions/admin-ai-router";

interface ModelCapabilities {
  supports_structured_output?: boolean;
  supports_tools?: boolean;
  supports_reasoning?: boolean;
}

interface ModelEvaluation {
  grounding_success?: number;
  citation_compliance?: number;
  structured_output_success?: number;
  latency_ms?: number;
}

export type RoutingMode = "auto_free" | "openrouter_free" | "manual";

/** A row from `openrouter_model_registry` as rendered by this component. */
export interface ModelRegistryRow {
  id: string;
  model_id: string;
  model_name: string;
  is_free: boolean;
  context_length: number;
  capabilities: ModelCapabilities | null;
  health_status: string;
  latency_ms: number | null;
  rank_score: number | null;
  excluded_by_admin: boolean;
  last_discovered_at: string;
  last_evaluated_at?: string | null;
  internal_evaluation?: ModelEvaluation | null;
}

interface ModelRouterSettingsProps {
  initialRoutingConfig: {
    routing_mode: RoutingMode;
    primary_model: string;
    fallback_model_1?: string | null;
    fallback_model_2?: string | null;
    streaming_enabled: boolean;
    model_cache_ttl_hours: number;
    last_refreshed_at?: string | null;
  };
  initialModels: ModelRegistryRow[];
  initialRecommendationSettings: {
    enabled: boolean;
    max_recommendations: number;
    relevance_weight: number;
    rating_weight: number;
    experience_weight: number;
    fee_weight: number;
    location_weight: number;
    min_relevance_threshold: number;
  };
}

export function ModelRouterSettingsClient({
  initialRoutingConfig,
  initialModels,
  initialRecommendationSettings,
}: ModelRouterSettingsProps) {
  // Router Config State
  const [routingMode, setRoutingMode] = useState(initialRoutingConfig.routing_mode);
  const [primaryModel, setPrimaryModel] = useState(initialRoutingConfig.primary_model);
  const [fallback1, setFallback1] = useState(initialRoutingConfig.fallback_model_1 || "");
  const [fallback2, setFallback2] = useState(initialRoutingConfig.fallback_model_2 || "");
  const [streaming, setStreaming] = useState(initialRoutingConfig.streaming_enabled);
  const [cacheTtl, setCacheTtl] = useState(String(initialRoutingConfig.model_cache_ttl_hours));

  // Models State
  const [models, setModels] = useState(initialModels);
  const [modelFilter, setModelFilter] = useState("");
  const [refreshingCatalog, setRefreshingCatalog] = useState(false);
  const [evaluatingModelId, setEvaluatingModelId] = useState<string | null>(null);

  // Recommendations Config State
  const [recEnabled, setRecEnabled] = useState(initialRecommendationSettings.enabled);
  const [maxRecs, setMaxRecs] = useState(String(initialRecommendationSettings.max_recommendations));
  const [relWeight, setRelWeight] = useState(initialRecommendationSettings.relevance_weight);
  const [ratingWeight, setRatingWeight] = useState(initialRecommendationSettings.rating_weight);
  const [expWeight, setExpWeight] = useState(initialRecommendationSettings.experience_weight);
  const [feeWeight, setFeeWeight] = useState(initialRecommendationSettings.fee_weight);
  const [locWeight, setLocWeight] = useState(initialRecommendationSettings.location_weight);
  const [minThreshold, setMinThreshold] = useState(
    String(initialRecommendationSettings.min_relevance_threshold)
  );

  // Status feedback
  const [routerSaved, setRouterSaved] = useState(false);
  const [routerSaving, setRouterSaving] = useState(false);
  const [routerError, setRouterError] = useState<string | null>(null);

  const [recSaved, setRecSaved] = useState(false);
  const [recSaving, setRecSaving] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const totalWeights = relWeight + ratingWeight + expWeight + feeWeight + locWeight;

  // Handle refresh AI models catalog
  const handleRefreshCatalog = async () => {
    setRefreshingCatalog(true);
    try {
      const res = await refreshOpenRouterModelsAction();
      if (res.success && res.models) {
        setModels(
          res.models.map((model) => ({
            id: model.id,
            model_id: model.model_id,
            model_name: model.model_name,
            is_free: model.is_free,
            context_length: model.context_length,
            capabilities: {
              supports_structured_output: model.supports_structured_output,
              supports_tools: model.supports_tools,
              supports_reasoning: model.supports_reasoning,
            },
            health_status: model.health_status,
            latency_ms: model.latency_ms,
            rank_score: model.rank_score,
            excluded_by_admin: model.excluded_by_admin,
            last_discovered_at: model.last_discovered_at,
            last_evaluated_at: model.last_evaluated_at,
            internal_evaluation: model.internal_evaluation ?? null,
          }))
        );
        if (res.models.length > 0 && routingMode === "auto_free") {
          setPrimaryModel(res.models[0].model_id);
          if (res.models[1]) setFallback1(res.models[1].model_id);
          if (res.models[2]) setFallback2(res.models[2].model_id);
        }
      }
    } catch (err) {
      alert(getErrorMessage(err) || "Failed to refresh models");
    } finally {
      setRefreshingCatalog(false);
    }
  };

  // Handle evaluation of a single model
  const handleEvaluate = async (modelId: string) => {
    setEvaluatingModelId(modelId);
    try {
      const res = await evaluateModelAction(modelId);
      setModels((prev) =>
        prev.map((m) =>
          m.model_id === modelId
            ? {
                ...m,
                rank_score: res.overallScore,
                latency_ms: res.latencyMs,
                health_status: res.success ? "healthy" : "degraded",
                internal_evaluation: {
                  structured_output_success: res.structuredOutputScore,
                  citation_compliance: res.citationScore,
                  grounding_success: res.groundingScore,
                  latency_ms: res.latencyMs,
                },
              }
            : m
        )
      );
    } catch (err) {
      alert(getErrorMessage(err) || "Evaluation failed");
    } finally {
      setEvaluatingModelId(null);
    }
  };

  // Handle exclude/include toggle
  const handleToggleExclude = async (modelId: string, currentExcluded: boolean) => {
    const next = !currentExcluded;
    try {
      await toggleModelExclusionAction(modelId, next);
      setModels((prev) =>
        prev.map((m) => (m.model_id === modelId ? { ...m, excluded_by_admin: next } : m))
      );
    } catch (err) {
      alert(getErrorMessage(err) || "Failed to toggle exclusion");
    }
  };

  // Save Router Settings
  const handleSaveRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setRouterSaving(true);
    setRouterSaved(false);
    setRouterError(null);

    try {
      await updateAiRoutingConfigAction({
        routing_mode: routingMode,
        primary_model: primaryModel,
        fallback_model_1: fallback1.trim() || null,
        fallback_model_2: fallback2.trim() || null,
        streaming_enabled: streaming,
        model_cache_ttl_hours: parseInt(cacheTtl, 10) || 4,
      });
      setRouterSaved(true);
      setTimeout(() => setRouterSaved(false), 3000);
    } catch (err) {
      setRouterError(getErrorMessage(err) || "Failed to save router config");
    } finally {
      setRouterSaving(false);
    }
  };

  // Save Recommendation Settings
  const handleSaveRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecSaving(true);
    setRecSaved(false);
    setRecError(null);

    if (totalWeights !== 100) {
      setRecError(`Weights must sum to 100%. Current sum: ${totalWeights}%.`);
      setRecSaving(false);
      return;
    }

    try {
      await updateAiRecommendationSettingsAction({
        enabled: recEnabled,
        max_recommendations: parseInt(maxRecs, 10) || 3,
        relevance_weight: relWeight,
        rating_weight: ratingWeight,
        experience_weight: expWeight,
        fee_weight: feeWeight,
        location_weight: locWeight,
        min_relevance_threshold: parseFloat(minThreshold) || 0.35,
      });
      setRecSaved(true);
      setTimeout(() => setRecSaved(false), 3000);
    } catch (err) {
      setRecError(getErrorMessage(err) || "Failed to save recommendation settings");
    } finally {
      setRecSaving(false);
    }
  };

  const filteredModels = models.filter(
    (m) =>
      m.model_id.toLowerCase().includes(modelFilter.toLowerCase()) ||
      m.model_name.toLowerCase().includes(modelFilter.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* ── Section 1: LegalEase AI Model Router ───────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-teal/10 p-2 text-teal">
                <Zap className="size-5" />
              </div>
              <div>
                <CardTitle className="font-heading text-lg text-navy">
                  LegalEase Free AI Model Router
                </CardTitle>
                <CardDescription className="text-xs">
                  Zero-inference-cost routing with multi-tier fallback and server-side model discovery.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshCatalog}
              disabled={refreshingCatalog}
              className="text-xs shrink-0"
            >
              {refreshingCatalog ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Querying Catalog...
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5 mr-1.5" /> Refresh Models Catalog
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveRouter} className="space-y-4">
            {routerError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="size-4 shrink-0" /> {routerError}
              </div>
            )}
            {routerSaved && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="size-4 shrink-0" /> Routing configuration updated successfully!
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="routingMode" className="text-xs font-semibold">
                  AI Routing Strategy
                </Label>
                <select
                  id="routingMode"
                  value={routingMode}
                  onChange={(e) => setRoutingMode(e.target.value as RoutingMode)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  <option value="auto_free">Automatic LegalEase Free Router (Recommended)</option>
                  <option value="openrouter_free">Direct Free Gateway</option>
                  <option value="manual">Manual Model Override</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Selects the healthiest verified free candidate with fallback.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="primaryModel" className="text-xs font-semibold">
                  Primary Model Candidate
                </Label>
                <Input
                  id="primaryModel"
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  className="text-xs font-mono"
                  placeholder="meta-llama/llama-3.3-70b-instruct:free"
                  required
                />
                <p className="text-[11px] text-muted-foreground">First choice for generation and RAG answers.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cacheTtl" className="text-xs font-semibold">
                  Model Registry Cache TTL (Hours)
                </Label>
                <Input
                  id="cacheTtl"
                  type="number"
                  min="1"
                  max="48"
                  value={cacheTtl}
                  onChange={(e) => setCacheTtl(e.target.value)}
                  className="text-xs"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Periodic background catalog refresh interval.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="fallback1" className="text-xs font-semibold">
                  Tier 1 Fallback Model
                </Label>
                <Input
                  id="fallback1"
                  value={fallback1}
                  onChange={(e) => setFallback1(e.target.value)}
                  className="text-xs font-mono"
                  placeholder="google/gemini-2.0-flash-exp:free"
                />
                <p className="text-[11px] text-muted-foreground">
                  Engaged automatically if Primary returns 429, timeout, or 5xx.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fallback2" className="text-xs font-semibold">
                  Tier 2 Fallback Model
                </Label>
                <Input
                  id="fallback2"
                  value={fallback2}
                  onChange={(e) => setFallback2(e.target.value)}
                  className="text-xs font-mono"
                  placeholder="mistralai/mistral-small-24b-instruct-2501:free"
                />
                <p className="text-[11px] text-muted-foreground">Last-line reserve model candidate.</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="streaming" className="text-xs font-semibold text-navy">
                  Fast Streaming Responses (SSE)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Stream answer tokens in real-time to citizens as they are produced.
                </p>
              </div>
              <Switch id="streaming" checked={streaming} onCheckedChange={setStreaming} />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={routerSaving} className="bg-navy hover:bg-navy-dark text-xs">
                {routerSaving ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5 mr-1.5" /> Save Router Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Section 2: Discovered Models Registry & Benchmarking ────────── */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
                <Cpu className="size-4 text-teal" /> Discovered Free AI Models
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect capabilities, measured latency, LegalEase evaluation scores, and toggle exclusions.
              </CardDescription>
            </div>

            <Input
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Filter models..."
              className="text-xs max-w-xs h-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="p-2.5 font-semibold">Model Identifier</th>
                  <th className="p-2.5 font-semibold">Context</th>
                  <th className="p-2.5 font-semibold">Capabilities</th>
                  <th className="p-2.5 font-semibold">Health & Status</th>
                  <th className="p-2.5 font-semibold">LegalEase Eval</th>
                  <th className="p-2.5 font-semibold">Latency</th>
                  <th className="p-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      No models in registry. Click &quot;Refresh Models Catalog&quot; to discover candidates.
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((m) => {
                    const isPrimary = m.model_id === primaryModel;
                    const isFallback = m.model_id === fallback1 || m.model_id === fallback2;
                    const isEvaluating = evaluatingModelId === m.model_id;

                    return (
                      <tr key={m.id} className={m.excluded_by_admin ? "opacity-60 bg-slate-50/50" : ""}>
                        <td className="p-2.5">
                          <div className="font-mono font-medium text-slate-900">{m.model_id}</div>
                          <div className="text-[10px] text-muted-foreground">{m.model_name}</div>
                          {isPrimary && (
                            <Badge className="bg-teal text-white text-[9px] py-0 h-4 mt-0.5">Primary</Badge>
                          )}
                          {isFallback && (
                            <Badge variant="outline" className="text-navy text-[9px] py-0 h-4 mt-0.5 ml-1">
                              Fallback
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {m.context_length ? `${(m.context_length / 1024).toFixed(0)}k` : "4k"}
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1">
                            {m.capabilities?.supports_structured_output && (
                              <Badge variant="secondary" className="text-[9px] py-0 h-4">
                                JSON
                              </Badge>
                            )}
                            {m.capabilities?.supports_tools && (
                              <Badge variant="secondary" className="text-[9px] py-0 h-4">
                                Tools
                              </Badge>
                            )}
                            {m.capabilities?.supports_reasoning && (
                              <Badge variant="secondary" className="text-[9px] py-0 h-4 bg-purple-50 text-purple-700">
                                Reasoning
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          {m.excluded_by_admin ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-200 text-[10px]">
                              Excluded
                            </Badge>
                          ) : m.health_status === "healthy" ? (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-200 text-[10px]">
                              Healthy
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-200 text-[10px]">
                              Degraded
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-medium">
                          {typeof m.rank_score === "number" && m.rank_score > 0 ? (
                            <span className="text-emerald-600 font-bold">{m.rank_score}/100</span>
                          ) : (
                            <span className="text-slate-400">Untested</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono">
                          {m.latency_ms ? `${m.latency_ms}ms` : "—"}
                        </td>
                        <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            disabled={isEvaluating}
                            onClick={() => handleEvaluate(m.model_id)}
                          >
                            {isEvaluating ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : (
                              <>
                                <Play className="size-2.5 mr-1" /> Test
                              </>
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 text-[10px] px-2 ${
                              m.excluded_by_admin ? "text-emerald-600" : "text-rose-600"
                            }`}
                            onClick={() => handleToggleExclude(m.model_id, m.excluded_by_admin)}
                          >
                            {m.excluded_by_admin ? "Include" : "Exclude"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: AI Lawyer Recommendation Settings ─────────────────── */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-gold/15 p-2 text-navy">
              <Scale className="size-5 text-gold-dark" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg text-navy">
                AI Lawyer Recommendation Weighting & Policy
              </CardTitle>
              <CardDescription className="text-xs">
                Configure deterministic ranking weights, candidate limits, and minimum relevance cutoff.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveRecommendations} className="space-y-4">
            {recError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="size-4 shrink-0" /> {recError}
              </div>
            )}
            {recSaved && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="size-4 shrink-0" /> Recommendation settings saved!
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="recEnabled" className="text-xs font-semibold text-navy">
                  AI-Assisted Lawyer Recommendations
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Display verified lawyer cards below relevant AI assistant answers when legal representation is needed.
                </p>
              </div>
              <Switch id="recEnabled" checked={recEnabled} onCheckedChange={setRecEnabled} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="maxRecs" className="text-xs font-semibold">
                  Maximum Lawyers Recommended per Answer
                </Label>
                <Input
                  id="maxRecs"
                  type="number"
                  min="1"
                  max="6"
                  value={maxRecs}
                  onChange={(e) => setMaxRecs(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minThreshold" className="text-xs font-semibold">
                  Minimum Specialization Relevance Cutoff (0.0 to 1.0)
                </Label>
                <Input
                  id="minThreshold"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.9"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  className="text-xs"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Lawyers below this relevance threshold are excluded from recommendations.
                </p>
              </div>
            </div>

            {/* Weights Allocation Sliders/Inputs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="font-heading text-xs font-bold text-navy flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-teal" /> Deterministic Ranking Weights (Must Equal 100%)
                </h5>
                <Badge
                  variant={totalWeights === 100 ? "outline" : "destructive"}
                  className={
                    totalWeights === 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                      : "font-bold"
                  }
                >
                  Sum: {totalWeights}% {totalWeights === 100 ? "✓" : "≠ 100%"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div className="space-y-1 p-2.5 rounded-lg border border-slate-200 bg-white">
                  <Label className="text-[11px] font-semibold text-slate-700">Relevance Match</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={relWeight}
                    onChange={(e) => setRelWeight(parseInt(e.target.value, 10) || 0)}
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Specialization match</p>
                </div>

                <div className="space-y-1 p-2.5 rounded-lg border border-slate-200 bg-white">
                  <Label className="text-[11px] font-semibold text-slate-700">Rating Quality</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ratingWeight}
                    onChange={(e) => setRatingWeight(parseInt(e.target.value, 10) || 0)}
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Bayesian average</p>
                </div>

                <div className="space-y-1 p-2.5 rounded-lg border border-slate-200 bg-white">
                  <Label className="text-[11px] font-semibold text-slate-700">Experience</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={expWeight}
                    onChange={(e) => setExpWeight(parseInt(e.target.value, 10) || 0)}
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Normalized years</p>
                </div>

                <div className="space-y-1 p-2.5 rounded-lg border border-slate-200 bg-white">
                  <Label className="text-[11px] font-semibold text-slate-700">Fee Suitability</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={feeWeight}
                    onChange={(e) => setFeeWeight(parseInt(e.target.value, 10) || 0)}
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Budget alignment</p>
                </div>

                <div className="space-y-1 p-2.5 rounded-lg border border-slate-200 bg-white">
                  <Label className="text-[11px] font-semibold text-slate-700">Location Match</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={locWeight}
                    onChange={(e) => setLocWeight(parseInt(e.target.value, 10) || 0)}
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">City & area match</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={recSaving || totalWeights !== 100}
                className="bg-navy hover:bg-navy-dark text-xs"
              >
                {recSaving ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5 mr-1.5" /> Save Recommendation Policy
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
