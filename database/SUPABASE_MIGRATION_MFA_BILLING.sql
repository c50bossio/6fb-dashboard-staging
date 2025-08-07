-- ============================================================================
-- 6FB AI Agent System - MFA & Billing Enhancement Migration
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/dfhqjdoydihajmjxniee/sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: UPDATE PROFILES TABLE FOR MFA & BILLING
-- ============================================================================

-- Add MFA and billing columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: CREATE MFA TABLES
-- ============================================================================

-- MFA Methods table
CREATE TABLE IF NOT EXISTS public.user_mfa_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('totp', 'sms', 'backup_codes')),
  secret_key TEXT, -- Encrypted TOTP secret
  phone_number TEXT, -- For SMS MFA
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  backup_codes TEXT[], -- Array of backup codes (hashed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one method per type per user
  CONSTRAINT unique_user_method_type UNIQUE (user_id, method_type),
  -- Ensure only one primary method per user
  CONSTRAINT unique_primary_mfa_check CHECK (
    (is_primary = true AND method_type = 'totp') OR is_primary = false
  )
);

-- MFA Verification Attempts table (for rate limiting)
CREATE TABLE IF NOT EXISTS public.mfa_verification_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method_id UUID REFERENCES public.user_mfa_methods(id) ON DELETE CASCADE,
  attempt_code TEXT,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trusted Devices table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB DEFAULT '{}'::jsonb,
  is_trusted BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique device per user
  UNIQUE (user_id, device_fingerprint)
);

-- Enhanced Security Events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'mfa_setup', 'mfa_verify', 'login_attempt', 'suspicious_activity'
  event_details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB DEFAULT '{}'::jsonb,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions table (enhanced)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  device_fingerprint TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB DEFAULT '{}'::jsonb,
  mfa_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE BILLING TABLES
-- ============================================================================

-- Enhanced Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  stripe_invoice_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription usage tracking
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  resource_type TEXT NOT NULL, -- 'bookings_per_month', 'ai_chats_per_month', etc.
  count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user per resource per period
  CONSTRAINT unique_user_resource_period UNIQUE (user_id, resource_type, period_start)
);

-- Usage history for analytics
CREATE TABLE IF NOT EXISTS public.usage_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  usage_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table (for custom invoicing)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  invoice_number TEXT UNIQUE NOT NULL,
  stripe_invoice_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  line_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.user_mfa_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================================================

-- MFA Methods policies
CREATE POLICY "Users can view own MFA methods" ON public.user_mfa_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own MFA methods" ON public.user_mfa_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA methods" ON public.user_mfa_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own MFA methods" ON public.user_mfa_methods
  FOR DELETE USING (auth.uid() = user_id);

-- MFA Verification attempts (insert only)
CREATE POLICY "Users can create verification attempts" ON public.mfa_verification_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trusted devices policies
CREATE POLICY "Users can view own trusted devices" ON public.trusted_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own trusted devices" ON public.trusted_devices
  FOR ALL USING (auth.uid() = user_id);

-- Security events (read-only for users)
CREATE POLICY "Users can view own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

-- Sessions policies (service role only for full access)
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage" ON public.usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Usage history policies
CREATE POLICY "Users can view own usage history" ON public.usage_history
  FOR SELECT USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: CREATE PERFORMANCE INDEXES
-- ============================================================================

-- MFA tables indexes
CREATE INDEX IF NOT EXISTS idx_user_mfa_methods_user_id ON public.user_mfa_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_methods_type ON public.user_mfa_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_user_id ON public.mfa_verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_created_at ON public.mfa_verification_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON public.trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;

-- Billing tables indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_customer_id ON public.payments(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_resource_type ON public.usage_tracking(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_history_user_id ON public.usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- ============================================================================
-- STEP 7: CREATE UTILITY FUNCTIONS
-- ============================================================================

-- Check if user has MFA enabled
CREATE OR REPLACE FUNCTION public.user_has_mfa(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_mfa_methods 
    WHERE user_id = p_user_id AND is_verified = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if MFA is required for user (based on role)
CREATE OR REPLACE FUNCTION public.mfa_required_for_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  -- Require MFA for admin and enterprise roles
  RETURN user_role IN ('SUPER_ADMIN', 'ENTERPRISE_OWNER', 'SHOP_OWNER');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify backup code
CREATE OR REPLACE FUNCTION public.verify_backup_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  method_record RECORD;
  code_hash TEXT;
  updated_codes TEXT[];
BEGIN
  -- Hash the provided code
  code_hash := encode(digest(p_code, 'sha256'), 'hex');
  
  -- Find backup codes method
  SELECT * INTO method_record
  FROM public.user_mfa_methods
  WHERE user_id = p_user_id 
    AND method_type = 'backup_codes' 
    AND is_verified = true;
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code exists in backup_codes array
  IF code_hash = ANY(method_record.backup_codes) THEN
    -- Remove used code from array
    SELECT array_agg(code) INTO updated_codes
    FROM unnest(method_record.backup_codes) AS code
    WHERE code != code_hash;
    
    -- Update backup codes
    UPDATE public.user_mfa_methods
    SET backup_codes = updated_codes,
        updated_at = NOW()
    WHERE id = method_record.id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate backup codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  codes TEXT[] := '{}';
  raw_code TEXT;
  hashed_codes TEXT[] := '{}';
  i INTEGER;
BEGIN
  -- Generate 10 backup codes
  FOR i IN 1..10 LOOP
    -- Generate 8-character alphanumeric code
    raw_code := upper(encode(gen_random_bytes(4), 'hex'));
    codes := array_append(codes, raw_code);
    -- Hash for storage
    hashed_codes := array_append(hashed_codes, encode(digest(raw_code, 'sha256'), 'hex'));
  END LOOP;
  
  -- Store hashed codes
  INSERT INTO public.user_mfa_methods (
    user_id, 
    method_type, 
    backup_codes, 
    is_verified
  )
  VALUES (
    p_user_id, 
    'backup_codes', 
    hashed_codes, 
    true
  )
  ON CONFLICT (user_id, method_type) 
  DO UPDATE SET 
    backup_codes = EXCLUDED.backup_codes,
    updated_at = NOW();
  
  -- Return plain text codes for user to save
  RETURN codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log security event
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_risk_score INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent,
    risk_score
  )
  VALUES (
    p_user_id,
    p_event_type,
    p_details,
    p_ip_address,
    p_user_agent,
    p_risk_score
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check verification attempt rate limiting
CREATE OR REPLACE FUNCTION public.check_mfa_rate_limit(
  p_user_id UUID,
  p_time_window INTERVAL DEFAULT '15 minutes',
  p_max_attempts INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.mfa_verification_attempts
  WHERE user_id = p_user_id
    AND created_at > (NOW() - p_time_window)
    AND success = false;
    
  RETURN attempt_count < p_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current usage for a resource
CREATE OR REPLACE FUNCTION public.get_current_usage(
  p_user_id UUID,
  p_resource_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(count), 0)
  INTO v_count
  FROM public.usage_tracking
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND period_start <= NOW()
    AND period_end >= NOW();
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment usage counter
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_resource_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  -- Insert or update current period usage
  INSERT INTO public.usage_tracking (
    user_id,
    resource_type,
    count,
    period_start,
    period_end
  )
  VALUES (
    p_user_id,
    p_resource_type,
    p_amount,
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'
  )
  ON CONFLICT (user_id, resource_type, period_start)
  DO UPDATE SET 
    count = usage_tracking.count + p_amount,
    updated_at = NOW()
  RETURNING count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT subscription_status, subscription_current_period_end
  INTO v_status, v_period_end
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN v_status = 'active' AND (v_period_end IS NULL OR v_period_end > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW()
     OR (last_activity < NOW() - INTERVAL '30 days' AND NOT is_active);
     
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: ADD UPDATE TRIGGERS
-- ============================================================================

-- Create update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables with updated_at columns
CREATE TRIGGER update_user_mfa_methods_updated_at 
  BEFORE UPDATE ON public.user_mfa_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at 
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
SELECT 
  'MFA & Billing Migration Complete!' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_mfa_methods', 'mfa_verification_attempts', 'trusted_devices', 
    'security_events', 'user_sessions', 'payments', 'usage_tracking', 
    'usage_history', 'invoices'
  );