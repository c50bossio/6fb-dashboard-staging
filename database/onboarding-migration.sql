-- Onboarding Migration for 6FB AI Agent System
-- This adds onboarding-specific fields without duplicating existing data

-- Add onboarding tracking fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_goals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS business_size VARCHAR(20);

-- Add onboarding fields to barbershops table (if not exists)
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'barbershop',
ADD COLUMN IF NOT EXISTS business_hours_template VARCHAR(20);

-- Create onboarding_progress table for detailed tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  step_name VARCHAR(50) NOT NULL,
  step_data JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

-- Sample data structure for onboarding_progress.step_data:
-- {
--   "role": "shop_owner",
--   "goals": ["bookings", "finances", "automate"],
--   "businessSize": "2-5",
--   "businessName": "Premium Cuts Studio",
--   "businessAddress": "123 Main St",
--   "businessPhone": "(555) 123-4567",
--   "businessType": "barbershop",
--   "businessHours": "10-7",
--   "services": [
--     {"name": "Haircut", "price": 35, "duration": 30},
--     {"name": "Beard Trim", "price": 20, "duration": 20}
--   ]
-- }