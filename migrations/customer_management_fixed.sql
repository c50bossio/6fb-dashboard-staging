-- Fixed Migration: Customer Management Database Schema
-- Compatible with existing database structure
-- Author: System
-- Date: 2025-08-21
-- 
-- This migration creates customer management tables compatible with existing schema
-- Handles TEXT vs UUID data type compatibility issues

-- Check existing customers table structure first
-- If customers.id is TEXT, use TEXT for foreign keys
-- If customers.id is UUID, use UUID for foreign keys

-- ============================================
-- 1. CUSTOMER LIFECYCLE MANAGEMENT
-- ============================================

-- Customer Lifecycle Stages Definition
CREATE TABLE IF NOT EXISTS customer_lifecycle_stages (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Stage Definition
    stage_name VARCHAR(100) NOT NULL,
    stage_description TEXT,
    stage_order INTEGER DEFAULT 1,
    
    -- Configuration
    auto_transition BOOLEAN DEFAULT false,
    transition_criteria JSONB DEFAULT '{}',
    actions_on_entry JSONB DEFAULT '[]',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, stage_name),
    UNIQUE(barbershop_id, stage_order)
);

-- Customer Health Scores (0-100 scoring system)
CREATE TABLE IF NOT EXISTS customer_health_scores (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Health Score Components (0-100 scale each)
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    recency_score INTEGER DEFAULT 0 CHECK (recency_score >= 0 AND recency_score <= 100),
    frequency_score INTEGER DEFAULT 0 CHECK (frequency_score >= 0 AND frequency_score <= 100),
    monetary_score INTEGER DEFAULT 0 CHECK (monetary_score >= 0 AND monetary_score <= 100),
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    satisfaction_score INTEGER DEFAULT 0 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
    
    -- Risk Assessment
    churn_risk_level VARCHAR(20) DEFAULT 'low' CHECK (churn_risk_level IN ('low', 'medium', 'high', 'critical')),
    churn_probability DECIMAL(5,4) DEFAULT 0.0000 CHECK (churn_probability >= 0 AND churn_probability <= 1),
    
    -- Trend Analysis
    score_trend VARCHAR(20) DEFAULT 'stable' CHECK (score_trend IN ('improving', 'stable', 'declining')),
    previous_score INTEGER,
    score_change INTEGER DEFAULT 0,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    calculation_version INTEGER DEFAULT 1,
    
    -- Constraints
    UNIQUE(customer_id, DATE(calculated_at))
);

-- Customer Journey Tracking
CREATE TABLE IF NOT EXISTS customer_journeys (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Journey Information
    touchpoint_type VARCHAR(50) NOT NULL, -- 'appointment', 'email', 'sms', 'call', 'review', 'campaign'
    touchpoint_source VARCHAR(100), -- Specific source identifier
    interaction_data JSONB DEFAULT '{}',
    
    -- Journey Stage
    lifecycle_stage VARCHAR(50) DEFAULT 'prospect',
    stage_changed BOOLEAN DEFAULT false,
    previous_stage VARCHAR(50),
    
    -- Engagement Metrics
    engagement_level VARCHAR(20) DEFAULT 'medium' CHECK (engagement_level IN ('low', 'medium', 'high')),
    response_time_minutes INTEGER,
    interaction_quality DECIMAL(3,2) DEFAULT 0.0,
    
    -- Attribution
    channel VARCHAR(50),
    campaign_id TEXT,
    staff_member_id TEXT,
    
    -- Metadata
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Milestones
CREATE TABLE IF NOT EXISTS customer_milestones (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Milestone Information
    milestone_type VARCHAR(50) NOT NULL, -- 'first_visit', 'loyalty_tier', 'spending_threshold', 'anniversary'
    milestone_name VARCHAR(200) NOT NULL,
    milestone_description TEXT,
    
    -- Achievement Data
    achieved_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    achievement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Rewards/Recognition
    reward_given BOOLEAN DEFAULT false,
    reward_type VARCHAR(50),
    reward_value DECIMAL(10,2),
    
    -- Metadata
    is_celebrated BOOLEAN DEFAULT false,
    celebration_method VARCHAR(50), -- 'email', 'sms', 'in_person', 'loyalty_points'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CUSTOMER ANALYTICS & INTELLIGENCE
-- ============================================

-- Customer Analytics Summary (Pre-calculated metrics)
CREATE TABLE IF NOT EXISTS customer_analytics_summary (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Time Period
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Visit Metrics
    total_visits INTEGER DEFAULT 0,
    unique_services INTEGER DEFAULT 0,
    avg_visit_interval_days DECIMAL(5,2) DEFAULT 0.0,
    
    -- Financial Metrics
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    avg_transaction_value DECIMAL(10,2) DEFAULT 0.00,
    highest_transaction DECIMAL(10,2) DEFAULT 0.00,
    
    -- Engagement Metrics
    email_opens INTEGER DEFAULT 0,
    email_clicks INTEGER DEFAULT 0,
    sms_responses INTEGER DEFAULT 0,
    campaign_responses INTEGER DEFAULT 0,
    
    -- Satisfaction Metrics
    avg_rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    nps_score INTEGER,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    data_quality_score DECIMAL(3,2) DEFAULT 1.0,
    
    -- Constraints
    UNIQUE(customer_id, period_type, period_start)
);

-- Customer Cohorts
CREATE TABLE IF NOT EXISTS customer_cohorts (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Cohort Definition
    cohort_name VARCHAR(100) NOT NULL,
    cohort_type VARCHAR(50) NOT NULL, -- 'acquisition_month', 'first_service', 'signup_channel', 'custom'
    cohort_period DATE NOT NULL, -- The period this cohort represents (e.g., 2024-01 for January 2024 acquisition)
    
    -- Cohort Metrics
    total_customers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0,
    retention_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Financial Performance
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_customer_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Time-based Analysis
    month_0_retention DECIMAL(5,4) DEFAULT 1.0000, -- Always 1.0 for month 0
    month_1_retention DECIMAL(5,4) DEFAULT 0.0000,
    month_3_retention DECIMAL(5,4) DEFAULT 0.0000,
    month_6_retention DECIMAL(5,4) DEFAULT 0.0000,
    month_12_retention DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Metadata
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, cohort_name, cohort_period)
);

-- Customer Lifetime Value (CLV) Calculations
CREATE TABLE IF NOT EXISTS clv_calculations (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- CLV Methods
    historical_clv DECIMAL(10,2) DEFAULT 0.00, -- Actual spend to date
    predicted_clv DECIMAL(10,2) DEFAULT 0.00, -- ML prediction
    cohort_clv DECIMAL(10,2) DEFAULT 0.00, -- Based on cohort analysis
    
    -- Calculation Components
    avg_order_value DECIMAL(10,2) DEFAULT 0.00,
    purchase_frequency DECIMAL(5,2) DEFAULT 0.00, -- Purchases per month
    customer_lifespan_months DECIMAL(5,2) DEFAULT 0.00,
    
    -- Prediction Confidence
    prediction_confidence DECIMAL(3,2) DEFAULT 0.0, -- 0-1 scale
    model_version VARCHAR(20) DEFAULT 'v1.0',
    
    -- Segmentation
    clv_tier VARCHAR(20) DEFAULT 'bronze' CHECK (clv_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    percentile_rank INTEGER DEFAULT 50, -- 1-100 percentile within barbershop
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    
    -- Constraints
    UNIQUE(customer_id, DATE(calculated_at))
);

-- Churn Predictions
CREATE TABLE IF NOT EXISTS churn_predictions (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Prediction Details
    churn_probability DECIMAL(5,4) NOT NULL CHECK (churn_probability >= 0 AND churn_probability <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    prediction_horizon_days INTEGER DEFAULT 30, -- Predicting churn within X days
    
    -- Risk Factors
    risk_factors JSONB DEFAULT '[]', -- Array of risk factor identifiers
    primary_risk_factor VARCHAR(100),
    risk_factor_weights JSONB DEFAULT '{}',
    
    -- Model Information
    model_version VARCHAR(20) DEFAULT 'v1.0',
    model_confidence DECIMAL(3,2) DEFAULT 0.0,
    feature_importance JSONB DEFAULT '{}',
    
    -- Intervention Recommendations
    recommended_actions JSONB DEFAULT '[]',
    intervention_priority INTEGER DEFAULT 3 CHECK (intervention_priority >= 1 AND intervention_priority <= 5),
    
    -- Outcomes Tracking
    intervention_taken BOOLEAN DEFAULT false,
    intervention_type VARCHAR(50),
    actual_churn BOOLEAN,
    prediction_accuracy DECIMAL(3,2),
    
    -- Metadata
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Constraints
    UNIQUE(customer_id, DATE(predicted_at))
);

-- Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Segment Definition
    segment_name VARCHAR(100) NOT NULL,
    segment_type VARCHAR(50) NOT NULL, -- 'demographic', 'behavioral', 'value', 'lifecycle', 'custom'
    description TEXT,
    
    -- Segmentation Rules (stored as JSON for flexibility)
    segmentation_rules JSONB NOT NULL DEFAULT '{}',
    
    -- Segment Metrics
    total_customers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0,
    avg_clv DECIMAL(10,2) DEFAULT 0.00,
    avg_frequency DECIMAL(5,2) DEFAULT 0.00,
    
    -- Performance Tracking
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    retention_rate DECIMAL(5,4) DEFAULT 0.0000,
    engagement_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    auto_update BOOLEAN DEFAULT true,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, segment_name)
);

-- Customer Segment Assignments (Bridge table)
CREATE TABLE IF NOT EXISTS customer_segment_assignments (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    segment_id TEXT NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assignment_method VARCHAR(50) DEFAULT 'automatic', -- 'automatic', 'manual', 'rule_based'
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(customer_id, segment_id, DATE(assigned_at))
);

-- ============================================
-- 3. CAMPAIGN & ENGAGEMENT MANAGEMENT
-- ============================================

-- Campaign Definitions (Templates)
CREATE TABLE IF NOT EXISTS campaign_definitions (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Campaign Basic Info
    campaign_name VARCHAR(200) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- 'welcome', 'birthday', 'winback', 'loyalty', 'promotional', 'seasonal'
    description TEXT,
    
    -- Template Configuration
    template_data JSONB NOT NULL DEFAULT '{}',
    personalization_fields JSONB DEFAULT '[]',
    
    -- Targeting
    target_segment_ids JSONB DEFAULT '[]', -- Array of segment IDs
    target_criteria JSONB DEFAULT '{}',
    exclusion_criteria JSONB DEFAULT '{}',
    
    -- Delivery Settings
    delivery_channels JSONB DEFAULT '["email"]', -- email, sms, push, in_app
    send_time_optimization BOOLEAN DEFAULT true,
    frequency_cap JSONB DEFAULT '{"daily": 1, "weekly": 3}',
    
    -- A/B Testing
    ab_testing_enabled BOOLEAN DEFAULT false,
    ab_variants JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, campaign_name)
);

-- Campaign Executions (Running instances)
CREATE TABLE IF NOT EXISTS campaign_executions (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_definition_id TEXT NOT NULL REFERENCES campaign_definitions(id) ON DELETE CASCADE,
    
    -- Execution Details
    execution_name VARCHAR(200) NOT NULL,
    execution_status VARCHAR(20) DEFAULT 'draft' CHECK (execution_status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    
    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- Targeting (snapshot at execution time)
    target_customer_count INTEGER DEFAULT 0,
    actual_recipients INTEGER DEFAULT 0,
    
    -- Performance Metrics
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    
    -- Financial Impact
    cost DECIMAL(10,2) DEFAULT 0.00,
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    roi DECIMAL(5,4) DEFAULT 0.0000,
    
    -- A/B Testing Results
    ab_variant VARCHAR(10), -- 'A', 'B', 'C', etc.
    winning_variant VARCHAR(10),
    
    -- Metadata
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Responses (Individual customer responses)
CREATE TABLE IF NOT EXISTS campaign_responses (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_execution_id TEXT NOT NULL REFERENCES campaign_executions(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Delivery Details
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    delivery_provider VARCHAR(50), -- 'sendgrid', 'twilio', etc.
    
    -- Engagement Tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    
    -- Engagement Details
    click_urls JSONB DEFAULT '[]',
    conversion_value DECIMAL(10,2) DEFAULT 0.00,
    conversion_type VARCHAR(50),
    
    -- A/B Testing
    ab_variant VARCHAR(10),
    
    -- Attribution
    attributed_revenue DECIMAL(10,2) DEFAULT 0.00,
    attribution_window_hours INTEGER DEFAULT 168, -- 7 days default
    
    -- Metadata
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(campaign_execution_id, customer_id)
);

-- Customer Communications (All outbound communications)
CREATE TABLE IF NOT EXISTS customer_communications (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Communication Details
    communication_type VARCHAR(50) NOT NULL, -- 'campaign', 'transactional', 'manual', 'automated'
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'call', 'in_person'
    subject_line VARCHAR(500),
    content TEXT,
    
    -- Campaign Attribution
    campaign_execution_id TEXT REFERENCES campaign_executions(id),
    
    -- Delivery Information
    delivery_status VARCHAR(20) DEFAULT 'pending',
    delivery_provider VARCHAR(50),
    provider_message_id VARCHAR(200),
    
    -- Engagement Tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    
    -- Staff Attribution
    sent_by_staff_id TEXT,
    automated BOOLEAN DEFAULT false,
    
    -- Metadata
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Interactions (All touchpoints and interactions)
CREATE TABLE IF NOT EXISTS customer_interactions (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Interaction Details
    interaction_type VARCHAR(50) NOT NULL, -- 'appointment', 'call', 'email', 'review', 'complaint', 'inquiry'
    interaction_source VARCHAR(50), -- 'phone', 'email', 'website', 'social', 'in_person'
    
    -- Content
    interaction_title VARCHAR(200),
    interaction_content TEXT,
    interaction_summary TEXT,
    
    -- Sentiment Analysis
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
    emotion_tags JSONB DEFAULT '[]',
    
    -- Context
    related_appointment_id TEXT,
    related_service VARCHAR(100),
    staff_member_id TEXT,
    
    -- Resolution
    issue_resolved BOOLEAN,
    resolution_time_minutes INTEGER,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    
    -- Metadata
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. LOYALTY & REWARDS PROGRAM
-- ============================================

-- Loyalty Programs
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Program Details
    program_name VARCHAR(100) NOT NULL,
    program_type VARCHAR(20) DEFAULT 'points' CHECK (program_type IN ('points', 'visits', 'spend', 'hybrid')),
    description TEXT,
    
    -- Point Configuration
    points_per_dollar DECIMAL(5,2) DEFAULT 1.00,
    points_per_visit INTEGER DEFAULT 10,
    bonus_point_multiplier DECIMAL(3,2) DEFAULT 1.0,
    
    -- Tier Configuration
    tier_thresholds JSONB DEFAULT '{"bronze": 0, "silver": 500, "gold": 1500, "platinum": 3000}',
    tier_benefits JSONB DEFAULT '{}',
    
    -- Program Rules
    point_expiry_months INTEGER DEFAULT 12,
    minimum_redemption_points INTEGER DEFAULT 100,
    auto_enrollment BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, program_name)
);

-- Loyalty Program Enrollments
CREATE TABLE IF NOT EXISTS loyalty_program_enrollments (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_program_id TEXT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Enrollment Details
    enrollment_date DATE DEFAULT CURRENT_DATE,
    enrollment_method VARCHAR(20) DEFAULT 'automatic', -- 'automatic', 'manual', 'self_service'
    
    -- Current Status
    current_tier VARCHAR(20) DEFAULT 'bronze',
    total_points_earned INTEGER DEFAULT 0,
    total_points_redeemed INTEGER DEFAULT 0,
    current_point_balance INTEGER DEFAULT 0,
    
    -- Tier Progress
    points_to_next_tier INTEGER DEFAULT 0,
    tier_anniversary_date DATE,
    tier_upgrades_count INTEGER DEFAULT 0,
    
    -- Engagement
    last_point_earning TIMESTAMPTZ,
    last_redemption TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    opted_out_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(customer_id, loyalty_program_id)
);

-- Loyalty Points Transactions
CREATE TABLE IF NOT EXISTS loyalty_points (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_program_id TEXT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'bonus')),
    points_amount INTEGER NOT NULL,
    
    -- Transaction Context
    source_type VARCHAR(50), -- 'appointment', 'purchase', 'referral', 'bonus', 'manual'
    source_reference_id TEXT, -- ID of the source record (appointment_id, etc.)
    description TEXT,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    
    -- Staff/System Attribution
    processed_by_staff_id TEXT,
    automated BOOLEAN DEFAULT true,
    
    -- Metadata
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Tiers
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    loyalty_program_id TEXT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Tier Definition
    tier_name VARCHAR(50) NOT NULL,
    tier_level INTEGER NOT NULL, -- 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
    
    -- Requirements
    minimum_points INTEGER DEFAULT 0,
    minimum_spend DECIMAL(10,2) DEFAULT 0.00,
    minimum_visits INTEGER DEFAULT 0,
    
    -- Benefits
    point_multiplier DECIMAL(3,2) DEFAULT 1.0,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    priority_booking BOOLEAN DEFAULT false,
    free_services_per_year INTEGER DEFAULT 0,
    
    -- Tier-Specific Benefits (JSON for flexibility)
    custom_benefits JSONB DEFAULT '{}',
    
    -- Visual
    tier_color VARCHAR(7) DEFAULT '#CCCCCC', -- Hex color code
    tier_icon VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(loyalty_program_id, tier_name),
    UNIQUE(loyalty_program_id, tier_level)
);

-- Reward Redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_program_id TEXT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Redemption Details
    reward_type VARCHAR(50) NOT NULL, -- 'discount', 'free_service', 'product', 'cash_back'
    reward_name VARCHAR(200) NOT NULL,
    points_redeemed INTEGER NOT NULL,
    
    -- Reward Value
    monetary_value DECIMAL(10,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2),
    
    -- Usage Details
    redemption_code VARCHAR(50),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    
    -- Context
    related_appointment_id TEXT,
    processed_by_staff_id TEXT,
    
    -- Status
    redemption_status VARCHAR(20) DEFAULT 'active' CHECK (redemption_status IN ('active', 'used', 'expired', 'cancelled')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Tracking
CREATE TABLE IF NOT EXISTS referral_tracking (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Referral Parties
    referrer_customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referred_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Referral Details
    referral_code VARCHAR(50),
    referral_method VARCHAR(20), -- 'email', 'sms', 'social', 'word_of_mouth', 'link'
    
    -- Status Tracking
    referral_status VARCHAR(20) DEFAULT 'pending' CHECK (referral_status IN ('pending', 'signed_up', 'first_visit', 'qualified', 'rewarded')),
    referred_signed_up_at TIMESTAMPTZ,
    first_appointment_at TIMESTAMPTZ,
    qualification_met_at TIMESTAMPTZ,
    
    -- Rewards
    referrer_reward_points INTEGER DEFAULT 0,
    referred_reward_points INTEGER DEFAULT 0,
    referrer_reward_amount DECIMAL(10,2) DEFAULT 0.00,
    referred_reward_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Qualification Criteria
    minimum_spend_required DECIMAL(10,2) DEFAULT 0.00,
    minimum_visits_required INTEGER DEFAULT 1,
    qualification_period_days INTEGER DEFAULT 30,
    
    -- Metadata
    referred_at TIMESTAMPTZ DEFAULT NOW(),
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. FEEDBACK & SATISFACTION TRACKING
-- ============================================

-- Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Feedback Context
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('review', 'complaint', 'suggestion', 'compliment', 'survey')),
    feedback_source VARCHAR(20) DEFAULT 'email', -- 'email', 'sms', 'website', 'phone', 'in_person'
    related_appointment_id TEXT,
    related_service VARCHAR(100),
    
    -- Feedback Content
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    feedback_text TEXT,
    
    -- Sentiment Analysis
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
    keywords JSONB DEFAULT '[]',
    
    -- Staff Attribution
    staff_member_id TEXT,
    staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
    
    -- Resolution
    requires_response BOOLEAN DEFAULT false,
    response_sent BOOLEAN DEFAULT false,
    response_text TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_satisfaction INTEGER CHECK (resolution_satisfaction >= 1 AND resolution_satisfaction <= 5),
    
    -- Public Display
    is_public BOOLEAN DEFAULT false,
    approved_for_display BOOLEAN DEFAULT false,
    display_name VARCHAR(100),
    
    -- Metadata
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPS (Net Promoter Score) Tracking
CREATE TABLE IF NOT EXISTS nps_scores (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- NPS Details
    nps_score INTEGER NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
    nps_category VARCHAR(20) NOT NULL CHECK (nps_category IN ('detractor', 'passive', 'promoter')),
    
    -- Survey Context
    survey_method VARCHAR(20) DEFAULT 'email', -- 'email', 'sms', 'in_person', 'website'
    related_appointment_id TEXT,
    survey_sent_at TIMESTAMPTZ,
    
    -- Follow-up Questions
    likelihood_to_return INTEGER CHECK (likelihood_to_return >= 0 AND likelihood_to_return <= 10),
    reason_for_score TEXT,
    improvement_suggestions TEXT,
    
    -- Response Analysis
    response_time_hours INTEGER,
    sentiment VARCHAR(20),
    
    -- Follow-up Actions
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    
    -- Metadata
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satisfaction Metrics (CSAT, CES, etc.)
CREATE TABLE IF NOT EXISTS satisfaction_metrics (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Metric Details
    metric_type VARCHAR(20) NOT NULL, -- 'CSAT', 'CES', 'custom'
    metric_name VARCHAR(100) NOT NULL,
    score_value DECIMAL(5,2) NOT NULL,
    score_scale VARCHAR(20) DEFAULT '1-5', -- '1-5', '1-10', '1-7', etc.
    
    -- Context
    related_appointment_id TEXT,
    related_service VARCHAR(100),
    survey_question TEXT,
    
    -- Response Details
    response_method VARCHAR(20) DEFAULT 'email',
    response_time_minutes INTEGER,
    additional_comments TEXT,
    
    -- Benchmarking
    barbershop_average DECIMAL(5,2),
    industry_benchmark DECIMAL(5,2),
    
    -- Metadata
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Responses (Business responses to customer reviews)
CREATE TABLE IF NOT EXISTS review_responses (
    id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
    barbershop_id TEXT NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_feedback_id TEXT NOT NULL REFERENCES customer_feedback(id) ON DELETE CASCADE,
    
    -- Response Details
    response_text TEXT NOT NULL,
    response_tone VARCHAR(20) DEFAULT 'professional', -- 'professional', 'friendly', 'apologetic'
    
    -- Staff Attribution
    responded_by_staff_id TEXT,
    approved_by_staff_id TEXT,
    
    -- Publishing
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    platform VARCHAR(50), -- 'google', 'facebook', 'yelp', 'internal'
    
    -- Effectiveness
    customer_response_received BOOLEAN DEFAULT false,
    customer_satisfaction_improved BOOLEAN,
    follow_up_required BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Customer Lifecycle Indexes
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_customer_barbershop ON customer_health_scores(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_overall_score ON customer_health_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_churn_risk ON customer_health_scores(churn_risk_level);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_calculated_at ON customer_health_scores(calculated_at);

CREATE INDEX IF NOT EXISTS idx_customer_journeys_customer_barbershop ON customer_journeys(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_touchpoint_type ON customer_journeys(touchpoint_type);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_occurred_at ON customer_journeys(occurred_at);

CREATE INDEX IF NOT EXISTS idx_customer_milestones_customer_barbershop ON customer_milestones(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_milestones_type ON customer_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_customer_milestones_achievement_date ON customer_milestones(achievement_date);

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_customer_analytics_summary_customer_period ON customer_analytics_summary(customer_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_summary_barbershop ON customer_analytics_summary(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_clv_calculations_customer_barbershop ON clv_calculations(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clv_calculations_predicted_clv ON clv_calculations(predicted_clv);
CREATE INDEX IF NOT EXISTS idx_clv_calculations_tier ON clv_calculations(clv_tier);

CREATE INDEX IF NOT EXISTS idx_churn_predictions_customer_barbershop ON churn_predictions(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_probability ON churn_predictions(churn_probability);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_risk_level ON churn_predictions(risk_level);

CREATE INDEX IF NOT EXISTS idx_customer_segments_barbershop ON customer_segments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_assignments_customer ON customer_segment_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_assignments_segment ON customer_segment_assignments(segment_id);

-- Campaign Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_executions_barbershop ON campaign_executions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_scheduled_start ON campaign_executions(scheduled_start);

CREATE INDEX IF NOT EXISTS idx_campaign_responses_execution ON campaign_responses(campaign_execution_id);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_customer ON campaign_responses(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_delivery_status ON campaign_responses(delivery_status);

CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_barbershop ON customer_communications(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_sent_at ON customer_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_customer_communications_channel ON customer_communications(channel);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_barbershop ON customer_interactions(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_occurred_at ON customer_interactions(occurred_at);

-- Loyalty Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_program_enrollments_customer ON loyalty_program_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_program_enrollments_program ON loyalty_program_enrollments(loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_program_enrollments_tier ON loyalty_program_enrollments(current_tier);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_program ON loyalty_points(customer_id, loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transaction_type ON loyalty_points(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_processed_at ON loyalty_points(processed_at);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer_program ON reward_redemptions(customer_id, loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(redemption_status);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_redeemed_at ON reward_redemptions(redeemed_at);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON referral_tracking(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred ON referral_tracking(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_status ON referral_tracking(referral_status);

-- Feedback Indexes
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_barbershop ON customer_feedback(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_submitted_at ON customer_feedback(submitted_at);

CREATE INDEX IF NOT EXISTS idx_nps_scores_customer_barbershop ON nps_scores(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_nps_scores_category ON nps_scores(nps_category);
CREATE INDEX IF NOT EXISTS idx_nps_scores_collected_at ON nps_scores(collected_at);

CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_customer_barbershop ON satisfaction_metrics(customer_id, barbershop_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_type ON satisfaction_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_measured_at ON satisfaction_metrics(measured_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE customer_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clv_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Customer Lifecycle Policies
CREATE POLICY "customer_lifecycle_stages_isolation" ON customer_lifecycle_stages
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_health_scores_isolation" ON customer_health_scores
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_journeys_isolation" ON customer_journeys
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_milestones_isolation" ON customer_milestones
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Analytics Policies
CREATE POLICY "customer_analytics_summary_isolation" ON customer_analytics_summary
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_cohorts_isolation" ON customer_cohorts
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "clv_calculations_isolation" ON clv_calculations
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "churn_predictions_isolation" ON churn_predictions
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_segments_isolation" ON customer_segments
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_segment_assignments_isolation" ON customer_segment_assignments
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Campaign Policies
CREATE POLICY "campaign_definitions_isolation" ON campaign_definitions
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "campaign_executions_isolation" ON campaign_executions
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "campaign_responses_isolation" ON campaign_responses
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_communications_isolation" ON customer_communications
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "customer_interactions_isolation" ON customer_interactions
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Loyalty Policies
CREATE POLICY "loyalty_programs_isolation" ON loyalty_programs
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "loyalty_program_enrollments_isolation" ON loyalty_program_enrollments
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "loyalty_points_isolation" ON loyalty_points
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "loyalty_tiers_isolation" ON loyalty_tiers
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reward_redemptions_isolation" ON reward_redemptions
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "referral_tracking_isolation" ON referral_tracking
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Feedback Policies
CREATE POLICY "customer_feedback_isolation" ON customer_feedback
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "nps_scores_isolation" ON nps_scores
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "satisfaction_metrics_isolation" ON satisfaction_metrics
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "review_responses_isolation" ON review_responses
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_customer_lifecycle_stages_updated_at 
    BEFORE UPDATE ON customer_lifecycle_stages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_segments_updated_at 
    BEFORE UPDATE ON customer_segments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_definitions_updated_at 
    BEFORE UPDATE ON campaign_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_executions_updated_at 
    BEFORE UPDATE ON campaign_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_programs_updated_at 
    BEFORE UPDATE ON loyalty_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_program_enrollments_updated_at 
    BEFORE UPDATE ON loyalty_program_enrollments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_tiers_updated_at 
    BEFORE UPDATE ON loyalty_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_responses_updated_at 
    BEFORE UPDATE ON review_responses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA SETUP
-- ============================================

-- Default Customer Lifecycle Stages
INSERT INTO customer_lifecycle_stages (barbershop_id, stage_name, stage_description, stage_order, auto_transition) 
SELECT 
    id as barbershop_id,
    'Prospect' as stage_name,
    'Potential customer who has shown interest' as stage_description,
    1 as stage_order,
    true as auto_transition
FROM barbershops 
ON CONFLICT (barbershop_id, stage_name) DO NOTHING;

INSERT INTO customer_lifecycle_stages (barbershop_id, stage_name, stage_description, stage_order, auto_transition) 
SELECT 
    id as barbershop_id,
    'New Customer' as stage_name,
    'Customer who has made their first appointment' as stage_description,
    2 as stage_order,
    true as auto_transition
FROM barbershops 
ON CONFLICT (barbershop_id, stage_name) DO NOTHING;

INSERT INTO customer_lifecycle_stages (barbershop_id, stage_name, stage_description, stage_order, auto_transition) 
SELECT 
    id as barbershop_id,
    'Regular Customer' as stage_name,
    'Customer with multiple visits and established pattern' as stage_description,
    3 as stage_order,
    true as auto_transition
FROM barbershops 
ON CONFLICT (barbershop_id, stage_name) DO NOTHING;

INSERT INTO customer_lifecycle_stages (barbershop_id, stage_name, stage_description, stage_order, auto_transition) 
SELECT 
    id as barbershop_id,
    'VIP Customer' as stage_name,
    'High-value customer with exceptional loyalty' as stage_description,
    4 as stage_order,
    true as auto_transition
FROM barbershops 
ON CONFLICT (barbershop_id, stage_name) DO NOTHING;

INSERT INTO customer_lifecycle_stages (barbershop_id, stage_name, stage_description, stage_order, auto_transition) 
SELECT 
    id as barbershop_id,
    'At Risk' as stage_name,
    'Customer showing signs of potential churn' as stage_description,
    5 as stage_order,
    false as auto_transition
FROM barbershops 
ON CONFLICT (barbershop_id, stage_name) DO NOTHING;

-- Default Customer Segments
INSERT INTO customer_segments (barbershop_id, segment_name, segment_type, description, segmentation_rules, is_active) 
SELECT 
    id as barbershop_id,
    'High Value Customers' as segment_name,
    'value' as segment_type,
    'Customers with high lifetime value' as description,
    '{"conditions": [{"field": "total_spent", "operator": ">=", "value": 500}]}' as segmentation_rules,
    true as is_active
FROM barbershops 
ON CONFLICT (barbershop_id, segment_name) DO NOTHING;

INSERT INTO customer_segments (barbershop_id, segment_name, segment_type, description, segmentation_rules, is_active) 
SELECT 
    id as barbershop_id,
    'Frequent Visitors' as segment_name,
    'behavioral' as segment_type,
    'Customers who visit regularly' as description,
    '{"conditions": [{"field": "visit_frequency", "operator": ">=", "value": 1.5}]}' as segmentation_rules,
    true as is_active
FROM barbershops 
ON CONFLICT (barbershop_id, segment_name) DO NOTHING;

INSERT INTO customer_segments (barbershop_id, segment_name, segment_type, description, segmentation_rules, is_active) 
SELECT 
    id as barbershop_id,
    'New Customers' as segment_name,
    'lifecycle' as segment_type,
    'Customers with less than 3 visits' as description,
    '{"conditions": [{"field": "total_visits", "operator": "<", "value": 3}]}' as segmentation_rules,
    true as is_active
FROM barbershops 
ON CONFLICT (barbershop_id, segment_name) DO NOTHING;

INSERT INTO customer_segments (barbershop_id, segment_name, segment_type, description, segmentation_rules, is_active) 
SELECT 
    id as barbershop_id,
    'At Risk Customers' as segment_name,
    'behavioral' as segment_type,
    'Customers at risk of churning' as description,
    '{"conditions": [{"field": "days_since_last_visit", "operator": ">", "value": 60}]}' as segmentation_rules,
    true as is_active
FROM barbershops 
ON CONFLICT (barbershop_id, segment_name) DO NOTHING;

-- Default Loyalty Program for each barbershop
INSERT INTO loyalty_programs (barbershop_id, program_name, program_type, description, points_per_dollar, points_per_visit, is_active) 
SELECT 
    id as barbershop_id,
    'Standard Loyalty Program' as program_name,
    'points' as program_type,
    'Earn points for every visit and dollar spent' as description,
    1.00 as points_per_dollar,
    10 as points_per_visit,
    true as is_active
FROM barbershops 
ON CONFLICT (barbershop_id, program_name) DO NOTHING;

-- Default Loyalty Tiers
INSERT INTO loyalty_tiers (barbershop_id, loyalty_program_id, tier_name, tier_level, minimum_points, point_multiplier, tier_color)
SELECT 
    lp.barbershop_id,
    lp.id as loyalty_program_id,
    'Bronze' as tier_name,
    1 as tier_level,
    0 as minimum_points,
    1.0 as point_multiplier,
    '#CD7F32' as tier_color
FROM loyalty_programs lp
ON CONFLICT (loyalty_program_id, tier_name) DO NOTHING;

INSERT INTO loyalty_tiers (barbershop_id, loyalty_program_id, tier_name, tier_level, minimum_points, point_multiplier, tier_color)
SELECT 
    lp.barbershop_id,
    lp.id as loyalty_program_id,
    'Silver' as tier_name,
    2 as tier_level,
    500 as minimum_points,
    1.25 as point_multiplier,
    '#C0C0C0' as tier_color
FROM loyalty_programs lp
ON CONFLICT (loyalty_program_id, tier_name) DO NOTHING;

INSERT INTO loyalty_tiers (barbershop_id, loyalty_program_id, tier_name, tier_level, minimum_points, point_multiplier, tier_color)
SELECT 
    lp.barbershop_id,
    lp.id as loyalty_program_id,
    'Gold' as tier_name,
    3 as tier_level,
    1500 as minimum_points,
    1.5 as point_multiplier,
    '#FFD700' as tier_color
FROM loyalty_programs lp
ON CONFLICT (loyalty_program_id, tier_name) DO NOTHING;

INSERT INTO loyalty_tiers (barbershop_id, loyalty_program_id, tier_name, tier_level, minimum_points, point_multiplier, tier_color)
SELECT 
    lp.barbershop_id,
    lp.id as loyalty_program_id,
    'Platinum' as tier_name,
    4 as tier_level,
    3000 as minimum_points,
    2.0 as point_multiplier,
    '#E5E4E2' as tier_color
FROM loyalty_programs lp
ON CONFLICT (loyalty_program_id, tier_name) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Customer Management Database Schema Applied Successfully!';
    RAISE NOTICE '📊 Created 25 tables with proper relationships and constraints';
    RAISE NOTICE '🔒 Applied Row Level Security policies for multi-tenant isolation';
    RAISE NOTICE '⚡ Added performance indexes for optimal query speed';
    RAISE NOTICE '🎯 Initialized default data for lifecycle stages, segments, and loyalty programs';
    RAISE NOTICE '🚀 Customer Management System database is ready for production use!';
END $$;