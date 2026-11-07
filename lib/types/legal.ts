import type { Profile } from "@/lib/auth/types";

export type Specialization =
  | "Criminal Law"
  | "Family Law"
  | "Civil Law"
  | "Property Law"
  | "Corporate Law"
  | "Contract Law"
  | "Cybercrime Law"
  | "Consumer Law"
  | "Labour & Employment Law"
  | "Banking Law"
  | "Tax Law"
  | "Intellectual Property"
  | "Constitutional Law"
  | "Immigration"
  | "Estate Planning"
  | "Other";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "needs_info"
  | "rejected"
  | "suspended";

export type ConsultationType = "in_person" | "video" | "phone";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded" | "waived";

export interface LawyerProfileRecord {
  id: string; // references profiles.id
  professional_title: string;
  bio: string | null;
  primary_specialization: string;
  specializations: string[];
  years_of_experience: number;
  bar_council: string | null;
  bar_license_number: string | null;
  license_issue_date: string | null;
  city: string;
  area: string | null;
  office_name: string | null;
  office_address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  consultation_fee: number;
  consultation_duration: number;
  offers_in_person: boolean;
  offers_video: boolean;
  offers_phone: boolean;
  languages: string[];
  education: string | null;
  verification_status: VerificationStatus;
  is_published: boolean;
  rating: number;
  review_count: number;
  bank_name?: string | null;
  bank_account_title?: string | null;
  bank_iban?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LawyerWithProfile extends LawyerProfileRecord {
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  distance_km?: number;
}

export interface LawyerVerification {
  id: string;
  lawyer_id: string;
  bar_council: string;
  license_number: string;
  license_document_path: string | null;
  additional_document_path: string | null;
  status: VerificationStatus;
  lawyer_visible_note: string | null;
  admin_note?: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LawyerAvailability {
  id: string;
  lawyer_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LawyerTimeOff {
  id: string;
  lawyer_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  citizen_id: string;
  lawyer_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  consultation_type: ConsultationType;
  legal_category: string | null;
  subject: string;
  description: string | null;
  status: AppointmentStatus;
  consultation_fee: number;
  platform_fee?: number;
  platform_fee_type?: string;
  tax_amount?: number;
  total_amount?: number;
  lawyer_receivable?: number;
  duration_minutes?: number; // 60 to 180 min
  settlement_status?: "pending" | "eligible" | "transferred" | "settled" | "unsettled" | "failed" | "waived";
  settlement_reference?: string | null;
  completed_at?: string | null;
  completed_by?: "lawyer" | "admin" | null;
  early_completion_reason?: string | null;
  completed_early?: boolean;
  rating_submitted?: boolean;
  stripe_checkout_url?: string | null;
  stripe_session_id?: string | null;
  payment_status: PaymentStatus;
  citizen_notes: string | null;
  lawyer_notes: string | null;
  cancelled_by?: "citizen" | "lawyer" | "admin" | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  citizen?: Profile;
  lawyer?: Profile;
  lawyer_profile?: LawyerProfileRecord;
}

export interface Review {
  id: string;
  appointment_id: string;
  citizen_id: string;
  lawyer_id: string;
  rating: number; // 1-5
  comment?: string | null;
  lawyer_response?: string | null;
  lawyer_responded_at?: string | null;
  is_flagged?: boolean;
  flag_reason?: string | null;
  is_visible?: boolean;
  created_at: string;
  updated_at: string;
  citizen?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Payment {
  id: string;
  appointment_id: string | null;
  citizen_id: string;
  lawyer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transaction_reference: string | null;
  payment_method: string;
  provider?: string;
  provider_checkout_id?: string | null;
  provider_order_id?: string | null;
  stripe_session_id?: string | null;
  checkout_url?: string | null;
  webhook_event_id?: string | null;
  paid_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  appointment?: Appointment;
  citizen?: Profile;
  lawyer?: Profile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CitizenDocument {
  id: string;
  citizen_id: string;
  template_type: string;
  title: string;
  form_data: Record<string, string>;
  generated_content: string;
  status: "draft" | "generated" | "finalized";
  created_at: string;
  updated_at: string;
}

export interface LegalResourceItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  reading_time: string;
  summary: string;
  content: string;
  jurisdiction: string;
  updated_date: string;
  created_at: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface PlatformAiSetting {
  id: string;
  provider?: string;
  model?: string;
  generation_model?: string;
  embedding_model?: string;
  temperature: number;
  max_tokens: number;
  rag_enabled: boolean;
  similarity_threshold: number;
  match_count?: number;
  retrieval_top_k?: number;
  maintenance_mode?: boolean;
  system_prompt_override?: string | null;
  is_active?: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  target_type?: string;
  target_id?: string | null;
  changes?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  admin?: Profile;
}

export interface AppointmentAgreement {
  id: string;
  appointment_id: string;
  citizen_id: string;
  lawyer_id: string;
  consultation_fee: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  lawyer_receivable: number;
  currency: string;
  agreement_version: string;
  accepted_at: string;
  ip_address: string | null;
}

export interface EmailNotificationLog {
  id: string;
  user_id: string | null;
  direction: "outbound" | "inbound";
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  notification_type: string;
  status: "queued" | "sent" | "failed" | "received" | "read";
  error_message: string | null;
  message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaymentWebhookEvent {
  id: string;
  provider: string;
  event_name: string;
  event_id: string;
  appointment_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  role: "citizen" | "lawyer";
  category: string;
  subject: string;
  description: string;
  message?: string;
  priority?: string;
  appointment_id: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface CitizenFile {
  id: string;
  citizen_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_size_bytes?: number;
  category?: string;
  storage_path: string | null;
  extracted_text: string;
  summary: string | null;
  status: "processing" | "ready" | "failed";
  appointment_id: string | null;
  created_at: string;
}

export interface SavedResource {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
}

export interface AppointmentMessage {
  id: string;
  appointment_id: string;
  sender_id: string;
  sender_role: "citizen" | "lawyer" | "admin";
  message: string;
  content?: string;
  attachment_name: string | null;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}
