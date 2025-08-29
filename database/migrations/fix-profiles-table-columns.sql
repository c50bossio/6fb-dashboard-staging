-- Fix Profiles Table Schema
-- Ensures all necessary columns exist in the profiles table
-- Date: 2025-08-29

-- Add missing columns to profiles table if they don't exist
-- Using DO block to handle columns that might already exist

DO $$
BEGIN
  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to profiles table';
  ELSE
    RAISE NOTICE 'avatar_url column already exists';
  END IF;

  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name VARCHAR(255);
    RAISE NOTICE 'Added first_name column to profiles table';
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name VARCHAR(255);
    RAISE NOTICE 'Added last_name column to profiles table';
  END IF;

  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone VARCHAR(20);
    RAISE NOTICE 'Added phone column to profiles table';
  END IF;

  -- Add barbershop_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added barbershop_id column to profiles table';
  END IF;

  -- Add bio column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
    RAISE NOTICE 'Added bio column to profiles table';
  END IF;

  -- Add specialties column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'specialties'
  ) THEN
    ALTER TABLE profiles ADD COLUMN specialties TEXT[];
    RAISE NOTICE 'Added specialties column to profiles table';
  END IF;

  -- Add experience_years column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'experience_years'
  ) THEN
    ALTER TABLE profiles ADD COLUMN experience_years INTEGER DEFAULT 0;
    RAISE NOTICE 'Added experience_years column to profiles table';
  END IF;

  -- Add onboarding_completed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added onboarding_completed column to profiles table';
  END IF;

  -- Add subscription_tier column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'FREE';
    RAISE NOTICE 'Added subscription_tier column to profiles table';
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_active column to profiles table';
  END IF;

  -- Add metadata column if it doesn't exist (for storing additional data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE profiles ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added metadata column to profiles table';
  END IF;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON profiles(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Update existing profiles to set default values where needed
UPDATE profiles 
SET 
  is_active = COALESCE(is_active, true),
  subscription_tier = COALESCE(subscription_tier, 'FREE'),
  experience_years = COALESCE(experience_years, 0),
  metadata = COALESCE(metadata, '{}')
WHERE 
  is_active IS NULL 
  OR subscription_tier IS NULL 
  OR experience_years IS NULL 
  OR metadata IS NULL;

-- Create or replace the trigger function to update full_name from first_name and last_name
CREATE OR REPLACE FUNCTION update_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If full_name is not explicitly set, derive it from first_name and last_name
  IF (NEW.full_name IS NULL OR NEW.full_name = '') AND 
     (NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL) THEN
    NEW.full_name = TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  END IF;
  
  -- If first_name and last_name are null but full_name exists, try to split it
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' AND 
     NEW.first_name IS NULL AND NEW.last_name IS NULL THEN
    NEW.first_name = SPLIT_PART(NEW.full_name, ' ', 1);
    IF POSITION(' ' IN NEW.full_name) > 0 THEN
      NEW.last_name = SUBSTRING(NEW.full_name FROM POSITION(' ' IN NEW.full_name) + 1);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain full_name consistency
DROP TRIGGER IF EXISTS maintain_full_name ON profiles;
CREATE TRIGGER maintain_full_name
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_full_name();

-- Verify the table structure
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'profiles';
  
  RAISE NOTICE 'Profiles table now has % columns', col_count;
  RAISE NOTICE 'Profiles table schema update completed successfully!';
END $$;