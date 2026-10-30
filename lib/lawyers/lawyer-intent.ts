/**
 * Structured Lawyer Intent Extraction.
 *
 * Extracts legal intent, category, keywords, urgency, and jurisdiction
 * from a citizen's query and conversation context to find the best verified lawyers.
 */

import { z } from "zod";
import { chatCompletion } from "@/lib/ai/openrouter";
import type { QueryClassification } from "@/lib/rag/classifier";

export const lawyerIntentSchema = z.object({
  needs_lawyer: z.boolean().default(false),
  legal_category: z.string().default("general"),
  specializations: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  jurisdiction: z
    .object({
      country: z.string().optional().default("Pakistan"),
      province: z.string().nullish(),
      city: z.string().nullish(),
    })
    .default({ country: "Pakistan" }),
  urgency: z.enum(["urgent", "normal", "low"]).default("normal"),
  fee_preference: z.number().nullable().optional(),
});

export type LawyerIntent = z.infer<typeof lawyerIntentSchema>;

const INTENT_SYSTEM_PROMPT = `You are the LegalEase Legal Intent Classifier.
Analyze the user's query and output ONLY a valid JSON object matching this schema:
{
  "needs_lawyer": boolean, // true if user has an active dispute, needs legal representation, contract drafting, court filing, notice, or legal advice; false if asking general educational definition or greeting
  "legal_category": string, // e.g. "rent_tenancy", "family", "criminal", "property", "cybercrime", "employment_labour", "consumer", "contract"
  "specializations": string[], // relevant legal fields, e.g. ["Rent/Tenancy", "Property Law"]
  "keywords": string[], // 3-6 core problem keywords from query, e.g. ["landlord", "eviction", "security deposit"]
  "jurisdiction": {
    "country": "Pakistan",
    "province": string | null, // e.g. "Sindh", "Punjab" if mentioned
    "city": string | null // e.g. "Karachi", "Lahore" if mentioned
  },
  "urgency": "urgent" | "normal" | "low", // "urgent" if immediate threat, arrest, eviction tomorrow; else "normal"
  "fee_preference": number | null // budget in PKR ONLY if explicitly stated by user, otherwise null
}
Strictly output valid JSON with no markdown wrapping.`;

/**
 * Extracts structured lawyer intent.
 * Fast execution: if the query is a simple greeting or trivial informational question,
 * resolves immediately without an LLM call.
 */
export async function extractLawyerIntent(
  query: string,
  classification?: QueryClassification | null
): Promise<LawyerIntent> {
  const clean = query.trim().toLowerCase();

  // Fast check: greetings and trivial definitions don't need a lawyer
  const isGreeting = /^(hi|hello|salam|assalam|hey|good morning|good evening)[\s!.]*$/i.test(clean);
  if (isGreeting) {
    return {
      needs_lawyer: false,
      legal_category: "general",
      specializations: [],
      keywords: [],
      jurisdiction: { country: "Pakistan", province: null, city: null },
      urgency: "low",
      fee_preference: null,
    };
  }

  // Fast check: simple article definition query without personal dispute
  const isAbstractDefinition =
    /^(what is|define|explain article|explain section)\s+[a-z0-9\s]+$/i.test(clean) &&
    !clean.includes("my") &&
    !clean.includes("help") &&
    !clean.includes("me") &&
    !clean.includes("sue");

  if (isAbstractDefinition) {
    return {
      needs_lawyer: false,
      legal_category: classification?.category || "constitutional",
      specializations: classification?.category ? [classification.category] : [],
      keywords: classification?.matchedKeywords || [],
      jurisdiction: {
        country: "Pakistan",
        province: classification?.province || null,
        city: classification?.city || null,
      },
      urgency: "low",
      fee_preference: null,
    };
  }

  try {
    const res = await chatCompletion(
      [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: `Query: ${query}` },
      ],
      {
        jsonObject: true,
        maxTokens: 250,
        temperature: 0.1,
        taskType: "lawyer_intent_extraction",
      }
    );

    let text = res.content.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last > first) {
      text = text.slice(first, last + 1);
    }

    const parsed = JSON.parse(text);
    const validated = lawyerIntentSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
  } catch (err) {
    console.warn("[lawyer-intent] LLM intent extraction failed, using heuristic fallback:", err);
  }

  // Heuristic fallback if LLM extraction fails
  const category = classification?.category || "general";
  const needsLawyer =
    clean.includes("lawyer") ||
    clean.includes("court") ||
    clean.includes("case") ||
    clean.includes("evict") ||
    clean.includes("divorce") ||
    clean.includes("fir") ||
    clean.includes("police") ||
    clean.includes("dispute") ||
    clean.includes("notice") ||
    clean.includes("sue");

  return {
    needs_lawyer: needsLawyer,
    legal_category: category,
    specializations: category !== "general" ? [category.replace(/_/g, " ")] : [],
    keywords: classification?.matchedKeywords || [],
    jurisdiction: {
      country: "Pakistan",
      province: classification?.province || null,
      city: classification?.city || "Karachi",
    },
    urgency: clean.includes("tomorrow") || clean.includes("urgent") || clean.includes("arrest") ? "urgent" : "normal",
    fee_preference: null,
  };
}
