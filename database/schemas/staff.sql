-- =====================================================
-- STAFF TABLE SCHEMA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data analysis from app/dashboard/staff/page.js
-- Supports: Staff management, scheduling, performance tracking, commission calculation

-- Create staff role enum
CREATE TYPE staff_role AS ENUM (
    'apprentice',
    'barber',
    'senior_barber',
    'master_barber',
    'manager',
    'owner'
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal information
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    profile_image TEXT, -- URL to profile image
    
    -- Employment information
    role staff_role NOT NULL DEFAULT 'barber',
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Compensation structure
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 75.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    hourly_rate DECIMAL(6,2) CHECK (hourly_rate >= 0),
    base_salary DECIMAL(10,2) CHECK (base_salary >= 0),
    
    -- Skills and specialties
    specialties TEXT[] DEFAULT '{}', -- Array of specialty services
    certifications TEXT[] DEFAULT '{}', -- Professional certifications
    languages TEXT[] DEFAULT '{English}', -- Spoken languages
    
    -- Performance metrics (updated by triggers/procedures)
    total_appointments INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_commissions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER NOT NULL DEFAULT 0,
    
    -- Current week performance (updated regularly)
    weekly_hours DECIMAL(5,2) DEFAULT 0.00,
    total_appointments_week INTEGER NOT NULL DEFAULT 0,
    total_revenue_week DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Availability and scheduling
    default_schedule JSONB DEFAULT '{}', -- JSON structure for weekly schedule
    is_accepting_bookings BOOLEAN NOT NULL DEFAULT true,
    max_daily_appointments INTEGER DEFAULT 16,
    
    -- Professional details
    bio TEXT,
    years_experience INTEGER CHECK (years_experience >= 0),
    education TEXT,
    
    -- Contact and emergency information
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    address TEXT,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

-- =====================================================
-- STAFF SCHEDULE TABLE
-- =====================================================

-- Create day of week enum
CREATE TYPE day_of_week AS ENUM (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

CREATE TABLE IF NOT EXISTS staff_schedules (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Staff reference
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Schedule details
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    is_available BOOLEAN NOT NULL DEFAULT true,
    
    -- Break times
    break_start_time TIME,
    break_end_time TIME CHECK (break_end_time > break_start_time),
    
    -- Effective dates
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_staff_day_schedule UNIQUE (staff_id, day_of_week, effective_from),
    CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- =====================================================
-- STAFF TIME OFF TABLE
-- =====================================================

CREATE TYPE time_off_type AS ENUM (
    'vacation',
    'sick_leave',
    'personal',
    'training',
    'holiday',
    'emergency'
);

CREATE TYPE time_off_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS staff_time_off (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Staff reference
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Time off details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    time_off_type time_off_type NOT NULL,
    status time_off_status NOT NULL DEFAULT 'pending',
    
    -- Details
    reason TEXT,
    notes TEXT,
    
    -- Approval information
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- STAFF PERFORMANCE REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_performance_reviews (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Staff reference
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Review details
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL CHECK (review_period_end >= review_period_start),
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Performance scores (1-5 scale)
    punctuality_score INTEGER CHECK (punctuality_score >= 1 AND punctuality_score <= 5),
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    customer_service_score INTEGER CHECK (customer_service_score >= 1 AND customer_service_score <= 5),
    teamwork_score INTEGER CHECK (teamwork_score >= 1 AND teamwork_score <= 5),
    overall_score DECIMAL(3,2) CHECK (overall_score >= 1 AND overall_score <= 5),
    
    -- Review content
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    reviewer_comments TEXT,
    staff_comments TEXT,
    
    -- Reviewer information
    reviewed_by UUID NOT NULL REFERENCES staff(id),
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Staff table indexes
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_name_trgm ON staff USING gin(name gin_trgm_ops) WHERE is_active = true;

-- Performance tracking indexes
CREATE INDEX IF NOT EXISTS idx_staff_total_revenue ON staff(total_revenue DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_average_rating ON staff(average_rating DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_commission_rate ON staff(commission_rate) WHERE is_active = true;

-- Scheduling indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_day ON staff_schedules(day_of_week) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_staff_schedules_effective ON staff_schedules(effective_from, effective_until);

-- Time off indexes
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_id ON staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON staff_time_off(status);

-- Performance review indexes
CREATE INDEX IF NOT EXISTS idx_staff_performance_staff_id ON staff_performance_reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_date ON staff_performance_reviews(review_date DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;

-- Staff policies
CREATE POLICY "Staff can view all active staff members" ON staff
    FOR SELECT 
    USING (is_active = true AND auth.role() = 'authenticated');

CREATE POLICY "Managers can view all staff" ON staff
    FOR SELECT 
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "Managers can create staff" ON staff
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "Managers can update staff" ON staff
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- Schedule policies
CREATE POLICY "Staff can view schedules" ON staff_schedules
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage own schedule" ON staff_schedules
    FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND (
            staff_id = auth.uid()
            OR auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- Time off policies
CREATE POLICY "Staff can view own time off" ON staff_time_off
    FOR SELECT 
    USING (
        auth.role() = 'authenticated'
        AND (
            staff_id = auth.uid()
            OR auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "Staff can request time off" ON staff_time_off
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND staff_id = auth.uid()
    );

CREATE POLICY "Managers can approve time off" ON staff_time_off
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- Performance review policies
CREATE POLICY "Staff can view own reviews" ON staff_performance_reviews
    FOR SELECT 
    USING (
        auth.role() = 'authenticated'
        AND (
            staff_id = auth.uid()
            OR reviewed_by = auth.uid()
            OR auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "Managers can create reviews" ON staff_performance_reviews
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC FIELD UPDATES
-- =====================================================

-- Function to update staff updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for staff table
CREATE TRIGGER trigger_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

-- Function to set created_by on staff insert
CREATE OR REPLACE FUNCTION set_staff_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for staff creation
CREATE TRIGGER trigger_staff_created_by
    BEFORE INSERT ON staff
    FOR EACH ROW
    EXECUTE FUNCTION set_staff_created_by();

-- =====================================================
-- VIEWS FOR STAFF ANALYTICS
-- =====================================================

-- View: Active staff with performance metrics
CREATE OR REPLACE VIEW active_staff_performance AS
SELECT 
    s.*,
    CASE 
        WHEN s.total_appointments > 0 
        THEN ROUND(s.total_revenue / s.total_appointments, 2)
        ELSE 0
    END as avg_revenue_per_appointment,
    CASE 
        WHEN s.hire_date IS NOT NULL 
        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.hire_date))
        ELSE 0
    END as years_employed,
    -- Calculate current week utilization
    CASE 
        WHEN s.weekly_hours > 0 
        THEN ROUND((s.total_appointments_week * 0.75) / s.weekly_hours * 100, 1) -- Assuming 45min avg appointment
        ELSE 0
    END as utilization_percentage
FROM staff s
WHERE s.is_active = true
ORDER BY s.total_revenue_week DESC;

-- View: Staff schedule summary
CREATE OR REPLACE VIEW staff_schedule_summary AS
SELECT 
    s.id as staff_id,
    s.name,
    s.role,
    COUNT(ss.id) as scheduled_days,
    COALESCE(SUM(
        EXTRACT(EPOCH FROM (ss.end_time - ss.start_time)) / 3600
    ), 0) as total_weekly_hours,
    ARRAY_AGG(
        CASE WHEN ss.is_available THEN ss.day_of_week::TEXT END
        ORDER BY 
        CASE ss.day_of_week 
            WHEN 'monday' THEN 1 
            WHEN 'tuesday' THEN 2 
            WHEN 'wednesday' THEN 3 
            WHEN 'thursday' THEN 4 
            WHEN 'friday' THEN 5 
            WHEN 'saturday' THEN 6 
            WHEN 'sunday' THEN 7 
        END
    ) FILTER (WHERE ss.is_available) as working_days
FROM staff s
LEFT JOIN staff_schedules ss ON s.id = ss.staff_id 
    AND ss.effective_from <= CURRENT_DATE 
    AND (ss.effective_until IS NULL OR ss.effective_until >= CURRENT_DATE)
WHERE s.is_active = true
GROUP BY s.id, s.name, s.role
ORDER BY total_weekly_hours DESC;

-- View: Staff commission summary
CREATE OR REPLACE VIEW staff_commission_summary AS
SELECT 
    s.id,
    s.name,
    s.role,
    s.commission_rate,
    s.total_commissions,
    s.total_revenue_week,
    ROUND(s.total_revenue_week * (s.commission_rate / 100.0), 2) as weekly_commission_estimate,
    s.total_appointments_week,
    CASE 
        WHEN s.total_appointments_week > 0 
        THEN ROUND(s.total_revenue_week / s.total_appointments_week, 2)
        ELSE 0
    END as avg_service_value
FROM staff s
WHERE s.is_active = true
ORDER BY weekly_commission_estimate DESC;

-- View: Top performing staff
CREATE OR REPLACE VIEW top_performing_staff AS
SELECT 
    s.name,
    s.role,
    s.average_rating,
    s.total_reviews,
    s.total_revenue,
    s.total_appointments,
    s.total_revenue_week,
    s.total_appointments_week,
    ROUND(s.total_revenue / NULLIF(s.total_appointments, 0), 2) as lifetime_avg_per_appointment,
    -- Performance score calculation
    ROUND(
        (s.average_rating * 0.3) +
        (LEAST(s.total_appointments_week / 20.0, 1) * 5 * 0.3) + -- Appointment volume (max 20/week = full score)
        (LEAST(s.total_revenue_week / 1000.0, 1) * 5 * 0.4), -- Revenue target (max $1000/week = full score)
        2
    ) as performance_score
FROM staff s
WHERE s.is_active = true
    AND s.total_appointments > 10 -- Minimum appointments for meaningful metrics
ORDER BY performance_score DESC;

-- =====================================================
-- FUNCTIONS FOR STAFF MANAGEMENT
-- =====================================================

-- Function to calculate staff performance metrics
CREATE OR REPLACE FUNCTION update_staff_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
    v_staff RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    FOR v_staff IN 
        SELECT id FROM staff WHERE is_active = true
    LOOP
        -- Update performance metrics from appointments/payments
        -- This would typically be called by a scheduled job
        -- For now, it's a placeholder for the structure
        
        -- Update total appointments and revenue from payments table
        UPDATE staff s
        SET 
            total_appointments = COALESCE(p.appointment_count, 0),
            total_revenue = COALESCE(p.total_revenue, 0),
            total_commissions = COALESCE(p.total_commissions, 0)
        FROM (
            SELECT 
                barber_id,
                COUNT(*) as appointment_count,
                SUM(total) as total_revenue,
                SUM(commission) as total_commissions
            FROM payments
            WHERE status = 'completed'
                AND barber_id = v_staff.id
        ) p
        WHERE s.id = v_staff.id;
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check staff availability
CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week TEXT;
    v_schedule_exists BOOLEAN := false;
    v_time_off_exists BOOLEAN := false;
BEGIN
    -- Get day of week
    v_day_of_week := LOWER(TO_CHAR(p_date, 'Day'));
    v_day_of_week := TRIM(v_day_of_week);
    
    -- Check if staff has schedule for this day
    SELECT EXISTS(
        SELECT 1 FROM staff_schedules
        WHERE staff_id = p_staff_id
            AND day_of_week = v_day_of_week::day_of_week
            AND is_available = true
            AND effective_from <= p_date
            AND (effective_until IS NULL OR effective_until >= p_date)
            AND start_time <= p_start_time
            AND end_time >= p_end_time
    ) INTO v_schedule_exists;
    
    -- Check for time off
    SELECT EXISTS(
        SELECT 1 FROM staff_time_off
        WHERE staff_id = p_staff_id
            AND status = 'approved'
            AND start_date <= p_date
            AND end_date >= p_date
    ) INTO v_time_off_exists;
    
    -- Available if scheduled and not on time off
    RETURN v_schedule_exists AND NOT v_time_off_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE staff IS 'Staff member information and employment details for 6FB barbershop system';
COMMENT ON COLUMN staff.specialties IS 'Array of specialty services the staff member can perform';
COMMENT ON COLUMN staff.default_schedule IS 'JSON structure containing weekly schedule template';
COMMENT ON TABLE staff_schedules IS 'Detailed weekly schedules for staff members with effective date ranges';
COMMENT ON TABLE staff_time_off IS 'Time off requests and approvals for staff members';
COMMENT ON TABLE staff_performance_reviews IS 'Performance review records with scores and feedback';
COMMENT ON VIEW active_staff_performance IS 'Performance metrics and analytics for active staff';
COMMENT ON VIEW staff_schedule_summary IS 'Weekly schedule summary showing working days and hours';
COMMENT ON VIEW staff_commission_summary IS 'Commission calculations and earnings summary';
COMMENT ON VIEW top_performing_staff IS 'Top performing staff ranked by composite performance score';