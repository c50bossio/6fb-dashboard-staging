-- Phase 7-8 Customer Insights & Purchase Analysis Database Schema
-- Advanced customer behavior analysis and retention tools

-- Customer Lifetime Value Tracking
-- Calculate and track CLV for each customer
CREATE TABLE customer_lifetime_value (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- CLV Metrics
    calculated_date DATE DEFAULT CURRENT_DATE,
    calculation_period_months INTEGER DEFAULT 12, -- Period used for calculation
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_visits INTEGER NOT NULL DEFAULT 0,
    average_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    visit_frequency DECIMAL(8,4) NOT NULL DEFAULT 0, -- Visits per month
    customer_lifespan_months DECIMAL(8,2) NOT NULL DEFAULT 0,
    
    -- CLV Calculations
    historical_clv DECIMAL(12,2) NOT NULL DEFAULT 0, -- Based on actual data
    predicted_clv DECIMAL(12,2) NOT NULL DEFAULT 0, -- ML prediction
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    
    -- Segmentation
    value_segment VARCHAR(20) DEFAULT 'medium' CHECK (value_segment IN ('low', 'medium', 'high', 'vip')),
    churn_risk_score DECIMAL(5,4) DEFAULT 0.5, -- 0 = low risk, 1 = high risk
    loyalty_score DECIMAL(5,4) DEFAULT 0.5, -- 0 = not loyal, 1 = very loyal
    
    -- Behavioral patterns
    preferred_services JSONB, -- Array of service preferences with scores
    seasonal_patterns JSONB, -- Monthly visit patterns
    price_sensitivity DECIMAL(5,4) DEFAULT 0.5, -- 0 = price insensitive, 1 = very sensitive
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_clv_date UNIQUE (customer_id, shop_id, calculated_date),
    
    -- Indexes for customer analytics
    INDEX idx_clv_shop_segment (shop_id, value_segment),
    INDEX idx_clv_predicted_value (predicted_clv DESC),
    INDEX idx_clv_churn_risk (churn_risk_score DESC),
    INDEX idx_clv_loyalty (loyalty_score DESC),
    INDEX idx_clv_calculation_date (calculated_date DESC)
);

-- Customer Segmentation Analysis
-- Dynamic customer segments based on behavior and value
CREATE TABLE customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    segment_name VARCHAR(100) NOT NULL,
    segment_description TEXT,
    
    -- Segment criteria
    criteria JSONB NOT NULL, -- Dynamic criteria for segment membership
    segment_type VARCHAR(30) DEFAULT 'behavioral' CHECK (segment_type IN (
        'behavioral', 'demographic', 'value_based', 'lifecycle', 'custom'
    )),
    
    -- Segment metrics
    customer_count INTEGER DEFAULT 0,
    avg_clv DECIMAL(12,2) DEFAULT 0,
    avg_visit_frequency DECIMAL(8,4) DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Marketing insights
    recommended_campaigns JSONB, -- Suggested marketing approaches
    retention_strategies JSONB, -- Retention recommendations
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_shop_segment_name UNIQUE (shop_id, segment_name),
    
    INDEX idx_segments_shop_active (shop_id, is_active),
    INDEX idx_segments_type (segment_type),
    INDEX idx_segments_customer_count (customer_count DESC)
);

-- Customer Segment Membership
-- Track which customers belong to which segments
CREATE TABLE customer_segment_membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Membership details
    joined_segment_date DATE DEFAULT CURRENT_DATE,
    membership_score DECIMAL(5,4) DEFAULT 1.0, -- How well they fit the segment (0-1)
    is_primary_segment BOOLEAN DEFAULT FALSE, -- Main segment for this customer
    
    -- Segment performance for this customer
    segment_clv_contribution DECIMAL(10,2) DEFAULT 0,
    segment_engagement_score DECIMAL(5,4) DEFAULT 0.5,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_segment UNIQUE (customer_id, segment_id),
    
    INDEX idx_segment_membership_customer (customer_id),
    INDEX idx_segment_membership_segment (segment_id),
    INDEX idx_segment_membership_shop (shop_id),
    INDEX idx_segment_membership_primary (is_primary_segment)
);

-- Purchase Behavior Analysis
-- Detailed analysis of customer purchase patterns
CREATE TABLE customer_behavior_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Analysis period
    analysis_date DATE DEFAULT CURRENT_DATE,
    analysis_period_days INTEGER DEFAULT 90,
    
    -- Visit patterns
    total_visits INTEGER DEFAULT 0,
    avg_days_between_visits DECIMAL(8,2) DEFAULT 0,
    visit_consistency_score DECIMAL(5,4) DEFAULT 0.5, -- How regular are visits
    preferred_days_of_week INTEGER[] DEFAULT '{}', -- Array of preferred weekdays (1-7)
    preferred_times_of_day VARCHAR(20)[] DEFAULT '{}', -- 'morning', 'afternoon', 'evening'
    
    -- Service preferences
    primary_service_category VARCHAR(100),
    service_diversity_score DECIMAL(5,4) DEFAULT 0, -- How many different services they try
    upsell_acceptance_rate DECIMAL(5,4) DEFAULT 0, -- Rate of accepting upsells
    addon_purchase_rate DECIMAL(5,4) DEFAULT 0, -- Rate of buying add-on products
    
    -- Spending behavior
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_transaction_value DECIMAL(10,2) DEFAULT 0,
    spending_growth_rate DECIMAL(8,4) DEFAULT 0, -- % change in spending
    price_point_preference VARCHAR(20) DEFAULT 'medium' CHECK (price_point_preference IN ('budget', 'medium', 'premium', 'luxury')),
    
    -- Engagement metrics
    appointment_cancellation_rate DECIMAL(5,4) DEFAULT 0,
    no_show_rate DECIMAL(5,4) DEFAULT 0,
    rebooking_rate DECIMAL(5,4) DEFAULT 0, -- % who book again after visit
    referral_count INTEGER DEFAULT 0, -- How many people they've referred
    
    -- Satisfaction indicators
    avg_rating DECIMAL(3,2) DEFAULT 0, -- If ratings/reviews are collected
    complaint_count INTEGER DEFAULT 0,
    compliment_count INTEGER DEFAULT 0,
    net_promoter_score INTEGER, -- NPS if collected
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_behavior_date UNIQUE (customer_id, shop_id, analysis_date),
    
    INDEX idx_behavior_analysis_shop_date (shop_id, analysis_date DESC),
    INDEX idx_behavior_analysis_customer (customer_id),
    INDEX idx_behavior_analysis_spending (total_spent DESC),
    INDEX idx_behavior_analysis_engagement (rebooking_rate DESC, no_show_rate ASC)
);

-- Retention Risk Analysis
-- Identify customers at risk of churning
CREATE TABLE customer_retention_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Risk assessment
    analysis_date DATE DEFAULT CURRENT_DATE,
    churn_risk_score DECIMAL(5,4) NOT NULL, -- 0 = no risk, 1 = high risk
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    confidence_level DECIMAL(5,4) DEFAULT 0.5,
    
    -- Risk factors
    days_since_last_visit INTEGER,
    expected_return_date DATE,
    days_overdue INTEGER DEFAULT 0,
    visit_frequency_decline DECIMAL(5,4) DEFAULT 0, -- % decline in visit frequency
    spending_decline DECIMAL(5,4) DEFAULT 0, -- % decline in spending
    
    -- Behavioral changes
    service_switching_increase BOOLEAN DEFAULT FALSE,
    price_sensitivity_increase BOOLEAN DEFAULT FALSE,
    cancellation_rate_increase BOOLEAN DEFAULT FALSE,
    engagement_score_decline DECIMAL(5,4) DEFAULT 0,
    
    -- Retention recommendations
    recommended_actions JSONB, -- Suggested retention strategies
    intervention_priority INTEGER DEFAULT 50, -- 1-100 priority score
    estimated_clv_at_risk DECIMAL(10,2) DEFAULT 0, -- Revenue at risk if customer churns
    
    -- Intervention tracking
    intervention_attempted BOOLEAN DEFAULT FALSE,
    intervention_date TIMESTAMPTZ,
    intervention_type VARCHAR(50),
    intervention_successful BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_retention_shop_risk (shop_id, risk_level),
    INDEX idx_retention_churn_score (churn_risk_score DESC),
    INDEX idx_retention_priority (intervention_priority DESC),
    INDEX idx_retention_overdue (days_overdue DESC)
);

-- Marketing Campaign Performance
-- Track effectiveness of marketing campaigns on customer segments
CREATE TABLE marketing_campaign_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'retention' CHECK (campaign_type IN (
        'acquisition', 'retention', 'winback', 'upsell', 'seasonal', 'loyalty'
    )),
    
    -- Campaign details
    start_date DATE NOT NULL,
    end_date DATE,
    target_segment_ids UUID[], -- Array of segment IDs targeted
    campaign_budget DECIMAL(10,2) DEFAULT 0,
    
    -- Performance metrics
    customers_targeted INTEGER DEFAULT 0,
    customers_reached INTEGER DEFAULT 0,
    customers_engaged INTEGER DEFAULT 0, -- Opened email, clicked link, etc.
    customers_converted INTEGER DEFAULT 0, -- Made purchase/booking
    
    -- Financial results
    total_revenue_generated DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    roi DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN total_cost > 0 THEN (total_revenue_generated - total_cost) / total_cost
            ELSE 0
        END
    ) STORED,
    
    -- Engagement metrics
    open_rate DECIMAL(5,4) DEFAULT 0, -- For email campaigns
    click_rate DECIMAL(5,4) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    unsubscribe_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Results by segment
    segment_performance JSONB, -- Performance breakdown by segment
    
    campaign_status VARCHAR(20) DEFAULT 'active' CHECK (campaign_status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_campaign_performance_shop (shop_id),
    INDEX idx_campaign_performance_type (campaign_type),
    INDEX idx_campaign_performance_roi (roi DESC),
    INDEX idx_campaign_performance_dates (start_date, end_date)
);

-- Customer Journey Mapping
-- Track customer progression through different stages
CREATE TABLE customer_journey_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Journey stage
    stage_name VARCHAR(50) NOT NULL CHECK (stage_name IN (
        'awareness', 'interest', 'first_visit', 'regular', 'loyal', 'advocate', 'at_risk', 'churned', 'won_back'
    )),
    entered_stage_date DATE DEFAULT CURRENT_DATE,
    stage_duration_days INTEGER DEFAULT 0,
    
    -- Stage metrics
    stage_revenue DECIMAL(10,2) DEFAULT 0,
    stage_visits INTEGER DEFAULT 0,
    stage_satisfaction DECIMAL(3,2) DEFAULT 0,
    
    -- Progression tracking
    previous_stage VARCHAR(50),
    next_expected_stage VARCHAR(50),
    progression_probability DECIMAL(5,4) DEFAULT 0.5, -- Likelihood of moving to next stage
    
    -- Stage-specific data
    stage_attributes JSONB, -- Custom attributes for each stage
    milestones_achieved JSONB, -- Key milestones reached in this stage
    
    is_current_stage BOOLEAN DEFAULT TRUE,
    exited_stage_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_journey_customer_current (customer_id, is_current_stage),
    INDEX idx_journey_shop_stage (shop_id, stage_name),
    INDEX idx_journey_progression (progression_probability DESC),
    INDEX idx_journey_dates (entered_stage_date DESC)
);

-- Customer Insights Summary
-- Pre-calculated summary insights for dashboard performance
CREATE TABLE customer_insights_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Summary period
    summary_date DATE DEFAULT CURRENT_DATE,
    summary_type VARCHAR(20) DEFAULT 'monthly' CHECK (summary_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Customer base metrics
    total_customers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0, -- Visited in period
    new_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,
    
    -- Value metrics
    total_clv DECIMAL(15,2) DEFAULT 0,
    avg_clv DECIMAL(12,2) DEFAULT 0,
    median_clv DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Retention metrics
    customer_retention_rate DECIMAL(5,4) DEFAULT 0,
    churn_rate DECIMAL(5,4) DEFAULT 0,
    avg_customer_lifespan_months DECIMAL(8,2) DEFAULT 0,
    
    -- Engagement metrics
    avg_visit_frequency DECIMAL(8,4) DEFAULT 0,
    avg_days_between_visits DECIMAL(8,2) DEFAULT 0,
    no_show_rate DECIMAL(5,4) DEFAULT 0,
    rebooking_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Segmentation breakdown
    segment_distribution JSONB, -- Count of customers in each segment
    high_value_customers_count INTEGER DEFAULT 0,
    at_risk_customers_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_shop_summary_date_type UNIQUE (shop_id, summary_date, summary_type),
    
    INDEX idx_insights_summary_shop_date (shop_id, summary_date DESC),
    INDEX idx_insights_summary_type (summary_type)
);

-- Create update triggers
CREATE TRIGGER update_clv_updated_at
    BEFORE UPDATE ON customer_lifetime_value
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segments_updated_at
    BEFORE UPDATE ON customer_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segment_membership_updated_at
    BEFORE UPDATE ON customer_segment_membership
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavior_analysis_updated_at
    BEFORE UPDATE ON customer_behavior_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_analysis_updated_at
    BEFORE UPDATE ON customer_retention_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_performance_updated_at
    BEFORE UPDATE ON marketing_campaign_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_stages_updated_at
    BEFORE UPDATE ON customer_journey_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common customer insights queries

-- Customer Value Dashboard View
CREATE VIEW v_customer_value_dashboard AS
SELECT 
    clv.shop_id,
    clv.customer_id,
    c.name as customer_name,
    c.email,
    c.phone,
    clv.predicted_clv,
    clv.value_segment,
    clv.churn_risk_score,
    clv.loyalty_score,
    clv.total_visits,
    clv.average_order_value,
    clv.visit_frequency,
    ba.days_since_last_visit,
    ra.risk_level as retention_risk_level,
    js.stage_name as current_journey_stage
FROM customer_lifetime_value clv
JOIN customers c ON clv.customer_id = c.id
LEFT JOIN customer_behavior_analysis ba ON clv.customer_id = ba.customer_id 
    AND ba.analysis_date = (SELECT MAX(analysis_date) FROM customer_behavior_analysis WHERE customer_id = ba.customer_id)
LEFT JOIN customer_retention_analysis ra ON clv.customer_id = ra.customer_id
    AND ra.analysis_date = (SELECT MAX(analysis_date) FROM customer_retention_analysis WHERE customer_id = ra.customer_id)
LEFT JOIN customer_journey_stages js ON clv.customer_id = js.customer_id 
    AND js.is_current_stage = TRUE
WHERE clv.calculated_date = (SELECT MAX(calculated_date) FROM customer_lifetime_value WHERE customer_id = clv.customer_id)
ORDER BY clv.predicted_clv DESC;

-- High-Risk Customer Alert View
CREATE VIEW v_high_risk_customers AS
SELECT 
    ra.shop_id,
    ra.customer_id,
    c.name as customer_name,
    c.email,
    ra.churn_risk_score,
    ra.risk_level,
    ra.days_since_last_visit,
    ra.days_overdue,
    ra.estimated_clv_at_risk,
    ra.intervention_priority,
    ra.recommended_actions,
    clv.predicted_clv,
    clv.value_segment
FROM customer_retention_analysis ra
JOIN customers c ON ra.customer_id = c.id
JOIN customer_lifetime_value clv ON ra.customer_id = clv.customer_id
WHERE ra.risk_level IN ('high', 'critical')
    AND ra.intervention_attempted = FALSE
    AND ra.analysis_date = (SELECT MAX(analysis_date) FROM customer_retention_analysis WHERE customer_id = ra.customer_id)
ORDER BY ra.intervention_priority DESC, ra.estimated_clv_at_risk DESC;

-- Segment Performance Summary View
CREATE VIEW v_segment_performance_summary AS
SELECT 
    s.shop_id,
    s.segment_name,
    s.segment_type,
    s.customer_count,
    s.avg_clv,
    s.total_revenue,
    AVG(clv.churn_risk_score) as avg_churn_risk,
    AVG(clv.loyalty_score) as avg_loyalty_score,
    COUNT(*) FILTER (WHERE ra.risk_level = 'high') as high_risk_customers,
    AVG(ba.rebooking_rate) as avg_rebooking_rate
FROM customer_segments s
LEFT JOIN customer_segment_membership csm ON s.id = csm.segment_id
LEFT JOIN customer_lifetime_value clv ON csm.customer_id = clv.customer_id
LEFT JOIN customer_retention_analysis ra ON csm.customer_id = ra.customer_id
LEFT JOIN customer_behavior_analysis ba ON csm.customer_id = ba.customer_id
WHERE s.is_active = TRUE
GROUP BY s.shop_id, s.id, s.segment_name, s.segment_type, s.customer_count, s.avg_clv, s.total_revenue
ORDER BY s.total_revenue DESC;

-- Functions for customer insights

-- Function to calculate CLV
CREATE OR REPLACE FUNCTION calculate_customer_clv(
    customer_uuid UUID,
    shop_uuid UUID,
    calculation_months INTEGER DEFAULT 12
) RETURNS DECIMAL AS $$
DECLARE
    total_revenue DECIMAL := 0;
    total_visits INTEGER := 0;
    avg_order_value DECIMAL := 0;
    visit_frequency DECIMAL := 0;
    predicted_lifespan DECIMAL := 24; -- Default 2 years
    clv_result DECIMAL := 0;
BEGIN
    -- Get historical data
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(*),
        COALESCE(AVG(total_amount), 0)
    INTO total_revenue, total_visits, avg_order_value
    FROM appointments a
    WHERE a.customer_id = customer_uuid
        AND a.shop_id = shop_uuid
        AND a.date >= CURRENT_DATE - (calculation_months || ' months')::interval
        AND a.status = 'completed';
    
    -- Calculate visit frequency (visits per month)
    visit_frequency = total_visits::decimal / calculation_months;
    
    -- Simple CLV calculation: AOV * Visits per month * Predicted lifespan in months
    IF visit_frequency > 0 AND avg_order_value > 0 THEN
        clv_result = avg_order_value * visit_frequency * predicted_lifespan;
    END IF;
    
    RETURN GREATEST(clv_result, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update customer insights
CREATE OR REPLACE FUNCTION update_customer_insights(shop_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    customer_record RECORD;
    insights_updated INTEGER := 0;
BEGIN
    -- Update CLV for all customers
    FOR customer_record IN 
        SELECT id FROM customers WHERE shop_id = shop_uuid AND is_active = true
    LOOP
        -- Calculate and update CLV
        INSERT INTO customer_lifetime_value (
            customer_id, shop_id, calculated_date,
            total_revenue, predicted_clv, confidence_score
        ) 
        SELECT 
            customer_record.id,
            shop_uuid,
            CURRENT_DATE,
            COALESCE(SUM(total_amount), 0),
            calculate_customer_clv(customer_record.id, shop_uuid),
            0.7 -- Default confidence
        FROM appointments
        WHERE customer_id = customer_record.id 
            AND shop_id = shop_uuid
            AND status = 'completed'
            AND date >= CURRENT_DATE - INTERVAL '12 months'
        ON CONFLICT (customer_id, shop_id, calculated_date)
        DO UPDATE SET
            predicted_clv = EXCLUDED.predicted_clv,
            total_revenue = EXCLUDED.total_revenue,
            updated_at = NOW();
        
        insights_updated = insights_updated + 1;
    END LOOP;
    
    RETURN insights_updated;
END;
$$ LANGUAGE plpgsql;

-- Sample data seeding function
CREATE OR REPLACE FUNCTION seed_customer_insights_data(shop_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Generate sample CLV data
    INSERT INTO customer_lifetime_value (
        customer_id, shop_id, predicted_clv, value_segment,
        churn_risk_score, loyalty_score, total_visits, average_order_value
    )
    SELECT 
        c.id,
        shop_uuid,
        (RANDOM() * 2000 + 200)::decimal(12,2), -- CLV between $200-$2200
        CASE 
            WHEN RANDOM() < 0.1 THEN 'vip'
            WHEN RANDOM() < 0.3 THEN 'high'
            WHEN RANDOM() < 0.7 THEN 'medium'
            ELSE 'low'
        END,
        RANDOM()::decimal(5,4), -- Random churn risk
        RANDOM()::decimal(5,4), -- Random loyalty score
        (RANDOM() * 20 + 1)::integer, -- 1-21 visits
        (RANDOM() * 100 + 20)::decimal(10,2) -- $20-$120 average order
    FROM customers c
    WHERE c.shop_id = shop_uuid AND c.is_active = true
    ON CONFLICT (customer_id, shop_id, calculated_date) DO NOTHING;
    
    RAISE NOTICE 'Sample customer insights data seeded for shop %', shop_uuid;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization
ANALYZE customer_lifetime_value;
ANALYZE customer_segments;
ANALYZE customer_segment_membership;
ANALYZE customer_behavior_analysis;
ANALYZE customer_retention_analysis;
ANALYZE marketing_campaign_performance;
ANALYZE customer_journey_stages;
ANALYZE customer_insights_summary;

-- Table comments
COMMENT ON TABLE customer_lifetime_value IS 'Customer lifetime value calculations and predictions';
COMMENT ON TABLE customer_segments IS 'Dynamic customer segmentation for targeted marketing';
COMMENT ON TABLE customer_segment_membership IS 'Tracks which customers belong to which segments';
COMMENT ON TABLE customer_behavior_analysis IS 'Detailed analysis of customer purchase and visit patterns';
COMMENT ON TABLE customer_retention_analysis IS 'Churn risk assessment and retention recommendations';
COMMENT ON TABLE marketing_campaign_performance IS 'Track effectiveness of marketing campaigns';
COMMENT ON TABLE customer_journey_stages IS 'Customer progression through lifecycle stages';
COMMENT ON TABLE customer_insights_summary IS 'Pre-calculated insights for dashboard performance';