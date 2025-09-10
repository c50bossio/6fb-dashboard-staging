-- =====================================================
-- PAYMENTS TABLE SCHEMA FOR 6FB AI AGENT SYSTEM
-- =====================================================
-- Based on mock data analysis from app/payments/page.js
-- Supports: Payment processing, commission tracking, financial analytics

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer and service information
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_name TEXT NOT NULL, -- Denormalized for performance
    service_name TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    
    -- Financial details
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tip DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL GENERATED ALWAYS AS (amount + tip) STORED,
    
    -- Payment processing
    payment_method TEXT NOT NULL DEFAULT 'cash'
        CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'digital_wallet', 'bank_transfer')),
    payment_intent_id TEXT, -- Stripe payment intent ID
    payment_processor TEXT DEFAULT 'stripe',
    
    -- Transaction status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    
    -- Commission and fees
    barber_id UUID NOT NULL REFERENCES staff(id),
    barber_name TEXT NOT NULL, -- Denormalized for performance
    commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    commission_rate DECIMAL(5,2), -- Percentage rate used
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Appointment linkage
    appointment_id UUID REFERENCES appointments(id),
    
    -- Transaction timing
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Refund information
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refunded_by UUID REFERENCES auth.users(id),
    
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
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_barber_id ON payments(barber_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_id ON payments(service_id) 
    WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id) 
    WHERE appointment_id IS NOT NULL;

-- Payment processing indexes
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent ON payments(payment_intent_id) 
    WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

-- Financial analytics indexes
CREATE INDEX IF NOT EXISTS idx_payments_transaction_date ON payments(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount DESC);
CREATE INDEX IF NOT EXISTS idx_payments_total ON payments(total DESC);

-- Commission tracking indexes
CREATE INDEX IF NOT EXISTS idx_payments_commission ON payments(commission DESC);
CREATE INDEX IF NOT EXISTS idx_payments_barber_date ON payments(barber_id, transaction_date DESC);

-- Date-based analytics indexes
CREATE INDEX IF NOT EXISTS idx_payments_date_status ON payments(DATE(transaction_date), status);
CREATE INDEX IF NOT EXISTS idx_payments_month_year ON payments(
    DATE_TRUNC('month', transaction_date), status
) WHERE status = 'completed';

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_payments_customer_name_trgm ON payments 
    USING gin(customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_payments_barber_name_trgm ON payments 
    USING gin(barber_name gin_trgm_ops);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all payments (staff need access for reporting)
CREATE POLICY "Staff can view payments" ON payments
    FOR SELECT 
    USING (
        auth.role() = 'authenticated'
    );

-- Policy: Staff can create new payments
CREATE POLICY "Staff can create payments" ON payments
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Policy: Staff can update payment status and details
CREATE POLICY "Staff can update payments" ON payments
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Policy: Only managers can process refunds
CREATE POLICY "Managers can refund payments" ON payments
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
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    
    -- Set processed_at when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.processed_at = now();
    END IF;
    
    -- Set failed_at when status changes to failed
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        NEW.failed_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update fields
CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Function to set created_by on insert
CREATE OR REPLACE FUNCTION set_payments_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set created_by automatically
CREATE TRIGGER trigger_payments_created_by
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION set_payments_created_by();

-- =====================================================
-- VIEWS FOR FINANCIAL ANALYTICS
-- =====================================================

-- View: Daily payment summary
CREATE OR REPLACE VIEW daily_payment_summary AS
SELECT 
    DATE(transaction_date) as payment_date,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN tip END), 0) as total_tips,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as service_revenue,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN commission END), 0) as total_commissions,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee END), 0) as total_platform_fees,
    ROUND(AVG(CASE WHEN status = 'completed' THEN total END), 2) as avg_transaction_amount
FROM payments
GROUP BY DATE(transaction_date)
ORDER BY payment_date DESC;

-- View: Monthly payment summary
CREATE OR REPLACE VIEW monthly_payment_summary AS
SELECT 
    DATE_TRUNC('month', transaction_date) as payment_month,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN tip END), 0) as total_tips,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN commission END), 0) as total_commissions,
    COUNT(DISTINCT CASE WHEN status = 'completed' THEN customer_id END) as unique_customers,
    COUNT(DISTINCT CASE WHEN status = 'completed' THEN barber_id END) as active_barbers
FROM payments
GROUP BY DATE_TRUNC('month', transaction_date)
ORDER BY payment_month DESC;

-- View: Barber commission summary
CREATE OR REPLACE VIEW barber_commission_summary AS
SELECT 
    barber_id,
    barber_name,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_services,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) as total_revenue_generated,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN commission END), 0) as total_commissions_earned,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN tip END), 0) as total_tips_received,
    ROUND(AVG(CASE WHEN status = 'completed' THEN commission_rate END), 2) as avg_commission_rate,
    ROUND(AVG(CASE WHEN status = 'completed' THEN total END), 2) as avg_service_value
FROM payments
WHERE transaction_date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY barber_id, barber_name
ORDER BY total_commissions_earned DESC;

-- View: Payment method analytics
CREATE OR REPLACE VIEW payment_method_analytics AS
SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2) as success_rate,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) as total_revenue,
    ROUND(AVG(CASE WHEN status = 'completed' THEN total END), 2) as avg_transaction_amount
FROM payments
GROUP BY payment_method
ORDER BY total_revenue DESC;

-- =====================================================
-- COMMISSION CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate commission based on barber rate and service amount
CREATE OR REPLACE FUNCTION calculate_commission(
    p_barber_id UUID,
    p_service_amount DECIMAL(10,2),
    p_commission_rate DECIMAL(5,2) DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_commission_amount DECIMAL(10,2);
BEGIN
    -- Use provided rate or get from staff table
    IF p_commission_rate IS NOT NULL THEN
        v_commission_rate := p_commission_rate;
    ELSE
        SELECT commission_rate INTO v_commission_rate
        FROM staff
        WHERE id = p_barber_id AND is_active = true;
        
        -- Default rate if not found
        IF v_commission_rate IS NULL THEN
            v_commission_rate := 70.0; -- 70% default
        END IF;
    END IF;
    
    -- Calculate commission
    v_commission_amount := p_service_amount * (v_commission_rate / 100.0);
    
    RETURN v_commission_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE payments IS 'Payment transactions and financial records for 6FB barbershop system';
COMMENT ON COLUMN payments.total IS 'Computed total of amount + tip';
COMMENT ON COLUMN payments.commission IS 'Commission amount paid to barber';
COMMENT ON COLUMN payments.platform_fee IS 'Fee charged by payment processor';
COMMENT ON COLUMN payments.metadata IS 'Additional payment processor metadata (JSON)';
COMMENT ON VIEW daily_payment_summary IS 'Daily aggregated payment statistics and revenue metrics';
COMMENT ON VIEW monthly_payment_summary IS 'Monthly aggregated payment statistics and revenue metrics';
COMMENT ON VIEW barber_commission_summary IS 'Current week commission earnings by barber';
COMMENT ON VIEW payment_method_analytics IS 'Payment method performance and success rates';