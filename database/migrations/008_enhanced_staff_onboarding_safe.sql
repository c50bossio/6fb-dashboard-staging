-- Enhanced Staff Onboarding Migration (Dependency Safe)
-- File: 008_enhanced_staff_onboarding_safe.sql
-- Created: 2025-08-25
-- Purpose: Add comprehensive staff onboarding with 31+ fields without breaking existing RLS policies

-- =======================================
-- PHASE 1: ADD METADATA COLUMN SAFELY
-- =======================================

-- Add metadata JSONB column to existing barbershop_staff table
ALTER TABLE barbershop_staff 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add new columns for enhanced staff management (safe additions)
ALTER TABLE barbershop_staff 
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS financial_model VARCHAR(50) DEFAULT 'commission',
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,4) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS booth_rent_amount DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'direct_deposit',
ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS routing_number_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);

-- =======================================
-- PHASE 2: CREATE NEW SUPPORTING TABLES
-- =======================================

-- Staff Specialties Table
CREATE TABLE IF NOT EXISTS staff_specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    specialty_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER DEFAULT 0,
    certified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Certifications Table
CREATE TABLE IF NOT EXISTS staff_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    certification_name VARCHAR(200) NOT NULL,
    issuing_organization VARCHAR(200),
    issue_date DATE,
    expiry_date DATE,
    certification_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Availability Table
CREATE TABLE IF NOT EXISTS staff_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    is_available BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    max_appointments INTEGER DEFAULT 10,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, day_of_week)
);

-- Staff Documents Table
CREATE TABLE IF NOT EXISTS staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'license', 'insurance', 'contract', 'w9', 'background_check'
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    notes TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Performance Metrics Table
CREATE TABLE IF NOT EXISTS staff_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    no_show_appointments INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    average_service_time INTEGER, -- minutes
    customer_rating_average DECIMAL(3,2),
    total_ratings_received INTEGER DEFAULT 0,
    punctuality_score DECIMAL(5,2), -- percentage
    upsell_rate DECIMAL(5,2), -- percentage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, metric_date)
);

-- =======================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- =======================================

-- Indexes for staff_specialties
CREATE INDEX IF NOT EXISTS idx_staff_specialties_staff_id ON staff_specialties(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_specialties_specialty ON staff_specialties(specialty_name);

-- Indexes for staff_certifications
CREATE INDEX IF NOT EXISTS idx_staff_certifications_staff_id ON staff_certifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_certifications_expiry ON staff_certifications(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_certifications_active ON staff_certifications(is_active);

-- Indexes for staff_availability
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_id ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_day ON staff_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_availability_available ON staff_availability(is_available);

-- Indexes for staff_documents
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_status ON staff_documents(status);
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiry ON staff_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Indexes for staff_performance_metrics
CREATE INDEX IF NOT EXISTS idx_staff_performance_staff_id ON staff_performance_metrics(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_date ON staff_performance_metrics(metric_date);

-- Index on main table metadata column
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_metadata ON barbershop_staff USING GIN (metadata);

-- =======================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY (SAFE APPROACH)
-- =======================================

-- Enable RLS on new tables (don't touch existing functions)
ALTER TABLE staff_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;

-- =======================================
-- PHASE 5: CREATE RLS POLICIES (REUSE EXISTING FUNCTIONS)
-- =======================================

-- Policies for staff_specialties (reuse existing user_owns_shop function)
CREATE POLICY "Shop owners can manage staff specialties" ON staff_specialties
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_specialties.staff_id 
            AND private.user_owns_shop(bs.barbershop_id)
        )
    );

CREATE POLICY "Staff can view their own specialties" ON staff_specialties
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_specialties.staff_id 
            AND bs.user_id = auth.uid()
        )
    );

-- Policies for staff_certifications
CREATE POLICY "Shop owners can manage staff certifications" ON staff_certifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_certifications.staff_id 
            AND private.user_owns_shop(bs.barbershop_id)
        )
    );

CREATE POLICY "Staff can manage their own certifications" ON staff_certifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_certifications.staff_id 
            AND bs.user_id = auth.uid()
        )
    );

-- Policies for staff_availability
CREATE POLICY "Shop owners can manage staff availability" ON staff_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_availability.staff_id 
            AND private.user_owns_shop(bs.barbershop_id)
        )
    );

CREATE POLICY "Staff can manage their own availability" ON staff_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_availability.staff_id 
            AND bs.user_id = auth.uid()
        )
    );

-- Policies for staff_documents
CREATE POLICY "Shop owners can manage staff documents" ON staff_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_documents.staff_id 
            AND private.user_owns_shop(bs.barbershop_id)
        )
    );

CREATE POLICY "Staff can view their own documents" ON staff_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_documents.staff_id 
            AND bs.user_id = auth.uid()
        )
    );

-- Policies for staff_performance_metrics
CREATE POLICY "Shop owners can manage staff performance metrics" ON staff_performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_performance_metrics.staff_id 
            AND private.user_owns_shop(bs.barbershop_id)
        )
    );

CREATE POLICY "Staff can view their own performance metrics" ON staff_performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershop_staff bs 
            WHERE bs.id = staff_performance_metrics.staff_id 
            AND bs.user_id = auth.uid()
        )
    );

-- =======================================
-- PHASE 6: CREATE UPDATED_AT TRIGGERS
-- =======================================

-- Create trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to new tables
CREATE TRIGGER update_staff_specialties_updated_at
    BEFORE UPDATE ON staff_specialties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_certifications_updated_at
    BEFORE UPDATE ON staff_certifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_availability_updated_at
    BEFORE UPDATE ON staff_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_documents_updated_at
    BEFORE UPDATE ON staff_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_performance_metrics_updated_at
    BEFORE UPDATE ON staff_performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================================
-- PHASE 7: CREATE HELPER FUNCTIONS
-- =======================================

-- Function to get staff member complete profile
CREATE OR REPLACE FUNCTION get_staff_complete_profile(staff_member_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    staff_record RECORD;
    specialties JSONB;
    certifications JSONB;
    availability JSONB;
    documents JSONB;
    performance JSONB;
BEGIN
    -- Get main staff record
    SELECT * INTO staff_record 
    FROM barbershop_staff 
    WHERE id = staff_member_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Staff member not found"}'::JSONB;
    END IF;
    
    -- Get specialties
    SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::JSONB) INTO specialties
    FROM staff_specialties s
    WHERE s.staff_id = staff_member_id;
    
    -- Get certifications
    SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::JSONB) INTO certifications
    FROM staff_certifications c
    WHERE c.staff_id = staff_member_id AND c.is_active = true;
    
    -- Get availability
    SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::JSONB) INTO availability
    FROM staff_availability a
    WHERE a.staff_id = staff_member_id
    ORDER BY a.day_of_week;
    
    -- Get documents count by type
    SELECT jsonb_object_agg(document_type, doc_count) INTO documents
    FROM (
        SELECT document_type, COUNT(*) as doc_count
        FROM staff_documents
        WHERE staff_id = staff_member_id
        GROUP BY document_type
    ) doc_counts;
    
    -- Get recent performance metrics
    SELECT row_to_json(pm) INTO performance
    FROM staff_performance_metrics pm
    WHERE pm.staff_id = staff_member_id
    ORDER BY pm.metric_date DESC
    LIMIT 1;
    
    -- Build complete profile
    result := jsonb_build_object(
        'staff_info', row_to_json(staff_record),
        'specialties', specialties,
        'certifications', certifications,
        'availability', availability,
        'documents_summary', COALESCE(documents, '{}'::JSONB),
        'latest_performance', performance
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update staff performance metrics
CREATE OR REPLACE FUNCTION update_staff_performance_metrics(
    staff_member_id UUID,
    metric_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    total_appts INTEGER;
    completed_appts INTEGER;
    cancelled_appts INTEGER;
    no_show_appts INTEGER;
    total_rev DECIMAL(10,2);
    avg_rating DECIMAL(3,2);
    rating_count INTEGER;
BEGIN
    -- Calculate metrics from appointments
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating,
        COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as rating_count
    INTO total_appts, completed_appts, cancelled_appts, no_show_appts, total_rev, avg_rating, rating_count
    FROM appointments
    WHERE barber_id = staff_member_id
    AND DATE(appointment_date) = metric_date_param;
    
    -- Insert or update performance metrics
    INSERT INTO staff_performance_metrics (
        staff_id, metric_date, total_appointments, completed_appointments,
        cancelled_appointments, no_show_appointments, total_revenue,
        customer_rating_average, total_ratings_received
    ) VALUES (
        staff_member_id, metric_date_param, total_appts, completed_appts,
        cancelled_appts, no_show_appts, total_rev, avg_rating, rating_count
    )
    ON CONFLICT (staff_id, metric_date) 
    DO UPDATE SET
        total_appointments = EXCLUDED.total_appointments,
        completed_appointments = EXCLUDED.completed_appointments,
        cancelled_appointments = EXCLUDED.cancelled_appointments,
        no_show_appointments = EXCLUDED.no_show_appointments,
        total_revenue = EXCLUDED.total_revenue,
        customer_rating_average = EXCLUDED.customer_rating_average,
        total_ratings_received = EXCLUDED.total_ratings_received,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================
-- MIGRATION COMPLETE
-- =======================================

-- Success message
SELECT 'Enhanced Staff Onboarding Migration Complete! Added 31+ fields support with 5 new tables and comprehensive RLS policies.' as message;