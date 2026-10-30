import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { chatRequestSchema } from "@/lib/ai/schemas";
import { askLegalQuestion, RagPipelineError } from "@/lib/rag/legal-rag";
import { rateLimit } from "@/lib/rag/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TITLE_MAX_LENGTH = 60;
const TITLE_BREAK_WORDS = /[\n.!?;:]/;

function titleFromQuestion(question: string): string {
  let title = question.trim().replace(/\s+/g, " ");
  const breakIndex = title.search(TITLE_BREAK_WORDS);
  if (breakIndex !== -1) {
    title = title.slice(0, breakIndex + 1);
  }
  if (title.length > TITLE_MAX_LENGTH) {
    title = `${title.slice(0, TITLE_MAX_LENGTH - 1)}…`;
  }
  return title.trim();
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  if (!supabase) {
    return jsonError(503, "Supabase is not configured yet.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(400, z.prettifyError(parsed.error));
  }
  const { message, conversation_id } = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(401, "You must be signed in to use the AI assistant.");
  }

  // Cheap guard before touching the LLM: per-user short-window rate limit.
  const limit = rateLimit(`chat:${user.id}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You have reached the message limit. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  // Verify conversation ownership if a conversation is supplied.
  let conversationId: string | null = conversation_id ?? null;
  if (conversation_id) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conv) {
      return jsonError(404, "Conversation not found.");
    }
  } else {
    // Create the conversation up front (title from the first message). The
    // messages table requires a NOT NULL conversation_id, so an id must exist
    // before any message is inserted.
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: titleFromQuestion(message) })
      .select("id")
      .single();
    if (convError || !conv) {
      return jsonError(500, "Could not create the conversation.");
    }
    conversationId = conv.id;
  }

  // Persist the user's message up front so a failed answer still records the
  // question and keeps chat scrolling in the UI.
  const { error: userMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId!,
      role: "user",
      content: message,
    })
    .select("id")
    .single();
  if (userMessageError) {
    return jsonError(500, "Could not save your message. Please try again.");
  }

  let answer;
  try {
    answer = await askLegalQuestion({
      supabase,
      userId: user.id,
      conversationId: conversationId,
      question: message,
    });
  } catch (err) {
    if (err instanceof RagPipelineError) {
      const status = err.kind === "config" ? 500 : 502;
      const detail =
        err.kind === "config"
          ? "The AI assistant is not fully configured."
          : "The AI service returned an error. Please try again shortly.";
      return jsonError(status, detail);
    }
    return jsonError(502, "Unexpected error while answering. Please try again.");
  }

  try {

    const recommendedLawyers = answer.recommendedLawyers || [];
    const structuredResponse = {
      summary: answer.summary,
      legal_category: answer.legalCategory,
      jurisdiction: answer.jurisdiction,
      confidence: answer.confidence,
      needs_lawyer: answer.needsLawyer,
      insufficient_context: answer.insufficientContext,
      mode: answer.mode,
      citations: answer.citations,
      sources: answer.sources,
      recommended_lawyers: recommendedLawyers,
      standalone_question: answer.standaloneQuestion,
      retrieved_count: answer.retrieved.count,
      retrieved_categories: answer.retrieved.categories,
      retrieved_documents: answer.retrieved.documents,
      llm_model: answer.llmModel,
    };

    const { data: assistantMessage, error: assistantError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: answer.answerText,
        structured_response: structuredResponse,
        sources: answer.sources,
      })
      .select("id, content, created_at")
      .single();

    if (assistantError || !assistantMessage) {
      return jsonError(502, "The answer was generated but could not be saved.");
    }

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Privacy-safe impression logging for recommendations
    if (recommendedLawyers.length > 0) {
      try {
        const events = recommendedLawyers.map((l) => ({
          event_type: "impression",
          lawyer_id: l.id,
          legal_category: answer.legalCategory,
          recommendation_score: l.compositeScore,
          user_id: user.id,
        }));
        await supabase.from("ai_recommendation_events").insert(events);
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({
      conversation_id: conversationId,
      assistant_message: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        structured_response: structuredResponse,
        sources: answer.sources,
        recommended_lawyers: recommendedLawyers,
        created_at: assistantMessage.created_at,
      },
    });
  } catch {
    return jsonError(502, "The answer was generated but could not be saved.");
  }
}