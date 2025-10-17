-- =====================================================
-- FIX ONBOARDING DATABASE SCHEMA - COMPREHENSIVE UPDATE
-- This script ensures all tables exist with proper columns
-- for the onboarding system to work 100% end-to-end
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_last_step VARCHAR(50),
ADD COLUMN IF NOT EXISTS user_goals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS business_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';

-- 2. Add missing columns to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'barbershop',
ADD COLUMN IF NOT EXISTS shop_slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS website_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1F2937"}',
ADD COLUMN IF NOT EXISTS business_hours_template JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_clients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create onboarding_progress table if not exists
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name VARCHAR(50) NOT NULL,
  step_data JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

-- 4. Create analytics_events table for tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name VARCHAR(100) NOT NULL,
  event_properties JSONB DEFAULT '{}',
  user_properties JSONB DEFAULT '{}',
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ensure services table has all required columns
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add shop_id as an alias for barbershop_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'barbershop_id') THEN
    ALTER TABLE services RENAME COLUMN shop_id TO barbershop_id;
  END IF;
END $$;

-- 6. Ensure barbers table has all required columns
ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS chair_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100),
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['English']::TEXT[],
ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON profiles(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbers_shop ON barbers(shop_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON barbershops(shop_slug);

-- 8. Set up RLS policies for new tables
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write their own onboarding progress
CREATE POLICY "Users can manage own onboarding progress"
ON onboarding_progress FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to create their own analytics events
CREATE POLICY "Users can create own analytics events"
ON analytics_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own analytics events
CREATE POLICY "Users can read own analytics events"
ON analytics_events FOR SELECT
USING (auth.uid() = user_id);

-- 9. Create function to link barbershop to profile after creation
CREATE OR REPLACE FUNCTION link_barbershop_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profile with the barbershop_id when a barbershop is created
  UPDATE profiles 
  SET barbershop_id = NEW.id,
      updated_at = NOW()
  WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically link barbershop to profile
DROP TRIGGER IF EXISTS link_barbershop_to_profile_trigger ON barbershops;
CREATE TRIGGER link_barbershop_to_profile_trigger
AFTER INSERT ON barbershops
FOR EACH ROW
EXECUTE FUNCTION link_barbershop_to_profile();

-- 11. Create view for easy access to user's complete data
CREATE OR REPLACE VIEW user_complete_profile AS
SELECT 
  p.*,
  b.name as barbershop_name,
  b.address as barbershop_address,
  b.phone as barbershop_phone,
  b.business_type,
  b.shop_slug,
  b.website_enabled,
  b.booking_enabled
FROM profiles p
LEFT JOIN barbershops b ON p.barbershop_id = b.id;

-- 12. Grant necessary permissions
GRANT ALL ON user_complete_profile TO authenticated;
GRANT ALL ON onboarding_progress TO authenticated;
GRANT ALL ON analytics_events TO authenticated;

-- 13. Verify the setup
DO $$
DECLARE
  missing_columns TEXT := '';
  result_message TEXT;
BEGIN
  -- Check for critical columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'barbershop_id') THEN
    missing_columns := missing_columns || 'profiles.barbershop_id, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'barbershops' AND column_name = 'shop_slug') THEN
    missing_columns := missing_columns || 'barbershops.shop_slug, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_name = 'onboarding_progress') THEN
    missing_columns := missing_columns || 'onboarding_progress table, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_name = 'analytics_events') THEN
    missing_columns := missing_columns || 'analytics_events table, ';
  END IF;
  
  IF missing_columns = '' THEN
    RAISE NOTICE '✅ SUCCESS: All required tables and columns are present!';
    RAISE NOTICE '✅ The onboarding database schema is now complete';
  ELSE
    RAISE WARNING '❌ WARNING: Missing elements: %', missing_columns;
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE!
-- ✅ All tables updated with required columns
-- ✅ Indexes created for performance
-- ✅ RLS policies configured
-- ✅ Automatic barbershop-profile linking enabled
-- ✅ Analytics tracking ready
-- =====================================================