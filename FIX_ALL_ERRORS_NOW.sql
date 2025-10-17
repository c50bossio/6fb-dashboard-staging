-- COMPREHENSIVE FIX FOR ALL DATABASE ERRORS
-- Run this in Supabase SQL Editor to fix all schema issues

-- Step 1: Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_last_step TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_progress_percentage INTEGER DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Step 2: Ensure all profiles have valid onboarding_data
UPDATE public.profiles 
SET 
  onboarding_data = CASE 
    WHEN onboarding_data IS NULL THEN '{}'::jsonb
    WHEN onboarding_data::text = '[object Object]' THEN '{}'::jsonb
    WHEN onboarding_data::text LIKE '%[object Object]%' THEN '{}'::jsonb
    ELSE onboarding_data
  END,
  onboarding_step = COALESCE(onboarding_step, 0),
  onboarding_progress_percentage = COALESCE(onboarding_progress_percentage, 0);

-- Step 3: Fix dev-enterprise user specifically
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the dev-enterprise user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'dev-enterprise@test.com' 
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Ensure profile exists with all fields
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      shop_name,
      onboarding_step,
      onboarding_data,
      onboarding_progress_percentage,
      onboarding_last_step,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'dev-enterprise@test.com',
      'Dev Enterprise User',
      'ENTERPRISE_OWNER',
      'Demo Barbershop',
      0,
      '{}'::jsonb,
      0,
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(profiles.email, EXCLUDED.email),
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
      role = COALESCE(profiles.role, EXCLUDED.role),
      shop_name = COALESCE(profiles.shop_name, EXCLUDED.shop_name),
      onboarding_data = COALESCE(profiles.onboarding_data, EXCLUDED.onboarding_data),
      onboarding_step = COALESCE(profiles.onboarding_step, EXCLUDED.onboarding_step),
      onboarding_progress_percentage = COALESCE(profiles.onboarding_progress_percentage, EXCLUDED.onboarding_progress_percentage),
      updated_at = NOW();
      
    RAISE NOTICE 'Dev-enterprise user profile updated successfully';
  ELSE
    RAISE NOTICE 'Dev-enterprise user not found in auth.users';
  END IF;
END $$;

-- Step 4: Create onboarding_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_data JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

-- Step 5: Enable RLS and create policies
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding progress" 
ON public.onboarding_progress
FOR ALL USING (auth.uid() = user_id);

-- Step 6: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 7: Verify the fix
SELECT 
  id,
  email,
  role,
  shop_name,
  onboarding_step,
  onboarding_progress_percentage,
  CASE 
    WHEN onboarding_data IS NOT NULL AND onboarding_data::text != '{}' THEN '✅ Has data'
    ELSE '⚠️ Empty'
  END as onboarding_data_status,
  CASE 
    WHEN onboarding_last_step IS NOT NULL THEN onboarding_last_step
    ELSE 'Not set'
  END as last_step
FROM public.profiles
WHERE email = 'dev-enterprise@test.com';