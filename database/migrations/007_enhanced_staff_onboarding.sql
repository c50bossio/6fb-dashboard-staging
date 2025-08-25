-- Migration: Enhanced Staff Onboarding
-- Description: Adds critical fields for comprehensive staff onboarding
-- Created: 2025-08-25

-- Add new columns to barbershop_staff table
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false;
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS background_check_consent BOOLEAN DEFAULT false;
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0;
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS previous_workplace VARCHAR(255);
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS max_daily_appointments INTEGER DEFAULT 10;
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER DEFAULT 0;

-- Create staff_specialties table
CREATE TABLE IF NOT EXISTS staff_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  specialty VARCHAR(100) NOT NULL,
  years_practicing INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id, specialty)
);

-- Create staff_certifications table
CREATE TABLE IF NOT EXISTS staff_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
  certifications JSONB DEFAULT '[]'::jsonb,
  verified_certifications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id)
);

-- Create staff_availability table for more granular schedule control
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_duration INTEGER, -- in minutes
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id, day_of_week)
);

-- Create staff_documents table for storing important documents
CREATE TABLE IF NOT EXISTS staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'license', 'insurance', 'certification', 'w9', 'contract'
  document_name VARCHAR(255) NOT NULL,
  document_url TEXT,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create staff_onboarding_checklist table
CREATE TABLE IF NOT EXISTS staff_onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Basic Information
  basic_info_complete BOOLEAN DEFAULT false,
  
  -- Legal & Compliance
  license_verified BOOLEAN DEFAULT false,
  emergency_contact_added BOOLEAN DEFAULT false,
  background_check_initiated BOOLEAN DEFAULT false,
  insurance_verified BOOLEAN DEFAULT false,
  
  -- Professional
  specialties_added BOOLEAN DEFAULT false,
  certifications_uploaded BOOLEAN DEFAULT false,
  portfolio_created BOOLEAN DEFAULT false,
  
  -- Operational
  schedule_configured BOOLEAN DEFAULT false,
  services_assigned BOOLEAN DEFAULT false,
  pricing_set BOOLEAN DEFAULT false,
  
  -- Financial
  payment_info_added BOOLEAN DEFAULT false,
  commission_agreed BOOLEAN DEFAULT false,
  direct_deposit_setup BOOLEAN DEFAULT false,
  
  -- Training
  orientation_completed BOOLEAN DEFAULT false,
  system_training_completed BOOLEAN DEFAULT false,
  policies_acknowledged BOOLEAN DEFAULT false,
  
  -- Marketing
  profile_photo_uploaded BOOLEAN DEFAULT false,
  bio_written BOOLEAN DEFAULT false,
  social_media_connected BOOLEAN DEFAULT false,
  
  completion_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(staff_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_specialties_staff_id ON staff_specialties(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_specialties_barbershop_id ON staff_specialties(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_id ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_checklist_staff_id ON staff_onboarding_checklist(staff_id);

-- Add RLS policies
ALTER TABLE staff_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_specialties
CREATE POLICY "Barbershop owners can manage staff specialties" 
  ON staff_specialties 
  FOR ALL 
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view and manage their own specialties" 
  ON staff_specialties 
  FOR ALL 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_certifications
CREATE POLICY "Barbershop owners can manage staff certifications" 
  ON staff_certifications 
  FOR ALL 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff 
      WHERE barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage their own certifications" 
  ON staff_certifications 
  FOR ALL 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_availability
CREATE POLICY "Barbershop owners can manage staff availability" 
  ON staff_availability 
  FOR ALL 
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage their own availability" 
  ON staff_availability 
  FOR ALL 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_documents
CREATE POLICY "Barbershop owners can manage staff documents" 
  ON staff_documents 
  FOR ALL 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff 
      WHERE barbershop_id IN (
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage their own documents" 
  ON staff_documents 
  FOR ALL 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_onboarding_checklist
CREATE POLICY "Barbershop owners can view staff onboarding progress" 
  ON staff_onboarding_checklist 
  FOR ALL 
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own onboarding checklist" 
  ON staff_onboarding_checklist 
  FOR SELECT 
  USING (
    staff_id IN (
      SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

-- Function to calculate onboarding completion percentage
CREATE OR REPLACE FUNCTION calculate_onboarding_completion(checklist_id UUID)
RETURNS INTEGER AS $$
DECLARE
  checklist RECORD;
  total_steps INTEGER := 20; -- Total number of checklist items
  completed_steps INTEGER := 0;
BEGIN
  SELECT * INTO checklist FROM staff_onboarding_checklist WHERE id = checklist_id;
  
  IF checklist.basic_info_complete THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.license_verified THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.emergency_contact_added THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.background_check_initiated THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.insurance_verified THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.specialties_added THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.certifications_uploaded THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.portfolio_created THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.schedule_configured THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.services_assigned THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.pricing_set THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.payment_info_added THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.commission_agreed THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.direct_deposit_setup THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.orientation_completed THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.system_training_completed THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.policies_acknowledged THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.profile_photo_uploaded THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.bio_written THEN completed_steps := completed_steps + 1; END IF;
  IF checklist.social_media_connected THEN completed_steps := completed_steps + 1; END IF;
  
  RETURN (completed_steps * 100) / total_steps;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update completion percentage
CREATE OR REPLACE FUNCTION update_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.completion_percentage := calculate_onboarding_completion(NEW.id);
  
  IF NEW.completion_percentage = 100 AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_completion_trigger
  BEFORE INSERT OR UPDATE ON staff_onboarding_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_completion();

-- Sample data for demonstration (commented out for production)
-- INSERT INTO staff_specialties (staff_id, barbershop_id, specialty, years_practicing)
-- VALUES 
--   ('sample-staff-uuid', 'sample-barbershop-uuid', 'Fades', 5),
--   ('sample-staff-uuid', 'sample-barbershop-uuid', 'Beard Grooming', 3);