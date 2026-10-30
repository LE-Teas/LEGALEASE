/** Shared client/server shapes for the AI assistant UI + API. */

export interface UiSource {
  chunk_id: string;
  document_id: string;
  title: string;
  section_number: string | null;
  article_number: string | null;
  section_title: string | null;
  page_number: number | null;
  category: string;
  jurisdiction_level: string | null;
  province: string | null;
  official_source_url: string | null;
  excerpt: string;
  similarity: number | null;
}

export interface UiRecommendedLawyer {
  id: string;
  fullName: string;
  professionalTitle: string;
  primarySpecialization: string;
  specializations: string[];
  city: string;
  area: string | null;
  yearsOfExperience: number;
  consultationFee: number;
  rating: number;
  totalReviews: number;
  avatarUrl: string | null;
  whyRecommended: string;
  compositeScore: number;
}

export interface UiStructuredResponse {
  summary?: string;
  legal_category?: string;
  jurisdiction?: string;
  confidence?: "high" | "medium" | "low";
  needs_lawyer?: boolean;
  insufficient_context?: boolean;
  mode?: "answer" | "insufficient";
  citations?: Array<Record<string, unknown>>;
  sources?: UiSource[];
  recommended_lawyers?: UiRecommendedLawyer[];
  standalone_question?: string;
  retrieved_count?: number;
  retrieved_categories?: string[];
  retrieved_documents?: string[];
  llm_model?: string;
}

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured_response?: UiStructuredResponse | null;
  sources?: UiSource[] | null;
  recommended_lawyers?: UiRecommendedLawyer[] | null;
  created_at?: string | null;
  status?: "pending" | "streaming" | "done" | "error";
  error?: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}