-- =====================================================
-- CUSTOMERS TABLE SCHEMA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data analysis from app/customers/page.js
-- Supports: Customer management, loyalty tracking, preferences

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal information
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    
    -- Profile and membership
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'vip')),
    
    -- Visit and spending analytics
    total_visits INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    last_visit DATE,
    
    -- Customer preferences
    preferred_barber_id UUID REFERENCES staff(id),
    notes TEXT,
    
    -- Loyalty and engagement
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Soft delete support
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) 
    WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- Search and filtering indexes
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers 
    USING gin(name gin_trgm_ops) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status) 
    WHERE deleted_at IS NULL;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_loyalty_points ON customers(loyalty_points DESC) 
    WHERE deleted_at IS NULL;

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber ON customers(preferred_barber_id) 
    WHERE deleted_at IS NULL AND preferred_barber_id IS NOT NULL;

-- Operational indexes
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active customers in their organization
CREATE POLICY "Users can view customers" ON customers
    FOR SELECT 
    USING (
        deleted_at IS NULL 
        AND auth.role() = 'authenticated'
    );

-- Policy: Staff can create new customers
CREATE POLICY "Staff can create customers" ON customers
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND deleted_at IS NULL
    );

-- Policy: Staff can update customer information
CREATE POLICY "Staff can update customers" ON customers
    FOR UPDATE 
    USING (
        deleted_at IS NULL 
        AND auth.role() = 'authenticated'
    )
    WITH CHECK (
        deleted_at IS NULL 
        AND auth.role() = 'authenticated'
    );

-- Policy: Only managers can soft delete customers
CREATE POLICY "Managers can delete customers" ON customers
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            auth.jwt() ->> 'user_role' IN ('admin', 'manager')
            OR auth.jwt() ->> 'role' IN ('admin', 'manager')
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC FIELD UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Function to set created_by on insert
CREATE OR REPLACE FUNCTION set_customers_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set created_by automatically
CREATE TRIGGER trigger_customers_created_by
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customers_created_by();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Active customers with computed fields
CREATE OR REPLACE VIEW active_customers AS
SELECT 
    c.*,
    s.name as preferred_barber_name,
    CASE 
        WHEN c.last_visit IS NULL THEN 'Never visited'
        WHEN c.last_visit < CURRENT_DATE - INTERVAL '30 days' THEN 'Inactive'
        WHEN c.last_visit < CURRENT_DATE - INTERVAL '7 days' THEN 'At risk'
        ELSE 'Active'
    END as visit_status,
    CASE 
        WHEN c.total_spent >= 1000 THEN 'high_value'
        WHEN c.total_spent >= 500 THEN 'medium_value'
        ELSE 'standard'
    END as value_tier
FROM customers c
LEFT JOIN staff s ON c.preferred_barber_id = s.id
WHERE c.deleted_at IS NULL
ORDER BY c.last_visit DESC NULLS LAST;

-- View: Customer analytics summary
CREATE OR REPLACE VIEW customer_analytics AS
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
    COUNT(CASE WHEN status = 'vip' THEN 1 END) as vip_customers,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_customers,
    ROUND(AVG(total_spent), 2) as avg_total_spent,
    ROUND(AVG(total_visits), 1) as avg_total_visits,
    ROUND(AVG(loyalty_points), 0) as avg_loyalty_points,
    COUNT(CASE WHEN last_visit >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_visitors,
    COUNT(CASE WHEN last_visit < CURRENT_DATE - INTERVAL '90 days' OR last_visit IS NULL THEN 1 END) as at_risk_customers
FROM customers
WHERE deleted_at IS NULL;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE customers IS 'Customer information and relationship management for 6FB barbershop system';
COMMENT ON COLUMN customers.status IS 'Customer status: active, inactive, or vip';
COMMENT ON COLUMN customers.total_visits IS 'Total number of completed appointments';
COMMENT ON COLUMN customers.total_spent IS 'Total amount spent across all appointments';
COMMENT ON COLUMN customers.loyalty_points IS 'Accumulated loyalty points for rewards program';
COMMENT ON COLUMN customers.preferred_barber_id IS 'Reference to preferred staff member';
COMMENT ON VIEW active_customers IS 'Active customers with enriched data including barber names and status calculations';
COMMENT ON VIEW customer_analytics IS 'Real-time analytics summary of customer base metrics';