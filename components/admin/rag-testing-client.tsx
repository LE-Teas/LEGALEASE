"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { testLegalRagQueryAction, type RagTestResult } from "@/app/actions/rag-testing";

const SAMPLE_QUERIES = [
  "What constitutes theft under the Pakistan Penal Code?",
  "What is the statutory notice period for terminating a residential tenancy in Sindh?",
  "What are the legal grounds for Khula under the Muslim Family Laws Ordinance?",
  "What is the procedure for registering a private limited company under SECP?",
  "What are the penalties for unauthorized access to an information system under PECA 2016?",
];

export function RagTestingClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagTestResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async (testQuery?: string) => {
    const q = testQuery || query;
    if (!q.trim()) return;

    if (testQuery) setQuery(testQuery);
    setLoading(true);
    setError(null);

    try {
      const res = await testLegalRagQueryAction(q);
      if (!res.ok || !res.data) {
        setError(res.error || "Testing failed.");
      } else {
        setResult(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Testing request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input Card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg text-navy flex items-center gap-2">
            <Sparkles className="size-5 text-teal" />
            Enter Test Legal Query
          </CardTitle>
          <CardDescription className="text-xs">
            Run complete query classification, pgvector chunk retrieval, context sufficiency checks, and LegalEase AI grounded completion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What constitutes theft under the Pakistan Penal Code?"
              className="text-sm font-medium"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleTest();
                }
              }}
            />
            <Button
              onClick={() => handleTest()}
              disabled={loading || !query.trim()}
              className="bg-navy hover:bg-navy/90 text-white shrink-0 text-xs px-5"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin text-gold" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 size-4 text-gold" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {/* Quick Sample Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground mr-1">Quick samples:</span>
            {SAMPLE_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTest(sq)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-left"
              >
                {sq.length > 45 ? sq.slice(0, 45) + "..." : sq}
              </button>
            ))}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Diagnostic KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3.5 border-slate-200">
              <span className="text-[11px] text-muted-foreground font-medium">Detected Category</span>
              <p className="font-heading font-bold text-sm text-navy mt-0.5 capitalize">
                {result.classification.category
                  ? result.classification.category.replace(/_/g, " ")
                  : "General / Unclassified"}
              </p>
              <span className="text-[10px] text-teal font-semibold">
                Confidence: {result.classification.confidence}
              </span>
            </Card>

            <Card className="p-3.5 border-slate-200">
              <span className="text-[11px] text-muted-foreground font-medium">Jurisdiction Level</span>
              <p className="font-heading font-bold text-sm text-navy mt-0.5">
                {result.classification.jurisdictionLevel ?? "Unknown"}
                {result.classification.province ? ` (${result.classification.province})` : ""}
              </p>
              <span className="text-[10px] text-slate-500">
                Heuristic classification
              </span>
            </Card>

            <Card className="p-3.5 border-slate-200">
              <span className="text-[11px] text-muted-foreground font-medium">Chunks Retrieved</span>
              <p className="font-heading font-bold text-sm text-navy mt-0.5">
                {result.retrieval.totalFound} of top-{result.retrieval.topK}
              </p>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="size-3 text-teal" />
                {result.retrieval.retrievalLatencyMs}ms retrieval
              </span>
            </Card>

            <Card className="p-3.5 border-slate-200">
              <span className="text-[11px] text-muted-foreground font-medium">LLM Generation</span>
              <p className="font-heading font-bold text-sm text-navy mt-0.5 truncate" title={result.generation.model}>
                {result.generation.model.split("/").pop()}
              </p>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="size-3 text-teal" />
                {result.generation.generationLatencyMs}ms generation
              </span>
            </Card>
          </div>

          {/* Generated Response */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Grounded Legal Response (LegalEase AI)
                </CardTitle>
                <CardDescription className="text-xs">
                  Generated solely from the retrieved verified legal knowledge chunks below.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                {result.generation.insufficientContext ? (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 text-[10px]">
                    Insufficient Context
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 text-[10px]">
                    Grounded Answer
                  </Badge>
                )}
                {result.generation.needsLawyer && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 text-[10px]">
                    Lawyer Recommended
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {result.generation.rawAnswer}
              </div>

              {/* Citations validated against chunks */}
              {result.generation.citationsValidated && result.generation.citationsValidated.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                    Validated Citations ({result.generation.citationsValidated.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.generation.citationsValidated.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal/10 text-teal-900 text-xs font-medium border border-teal/20"
                      >
                        <Scale className="size-3 text-teal" />
                        <span className="font-semibold">{c.title}</span>
                        {c.section && <span>§ {c.section}</span>}
                        {c.article && <span>Art. {c.article}</span>}
                        {c.page && <span>p. {c.page}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Retrieved Chunks Inspector */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
                <Layers className="size-4 text-teal" />
                Retrieved Verified Chunks ({result.retrieval.chunks.length})
              </CardTitle>
              <CardDescription className="text-xs">
                pgvector cosine distance ranking (threshold: {result.retrieval.similarityThreshold})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {result.retrieval.chunks.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No verified chunks passed the similarity threshold for this query. The model appropriately returned insufficient context.
                </div>
              ) : (
                result.retrieval.chunks.map((chunk, idx) => (
                  <div
                    key={chunk.chunkId}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-navy text-white">
                          #{idx + 1}
                        </span>
                        <p className="font-heading text-xs font-bold text-navy">
                          {chunk.documentTitle}
                        </p>
                        {chunk.sectionNumber && (
                          <Badge variant="outline" className="text-[10px] bg-white">
                            Section {chunk.sectionNumber}
                          </Badge>
                        )}
                        {chunk.articleNumber && (
                          <Badge variant="outline" className="text-[10px] bg-white">
                            Article {chunk.articleNumber}
                          </Badge>
                        )}
                        {chunk.pageNumber && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Page {chunk.pageNumber}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono text-teal border-teal/30">
                        Score: {chunk.similarity}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded border border-slate-200/60 leading-relaxed whitespace-pre-wrap">
                      {chunk.contentSnippet}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
