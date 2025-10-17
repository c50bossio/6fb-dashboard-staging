-- ==========================================
-- ENHANCED BARBER MANAGEMENT SCHEMA
-- ==========================================

-- Add missing columns to barbershop_staff table
ALTER TABLE barbershop_staff 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS booth_rent_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS financial_model VARCHAR(20) CHECK (financial_model IN ('commission', 'booth_rent', 'hybrid')),
ADD COLUMN IF NOT EXISTS can_manage_schedule BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_manage_clients BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_sell_products BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bank_transfer';

-- Barber documents and compliance
CREATE TABLE IF NOT EXISTS barber_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Document details
  document_type VARCHAR(50) NOT NULL, -- 'license', 'insurance', 'certification', 'contract', 'w9', 'other'
  document_name VARCHAR(255) NOT NULL,
  document_number VARCHAR(100),
  
  -- File storage
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_type VARCHAR(50),
  
  -- Validity
  issue_date DATE,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_document UNIQUE(barber_id, barbershop_id, document_type, document_number)
);

-- Barber onboarding checklist
CREATE TABLE IF NOT EXISTS barber_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Profile steps
  profile_completed BOOLEAN DEFAULT false,
  profile_completed_at TIMESTAMPTZ,
  
  -- Documents
  license_uploaded BOOLEAN DEFAULT false,
  license_uploaded_at TIMESTAMPTZ,
  insurance_uploaded BOOLEAN DEFAULT false,
  insurance_uploaded_at TIMESTAMPTZ,
  contract_signed BOOLEAN DEFAULT false,
  contract_signed_at TIMESTAMPTZ,
  
  -- Training
  shop_tour_completed BOOLEAN DEFAULT false,
  shop_tour_completed_at TIMESTAMPTZ,
  pos_training_completed BOOLEAN DEFAULT false,
  pos_training_completed_at TIMESTAMPTZ,
  booking_system_training BOOLEAN DEFAULT false,
  booking_system_training_at TIMESTAMPTZ,
  
  -- Setup
  chair_assigned BOOLEAN DEFAULT false,
  chair_number INTEGER,
  chair_assigned_at TIMESTAMPTZ,
  supplies_provided BOOLEAN DEFAULT false,
  supplies_provided_at TIMESTAMPTZ,
  keys_provided BOOLEAN DEFAULT false,
  keys_provided_at TIMESTAMPTZ,
  
  -- Banking
  payment_setup BOOLEAN DEFAULT false,
  payment_setup_at TIMESTAMPTZ,
  tax_forms_completed BOOLEAN DEFAULT false,
  tax_forms_completed_at TIMESTAMPTZ,
  
  -- Completion
  onboarding_progress INTEGER DEFAULT 0, -- Percentage 0-100
  fully_onboarded BOOLEAN DEFAULT false,
  fully_onboarded_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_onboarding UNIQUE(barber_id, barbershop_id)
);

-- Barber performance tracking
CREATE TABLE IF NOT EXISTS barber_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Time period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Appointment metrics
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  
  -- Revenue metrics
  service_revenue DECIMAL(10,2) DEFAULT 0,
  product_revenue DECIMAL(10,2) DEFAULT 0,
  tip_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Commission/earnings
  service_commission DECIMAL(10,2) DEFAULT 0,
  product_commission DECIMAL(10,2) DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  booth_rent_paid DECIMAL(10,2) DEFAULT 0,
  net_earnings DECIMAL(10,2) DEFAULT 0,
  
  -- Client metrics
  new_clients INTEGER DEFAULT 0,
  returning_clients INTEGER DEFAULT 0,
  total_unique_clients INTEGER DEFAULT 0,
  client_retention_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Efficiency metrics
  average_service_duration INTEGER, -- minutes
  utilization_rate DECIMAL(5,2) DEFAULT 0, -- percentage
  rebooking_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Quality metrics
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  five_star_reviews INTEGER DEFAULT 0,
  
  -- Ranking
  shop_rank INTEGER, -- Rank within shop for this period
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_performance UNIQUE(barber_id, barbershop_id, period_type, period_start)
);

-- Barber goals and targets
CREATE TABLE IF NOT EXISTS barber_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Goal details
  goal_type VARCHAR(50) NOT NULL, -- 'revenue', 'appointments', 'clients', 'rating', 'products'
  goal_period VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  goal_value DECIMAL(10,2) NOT NULL,
  
  -- Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Progress
  current_value DECIMAL(10,2) DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'achieved', 'missed', 'cancelled'
  achieved_at TIMESTAMPTZ,
  
  -- Incentive
  reward_type VARCHAR(50), -- 'bonus', 'commission_increase', 'prize', 'recognition'
  reward_value TEXT,
  reward_claimed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barber shifts and time tracking
CREATE TABLE IF NOT EXISTS barber_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Shift details
  shift_date DATE NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Break tracking
  break_minutes INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'no_show', 'cancelled'
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_shift UNIQUE(barber_id, barbershop_id, shift_date, scheduled_start)
);

-- Barber notifications preferences
CREATE TABLE IF NOT EXISTS barber_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Appointment notifications
  new_booking_email BOOLEAN DEFAULT true,
  new_booking_sms BOOLEAN DEFAULT true,
  new_booking_push BOOLEAN DEFAULT true,
  
  cancellation_email BOOLEAN DEFAULT true,
  cancellation_sms BOOLEAN DEFAULT true,
  cancellation_push BOOLEAN DEFAULT true,
  
  reminder_email BOOLEAN DEFAULT true,
  reminder_sms BOOLEAN DEFAULT false,
  reminder_push BOOLEAN DEFAULT true,
  
  -- Performance notifications
  daily_summary_email BOOLEAN DEFAULT true,
  weekly_report_email BOOLEAN DEFAULT true,
  goal_progress_email BOOLEAN DEFAULT true,
  
  -- Shop notifications
  shop_announcements_email BOOLEAN DEFAULT true,
  shop_announcements_push BOOLEAN DEFAULT true,
  schedule_changes_email BOOLEAN DEFAULT true,
  schedule_changes_sms BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '09:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_barber_notifications UNIQUE(barber_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_barber_documents_barber ON barber_documents(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_documents_shop ON barber_documents(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_documents_type ON barber_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_barber_documents_expiry ON barber_documents(expiry_date);

CREATE INDEX IF NOT EXISTS idx_barber_onboarding_barber ON barber_onboarding(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_onboarding_shop ON barber_onboarding(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_barber_performance_barber ON barber_performance(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_performance_shop ON barber_performance(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_performance_period ON barber_performance(period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_barber_goals_barber ON barber_goals(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_goals_status ON barber_goals(status);

CREATE INDEX IF NOT EXISTS idx_barber_shifts_barber ON barber_shifts(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_shifts_date ON barber_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_barber_shifts_status ON barber_shifts(status);

-- Enable RLS on new tables
ALTER TABLE barber_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_documents
CREATE POLICY "Barbers can view own documents" ON barber_documents
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = barber_id);

CREATE POLICY "Shop owners can manage barber documents" ON barber_documents
  FOR ALL TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
    )
  );

-- RLS Policies for barber_onboarding
CREATE POLICY "Barbers can view own onboarding" ON barber_onboarding
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = barber_id);

CREATE POLICY "Shop owners can manage onboarding" ON barber_onboarding
  FOR ALL TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
    )
  );

-- RLS Policies for barber_performance
CREATE POLICY "Barbers can view own performance" ON barber_performance
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = barber_id);

CREATE POLICY "Shop owners can view all performance" ON barber_performance
  FOR SELECT TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
    )
  );

-- RLS Policies for barber_goals
CREATE POLICY "Barbers can view own goals" ON barber_goals
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = barber_id);

CREATE POLICY "Shop owners can manage goals" ON barber_goals
  FOR ALL TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
    )
  );

-- RLS Policies for barber_shifts
CREATE POLICY "Barbers can view own shifts" ON barber_shifts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = barber_id);

CREATE POLICY "Shop owners can manage shifts" ON barber_shifts
  FOR ALL TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
    )
  );

-- RLS Policies for barber_notification_preferences
CREATE POLICY "Barbers can manage own preferences" ON barber_notification_preferences
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = barber_id);