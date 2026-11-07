/**
 * Zod schemas for the structured LegalEase LLM response and the source
 * payload saved with each assistant message.
 */

import { z } from "zod";

export const citationSchema = z.object({
  document_id: z.uuid().nullish(),
  title: z.string(),
  section: z.string().nullish(),
  article: z.string().nullish(),
  page: z.number().int().positive().nullish(),
});

export type LegalCitation = z.infer<typeof citationSchema>;

export const legalAnswerSchema = z.object({
  answer: z.string().min(1),
  summary: z.string().optional().default(""),
  legal_category: z.string().optional().default("other"),
  jurisdiction: z.string().optional().default("Pakistan"),
  citations: z.array(citationSchema).optional().default([]),
  confidence: z.enum(["high", "medium", "low"]).optional().default("low"),
  needs_lawyer: z.boolean().optional().default(false),
  insufficient_context: z.boolean().optional().default(false),
});

export type LegalAnswer = z.infer<typeof legalAnswerSchema>;

/**
 * The sources object persisted with an assistant message — what the source
 * panel renders. Values are constructed server-side from the *retrieved*
 * chunks, never from the LLM.
 */
export const legalSourceSchema = z.object({
  chunk_id: z.uuid(),
  document_id: z.uuid(),
  title: z.string(),
  section_number: z.string().nullish(),
  article_number: z.string().nullish(),
  section_title: z.string().nullish(),
  page_number: z.number().int().positive().nullish(),
  category: z.string().optional(),
  jurisdiction_level: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  year: z.number().int().nullish(),
  verification_status: z.string().optional(),
  official_source_url: z.string().nullish(),
  excerpt: z.string(),
  similarity: z.number().nullish(),
});

export type LegalSource = z.infer<typeof legalSourceSchema>;

export const chatRequestSchema = z.object({
  message: z.string().min(3, "Your question is too short.").max(2000, "Your question is too long."),
  conversation_id: z.uuid().optional(),
  file_id: z.uuid().optional().nullable(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const conversationSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
