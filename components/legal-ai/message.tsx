"use client";

import { BookOpenText, Scale, UserRound } from "lucide-react";

import type { UiMessage } from "@/lib/legal-ai/types";
import { Markdown } from "@/components/legal-ai/markdown";
import { SourceCard } from "@/components/legal-ai/source-card";
import { RecommendedLawyersSection } from "@/components/legal-ai/recommended-lawyers";
import { Badge } from "@/components/ui/badge";

function confidenceLabel(value?: string): string {
  if (value === "high") return "High confidence";
  if (value === "medium") return "Medium confidence";
  return "Low confidence";
}

export function Message({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#0d2b43] px-4 py-2.5 text-xs sm:text-sm text-white shadow-xs leading-relaxed">
          {message.content}
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ecfdf5] text-[#0fa176] border border-[#0fa176]/30">
          <UserRound className="size-4" data-icon="inline" />
        </span>
      </div>
    );
  }

  const structured = message.structured_response;
  const recommendedLawyers =
    message.recommended_lawyers || structured?.recommended_lawyers || [];

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#0d2b43] text-[#0fa176] shadow-xs">
        <Scale className="size-4" data-icon="inline" />
      </span>
      <div className="max-w-[90%] space-y-2.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3.5 shadow-xs text-xs sm:text-sm text-[#0d2b43]">
        {message.status === "error" ? (
          <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{message.error}</p>
        ) : (
          <Markdown content={message.content} />
        )}

        {structured && message.status !== "error" && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
            <Badge
              variant="secondary"
              className={
                structured.confidence === "high"
                  ? "bg-[#ecfdf5] text-[#0fa176] border border-[#0fa176]/30 font-semibold text-[10px]"
                  : structured.confidence === "medium"
                    ? "bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]"
                    : "bg-slate-100 text-slate-600 text-[10px]"
              }
            >
              {confidenceLabel(structured.confidence)}
            </Badge>
            {structured.needs_lawyer && (
              <Badge variant="outline" className="text-[#0d2b43] border-[#0d2b43]/30 text-[10px] font-semibold">
                Advocate Consultation Advised
              </Badge>
            )}
            {structured.mode === "insufficient" && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                Statute Precedent Search Required
              </Badge>
            )}
          </div>
        )}

        {message.sources && message.sources.length > 0 && message.status !== "error" && (
          <div className="border-t border-border/60 pt-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <BookOpenText className="size-3.5" data-icon="inline" />
              Sources from the verified knowledge base
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <SourceCard key={source.chunk_id} source={source} index={index} />
              ))}
            </div>
          </div>
        )}

        {recommendedLawyers.length > 0 && message.status !== "error" && (
          <RecommendedLawyersSection
            lawyers={recommendedLawyers}
            legalCategory={structured?.legal_category}
          />
        )}
      </div>
    </div>
  );
}