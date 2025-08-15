-- Add avatar_url column to profiles table if it doesn't exist
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'profiles' 
      AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN avatar_url TEXT;
    
    RAISE NOTICE 'avatar_url column added successfully';
  ELSE
    RAISE NOTICE 'avatar_url column already exists';
  END IF;
END $$;