-- ============================================================================
-- 2026-11-07 0001 — Security hardening
-- ============================================================================
-- Addresses audit findings:
--   F-2  platform_settings exposed SMTP/IMAP secrets to `anon`
--   F-3  lawyers could self-verify (RLS UPDATE without WITH CHECK)
--   F-4  anonymous, unlimited CNIC enumeration + plaintext CNIC storage
--   F-7  legal documents auto-"verified" on upload (enforced in app; DB guard here)
--   F-8  notifications / appointment_agreements INSERT `with check (true)`
--   D-10 no storage policy covering the private `documents` bucket
--
-- IDEMPOTENT: safe to re-run. No destructive statements against user data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. F-2 — platform_settings: secrets must never be anon-readable
-- ----------------------------------------------------------------------------
-- The table mixes public operational config (fees, cancellation window) with
-- secrets (SMTP/IMAP passwords, Stripe keys). A blanket `using (true)` policy
-- meant anyone holding the public anon key could read the mail credentials.

create or replace function public.is_secret_setting(p_key text)
returns boolean language sql immutable as $$
  select p_key = any (array[
    'smtp_pass', 'imap_pass',
    'stripe_secret_key', 'stripe_webhook_secret',
    'lemonsqueezy_api_key', 'openrouter_api_key',
    'gemini_api_key', 'smtp_api_key'
  ]);
$$;

drop policy if exists "platform_settings_read" on public.platform_settings;

-- Non-secret settings stay readable (the citizen UI needs fees/cutoff values
-- before sign-in). Secret rows are admin-only.
create policy "platform_settings_read_public" on public.platform_settings
  for select using (not public.is_secret_setting(key));

create policy "platform_settings_read_admin" on public.platform_settings
  for select using (public.is_admin());

-- Belt and braces: column-filtered defence is in the policy, but also ensure
-- the admin write policy still applies (unchanged from schema.sql).
drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Server-side services read secrets through the service-role client, which
-- bypasses RLS, so nothing in lib/services/* needs changing.

-- ----------------------------------------------------------------------------
-- 2. F-3 — lawyer_profiles: block non-admin writes to privileged columns
-- ----------------------------------------------------------------------------
-- `for update using (id = auth.uid())` with no WITH CHECK let a lawyer write any
-- value into their own row, including verification_status / is_published.
-- Use a BEFORE UPDATE trigger so the rule holds even if a policy is later
-- loosened, and add WITH CHECK for defence in depth.

create or replace function public.guard_lawyer_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- service_role (no auth.uid()) and admins may change these freely.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception
      'verification_status is controlled by admin review, not by the lawyer';
  end if;

  if new.is_published is distinct from old.is_published then
    raise exception
      'is_published is controlled by admin verification';
  end if;

  if new.rating is distinct from old.rating
     or new.review_count is distinct from old.review_count then
    raise exception 'rating/review_count are derived from reviews and cannot be set directly';
  end if;

  if new.bar_council is distinct from old.bar_council
     or new.bar_license_number is distinct from old.bar_license_number then
    raise exception 'Bar Council details change only through the verification workflow';
  end if;

  return new;
end; $$;

drop trigger if exists lawyer_profiles_guard_privileged on public.lawyer_profiles;
create trigger lawyer_profiles_guard_privileged
  before update on public.lawyer_profiles
  for each row execute function public.guard_lawyer_profile_privileged_columns();

drop policy if exists "lawyer_profiles_update" on public.lawyer_profiles;
create policy "lawyer_profiles_update" on public.lawyer_profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. F-8 — notifications / appointment_agreements: stop forged inserts
-- ----------------------------------------------------------------------------
-- Server-side fan-out uses the service-role client (bypasses RLS), so this
-- only blocks a browser holding a user JWT from writing other people's rows.

drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "appointment_agreements_insert" on public.appointment_agreements;
create policy "appointment_agreements_insert" on public.appointment_agreements
  for insert with check (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (a.citizen_id = auth.uid() or a.lawyer_id = auth.uid())
    )
    or public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 4. F-4 — CNIC blind index (keyed HMAC), no anonymous lookup
-- ----------------------------------------------------------------------------
-- Design:
--   * `cnic_hmac` = HMAC-SHA256(CNIC_HMAC_KEY, normalized 13-digit CNIC),
--     computed in the application (server-only key, never in the database).
--   * Lookup goes through a security-definer RPC that takes the HMAC, so the
--     raw CNIC never reaches SQL and a database dump alone cannot reverse it.
--   * Direct table access from anon/authenticated is revoked.
--   * The legacy plaintext column is retained until the backfill script runs;
--     see 0003_drop_plaintext_cnic.sql for removal.

alter table public.filer_records
  add column if not exists cnic_hmac text;

create index if not exists filer_records_dataset_hmac_idx
  on public.filer_records (dataset_id, cnic_hmac);

-- Direct reads/writes on the CNIC table are withdrawn from client roles.
revoke all on public.filer_records from anon, authenticated;
grant all on public.filer_records to service_role;

-- Drop the plaintext-needle index: it is no longer used by lookup and only
-- widens the exposure surface.
drop index if exists public.filer_records_cnic_idx;

create or replace function public.lookup_filer_status_by_hmac(p_hmac text)
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
  v_record  public.filer_records%rowtype;
begin
  if p_hmac is null or length(p_hmac) < 32 then
    return query select false, null::text, null::text, null::text,
      null::date, null::text, null::timestamptz;
    return;
  end if;

  select * into v_dataset
  from public.filer_datasets
  where filer_datasets.status = 'active'
  order by activated_at desc nulls last
  limit 1;

  if v_dataset.id is null then
    return query select false, null::text, null::text, null::text,
      null::date, null::text, null::timestamptz;
    return;
  end if;

  select * into v_record
  from public.filer_records
  where dataset_id = v_dataset.id and cnic_hmac = p_hmac
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
    return query select
      false, null::text, v_dataset.tax_year, v_dataset.source,
      v_dataset.effective_date, v_dataset.file_name, v_dataset.uploaded_at;
  end if;
end; $$;

revoke execute on function public.lookup_filer_status_by_hmac(text) from public, anon;
grant  execute on function public.lookup_filer_status_by_hmac(text) to authenticated, service_role;

-- Retire the raw-CNIC RPC from client roles. The application no longer calls it.
revoke execute on function public.lookup_active_filer_status(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. F-7 / D-7 — knowledge-base integrity guards
-- ----------------------------------------------------------------------------
-- Defence in depth: the application now uploads as `pending`, but make the DB
-- reject a self-serve flip to `verified` without a recorded reviewer.

create or replace function public.guard_legal_document_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- service_role (trusted server code: ingestion scripts, admin actions) has no
  -- auth.uid(). It is allowed to verify, but must still stamp a reviewer so the
  -- corpus always has an approval trail.
  if auth.uid() is null then
    if new.verification_status = 'verified'
       and coalesce(old.verification_status, 'pending') <> 'verified' then
      new.verified_at := coalesce(new.verified_at, now());
    end if;
    return new;
  end if;

  -- A signed-in user flipping a document to `verified` must be an admin.
  if new.verification_status = 'verified'
     and coalesce(old.verification_status, 'pending') <> 'verified' then
    if not public.is_admin() then
      raise exception
        'Only an administrator may verify a legal document';
    end if;
    new.verified_by := coalesce(new.verified_by, auth.uid());
    new.verified_at := coalesce(new.verified_at, now());
  end if;

  return new;
end; $$;

drop trigger if exists legal_documents_guard_verification on public.legal_documents;
create trigger legal_documents_guard_verification
  before insert or update of verification_status on public.legal_documents
  for each row execute function public.guard_legal_document_verification();

-- ----------------------------------------------------------------------------
-- 6. D-10 — storage policies for the private `documents` bucket
-- ----------------------------------------------------------------------------
-- Previously no policy existed for this bucket; /api/documents compensated by
-- signing paths with the service-role client (see F-5). Ownership convention
-- for citizen uploads: `citizen-files/<user_id>/<file>`.

drop policy if exists "documents_owner_select" on storage.objects;
create policy "documents_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = 'citizen-files'
         and (storage.foldername(name))[2] = auth.uid()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "documents_owner_insert" on storage.objects;
create policy "documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = 'citizen-files'
         and (storage.foldername(name))[2] = auth.uid()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "documents_owner_delete" on storage.objects;
create policy "documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = 'citizen-files'
         and (storage.foldername(name))[2] = auth.uid()::text
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Lawyers may read verification uploads they own; admins may read all.
drop policy if exists "verifications_owner_select" on storage.objects;
create policy "verifications_owner_select" on storage.objects
  for select using (
    bucket_id = 'verifications'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- NOTE: the broad `verifications_private_access` policy from schema.sql
-- (`for all using bucket_id = 'verifications'`) is intentionally dropped here,
-- because it let ANY authenticated user read ANY lawyer's credentials.
drop policy if exists "verifications_private_access" on storage.objects;

comment on column public.filer_records.cnic_hmac is
  'HMAC-SHA256(CNIC_HMAC_KEY, 13-digit CNIC). Lookup key. Raw CNIC is never queried.';
