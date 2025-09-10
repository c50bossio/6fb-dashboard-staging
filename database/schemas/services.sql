-- =====================================================
-- SERVICES TABLE SCHEMA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data analysis from app/dashboard/services/page.js
-- Supports: Service catalog, pricing management, booking analytics

-- Create service category enum
CREATE TYPE service_category AS ENUM (
    'haircuts',
    'beard',
    'treatments',
    'styling',
    'color',
    'special'
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic service information
    name TEXT NOT NULL,
    category service_category NOT NULL,
    description TEXT,
    
    -- Service details
    duration INTEGER NOT NULL DEFAULT 30 CHECK (duration > 0), -- Duration in minutes
    price DECIMAL(8,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    
    -- Service features
    popular BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    online_booking_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Service inclusions
    includes TEXT[] DEFAULT '{}', -- What's included in the service
    
    -- Performance metrics (updated by triggers/procedures)
    bookings_this_month INTEGER NOT NULL DEFAULT 0,
    bookings_total INTEGER NOT NULL DEFAULT 0,
    revenue_this_month DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    revenue_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Rating and reviews
    average_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER NOT NULL DEFAULT 0,
    
    -- Staff assignment
    available_to_all_staff BOOLEAN NOT NULL DEFAULT true,
    restricted_staff_ids UUID[] DEFAULT '{}', -- If not available to all, specify staff IDs
    
    -- Pricing and promotions
    cost_of_goods DECIMAL(8,2) DEFAULT 0.00, -- Cost of supplies used
    margin_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN cost_of_goods > 0 
            THEN ROUND(((price - cost_of_goods) / price * 100), 2)
            ELSE NULL
        END
    ) STORED,
    
    -- Advanced features
    requires_consultation BOOLEAN NOT NULL DEFAULT false,
    preparation_time INTEGER DEFAULT 0, -- Minutes needed before service
    cleanup_time INTEGER DEFAULT 0, -- Minutes needed after service
    
    -- Age and gender restrictions
    min_age INTEGER CHECK (min_age >= 0),
    max_age INTEGER CHECK (max_age >= min_age),
    gender_restriction TEXT CHECK (gender_restriction IN ('male', 'female', 'any')),
    
    -- Booking rules
    advance_booking_days INTEGER DEFAULT 30, -- Max days in advance
    cancellation_hours INTEGER DEFAULT 24, -- Hours before cancellation allowed
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    
    -- SEO and marketing
    seo_title TEXT,
    seo_description TEXT,
    marketing_description TEXT
);

-- =====================================================
-- SERVICE ADDONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS service_addons (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Addon details
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(8,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    duration INTEGER NOT NULL DEFAULT 0 CHECK (duration >= 0), -- Additional minutes
    
    -- Availability
    active BOOLEAN NOT NULL DEFAULT true,
    
    -- Compatible services (if empty, available for all services)
    compatible_service_ids UUID[] DEFAULT '{}',
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SERVICE PACKAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS service_packages (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Package details
    name TEXT NOT NULL,
    description TEXT,
    package_price DECIMAL(10,2) NOT NULL CHECK (package_price >= 0),
    
    -- Package composition
    service_ids UUID[] NOT NULL, -- Array of service IDs in package
    discount_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    
    -- Package rules
    must_book_together BOOLEAN NOT NULL DEFAULT true, -- All services in one appointment
    valid_days INTEGER DEFAULT 90, -- Days package is valid for
    
    -- Availability
    active BOOLEAN NOT NULL DEFAULT true,
    popular BOOLEAN NOT NULL DEFAULT false,
    
    -- Performance metrics
    bookings_total INTEGER NOT NULL DEFAULT 0,
    revenue_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- DYNAMIC PRICING RULES TABLE
-- =====================================================

CREATE TYPE pricing_rule_type AS ENUM (
    'time_based',    -- Different prices by time of day/week
    'demand_based',  -- Surge pricing based on demand
    'seasonal',      -- Seasonal pricing adjustments
    'member_discount', -- Loyalty/membership discounts
    'bulk_discount'  -- Multiple service discounts
);

CREATE TABLE IF NOT EXISTS service_pricing_rules (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule details
    name TEXT NOT NULL,
    rule_type pricing_rule_type NOT NULL,
    service_id UUID REFERENCES services(id),
    
    -- Rule conditions (JSON structure)
    conditions JSONB NOT NULL DEFAULT '{}', -- Time ranges, demand thresholds, etc.
    
    -- Pricing adjustment
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed_amount')),
    adjustment_value DECIMAL(8,2) NOT NULL,
    
    -- Rule priority and status
    priority INTEGER NOT NULL DEFAULT 1, -- Higher number = higher priority
    active BOOLEAN NOT NULL DEFAULT true,
    
    -- Effective dates
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Services table indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_popular ON services(popular) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON services USING gin(name gin_trgm_ops) WHERE active = true;

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_services_bookings_month ON services(bookings_this_month DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_revenue_month ON services(revenue_this_month DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_rating ON services(average_rating DESC) WHERE active = true;

-- Pricing and duration indexes
CREATE INDEX IF NOT EXISTS idx_services_price ON services(price) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_duration ON services(duration) WHERE active = true;

-- Staff assignment indexes
CREATE INDEX IF NOT EXISTS idx_services_staff_assignment ON services(available_to_all_staff) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_services_restricted_staff ON services USING gin(restricted_staff_ids) 
    WHERE active = true AND available_to_all_staff = false;

-- Service addons indexes
CREATE INDEX IF NOT EXISTS idx_service_addons_active ON service_addons(active);
CREATE INDEX IF NOT EXISTS idx_service_addons_compatible ON service_addons USING gin(compatible_service_ids);

-- Service packages indexes
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages(active);
CREATE INDEX IF NOT EXISTS idx_service_packages_popular ON service_packages(popular) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_service_packages_services ON service_packages USING gin(service_ids);

-- Pricing rules indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_service_id ON service_pricing_rules(service_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON service_pricing_rules(rule_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON service_pricing_rules(priority DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_effective ON service_pricing_rules(effective_from, effective_until);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Everyone can view active services" ON services
    FOR SELECT 
    USING (active = true);

CREATE POLICY "Staff can view all services" ON services
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can create services" ON services
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "Managers can update services" ON services
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

-- Service addons policies
CREATE POLICY "Everyone can view active addons" ON service_addons
    FOR SELECT 
    USING (active = true);

CREATE POLICY "Managers can manage addons" ON service_addons
    FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- Service packages policies
CREATE POLICY "Everyone can view active packages" ON service_packages
    FOR SELECT 
    USING (active = true);

CREATE POLICY "Managers can manage packages" ON service_packages
    FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- Pricing rules policies
CREATE POLICY "Staff can view pricing rules" ON service_pricing_rules
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can manage pricing rules" ON service_pricing_rules
    FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager', 'owner')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC FIELD UPDATES
-- =====================================================

-- Function to update services updated_at timestamp
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for services table
CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_services_updated_at();

-- Function to set created_by on services insert
CREATE OR REPLACE FUNCTION set_services_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for services creation
CREATE TRIGGER trigger_services_created_by
    BEFORE INSERT ON services
    FOR EACH ROW
    EXECUTE FUNCTION set_services_created_by();

-- =====================================================
-- VIEWS FOR SERVICE ANALYTICS
-- =====================================================

-- View: Service performance summary
CREATE OR REPLACE VIEW service_performance AS
SELECT 
    s.*,
    CASE 
        WHEN s.bookings_total > 0 
        THEN ROUND(s.revenue_total / s.bookings_total, 2)
        ELSE 0
    END as avg_revenue_per_booking,
    CASE 
        WHEN s.bookings_this_month > 0 
        THEN ROUND(s.revenue_this_month / s.bookings_this_month, 2)
        ELSE 0
    END as avg_revenue_per_booking_month,
    -- Market share calculation
    ROUND(
        s.revenue_this_month * 100.0 / NULLIF(
            (SELECT SUM(revenue_this_month) FROM services WHERE active = true), 0
        ), 2
    ) as revenue_market_share_percent
FROM services s
WHERE s.active = true
ORDER BY s.revenue_this_month DESC;

-- View: Service category summary
CREATE OR REPLACE VIEW service_category_analytics AS
SELECT 
    category,
    COUNT(*) as service_count,
    COUNT(CASE WHEN active = true THEN 1 END) as active_service_count,
    COUNT(CASE WHEN popular = true AND active = true THEN 1 END) as popular_service_count,
    ROUND(AVG(CASE WHEN active = true THEN price END), 2) as avg_price,
    ROUND(AVG(CASE WHEN active = true THEN duration END), 0) as avg_duration,
    SUM(CASE WHEN active = true THEN bookings_this_month END) as total_bookings_month,
    ROUND(SUM(CASE WHEN active = true THEN revenue_this_month END), 2) as total_revenue_month,
    ROUND(AVG(CASE WHEN active = true AND total_reviews > 0 THEN average_rating END), 2) as avg_rating
FROM services
GROUP BY category
ORDER BY total_revenue_month DESC NULLS LAST;

-- View: Popular services ranked
CREATE OR REPLACE VIEW popular_services_ranked AS
SELECT 
    s.name,
    s.category,
    s.price,
    s.duration,
    s.bookings_this_month,
    s.revenue_this_month,
    s.average_rating,
    s.total_reviews,
    -- Popularity score calculation
    ROUND(
        (s.bookings_this_month * 0.4) +
        (s.average_rating * s.total_reviews * 0.3) +
        (s.revenue_this_month / 1000.0 * 0.3), 
        2
    ) as popularity_score
FROM services s
WHERE s.active = true 
    AND s.bookings_this_month > 0
ORDER BY popularity_score DESC
LIMIT 20;

-- View: Service profitability analysis
CREATE OR REPLACE VIEW service_profitability AS
SELECT 
    s.id,
    s.name,
    s.category,
    s.price,
    s.cost_of_goods,
    s.margin_percentage,
    s.revenue_this_month,
    COALESCE(s.revenue_this_month - (s.bookings_this_month * s.cost_of_goods), s.revenue_this_month) as gross_profit_month,
    s.bookings_this_month,
    CASE 
        WHEN s.bookings_this_month > 0 
        THEN ROUND(
            (s.revenue_this_month - (s.bookings_this_month * COALESCE(s.cost_of_goods, 0))) / s.bookings_this_month, 
            2
        )
        ELSE 0
    END as profit_per_booking
FROM services s
WHERE s.active = true 
    AND s.bookings_this_month > 0
ORDER BY gross_profit_month DESC;

-- =====================================================
-- FUNCTIONS FOR SERVICE MANAGEMENT
-- =====================================================

-- Function to calculate dynamic service pricing
CREATE OR REPLACE FUNCTION calculate_service_price(
    p_service_id UUID,
    p_booking_date DATE DEFAULT CURRENT_DATE,
    p_booking_time TIME DEFAULT CURRENT_TIME
) RETURNS DECIMAL(8,2) AS $$
DECLARE
    v_base_price DECIMAL(8,2);
    v_final_price DECIMAL(8,2);
    v_rule RECORD;
    v_day_of_week TEXT;
BEGIN
    -- Get base price
    SELECT price INTO v_base_price
    FROM services
    WHERE id = p_service_id AND active = true;
    
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    v_final_price := v_base_price;
    v_day_of_week := LOWER(TO_CHAR(p_booking_date, 'Day'));
    v_day_of_week := TRIM(v_day_of_week);
    
    -- Apply pricing rules in priority order
    FOR v_rule IN 
        SELECT * FROM service_pricing_rules
        WHERE (service_id = p_service_id OR service_id IS NULL)
            AND active = true
            AND effective_from <= (p_booking_date + p_booking_time)::timestamp
            AND (effective_until IS NULL OR effective_until >= (p_booking_date + p_booking_time)::timestamp)
        ORDER BY priority DESC
    LOOP
        -- Apply pricing adjustments based on rule type
        IF v_rule.rule_type = 'time_based' THEN
            -- Check if current time/day matches conditions
            IF v_rule.conditions ? 'days' AND 
               v_rule.conditions->'days' ? v_day_of_week THEN
                IF v_rule.adjustment_type = 'percentage' THEN
                    v_final_price := v_final_price * (1 + v_rule.adjustment_value / 100.0);
                ELSE
                    v_final_price := v_final_price + v_rule.adjustment_value;
                END IF;
            END IF;
        END IF;
        
        -- Add more rule type implementations as needed
    END LOOP;
    
    -- Ensure price doesn't go below base price / 2 or above base price * 2
    v_final_price := GREATEST(v_final_price, v_base_price * 0.5);
    v_final_price := LEAST(v_final_price, v_base_price * 2.0);
    
    RETURN ROUND(v_final_price, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update service performance metrics
CREATE OR REPLACE FUNCTION update_service_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Update monthly metrics from payments
    UPDATE services s
    SET 
        bookings_this_month = COALESCE(p.booking_count, 0),
        revenue_this_month = COALESCE(p.total_revenue, 0.00)
    FROM (
        SELECT 
            service_id,
            COUNT(*) as booking_count,
            SUM(amount) as total_revenue
        FROM payments
        WHERE status = 'completed'
            AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
            AND service_id IS NOT NULL
        GROUP BY service_id
    ) p
    WHERE s.id = p.service_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Update total metrics
    UPDATE services s
    SET 
        bookings_total = COALESCE(p.booking_count, 0),
        revenue_total = COALESCE(p.total_revenue, 0.00)
    FROM (
        SELECT 
            service_id,
            COUNT(*) as booking_count,
            SUM(amount) as total_revenue
        FROM payments
        WHERE status = 'completed'
            AND service_id IS NOT NULL
        GROUP BY service_id
    ) p
    WHERE s.id = p.service_id;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available services for staff member
CREATE OR REPLACE FUNCTION get_available_services_for_staff(p_staff_id UUID)
RETURNS TABLE (
    service_id UUID,
    service_name TEXT,
    category service_category,
    price DECIMAL(8,2),
    duration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.category,
        s.price,
        s.duration
    FROM services s
    WHERE s.active = true
        AND (
            s.available_to_all_staff = true
            OR p_staff_id = ANY(s.restricted_staff_ids)
        )
    ORDER BY s.category, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE services IS 'Service catalog and pricing for 6FB barbershop system';
COMMENT ON COLUMN services.duration IS 'Service duration in minutes';
COMMENT ON COLUMN services.includes IS 'Array of items/steps included in the service';
COMMENT ON COLUMN services.margin_percentage IS 'Profit margin percentage after cost of goods (computed)';
COMMENT ON TABLE service_addons IS 'Optional add-ons that can be purchased with services';
COMMENT ON TABLE service_packages IS 'Service bundles and packages with discounted pricing';
COMMENT ON TABLE service_pricing_rules IS 'Dynamic pricing rules for time-based and demand-based pricing';
COMMENT ON VIEW service_performance IS 'Service performance metrics with revenue per booking calculations';
COMMENT ON VIEW service_category_analytics IS 'Category-level analytics and performance summaries';
COMMENT ON VIEW popular_services_ranked IS 'Most popular services ranked by composite popularity score';
COMMENT ON VIEW service_profitability IS 'Profitability analysis showing gross profit and margins per service';