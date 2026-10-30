-- ============================================================================
-- LegalEase — Unified Complete Database Schema (v2)
-- Single query file to maintain for the complete project.
-- Run this in the Supabase SQL Editor (or via supabase db push).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists vector with schema extensions;
create extension if not exists postgis with schema extensions;

-- ----------------------------------------------------------------------------
-- 2. SHARED HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ----------------------------------------------------------------------------
-- 3. PROFILES TABLE & AUTH TRIGGERS
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'citizen' check (role in ('citizen', 'lawyer', 'admin')),
  full_name text not null,
  email text not null,
  phone text,
  city text,
  area text,
  preferred_language text default 'English',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists area text;
alter table public.profiles add column if not exists preferred_language text default 'English';
alter table public.profiles add column if not exists avatar_url text;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_city_idx on public.profiles (city);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Admin check helper
create or replace function public.is_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
end; $$;

-- Auto-create profile at sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := lower(trim(coalesce(meta->>'role', 'citizen')));
  full_name text := nullif(trim(coalesce(meta->>'full_name', '')), '');
begin
  if requested_role not in ('citizen', 'lawyer') then requested_role := 'citizen'; end if;

  insert into public.profiles (id, role, full_name, email, phone, city, avatar_url)
  values (
    new.id, requested_role,
    coalesce(full_name, split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    nullif(trim(coalesce(meta->>'phone', '')), ''),
    nullif(trim(coalesce(meta->>'city', '')), ''),
    nullif(trim(coalesce(meta->>'avatar_url', '')), '')
  ) on conflict (id) do nothing;

  -- If lawyer: create lawyer_profiles with is_published=FALSE (must be verified first)
  if requested_role = 'lawyer' then
    insert into public.lawyer_profiles (id, professional_title, city, verification_status, is_published)
    values (new.id, 'Advocate High Court', nullif(trim(coalesce(meta->>'city', '')), ''), 'not_submitted', false)
    on conflict (id) do nothing;
  end if;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent role change
create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role then raise exception 'Profile role cannot be changed'; end if;
  return new;
end; $$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

create or replace function public.set_profile_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('citizen', 'lawyer', 'admin') then raise exception 'Invalid role: %', p_role; end if;
  alter table public.profiles disable trigger profiles_prevent_role_change;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  alter table public.profiles enable trigger profiles_prevent_role_change;
  if not found then raise exception 'No profile found for user %', p_user_id; end if;
end; $$;

revoke execute on function public.set_profile_role(uuid, text) from public, anon, authenticated;
grant execute on function public.set_profile_role(uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 4. LAWYER PROFILES & LOCATION
-- ----------------------------------------------------------------------------
create table if not exists public.lawyer_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  professional_title text default 'Advocate High Court',
  bio text,
  primary_specialization text default 'Civil Law',
  specializations text[] not null default array['Civil Law']::text[],
  years_of_experience integer not null default 1,
  bar_council text,
  bar_license_number text,
  license_issue_date date,
  city text default 'Karachi',
  area text,
  office_name text,
  office_address text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  office_location extensions.geography(Point, 4326),
  consultation_fee numeric(10,2) not null default 3000,
  consultation_duration integer not null default 30,
  offers_in_person boolean not null default true,
  offers_video boolean not null default true,
  offers_phone boolean not null default true,
  languages text[] not null default array['English', 'Urdu']::text[],
  education text,
  verification_status text not null default 'not_submitted'
    check (verification_status in ('not_submitted', 'pending', 'verified', 'needs_info', 'rejected', 'suspended')),
  is_published boolean not null default false,
  rating numeric(3,2) not null default 0.00,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lawyer_profiles add column if not exists is_published boolean not null default false;
alter table public.lawyer_profiles add column if not exists verification_status text not null default 'not_submitted';

drop trigger if exists lawyer_profiles_set_updated_at on public.lawyer_profiles;
create trigger lawyer_profiles_set_updated_at before update on public.lawyer_profiles
  for each row execute function public.handle_updated_at();

create or replace function public.handle_lawyer_office_location()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.office_location = extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326)::extensions.geography;
  else new.office_location = null; end if;
  return new;
end; $$;

drop trigger if exists lawyer_profiles_sync_location on public.lawyer_profiles;
create trigger lawyer_profiles_sync_location
  before insert or update of latitude, longitude on public.lawyer_profiles
  for each row execute function public.handle_lawyer_office_location();

create index if not exists lawyer_profiles_office_loc_idx on public.lawyer_profiles using gist (office_location);
create index if not exists lawyer_profiles_filter_idx on public.lawyer_profiles (is_published, verification_status, city);

-- ----------------------------------------------------------------------------
-- 5. LAWYER VERIFICATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.lawyer_verifications (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.profiles (id) on delete cascade,
  bar_council text not null,
  license_number text not null,
  license_document_path text,
  additional_document_path text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'needs_info', 'rejected', 'suspended')),
  lawyer_visible_note text,
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lawyer_verifications add column if not exists lawyer_visible_note text;
alter table public.lawyer_verifications add column if not exists admin_note text;

drop trigger if exists lawyer_verifications_set_updated_at on public.lawyer_verifications;
create trigger lawyer_verifications_set_updated_at before update on public.lawyer_verifications
  for each row execute function public.handle_updated_at();

-- Sync verification status to lawyer_profiles (security definer — lawyers can't self-verify)
create or replace function public.sync_lawyer_verification_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.lawyer_profiles set
    verification_status = new.status,
    bar_council = new.bar_council,
    bar_license_number = new.license_number,
    is_published = case
      when new.status = 'verified' then true
      when new.status in ('rejected', 'suspended') then false
      else is_published end,
    updated_at = now()
  where id = new.lawyer_id;
  return new;
end; $$;

drop trigger if exists lawyer_verification_status_sync on public.lawyer_verifications;
create trigger lawyer_verification_status_sync
  after insert or update of status on public.lawyer_verifications
  for each row execute function public.sync_lawyer_verification_status();

-- ----------------------------------------------------------------------------
-- 6. LAWYER AVAILABILITY & TIME OFF
-- ----------------------------------------------------------------------------
create table if not exists public.lawyer_availability (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_availability_times check (start_time < end_time)
);
create index if not exists lawyer_availability_idx on public.lawyer_availability (lawyer_id, day_of_week, is_active);

create table if not exists public.lawyer_time_off (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.profiles (id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint check_time_off_range check (start_datetime < end_datetime)
);
create index if not exists lawyer_time_off_idx on public.lawyer_time_off (lawyer_id, start_datetime, end_datetime);

-- ----------------------------------------------------------------------------
-- 7. PLATFORM SETTINGS (fee management, general config)
-- ----------------------------------------------------------------------------
create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  description text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value, description) values
  ('platform_fee_type', 'percentage', 'Platform fee model: "percentage" or "fixed"'),
  ('platform_fee_value', '10', 'Platform fee value'),
  ('tax_percentage', '0', 'Tax on platform fee (0 = no tax)'),
  ('booking_advance_days', '60', 'Max days ahead a citizen can book'),
  ('cancellation_cutoff_hours', '24', 'Hours before appointment that cancellation is allowed'),
  ('consultation_agreement_version', '1.0', 'Current consultation agreement version'),
  ('cancellation_policy_version', '1.0', 'Current cancellation policy version'),
  ('refund_policy_version', '1.0', 'Current refund policy version'),
  ('platform_name', 'LegalEase', 'Platform display name'),
  ('support_email', 'support@legalease.pk', 'Support email')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 8. APPOINTMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references public.profiles (id) on delete cascade,
  lawyer_id uuid not null references public.profiles (id) on delete cascade,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  consultation_type text not null default 'in_person'
    check (consultation_type in ('in_person', 'video', 'phone')),
  legal_category text,
  subject text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  consultation_fee numeric(10,2) not null default 0,
  platform_fee numeric(10,2) not null default 0,
  platform_fee_type text not null default 'percentage',
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  lawyer_receivable numeric(10,2) not null default 0,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  cancelled_by text check (cancelled_by in ('citizen', 'lawyer', 'admin')),
  cancelled_at timestamptz,
  cancellation_reason text,
  citizen_notes text,
  lawyer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.appointments add column if not exists platform_fee numeric(10,2) not null default 0;
alter table public.appointments add column if not exists platform_fee_type text not null default 'percentage';
alter table public.appointments add column if not exists tax_amount numeric(10,2) not null default 0;
alter table public.appointments add column if not exists total_amount numeric(10,2) not null default 0;
alter table public.appointments add column if not exists lawyer_receivable numeric(10,2) not null default 0;
alter table public.appointments add column if not exists payment_status text not null default 'unpaid';
alter table public.appointments add column if not exists cancelled_by text;
alter table public.appointments add column if not exists cancelled_at timestamptz;
alter table public.appointments add column if not exists cancellation_reason text;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.handle_updated_at();

create unique index if not exists appointments_no_double_booking_idx
  on public.appointments (lawyer_id, appointment_date, start_time)
  where status in ('pending', 'confirmed');

create index if not exists appointments_citizen_idx on public.appointments (citizen_id, appointment_date desc);
create index if not exists appointments_lawyer_idx on public.appointments (lawyer_id, appointment_date desc);
create index if not exists appointments_status_idx on public.appointments (status, appointment_date desc);

-- ----------------------------------------------------------------------------
-- 9. APPOINTMENT AGREEMENTS (immutable fee snapshot + acceptance record)
-- ----------------------------------------------------------------------------
create table if not exists public.appointment_agreements (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  agreement_version text not null default '1.0',
  cancellation_policy_version text not null default '1.0',
  refund_policy_version text not null default '1.0',
  consultation_fee numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  platform_fee_type text not null,
  tax_amount numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  lawyer_receivable numeric(10,2) not null,
  citizen_accepted_at timestamptz not null default now(),
  citizen_ip_address inet,
  lawyer_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. REVIEWS
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  citizen_id uuid not null references public.profiles (id) on delete cascade,
  lawyer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  is_visible boolean not null default true,
  moderated_at timestamptz,
  moderated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reviews add column if not exists is_visible boolean not null default true;
alter table public.reviews add column if not exists moderated_at timestamptz;
alter table public.reviews add column if not exists moderated_by uuid references public.profiles (id);
create index if not exists reviews_lawyer_idx on public.reviews (lawyer_id, created_at desc);

create or replace function public.sync_lawyer_review_stats()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_lawyer uuid := coalesce(new.lawyer_id, old.lawyer_id);
  v_avg numeric(3,2); v_count integer;
begin
  select coalesce(round(avg(rating)::numeric, 2), 0.00), count(*)::integer into v_avg, v_count
  from public.reviews where lawyer_id = target_lawyer and is_visible = true;
  update public.lawyer_profiles set rating = v_avg, review_count = v_count, updated_at = now() where id = target_lawyer;
  return null;
end; $$;

drop trigger if exists on_review_sync_stats on public.reviews;
create trigger on_review_sync_stats after insert or update or delete on public.reviews
  for each row execute function public.sync_lawyer_review_stats();

-- ----------------------------------------------------------------------------
-- 11. PAYMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete set null,
  citizen_id uuid not null references public.profiles (id) on delete cascade,
  lawyer_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'PKR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  transaction_reference text,
  payment_method text not null default 'bank_transfer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.handle_updated_at();
create index if not exists payments_citizen_idx on public.payments (citizen_id);
create index if not exists payments_lawyer_idx on public.payments (lawyer_id);

-- ----------------------------------------------------------------------------
-- 12. NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 12b. VIDEO CONSULTATIONS (Jitsi room tracking)
-- ----------------------------------------------------------------------------
create table if not exists public.video_consultations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  room_name text not null unique,
  citizen_joined_at timestamptz,
  lawyer_joined_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists video_consultations_set_updated_at on public.video_consultations;
create trigger video_consultations_set_updated_at before update on public.video_consultations
  for each row execute function public.handle_updated_at();
create index if not exists video_consultations_appointment_idx on public.video_consultations (appointment_id);

-- RLS for video_consultations
alter table public.video_consultations enable row level security;

drop policy if exists "video_consultations_participant_select" on public.video_consultations;
create policy "video_consultations_participant_select" on public.video_consultations
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = video_consultations.appointment_id
        and (a.citizen_id = auth.uid() or a.lawyer_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "video_consultations_participant_insert" on public.video_consultations;
create policy "video_consultations_participant_insert" on public.video_consultations
  for insert with check (
    exists (
      select 1 from public.appointments a
      where a.id = video_consultations.appointment_id
        and (a.citizen_id = auth.uid() or a.lawyer_id = auth.uid())
        and a.status = 'confirmed'
        and a.consultation_type = 'video'
    )
  );

drop policy if exists "video_consultations_participant_update" on public.video_consultations;
create policy "video_consultations_participant_update" on public.video_consultations
  for update using (
    exists (
      select 1 from public.appointments a
      where a.id = video_consultations.appointment_id
        and (a.citizen_id = auth.uid() or a.lawyer_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 13. PLATFORM AI SETTINGS (non-secret runtime config)
-- ----------------------------------------------------------------------------
create table if not exists public.platform_ai_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'openrouter',
  generation_model text not null default 'google/gemini-2.5-flash',
  embedding_model text not null default 'openai/text-embedding-3-small',
  temperature numeric(3,2) not null default 0.20 check (temperature between 0 and 2),
  max_tokens integer not null default 2048 check (max_tokens between 64 and 32768),
  retrieval_top_k integer not null default 8 check (retrieval_top_k between 1 and 50),
  similarity_threshold numeric(4,3) not null default 0.350 check (similarity_threshold between 0 and 1),
  rag_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into public.platform_ai_settings (provider, generation_model, embedding_model)
values ('openrouter', 'google/gemini-2.5-flash', 'openai/text-embedding-3-small')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 13b. OPENROUTER FREE MODEL REGISTRY & AI LAWYER RECOMMENDATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.openrouter_model_registry (
  id text primary key,
  model_id text not null unique,
  model_name text not null,
  is_free boolean not null default true,
  context_length integer default 4096,
  capabilities jsonb not null default '{}'::jsonb,
  openrouter_metadata jsonb not null default '{}'::jsonb,
  internal_evaluation jsonb not null default '{}'::jsonb,
  health_status text not null default 'healthy',
  latency_ms integer,
  throughput_tps numeric,
  rank_score numeric default 0,
  excluded_by_admin boolean not null default false,
  last_discovered_at timestamptz default now(),
  last_evaluated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_openrouter_model_registry_free
  on public.openrouter_model_registry (is_free, excluded_by_admin, rank_score desc);

create table if not exists public.ai_routing_config (
  id text primary key default 'default',
  routing_mode text not null default 'auto_free',
  primary_model text not null default 'meta-llama/llama-3.3-70b-instruct:free',
  fallback_model_1 text default 'google/gemini-2.0-flash-exp:free',
  fallback_model_2 text default 'mistralai/mistral-small-24b-instruct-2501:free',
  streaming_enabled boolean not null default true,
  model_cache_ttl_hours integer not null default 4,
  eval_weights jsonb not null default '{"quality": 40, "reliability": 25, "latency": 20, "structured": 15}'::jsonb,
  auto_refresh_enabled boolean not null default true,
  last_refreshed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

insert into public.ai_routing_config (id, routing_mode, primary_model, fallback_model_1, fallback_model_2)
values (
  'default',
  'auto_free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-small-24b-instruct-2501:free'
)
on conflict (id) do nothing;

create table if not exists public.ai_recommendation_settings (
  id text primary key default 'default',
  enabled boolean not null default true,
  max_recommendations integer not null default 3,
  relevance_weight integer not null default 50,
  rating_weight integer not null default 20,
  experience_weight integer not null default 15,
  fee_weight integer not null default 10,
  location_weight integer not null default 5,
  min_relevance_threshold numeric not null default 0.35,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

insert into public.ai_recommendation_settings (
  id, enabled, max_recommendations, relevance_weight, rating_weight, experience_weight, fee_weight, location_weight, min_relevance_threshold
)
values ('default', true, 3, 50, 20, 15, 10, 5, 0.35)
on conflict (id) do nothing;

create table if not exists public.ai_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  lawyer_id uuid not null references public.lawyer_profiles(id) on delete cascade,
  legal_category text,
  recommendation_score numeric,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_recommendation_events_lawyer
  on public.ai_recommendation_events (lawyer_id, event_type, created_at desc);

-- ----------------------------------------------------------------------------
-- 14. ADMIN AUDIT LOGS
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs (admin_id, created_at desc);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 15. CITIZEN LEGAL DOCUMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.citizen_documents (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references public.profiles (id) on delete cascade,
  template_type text not null,
  title text not null,
  form_data jsonb not null default '{}'::jsonb,
  generated_content text not null,
  status text not null default 'draft' check (status in ('draft', 'generated', 'finalized')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists citizen_documents_set_updated_at on public.citizen_documents;
create trigger citizen_documents_set_updated_at before update on public.citizen_documents
  for each row execute function public.handle_updated_at();
create index if not exists citizen_documents_citizen_idx on public.citizen_documents (citizen_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 16. LEGAL RESOURCES
-- ----------------------------------------------------------------------------
create table if not exists public.legal_resources (
  id text primary key,
  title text not null,
  slug text not null unique,
  category text not null,
  reading_time text not null default '5 min read',
  summary text not null,
  content text not null,
  jurisdiction text not null default 'Pakistan',
  updated_date text not null default '2026',
  created_at timestamptz not null default now()
);
create index if not exists legal_resources_category_idx on public.legal_resources (category);

-- ----------------------------------------------------------------------------
-- 17. RAG KNOWLEDGE BASE
-- ----------------------------------------------------------------------------
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_title text not null,
  short_title text,
  document_type text not null default 'statute'
    check (document_type in ('constitution', 'code', 'statute', 'ordinance', 'rules', 'regulation', 'notification', 'other')),
  category text not null default 'other'
    check (category in ('constitutional', 'criminal', 'criminal_procedure', 'civil_procedure', 'evidence', 'contract', 'family', 'property', 'rent_tenancy', 'consumer', 'employment_labour', 'cybercrime', 'registration', 'other')),
  jurisdiction_level text not null default 'Federal'
    check (jurisdiction_level in ('Federal', 'Provincial', 'Local')),
  province text, city text, country text not null default 'Pakistan',
  year integer, official_source_url text, source_authority text,
  storage_path text, file_hash text not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'needs_review', 'rejected')),
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'extracting', 'chunking', 'embedding', 'ready', 'failed')),
  version_label text, effective_date date, version_date date,
  is_active boolean not null default true, is_repealed boolean not null default false,
  requires_review boolean not null default false, page_count integer,
  created_by uuid references public.profiles (id) on delete set null,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists legal_documents_file_hash_key on public.legal_documents (file_hash);
create index if not exists legal_documents_status_idx on public.legal_documents (verification_status, processing_status, is_active, is_repealed);
create index if not exists legal_documents_category_idx on public.legal_documents (category);
drop trigger if exists legal_documents_set_updated_at on public.legal_documents;
create trigger legal_documents_set_updated_at before update on public.legal_documents
  for each row execute function public.handle_updated_at();

create table if not exists public.legal_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents (id) on delete cascade,
  chunk_index integer not null, section_number text, section_title text, article_number text,
  page_number integer, content text not null, token_count integer,
  embedding extensions.vector(1536), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists legal_chunks_document_idx on public.legal_chunks (document_id, chunk_index);

-- ----------------------------------------------------------------------------
-- 18. CHAT HISTORY
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.handle_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null, structured_response jsonb, sources jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at asc);

-- ----------------------------------------------------------------------------
-- 18b. FILER DATASETS & RECORDS (CNIC Structured Taxpayer Lookup)
-- ----------------------------------------------------------------------------
create table if not exists public.filer_datasets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'xlsx', 'xls')),
  source text not null default 'FBR Active Taxpayers List (ATL)',
  tax_year text,
  effective_date date,
  record_count integer not null default 0,
  filer_count integer not null default 0,
  non_filer_count integer not null default 0,
  status text not null default 'ready' check (status in ('processing', 'ready', 'active', 'inactive', 'failed')),
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  activated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists filer_datasets_status_idx on public.filer_datasets (status);
create index if not exists filer_datasets_uploaded_at_idx on public.filer_datasets (uploaded_at desc);

create table if not exists public.filer_records (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.filer_datasets (id) on delete cascade,
  cnic_normalized text not null check (length(cnic_normalized) = 13),
  status text not null check (status in ('filer', 'non_filer')),
  tax_year text,
  source text,
  effective_date date,
  created_at timestamptz not null default now()
);
create index if not exists filer_records_dataset_cnic_idx on public.filer_records (dataset_id, cnic_normalized);
create index if not exists filer_records_cnic_idx on public.filer_records (cnic_normalized);
create index if not exists filer_records_dataset_status_idx on public.filer_records (dataset_id, status);

-- ----------------------------------------------------------------------------
-- 19. RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- Exact Filer Status Lookup against Active Dataset
create or replace function public.lookup_active_filer_status(p_cnic text)
returns table (
  found boolean,
  status text,
  tax_year text,
  source text,
  effective_date date,
  dataset_name text,
  dataset_uploaded_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_dataset public.filer_datasets%rowtype;
  v_record public.filer_records%rowtype;
  v_clean_cnic text;
begin
  -- Normalize CNIC: strip any non-digits
  v_clean_cnic := regexp_replace(coalesce(p_cnic, ''), '[^0-9]', '', 'g');

  -- Must be exactly 13 digits
  if length(v_clean_cnic) <> 13 then
    return query select false, null::text, null::text, null::text, null::date, null::text, null::timestamptz;
    return;
  end if;

  -- Find the currently active dataset
  select * into v_dataset from public.filer_datasets where filer_datasets.status = 'active' order by activated_at desc nulls last limit 1;

  if v_dataset.id is null then
    return query select false, null::text, null::text, null::text, null::date, null::text, null::timestamptz;
    return;
  end if;

  -- Find the record in the active dataset
  select * into v_record
  from public.filer_records
  where dataset_id = v_dataset.id and cnic_normalized = v_clean_cnic
  limit 1;

  if v_record.id is not null then
    return query select
      true,
      v_record.status,
      coalesce(v_record.tax_year, v_dataset.tax_year),
      coalesce(v_record.source, v_dataset.source),
      coalesce(v_record.effective_date, v_dataset.effective_date),
      v_dataset.file_name,
      v_dataset.uploaded_at;
  else
    -- Not found in active dataset
    return query select
      false,
      null::text,
      v_dataset.tax_year,
      v_dataset.source,
      v_dataset.effective_date,
      v_dataset.file_name,
      v_dataset.uploaded_at;
  end if;
end;
$$;

-- RAG Retrieval
create or replace function public.match_legal_chunks(
  query_embedding vector, match_count int default 8, similarity_threshold float default 0.35,
  p_category text default null, p_jurisdiction_level text default null,
  p_province text default null, p_document_id uuid default null
)
returns table (chunk_id uuid, document_id uuid, document_title text, content text,
  section_number text, article_number text, section_title text, page_number integer,
  category text, jurisdiction_level text, province text, official_source_url text,
  version_label text, similarity float)
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
  select c.id, d.id, d.title, c.content, c.section_number, c.article_number,
    c.section_title, c.page_number, d.category, d.jurisdiction_level, d.province,
    d.official_source_url, d.version_label, 1 - (c.embedding <=> query_embedding)
  from public.legal_chunks c join public.legal_documents d on d.id = c.document_id
  where d.verification_status = 'verified' and d.processing_status = 'ready'
    and d.is_active = true and d.is_repealed = false
    and (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
    and (p_category is null or d.category = p_category)
    and (p_jurisdiction_level is null or d.jurisdiction_level = p_jurisdiction_level)
    and (p_province is null or d.province = p_province)
    and (p_document_id is null or d.id = p_document_id)
  order by c.embedding <=> query_embedding limit match_count;
end; $$;

-- PostGIS Nearby Lawyers — VERIFIED & PUBLISHED ONLY
create or replace function public.find_nearby_lawyers(
  p_latitude double precision, p_longitude double precision,
  p_radius_km double precision default 50,
  p_specialization text default null, p_city text default null
)
returns table (id uuid, full_name text, avatar_url text, professional_title text, bio text,
  primary_specialization text, specializations text[], years_of_experience integer,
  city text, area text, office_name text, office_address text,
  consultation_fee numeric, consultation_duration integer,
  offers_in_person boolean, offers_video boolean, offers_phone boolean,
  rating numeric, review_count integer, verification_status text, distance_km double precision)
language plpgsql security definer set search_path = public, extensions as $$
declare user_point extensions.geography;
begin
  user_point := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  return query
  select lp.id, p.full_name, p.avatar_url, lp.professional_title, lp.bio,
    lp.primary_specialization, lp.specializations, lp.years_of_experience,
    lp.city, lp.area, lp.office_name, lp.office_address, lp.consultation_fee,
    lp.consultation_duration, lp.offers_in_person, lp.offers_video, lp.offers_phone,
    lp.rating, lp.review_count, lp.verification_status,
    round((extensions.st_distance(lp.office_location, user_point) / 1000.0)::numeric, 1)::double precision
  from public.lawyer_profiles lp join public.profiles p on p.id = lp.id
  where lp.is_published = true and lp.verification_status = 'verified' and p.is_active = true
    and (p_city is null or lower(lp.city) = lower(p_city))
    and (p_specialization is null or lower(lp.primary_specialization) = lower(p_specialization) or p_specialization = any(lp.specializations))
    and lp.office_location is not null
    and extensions.st_dwithin(lp.office_location, user_point, p_radius_km * 1000)
  order by extensions.st_distance(lp.office_location, user_point) asc;
end; $$;

-- Server-side fee calculator
create or replace function public.calculate_appointment_fees(p_consultation_fee numeric)
returns table (consultation_fee numeric, platform_fee numeric, platform_fee_type text,
  tax_amount numeric, total_amount numeric, lawyer_receivable numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_fee_type text; v_fee_value numeric; v_tax_pct numeric;
  v_platform_fee numeric; v_tax_amount numeric; v_total numeric;
begin
  select value into v_fee_type from public.platform_settings where key = 'platform_fee_type';
  select value::numeric into v_fee_value from public.platform_settings where key = 'platform_fee_value';
  select value::numeric into v_tax_pct from public.platform_settings where key = 'tax_percentage';
  v_fee_type := coalesce(v_fee_type, 'percentage');
  v_fee_value := coalesce(v_fee_value, 10);
  v_tax_pct := coalesce(v_tax_pct, 0);
  if v_fee_type = 'percentage' then v_platform_fee := round(p_consultation_fee * v_fee_value / 100, 2);
  else v_platform_fee := v_fee_value; end if;
  v_tax_amount := round(v_platform_fee * v_tax_pct / 100, 2);
  v_total := p_consultation_fee + v_platform_fee + v_tax_amount;
  return query select p_consultation_fee, v_platform_fee, v_fee_type, v_tax_amount, v_total, p_consultation_fee;
end; $$;

-- Admin: update lawyer verification status
create or replace function public.admin_update_lawyer_verification(
  p_lawyer_id uuid, p_status text,
  p_admin_note text default null, p_lawyer_visible_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin_id uuid := auth.uid();
  v_verification_id uuid; v_old_status text;
begin
  if not public.is_admin() then raise exception 'Unauthorized: admin access required'; end if;
  if p_status not in ('pending', 'verified', 'needs_info', 'rejected', 'suspended') then
    raise exception 'Invalid verification status: %', p_status; end if;
  select id, status into v_verification_id, v_old_status from public.lawyer_verifications
  where lawyer_id = p_lawyer_id order by created_at desc limit 1;
  if v_verification_id is null then
    if p_status = 'verified' then
      insert into public.lawyer_verifications (lawyer_id, bar_council, license_number, status, admin_note, lawyer_visible_note, reviewed_by, reviewed_at)
      values (p_lawyer_id, 'N/A', 'N/A', p_status, p_admin_note, p_lawyer_visible_note, v_admin_id, now())
      returning id into v_verification_id;
    else raise exception 'No verification submission found for this lawyer'; end if;
  else
    update public.lawyer_verifications set status = p_status,
      admin_note = coalesce(p_admin_note, admin_note),
      lawyer_visible_note = coalesce(p_lawyer_visible_note, lawyer_visible_note),
      reviewed_by = v_admin_id, reviewed_at = now(), updated_at = now()
    where id = v_verification_id;
  end if;
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
  values (v_admin_id, 'update_verification_status', 'lawyer_verification', v_verification_id::text,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_status, 'admin_note', p_admin_note));
  return jsonb_build_object('success', true, 'verification_id', v_verification_id, 'new_status', p_status);
end; $$;

revoke execute on function public.admin_update_lawyer_verification(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_lawyer_verification(uuid, text, text, text) to authenticated;

-- Admin: update platform settings
create or replace function public.admin_update_platform_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized: admin access required'; end if;
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, old_values, new_values)
  select auth.uid(), 'update_platform_setting', 'platform_settings', p_key,
    jsonb_build_object('value', value), jsonb_build_object('value', p_value)
  from public.platform_settings where key = p_key;
  update public.platform_settings set value = p_value, updated_by = auth.uid(), updated_at = now()
  where key = p_key;
end; $$;

revoke execute on function public.admin_update_platform_setting(text, text) from public, anon;
grant execute on function public.admin_update_platform_setting(text, text) to authenticated;

-- Admin: update AI settings
create or replace function public.admin_update_ai_settings(
  p_generation_model text default null, p_embedding_model text default null,
  p_temperature numeric default null, p_max_tokens integer default null,
  p_retrieval_top_k integer default null, p_similarity_threshold numeric default null,
  p_rag_enabled boolean default null, p_maintenance_mode boolean default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_old jsonb;
begin
  if not public.is_admin() then raise exception 'Unauthorized: admin access required'; end if;
  select to_jsonb(s) into v_old from public.platform_ai_settings s limit 1;
  update public.platform_ai_settings set
    generation_model = coalesce(p_generation_model, generation_model),
    embedding_model = coalesce(p_embedding_model, embedding_model),
    temperature = coalesce(p_temperature, temperature),
    max_tokens = coalesce(p_max_tokens, max_tokens),
    retrieval_top_k = coalesce(p_retrieval_top_k, retrieval_top_k),
    similarity_threshold = coalesce(p_similarity_threshold, similarity_threshold),
    rag_enabled = coalesce(p_rag_enabled, rag_enabled),
    maintenance_mode = coalesce(p_maintenance_mode, maintenance_mode),
    updated_by = auth.uid(), updated_at = now();
  insert into public.admin_audit_logs (admin_id, action, entity_type, old_values, new_values)
  values (auth.uid(), 'update_ai_settings', 'platform_ai_settings', v_old,
    jsonb_build_object('generation_model', p_generation_model, 'embedding_model', p_embedding_model,
      'temperature', p_temperature, 'max_tokens', p_max_tokens, 'rag_enabled', p_rag_enabled));
end; $$;

revoke execute on function public.admin_update_ai_settings from public, anon;
grant execute on function public.admin_update_ai_settings to authenticated;

-- Atomic appointment booking (prevents double-booking via advisory lock + unique constraint)
create or replace function public.create_appointment_atomic(
  p_citizen_id uuid, p_lawyer_id uuid, p_appointment_date date,
  p_start_time time, p_end_time time, p_consultation_type text,
  p_legal_category text, p_subject text, p_description text, p_citizen_notes text,
  p_citizen_ip inet default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid := auth.uid();
  v_lawyer record; v_fees record; v_appointment_id uuid;
  v_agr_ver text; v_can_ver text; v_ref_ver text;
begin
  if v_caller_id != p_citizen_id then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.profiles where id = v_caller_id and role = 'citizen') then
    raise exception 'Only citizens can book appointments'; end if;

  -- Verify lawyer is VERIFIED and PUBLISHED
  select lp.consultation_fee, lp.consultation_duration, p.full_name into v_lawyer
  from public.lawyer_profiles lp join public.profiles p on p.id = lp.id
  where lp.id = p_lawyer_id and lp.is_published = true
    and lp.verification_status = 'verified' and p.is_active = true;
  if not found then raise exception 'Lawyer not found or not available for booking'; end if;

  if p_consultation_type not in ('in_person', 'video', 'phone') then
    raise exception 'Invalid consultation type'; end if;

  -- Calculate fees server-side
  select * into v_fees from public.calculate_appointment_fees(v_lawyer.consultation_fee);

  -- Advisory lock prevents race conditions
  perform pg_advisory_xact_lock(hashtext(p_lawyer_id::text || p_appointment_date::text || p_start_time::text));

  -- Insert (unique index handles double-booking)
  insert into public.appointments (
    citizen_id, lawyer_id, appointment_date, start_time, end_time,
    consultation_type, legal_category, subject, description, citizen_notes,
    consultation_fee, platform_fee, platform_fee_type, tax_amount,
    total_amount, lawyer_receivable, status, payment_status
  ) values (
    p_citizen_id, p_lawyer_id, p_appointment_date, p_start_time, p_end_time,
    p_consultation_type, p_legal_category, p_subject, p_description, p_citizen_notes,
    v_fees.consultation_fee, v_fees.platform_fee, v_fees.platform_fee_type,
    v_fees.tax_amount, v_fees.total_amount, v_fees.lawyer_receivable,
    'pending', 'unpaid'
  ) returning id into v_appointment_id;

  -- Read policy versions
  select value into v_agr_ver from public.platform_settings where key = 'consultation_agreement_version';
  select value into v_can_ver from public.platform_settings where key = 'cancellation_policy_version';
  select value into v_ref_ver from public.platform_settings where key = 'refund_policy_version';

  -- Create immutable fee snapshot + agreement record
  insert into public.appointment_agreements (
    appointment_id, agreement_version, cancellation_policy_version, refund_policy_version,
    consultation_fee, platform_fee, platform_fee_type, tax_amount, total_amount, lawyer_receivable,
    citizen_accepted_at, citizen_ip_address
  ) values (
    v_appointment_id, coalesce(v_agr_ver,'1.0'), coalesce(v_can_ver,'1.0'), coalesce(v_ref_ver,'1.0'),
    v_fees.consultation_fee, v_fees.platform_fee, v_fees.platform_fee_type,
    v_fees.tax_amount, v_fees.total_amount, v_fees.lawyer_receivable, now(), p_citizen_ip
  );

  -- Notify citizen
  insert into public.notifications (user_id, type, title, message, metadata) values
  (p_citizen_id, 'appointment_booked', 'Consultation Booking Submitted',
    'Your consultation request has been submitted and is awaiting advocate confirmation.',
    jsonb_build_object('appointment_id', v_appointment_id, 'lawyer_id', p_lawyer_id));

  -- Notify lawyer
  insert into public.notifications (user_id, type, title, message, metadata) values
  (p_lawyer_id, 'appointment_request', 'New Consultation Request',
    format('A citizen has requested a %s consultation on %s at %s.',
      replace(p_consultation_type, '_', ' '), p_appointment_date, p_start_time),
    jsonb_build_object('appointment_id', v_appointment_id, 'citizen_id', p_citizen_id));

  return jsonb_build_object('success', true, 'appointment_id', v_appointment_id,
    'consultation_fee', v_fees.consultation_fee, 'platform_fee', v_fees.platform_fee,
    'tax_amount', v_fees.tax_amount, 'total_amount', v_fees.total_amount);

exception when unique_violation then
  raise exception 'This time slot is no longer available. Please select another slot.';
end; $$;

revoke execute on function public.create_appointment_atomic from public, anon;
grant execute on function public.create_appointment_atomic to authenticated;

-- ----------------------------------------------------------------------------
-- 20. STORAGE BUCKETS
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('verifications', 'verifications', false),
  ('documents', 'documents', false),
  ('legal-documents', 'legal-documents', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 21. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.lawyer_profiles enable row level security;
alter table public.lawyer_verifications enable row level security;
alter table public.lawyer_availability enable row level security;
alter table public.lawyer_time_off enable row level security;
alter table public.platform_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_agreements enable row level security;
alter table public.reviews enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.citizen_documents enable row level security;
alter table public.legal_resources enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.platform_ai_settings enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_chunks enable row level security;
alter table public.filer_datasets enable row level security;
alter table public.filer_records enable row level security;
alter table public.openrouter_model_registry enable row level security;
alter table public.ai_routing_config enable row level security;
alter table public.ai_recommendation_settings enable row level security;
alter table public.ai_recommendation_events enable row level security;

-- PROFILES
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
  for select using (auth.uid() = id or role = 'lawyer' or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- LAWYER PROFILES — citizens ONLY see verified+published
drop policy if exists "lawyer_profiles_select" on public.lawyer_profiles;
create policy "lawyer_profiles_select" on public.lawyer_profiles
  for select using (
    (is_published = true and verification_status = 'verified')
    or id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "lawyer_profiles_insert" on public.lawyer_profiles;
create policy "lawyer_profiles_insert" on public.lawyer_profiles
  for insert with check (id = auth.uid());

drop policy if exists "lawyer_profiles_update" on public.lawyer_profiles;
create policy "lawyer_profiles_update" on public.lawyer_profiles
  for update using (id = auth.uid() or public.is_admin());

-- LAWYER VERIFICATIONS
drop policy if exists "lawyer_verifications_select" on public.lawyer_verifications;
create policy "lawyer_verifications_select" on public.lawyer_verifications
  for select using (lawyer_id = auth.uid() or public.is_admin());

drop policy if exists "lawyer_verifications_insert" on public.lawyer_verifications;
create policy "lawyer_verifications_insert" on public.lawyer_verifications
  for insert with check (lawyer_id = auth.uid());

drop policy if exists "lawyer_verifications_update" on public.lawyer_verifications;
create policy "lawyer_verifications_update" on public.lawyer_verifications
  for update using (lawyer_id = auth.uid() or public.is_admin());

-- LAWYER AVAILABILITY
drop policy if exists "availability_select_all" on public.lawyer_availability;
create policy "availability_select_all" on public.lawyer_availability for select using (true);
drop policy if exists "availability_manage_own" on public.lawyer_availability;
create policy "availability_manage_own" on public.lawyer_availability for all using (lawyer_id = auth.uid());

-- LAWYER TIME OFF
drop policy if exists "time_off_select_all" on public.lawyer_time_off;
create policy "time_off_select_all" on public.lawyer_time_off for select using (true);
drop policy if exists "time_off_manage_own" on public.lawyer_time_off;
create policy "time_off_manage_own" on public.lawyer_time_off for all using (lawyer_id = auth.uid());

-- PLATFORM SETTINGS (readable by all, writable by admin)
drop policy if exists "platform_settings_read" on public.platform_settings;
create policy "platform_settings_read" on public.platform_settings for select using (true);
drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write" on public.platform_settings
  for all using (public.is_admin());

-- APPOINTMENTS
drop policy if exists "appointments_select_parties" on public.appointments;
create policy "appointments_select_parties" on public.appointments
  for select using (citizen_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());
drop policy if exists "appointments_insert_citizen" on public.appointments;
create policy "appointments_insert_citizen" on public.appointments
  for insert with check (citizen_id = auth.uid());
drop policy if exists "appointments_update_parties" on public.appointments;
create policy "appointments_update_parties" on public.appointments
  for update using (citizen_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

-- APPOINTMENT AGREEMENTS
drop policy if exists "appointment_agreements_select" on public.appointment_agreements;
create policy "appointment_agreements_select" on public.appointment_agreements
  for select using (
    exists (select 1 from public.appointments a where a.id = appointment_id
      and (a.citizen_id = auth.uid() or a.lawyer_id = auth.uid()))
    or public.is_admin()
  );
drop policy if exists "appointment_agreements_insert" on public.appointment_agreements;
create policy "appointment_agreements_insert" on public.appointment_agreements
  for insert with check (true);

-- REVIEWS
drop policy if exists "reviews_select_visible" on public.reviews;
create policy "reviews_select_visible" on public.reviews
  for select using (is_visible = true or public.is_admin() or citizen_id = auth.uid());
drop policy if exists "reviews_insert_citizen" on public.reviews;
create policy "reviews_insert_citizen" on public.reviews
  for insert with check (
    citizen_id = auth.uid() and
    exists (select 1 from public.appointments a where a.id = appointment_id
      and a.citizen_id = auth.uid() and a.status = 'completed')
  );
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update using (citizen_id = auth.uid() or public.is_admin());

-- PAYMENTS
drop policy if exists "payments_select_parties" on public.payments;
create policy "payments_select_parties" on public.payments
  for select using (citizen_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());
drop policy if exists "payments_insert_parties" on public.payments;
create policy "payments_insert_parties" on public.payments
  for insert with check (citizen_id = auth.uid() or public.is_admin());

-- NOTIFICATIONS
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());
drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_system" on public.notifications for insert with check (true);

-- CITIZEN DOCUMENTS
drop policy if exists "citizen_documents_own" on public.citizen_documents;
create policy "citizen_documents_own" on public.citizen_documents
  for all using (citizen_id = auth.uid() or public.is_admin());

-- LEGAL RESOURCES
drop policy if exists "legal_resources_read_all" on public.legal_resources;
create policy "legal_resources_read_all" on public.legal_resources for select using (true);

-- AI SETTINGS
drop policy if exists "ai_settings_read_authenticated" on public.platform_ai_settings;
create policy "ai_settings_read_authenticated" on public.platform_ai_settings
  for select using (auth.role() = 'authenticated');
drop policy if exists "ai_settings_admin_write" on public.platform_ai_settings;
create policy "ai_settings_admin_write" on public.platform_ai_settings
  for all using (public.is_admin());

-- OPENROUTER MODEL REGISTRY
drop policy if exists "Model registry read by authenticated users" on public.openrouter_model_registry;
create policy "Model registry read by authenticated users"
  on public.openrouter_model_registry for select
  to authenticated
  using (true);

drop policy if exists "Model registry write by admin only" on public.openrouter_model_registry;
create policy "Model registry write by admin only"
  on public.openrouter_model_registry for all
  to authenticated
  using (public.is_admin());

-- AI ROUTING CONFIG
drop policy if exists "AI routing config read by authenticated users" on public.ai_routing_config;
create policy "AI routing config read by authenticated users"
  on public.ai_routing_config for select
  to authenticated
  using (true);

drop policy if exists "AI routing config write by admin only" on public.ai_routing_config;
create policy "AI routing config write by admin only"
  on public.ai_routing_config for all
  to authenticated
  using (public.is_admin());

-- AI RECOMMENDATION SETTINGS
drop policy if exists "Recommendation settings read by authenticated" on public.ai_recommendation_settings;
create policy "Recommendation settings read by authenticated"
  on public.ai_recommendation_settings for select
  to authenticated
  using (true);

drop policy if exists "Recommendation settings write by admin only" on public.ai_recommendation_settings;
create policy "Recommendation settings write by admin only"
  on public.ai_recommendation_settings for all
  to authenticated
  using (public.is_admin());

-- AI RECOMMENDATION EVENTS
drop policy if exists "Recommendation events insert by authenticated" on public.ai_recommendation_events;
create policy "Recommendation events insert by authenticated"
  on public.ai_recommendation_events for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Recommendation events read by admin" on public.ai_recommendation_events;
create policy "Recommendation events read by admin"
  on public.ai_recommendation_events for select
  to authenticated
  using (public.is_admin());

-- AUDIT LOGS
drop policy if exists "audit_logs_admin_only" on public.admin_audit_logs;
create policy "audit_logs_admin_only" on public.admin_audit_logs
  for all using (public.is_admin());

-- CONVERSATIONS & MESSAGES
create or replace function public.conversation_belongs_to_user(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c where c.id = p_conversation_id and c.user_id = auth.uid());
$$;

drop policy if exists "conversations_own" on public.conversations;
create policy "conversations_own" on public.conversations for all using (user_id = auth.uid());
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (public.conversation_belongs_to_user(conversation_id));
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (public.conversation_belongs_to_user(conversation_id));

-- STORAGE POLICIES
drop policy if exists "avatars_public_select" on storage.objects;
create policy "avatars_public_select" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars_auth_upload" on storage.objects;
create policy "avatars_auth_upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
drop policy if exists "verifications_private_access" on storage.objects;
create policy "verifications_private_access" on storage.objects
  for all using (bucket_id = 'verifications' and auth.role() = 'authenticated');

-- LEGAL DOCUMENTS STORAGE
drop policy if exists "legal_documents_admin_storage" on storage.objects;
create policy "legal_documents_admin_storage" on storage.objects
  for all using (bucket_id = 'legal-documents' and public.is_admin());

drop policy if exists "legal_documents_read_storage" on storage.objects;
create policy "legal_documents_read_storage" on storage.objects
  for select using (bucket_id = 'legal-documents' and auth.role() = 'authenticated');

-- LEGAL DOCUMENTS & CHUNKS POLICIES
drop policy if exists "legal_documents_admin_all" on public.legal_documents;
create policy "legal_documents_admin_all" on public.legal_documents
  for all using (public.is_admin());

drop policy if exists "legal_documents_public_select_verified" on public.legal_documents;
create policy "legal_documents_public_select_verified" on public.legal_documents
  for select using (
    (verification_status = 'verified' and is_active = true and is_repealed = false)
    or public.is_admin()
  );

drop policy if exists "legal_chunks_admin_all" on public.legal_chunks;
create policy "legal_chunks_admin_all" on public.legal_chunks
  for all using (public.is_admin());

drop policy if exists "legal_chunks_select_verified_docs" on public.legal_chunks;
create policy "legal_chunks_select_verified_docs" on public.legal_chunks
  for select using (
    exists (
      select 1 from public.legal_documents d
      where d.id = legal_chunks.document_id
        and d.verification_status = 'verified'
        and d.is_active = true
        and d.is_repealed = false
    )
    or public.is_admin()
  );

-- FILER DATASETS & RECORDS POLICIES
drop policy if exists "filer_datasets_admin_all" on public.filer_datasets;
create policy "filer_datasets_admin_all" on public.filer_datasets
  for all using (public.is_admin());

drop policy if exists "filer_datasets_active_select" on public.filer_datasets;
create policy "filer_datasets_active_select" on public.filer_datasets
  for select using (status = 'active' or public.is_admin());

drop policy if exists "filer_records_admin_all" on public.filer_records;
create policy "filer_records_admin_all" on public.filer_records
  for all using (public.is_admin());

-- GRANTS
grant select, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select, insert, update on public.lawyer_profiles to authenticated;
grant select on public.lawyer_profiles to anon;
grant select, insert, update on public.lawyer_verifications to authenticated;
grant select, insert, update, delete on public.lawyer_availability to authenticated;
grant select on public.lawyer_availability to anon;
grant select, insert, update, delete on public.lawyer_time_off to authenticated;
grant select on public.lawyer_time_off to anon;
grant select, insert, update, delete on public.lawyer_time_off to authenticated;
grant select on public.platform_settings to anon, authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select, insert on public.appointment_agreements to authenticated;
grant select, insert, update on public.reviews to authenticated;
grant select on public.reviews to anon;
grant select, insert, update on public.payments to authenticated;
grant select, insert, update on public.notifications to authenticated;
grant select, insert, update, delete on public.citizen_documents to authenticated;
grant select on public.legal_resources to anon, authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.platform_ai_settings to authenticated;
grant select on public.admin_audit_logs to authenticated;
grant select on public.legal_documents to anon, authenticated;
grant insert, update, delete on public.legal_documents to authenticated;
grant select on public.legal_chunks to anon, authenticated;
grant insert, update, delete on public.legal_chunks to authenticated;
grant select on public.filer_datasets to anon, authenticated;
grant insert, update, delete on public.filer_datasets to authenticated;
grant select, insert, update, delete on public.filer_records to authenticated;
grant execute on function public.lookup_active_filer_status(text) to anon, authenticated;
grant execute on function public.match_legal_chunks(vector, int, float, text, text, text, uuid) to anon, authenticated;
grant select on public.openrouter_model_registry to anon, authenticated;
grant insert, update, delete on public.openrouter_model_registry to authenticated;
grant select on public.ai_routing_config to anon, authenticated;
grant insert, update, delete on public.ai_routing_config to authenticated;
grant select on public.ai_recommendation_settings to anon, authenticated;
grant insert, update, delete on public.ai_recommendation_settings to authenticated;
grant select, insert on public.ai_recommendation_events to authenticated;

-- ----------------------------------------------------------------------------
-- 22. SEED LEGAL RESOURCES
-- ----------------------------------------------------------------------------
insert into public.legal_resources (id, slug, title, category, reading_time, summary, content, jurisdiction, updated_date)
values
(
  'know-your-rights-detention', 'know-your-rights-detention',
  'Know Your Rights: Police Detention & Arrest in Pakistan', 'Know Your Rights', '6 min read',
  'What police can and cannot do under the Code of Criminal Procedure (CrPC), what to say, and how to exercise your constitutional right to counsel.',
  '## Constitutional Guarantees Under Article 10
Under Article 10 of the Constitution of the Islamic Republic of Pakistan (1973), no person who is arrested shall be detained in custody without being informed, as soon as may be, of the grounds for such arrest, nor shall he be denied the right to consult and be defended by a legal practitioner of his choice.

### 24-Hour Production Before a Magistrate
Section 61 of the Code of Criminal Procedure (CrPC) explicitly prohibits police officers from detaining any arrested person without a warrant for a longer period than under all circumstances of the case is reasonable, and such period shall not, in the absence of a special order of a Magistrate under Section 167, exceed twenty-four hours exclusive of the time necessary for the journey from the place of arrest to the Magistrate''s Court.

### What To Do If Detained
1. **Remain calm and ask for grounds of arrest**: You have the legal right to know why you are being detained.
2. **Request to contact your family or lawyer**: Inform officers immediately of your request for counsel.
3. **Do not sign blank papers**: Never sign or thumbprint any blank or written confession under coercion.',
  'Federal (CrPC & Constitution)', '2026'
),
(
  'understand-an-employment-contract', 'understand-an-employment-contract',
  'How to Read an Employment Contract in Pakistan', 'Guides', '8 min read',
  'A plain-language walkthrough of employment contracts under Pakistani labour law: notice periods, probation, severance, and non-compete enforceability.',
  '## Key Provisions in Pakistani Employment Agreements
Under the Industrial and Commercial Employment (Standing Orders) Ordinance, 1968:

### Probation and Confirmation
- Standard probationary periods generally range from 1 to 3 months.
- A workman who successfully completes probation cannot be dismissed arbitrarily without written notice.

### Termination and Notice Periods
- Permanent employees are entitled to one month''s written notice or wages in lieu of notice.

### Non-Compete Clauses
Under Section 27 of the Contract Act, 1872, post-employment non-compete clauses are widely held unenforceable.',
  'Provincial & Federal Labour Enactments', '2026'
),
(
  'tenancy-agreement-checklist', 'tenancy-agreement-checklist',
  'Tenancy Agreement Checklist & Tenant Rights', 'Templates', '5 min read',
  'Crucial clauses to verify under the Sindh Rented Premises Ordinance / Punjab Rented Premises Act before signing a lease.',
  '## Mandatory Elements of a Valid Tenancy Agreement

### Key Checklist Items
1. **Clear Identification of Premises**: Address, floor, fixtures, and utility meters.
2. **Tenure and Expiry Date**: Explicit start and end date.
3. **Rent Amount and Mode of Payment**: Bank transfer or written stamped receipt.
4. **Security Deposit / Advance**: The amount must be clearly recorded.
5. **Subletting Prohibitions**: Without explicit written consent, subletting is ground for eviction.',
  'Provincial Rent Laws', '2026'
),
(
  'consumer-complaint-process', 'consumer-complaint-process',
  'The Consumer Complaint Process in Pakistan', 'Guides', '7 min read',
  'How provincial consumer courts function, legal notices required before filing, and how to claim damages.',
  '## Consumer Rights Protection
Under provincial legislation (e.g. Sindh Consumer Protection Act 2014, Punjab Consumer Protection Act 2005):

### Step 1: Legal Notice
Before approaching the Consumer Court, a consumer must serve a 15-day written notice specifying the defect.

### Step 2: Filing Before the Consumer Court
If the vendor fails to redress within 15 days, a petition can be filed before the District Consumer Court.',
  'Provincial Consumer Protection Laws', '2026'
),
(
  'bail-understanding-process', 'bail-understanding-process',
  'Understanding Bail: Pre-Arrest and Post-Arrest in Pakistan', 'Know Your Rights', '7 min read',
  'The difference between protective bail, pre-arrest bail (Section 498 CrPC), and regular bail (Section 497 CrPC).',
  '## Categories of Bail under Pakistani Law

### 1. Pre-Arrest Bail (Section 498 CrPC)
Sought when a citizen has genuine apprehension of arrest. The applicant must show tangible risk of imminent arrest.

### 2. Post-Arrest Bail (Section 497 CrPC)
- **Bailable Offenses**: Bail is a matter of statutory right.
- **Non-Bailable Offenses**: Bail is discretionary.',
  'Code of Criminal Procedure (CrPC 1898)', '2026'
),
(
  'family-law-basics', 'family-law-basics',
  'Family Law Basics: Khula, Talaq, Maintenance & Custody', 'Guides', '9 min read',
  'Procedural guide covering the Dissolution of Muslim Marriages Act 1939, Family Courts Act 1964, and Guardian and Wards Act 1890.',
  '## Key Rights in Family Matters

### Dissolution of Marriage (Khula)
A Muslim wife can seek dissolution through Khula if she cannot live with her husband within the limits ordained by Allah.

### Child Maintenance (Nafaqah)
The father has an absolute, non-waivable legal duty to provide financial maintenance for his minor children.

### Custody (Hizanat) vs Guardianship (Wilayat)
Under the Guardian and Wards Act 1890, the paramount consideration is always the **welfare of the minor**.',
  'Muslim Family Laws Ordinance 1961 & Family Courts Act 1964', '2026'
)
on conflict (id) do update set
  title = excluded.title, summary = excluded.summary, content = excluded.content,
  category = excluded.category, reading_time = excluded.reading_time, updated_date = excluded.updated_date;

-- ----------------------------------------------------------------------------
-- 13. SEED DEFAULT PLATFORM ADMINISTRATOR ACCOUNT
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- Ensure is_active column exists on profiles
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Temporarily drop trigger to allow admin role seeding if profile exists
drop trigger if exists profiles_prevent_role_change on public.profiles;

do $$
declare
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_admin_email text := 'admin@legalease.pk';
  v_admin_password text := 'Admin@123456';
begin
  -- 1. Create or update auth.users record
  if not exists (select 1 from auth.users where email = v_admin_email) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      extensions.crypt(v_admin_password, extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Platform Administrator","role":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    select id into v_admin_id from auth.users where email = v_admin_email;
    update auth.users
    set
      encrypted_password = extensions.crypt(v_admin_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Platform Administrator","role":"admin"}'::jsonb,
      updated_at = now()
    where id = v_admin_id;
  end if;

  -- 2. Insert or update public.profiles record
  insert into public.profiles (
    id,
    role,
    full_name,
    email,
    created_at,
    updated_at
  )
  values (
    v_admin_id,
    'admin',
    'Platform Administrator',
    v_admin_email,
    now(),
    now()
  )
  on conflict (id) do update set
    role = 'admin',
    full_name = 'Platform Administrator',
    email = v_admin_email,
    updated_at = now();
end $$;

-- Re-enable role change prevention trigger
drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change before update on public.profiles
  for each row execute function public.prevent_profile_role_change();


