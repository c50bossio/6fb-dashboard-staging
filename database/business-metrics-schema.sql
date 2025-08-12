-- Business Metrics Table Schema for 6FB AI Agent System
-- Purpose: Store daily, weekly, and monthly business performance metrics

CREATE TABLE IF NOT EXISTS business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Metric Period
    metric_date DATE NOT NULL,
    metric_period VARCHAR(10) NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
    
    -- Revenue Metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    service_revenue DECIMAL(10,2) DEFAULT 0,
    tip_revenue DECIMAL(10,2) DEFAULT 0,
    product_revenue DECIMAL(10,2) DEFAULT 0,
    average_booking_value DECIMAL(8,2) DEFAULT 0,
    
    -- Booking Metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    no_show_bookings INTEGER DEFAULT 0,
    walk_in_bookings INTEGER DEFAULT 0,
    
    -- Customer Metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    customer_retention_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Staff Performance
    total_staff_hours DECIMAL(8,2) DEFAULT 0,
    billable_hours DECIMAL(8,2) DEFAULT 0,
    staff_utilization_rate DECIMAL(5,2) DEFAULT 0,
    average_service_time INTEGER DEFAULT 0, -- in minutes
    
    -- Operational Metrics
    chair_utilization_rate DECIMAL(5,2) DEFAULT 0,
    peak_hours_capacity DECIMAL(5,2) DEFAULT 0,
    off_peak_capacity DECIMAL(5,2) DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0, -- in minutes
    
    -- Customer Satisfaction
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    customer_satisfaction_score DECIMAL(5,2) DEFAULT 0,
    
    -- Product/Inventory Metrics
    products_sold INTEGER DEFAULT 0,
    low_stock_alerts INTEGER DEFAULT 0,
    inventory_turnover_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Financial Health
    cost_per_booking DECIMAL(8,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    operating_expenses DECIMAL(10,2) DEFAULT 0,
    
    -- Growth Metrics
    booking_growth_rate DECIMAL(5,2) DEFAULT 0,
    revenue_growth_rate DECIMAL(5,2) DEFAULT 0,
    customer_acquisition_cost DECIMAL(8,2) DEFAULT 0,
    lifetime_value_ratio DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, metric_date, metric_period)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_business_metrics_barbershop_date ON business_metrics(barbershop_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON business_metrics(metric_period, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_revenue ON business_metrics(total_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_bookings ON business_metrics(total_bookings DESC);

-- Row Level Security
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view business metrics for their barbershop" ON business_metrics
    FOR SELECT USING (
        barbershop_id IN (
            SELECT barbershop_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Shop owners can insert metrics for their barbershop" ON business_metrics
    FOR INSERT WITH CHECK (
        barbershop_id IN (
            SELECT barbershop_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Shop owners can update metrics for their barbershop" ON business_metrics
    FOR UPDATE USING (
        barbershop_id IN (
            SELECT barbershop_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
        )
    );

-- Comments for documentation
COMMENT ON TABLE business_metrics IS 'Comprehensive business performance metrics for barbershops';
COMMENT ON COLUMN business_metrics.metric_period IS 'daily, weekly, or monthly aggregation period';
COMMENT ON COLUMN business_metrics.total_revenue IS 'Total revenue including all sources';
COMMENT ON COLUMN business_metrics.staff_utilization_rate IS 'Percentage of available staff time utilized';
COMMENT ON COLUMN business_metrics.chair_utilization_rate IS 'Percentage of chair/station capacity utilized';
COMMENT ON COLUMN business_metrics.customer_retention_rate IS 'Percentage of customers who return';
COMMENT ON COLUMN business_metrics.profit_margin IS 'Profit margin percentage';