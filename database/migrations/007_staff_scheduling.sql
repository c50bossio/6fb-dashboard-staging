-- Staff Scheduling Tables
-- Minimal tables for staff schedule management
-- Leverages existing barbershop_staff and calendar infrastructure

-- Staff recurring schedules (weekly patterns)
CREATE TABLE IF NOT EXISTS staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Schedule details
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Break times (optional)
    break_start TIME,
    break_end TIME,
    
    -- Schedule metadata
    is_recurring BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE, -- NULL means no end date
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    
    -- Ensure no overlapping schedules for same staff member on same day
    CONSTRAINT unique_staff_day_schedule UNIQUE(staff_id, day_of_week, is_active),
    -- Ensure break is within work hours
    CONSTRAINT valid_break_times CHECK (
        (break_start IS NULL AND break_end IS NULL) OR 
        (break_start >= start_time AND break_end <= end_time AND break_start < break_end)
    ),
    -- Ensure valid work hours
    CONSTRAINT valid_work_times CHECK (start_time < end_time)
);

-- Staff time off requests
CREATE TABLE IF NOT EXISTS staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Time off period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Time off details
    reason TEXT,
    type VARCHAR(50) DEFAULT 'personal' CHECK (type IN ('personal', 'sick', 'vacation', 'training', 'other')),
    
    -- Approval workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure end date is after or equal to start date
    CONSTRAINT valid_time_off_dates CHECK (end_date >= start_date)
);

-- Staff shift overrides (for specific date exceptions)
CREATE TABLE IF NOT EXISTS staff_shift_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES barbershop_staff(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Override details
    override_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_day_off BOOLEAN DEFAULT false, -- If true, staff is off this day regardless of regular schedule
    
    -- Metadata
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    
    -- Unique override per staff per date
    CONSTRAINT unique_staff_date_override UNIQUE(staff_id, override_date),
    -- Either specify times or mark as day off, not both
    CONSTRAINT valid_override CHECK (
        (is_day_off = true AND start_time IS NULL AND end_time IS NULL) OR
        (is_day_off = false AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_barbershop_id ON staff_schedules(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_day_of_week ON staff_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_id ON staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON staff_time_off(status);
CREATE INDEX IF NOT EXISTS idx_staff_shift_overrides_date ON staff_shift_overrides(override_date);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_staff_schedules_updated_at ON staff_schedules;
CREATE TRIGGER update_staff_schedules_updated_at
    BEFORE UPDATE ON staff_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_time_off_updated_at ON staff_time_off;
CREATE TRIGGER update_staff_time_off_updated_at
    BEFORE UPDATE ON staff_time_off
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shift_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_schedules
CREATE POLICY "Shop owners can manage all staff schedules" ON staff_schedules
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view their own schedule" ON staff_schedules
    FOR SELECT USING (
        staff_id IN (
            SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for staff_time_off
CREATE POLICY "Shop owners can manage all time off requests" ON staff_time_off
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can manage their own time off" ON staff_time_off
    FOR ALL USING (
        staff_id IN (
            SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for staff_shift_overrides
CREATE POLICY "Shop owners can manage all shift overrides" ON staff_shift_overrides
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view their own shift overrides" ON staff_shift_overrides
    FOR SELECT USING (
        staff_id IN (
            SELECT id FROM barbershop_staff WHERE user_id = auth.uid()
        )
    );

-- Helper function to get staff availability for a specific date
CREATE OR REPLACE FUNCTION get_staff_availability(
    p_staff_id UUID,
    p_date DATE
) RETURNS TABLE (
    is_available BOOLEAN,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME
) AS $$
DECLARE
    v_day_of_week INT;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check if staff has time off
    IF EXISTS (
        SELECT 1 FROM staff_time_off
        WHERE staff_id = p_staff_id
        AND p_date BETWEEN start_date AND end_date
        AND status = 'approved'
    ) THEN
        RETURN QUERY SELECT false::BOOLEAN, NULL::TIME, NULL::TIME, NULL::TIME, NULL::TIME;
        RETURN;
    END IF;
    
    -- Check for shift override
    IF EXISTS (
        SELECT 1 FROM staff_shift_overrides
        WHERE staff_id = p_staff_id
        AND override_date = p_date
    ) THEN
        RETURN QUERY
        SELECT 
            NOT is_day_off,
            start_time,
            end_time,
            NULL::TIME,
            NULL::TIME
        FROM staff_shift_overrides
        WHERE staff_id = p_staff_id
        AND override_date = p_date;
        RETURN;
    END IF;
    
    -- Return regular schedule
    RETURN QUERY
    SELECT 
        true,
        start_time,
        end_time,
        break_start,
        break_end
    FROM staff_schedules
    WHERE staff_id = p_staff_id
    AND day_of_week = v_day_of_week
    AND is_active = true
    AND p_date >= COALESCE(effective_from, p_date)
    AND p_date <= COALESCE(effective_until, p_date);
END;
$$ LANGUAGE plpgsql;