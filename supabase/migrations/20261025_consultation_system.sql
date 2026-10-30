-- Migration: 20261025_consultation_system.sql
-- Video and Physical Consultation System Enhancements

-- 1. Extend appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS settlement_reference TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS early_completion_reason TEXT;

-- Update constraints safely
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_payment_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_status_check 
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'waived'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_settlement_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_settlement_status_check 
  CHECK (settlement_status IN ('pending', 'eligible', 'transferred', 'failed', 'waived'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_duration_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_duration_check 
  CHECK (duration_minutes BETWEEN 60 AND 180);

-- 2. Make comment optional in reviews table (1-5 star rating is mandatory, written comment optional)
ALTER TABLE public.reviews ALTER COLUMN comment DROP NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN comment SET DEFAULT '';

-- 3. Create consultation_sessions table for server-authoritative timers
CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments (id) ON DELETE CASCADE,
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_ended_at TIMESTAMPTZ,
  booked_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (booked_duration_minutes BETWEEN 60 AND 180),
  actual_duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_sessions_appt_idx ON public.consultation_sessions (appointment_id);

-- 4. Create consultation_join_events table for presence tracking
CREATE TABLE IF NOT EXISTS public.consultation_join_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'lawyer')),
  event_type TEXT NOT NULL CHECK (event_type IN ('joined', 'left', 'heartbeat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_events_appt_idx ON public.consultation_join_events (appointment_id, created_at DESC);

-- 5. Row Level Security
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_join_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultation_sessions_select" ON public.consultation_sessions;
CREATE POLICY "consultation_sessions_select" ON public.consultation_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = consultation_sessions.appointment_id
        AND (a.citizen_id = auth.uid() OR a.lawyer_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "consultation_sessions_insert" ON public.consultation_sessions;
CREATE POLICY "consultation_sessions_insert" ON public.consultation_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = consultation_sessions.appointment_id
        AND (a.citizen_id = auth.uid() OR a.lawyer_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "consultation_sessions_update" ON public.consultation_sessions;
CREATE POLICY "consultation_sessions_update" ON public.consultation_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = consultation_sessions.appointment_id
        AND (a.citizen_id = auth.uid() OR a.lawyer_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "consultation_join_events_select" ON public.consultation_join_events;
CREATE POLICY "consultation_join_events_select" ON public.consultation_join_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = consultation_join_events.appointment_id
        AND (a.citizen_id = auth.uid() OR a.lawyer_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "consultation_join_events_insert" ON public.consultation_join_events;
CREATE POLICY "consultation_join_events_insert" ON public.consultation_join_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = consultation_join_events.appointment_id
        AND (a.citizen_id = auth.uid() OR a.lawyer_id = auth.uid())
    )
    OR public.is_admin()
  );

GRANT ALL ON public.consultation_sessions TO authenticated;
GRANT ALL ON public.consultation_join_events TO authenticated;

-- 6. Updated create_appointment_atomic with duration & physical vs video fee handling
CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_citizen_id uuid, p_lawyer_id uuid, p_appointment_date date,
  p_start_time time, p_end_time time, p_consultation_type text,
  p_legal_category text, p_subject text, p_description text, p_citizen_notes text,
  p_citizen_ip inet default null,
  p_duration_minutes integer default 60
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_lawyer record;
  v_fees record;
  v_appointment_id uuid;
  v_agr_ver text; v_can_ver text; v_ref_ver text;
  v_consultation_fee numeric(10,2) := 0;
  v_platform_fee numeric(10,2) := 0;
  v_platform_fee_type text := 'percentage';
  v_tax_amount numeric(10,2) := 0;
  v_total_amount numeric(10,2) := 0;
  v_lawyer_receivable numeric(10,2) := 0;
  v_payment_status text := 'unpaid';
  v_settlement_status text := 'pending';
BEGIN
  IF v_caller_id != p_citizen_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'citizen') THEN
    RAISE EXCEPTION 'Only citizens can book appointments'; END IF;

  -- Verify lawyer is VERIFIED and PUBLISHED
  SELECT lp.consultation_fee, lp.consultation_duration, p.full_name INTO v_lawyer
  FROM public.lawyer_profiles lp JOIN public.profiles p ON p.id = lp.id
  WHERE lp.id = p_lawyer_id AND lp.is_published = true
    AND lp.verification_status = 'verified' AND p.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lawyer not found or not available for booking'; END IF;

  IF p_consultation_type NOT IN ('in_person', 'video', 'phone') THEN
    RAISE EXCEPTION 'Invalid consultation type'; END IF;

  -- Validate duration between 60 and 180 minutes
  IF p_duration_minutes IS NULL OR p_duration_minutes < 60 OR p_duration_minutes > 180 THEN
    RAISE EXCEPTION 'Consultation duration must be between 60 and 180 minutes'; END IF;

  -- Calculate fees server-side:
  -- Physical consultations ('in_person') are FREE of booking charges and commission
  IF p_consultation_type = 'in_person' THEN
    v_consultation_fee := 0;
    v_platform_fee := 0;
    v_platform_fee_type := 'percentage';
    v_tax_amount := 0;
    v_total_amount := 0;
    v_lawyer_receivable := 0;
    v_payment_status := 'waived';
    v_settlement_status := 'waived';
  ELSE
    -- Video or phone consultation: calculate snapshot fees
    SELECT * INTO v_fees FROM public.calculate_appointment_fees(v_lawyer.consultation_fee);
    v_consultation_fee := v_fees.consultation_fee;
    v_platform_fee := v_fees.platform_fee;
    v_platform_fee_type := v_fees.platform_fee_type;
    v_tax_amount := v_fees.tax_amount;
    v_total_amount := v_fees.total_amount;
    v_lawyer_receivable := v_fees.lawyer_receivable;
    v_payment_status := 'unpaid';
    v_settlement_status := 'pending';
  END IF;

  -- Advisory lock prevents race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_lawyer_id::text || p_appointment_date::text || p_start_time::text));

  -- Insert appointment record
  INSERT INTO public.appointments (
    citizen_id, lawyer_id, appointment_date, start_time, end_time,
    consultation_type, legal_category, subject, description, citizen_notes,
    consultation_fee, platform_fee, platform_fee_type, tax_amount,
    total_amount, lawyer_receivable, status, payment_status,
    duration_minutes, settlement_status
  ) VALUES (
    p_citizen_id, p_lawyer_id, p_appointment_date, p_start_time, p_end_time,
    p_consultation_type, p_legal_category, p_subject, p_description, p_citizen_notes,
    v_consultation_fee, v_platform_fee, v_platform_fee_type, v_tax_amount,
    v_total_amount, v_lawyer_receivable, 'pending', v_payment_status,
    p_duration_minutes, v_settlement_status
  ) RETURNING id INTO v_appointment_id;

  -- Read policy versions
  SELECT value INTO v_agr_ver FROM public.platform_settings WHERE key = 'consultation_agreement_version';
  SELECT value INTO v_can_ver FROM public.platform_settings WHERE key = 'cancellation_policy_version';
  SELECT value INTO v_ref_ver FROM public.platform_settings WHERE key = 'refund_policy_version';

  -- Create immutable fee snapshot + agreement record
  INSERT INTO public.appointment_agreements (
    appointment_id, agreement_version, cancellation_policy_version, refund_policy_version,
    consultation_fee, platform_fee, platform_fee_type, tax_amount, total_amount, lawyer_receivable,
    citizen_accepted_at, citizen_ip_address
  ) VALUES (
    v_appointment_id, coalesce(v_agr_ver,'1.0'), coalesce(v_can_ver,'1.0'), coalesce(v_ref_ver,'1.0'),
    v_consultation_fee, v_platform_fee, v_platform_fee_type,
    v_tax_amount, v_total_amount, v_lawyer_receivable, now(), p_citizen_ip
  );

  -- Notify citizen
  INSERT INTO public.notifications (user_id, type, title, message, metadata) VALUES
  (p_citizen_id, 'appointment_booked', 'Consultation Booking Submitted',
    'Your consultation request has been submitted and is awaiting advocate confirmation.',
    jsonb_build_object('appointment_id', v_appointment_id, 'lawyer_id', p_lawyer_id));

  -- Notify lawyer
  INSERT INTO public.notifications (user_id, type, title, message, metadata) VALUES
  (p_lawyer_id, 'appointment_request', 'New Consultation Request',
    format('A citizen has requested a %s consultation (%s mins) on %s at %s.',
      replace(p_consultation_type, '_', ' '), p_duration_minutes, p_appointment_date, p_start_time),
    jsonb_build_object('appointment_id', v_appointment_id, 'citizen_id', p_citizen_id));

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appointment_id,
    'consultation_fee', v_consultation_fee, 'platform_fee', v_platform_fee,
    'tax_amount', v_tax_amount, 'total_amount', v_total_amount,
    'duration_minutes', p_duration_minutes, 'payment_status', v_payment_status);

EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This time slot is no longer available. Please select another slot.';
END; $$;

REVOKE EXECUTE ON FUNCTION public.create_appointment_atomic FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic TO authenticated;
