-- Add missing columns to profiles table for onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_last_step TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_progress_percentage INTEGER DEFAULT 0;

-- Ensure stripe_connected_accounts table exists
CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT DEFAULT 'express',
  business_type TEXT,
  business_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending',
  requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for stripe_connected_accounts
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own Stripe account
CREATE POLICY IF NOT EXISTS "Users can read own stripe account" 
ON public.stripe_connected_accounts
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own Stripe account
CREATE POLICY IF NOT EXISTS "Users can update own stripe account" 
ON public.stripe_connected_accounts
FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role has full access to stripe accounts" 
ON public.stripe_connected_accounts
FOR ALL USING (auth.role() = 'service_role');

-- Create onboarding_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_data JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

-- Add RLS policies for onboarding_progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own onboarding progress" 
ON public.onboarding_progress
FOR ALL USING (auth.uid() = user_id);