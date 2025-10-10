-- Migration: Add automatic profile creation trigger for Supabase Auth
-- This trigger creates a profile automatically when a new user is created in auth.users

-- Create or replace the profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert a new profile for the newly created auth user
  INSERT INTO public.profiles (id, email, full_name, role, subscription_tier, subscription_status, created_at, updated_at)
  VALUES (
    new.id, 
    new.email,
    -- Extract full name from user metadata with sensible fallbacks
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      CONCAT(
        COALESCE(new.raw_user_meta_data->>'given_name', ''),
        ' ',
        COALESCE(new.raw_user_meta_data->>'family_name', '')
      ),
      split_part(new.email, '@', 1),
      'User'
    ),
    -- Default role
    'CLIENT',
    -- Default subscription
    'free',
    'trial',
    -- Timestamps
    NOW(),
    NOW()
  );
  
  -- Also update avatar_url if available from OAuth
  UPDATE public.profiles 
  SET 
    avatar_url = COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      new.raw_user_meta_data->>'profile_picture'
    ),
    first_name = new.raw_user_meta_data->>'given_name',
    last_name = new.raw_user_meta_data->>'family_name'
  WHERE id = new.id 
    AND (
      new.raw_user_meta_data->>'avatar_url' IS NOT NULL OR
      new.raw_user_meta_data->>'picture' IS NOT NULL OR
      new.raw_user_meta_data->>'given_name' IS NOT NULL OR
      new.raw_user_meta_data->>'family_name' IS NOT NULL
    );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policies for profiles table if they don't exist
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Service role can manage all profiles (for triggers and admin operations)
CREATE POLICY "Service role can manage profiles" ON public.profiles
  USING (auth.role() = 'service_role');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);