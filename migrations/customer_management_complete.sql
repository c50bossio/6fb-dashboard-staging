-- Migration: Comprehensive Customer Management Database Schema
-- Description: Advanced customer lifecycle management, analytics, and engagement features
-- Author: System
-- Date: 2025-08-20
-- 
-- This migration creates comprehensive customer management tables for advanced
-- analytics, engagement tracking, loyalty programs, and lifecycle management.
-- All tables include barbershop_id for multi-tenant isolation.

-- ============================================
-- 1. CUSTOMER LIFECYCLE MANAGEMENT
-- ============================================

-- Customer Lifecycle Stages Definition
CREATE TABLE IF NOT EXISTS customer_lifecycle_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Stage Definition
    stage_name VARCHAR(100) NOT NULL,
    stage_description TEXT,
    stage_order INTEGER NOT NULL DEFAULT 0,
    
    -- Stage Criteria
    criteria JSONB NOT NULL DEFAULT '{}',
    /* Example criteria format:
    {
        "visits_min": 0,
        "visits_max": 0,
        "days_since_last_visit": null,
        "total_spent_min": 0,
        "total_spent_max": null,
        "engagement_score_min": 0,
        "custom_conditions": []
    }
    */
    
    -- Stage Settings
    is_active BOOLEAN DEFAULT true,
    color_code VARCHAR(7) DEFAULT '#6B7280', -- Hex color for UI
    
    -- Automated Actions
    automated_actions JSONB DEFAULT '{}',
    /* Example actions format:
    {
        "send_welcome_email": true,
        "assign_loyalty_points": 100,
        "trigger_campaign": "new_customer_welcome",
        "update_communication_preferences": {},
        "schedule_follow_up": {"days": 7, "type": "feedback"}
    }
    */
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_stage_per_shop UNIQUE(barbershop_id, stage_name)
);

-- Customer Health Scores (0-100 scoring system)
CREATE TABLE IF NOT EXISTS customer_health_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Health Score Components
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 100),
    loyalty_score INTEGER NOT NULL CHECK (loyalty_score >= 0 AND loyalty_score <= 100),
    satisfaction_score INTEGER NOT NULL CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
    frequency_score INTEGER NOT NULL CHECK (frequency_score >= 0 AND frequency_score <= 100),
    monetary_score INTEGER NOT NULL CHECK (monetary_score >= 0 AND monetary_score <= 100),
    
    -- Score Breakdown
    score_factors JSONB DEFAULT '{}',
    /* Example score_factors format:
    {
        "recency": {"value": 85, "weight": 0.25, "description": "Last visit 5 days ago"},
        "frequency": {"value": 70, "weight": 0.25, "description": "Visits every 3 weeks"},
        "monetary": {"value": 90, "weight": 0.20, "description": "High spending customer"},
        "engagement": {"value": 60, "weight": 0.15, "description": "Moderate app usage"},
        "satisfaction": {"value": 95, "weight": 0.15, "description": "Excellent reviews"}
    }
    */
    
    -- Trend Analysis
    previous_score INTEGER,
    score_trend VARCHAR(20) CHECK (score_trend IN ('improving', 'stable', 'declining')),
    trend_percentage DECIMAL(5, 2),
    
    -- Risk Assessment
    churn_risk VARCHAR(20) DEFAULT 'low' CHECK (churn_risk IN ('low', 'medium', 'high', 'critical')),
    risk_factors TEXT[],
    
    -- Calculation Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_version VARCHAR(20) DEFAULT '1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_health_score_per_customer UNIQUE(barbershop_id, customer_id)
);

-- Customer Journey Tracking
CREATE TABLE IF NOT EXISTS customer_journeys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Journey Event Details
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- 'touchpoint', 'transaction', 'communication', 'behavior'
    event_name VARCHAR(255) NOT NULL,
    event_description TEXT,
    
    -- Event Context
    channel VARCHAR(50), -- 'website', 'app', 'phone', 'in_store', 'email', 'sms'
    source VARCHAR(100), -- Specific source within channel
    medium VARCHAR(50), -- 'organic', 'paid', 'referral', 'direct'
    campaign_id UUID, -- Reference to campaign if applicable
    
    -- Event Data
    event_data JSONB DEFAULT '{}',
    /* Example event_data format:
    {
        "page_url": "/booking",
        "appointment_id": "uuid",
        "service_selected": "haircut",
        "time_spent": 300,
        "interaction_count": 3,
        "custom_properties": {}
    }
    */
    
    -- Session Information
    session_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    
    -- Journey Analysis
    journey_stage VARCHAR(100),
    is_conversion_event BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10, 2),
    
    -- Attribution
    first_touch_campaign VARCHAR(255),
    last_touch_campaign VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Milestones (Important customer events)
CREATE TABLE IF NOT EXISTS customer_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Milestone Details
    milestone_type VARCHAR(100) NOT NULL,
    milestone_name VARCHAR(255) NOT NULL,
    milestone_description TEXT,
    
    -- Milestone Data
    milestone_value DECIMAL(10, 2), -- Monetary value if applicable
    milestone_count INTEGER, -- Count value if applicable
    milestone_data JSONB DEFAULT '{}', -- Additional milestone-specific data
    
    -- Achievement Details
    achieved_at TIMESTAMPTZ NOT NULL,
    achievement_method VARCHAR(100), -- How it was achieved
    
    -- Recognition
    is_celebrated BOOLEAN DEFAULT false,
    celebration_type VARCHAR(50), -- 'email', 'sms', 'in_app', 'loyalty_points'
    celebration_data JSONB DEFAULT '{}',
    
    -- Milestone Importance
    importance_level INTEGER DEFAULT 1 CHECK (importance_level >= 1 AND importance_level <= 5),
    is_public BOOLEAN DEFAULT false, -- Can be shared/displayed publicly
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ANALYTICS AND INSIGHTS
-- ============================================

-- Customer Analytics Summary (Pre-calculated metrics per customer)
CREATE TABLE IF NOT EXISTS customer_analytics_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Time Period
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Visit Metrics
    total_visits INTEGER DEFAULT 0,
    completed_visits INTEGER DEFAULT 0,
    cancelled_visits INTEGER DEFAULT 0,
    no_show_visits INTEGER DEFAULT 0,
    
    -- Financial Metrics
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    average_transaction_value DECIMAL(10, 2) DEFAULT 0,
    total_tips DECIMAL(10, 2) DEFAULT 0,
    
    -- Service Metrics
    most_popular_service VARCHAR(255),
    service_variety_count INTEGER DEFAULT 0, -- Number of different services used
    preferred_barber_id UUID REFERENCES auth.users(id),
    
    -- Timing Metrics
    average_booking_lead_time INTEGER, -- Days between booking and appointment
    preferred_day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
    preferred_time_of_day TIME,
    
    -- Engagement Metrics
    app_sessions INTEGER DEFAULT 0,
    email_opens INTEGER DEFAULT 0,
    sms_responses INTEGER DEFAULT 0,
    referrals_made INTEGER DEFAULT 0,
    
    -- Satisfaction Metrics
    average_rating DECIMAL(3, 2),
    feedback_responses INTEGER DEFAULT 0,
    complaints_count INTEGER DEFAULT 0,
    
    -- Behavioral Metrics
    rebooking_rate DECIMAL(5, 2), -- Percentage who rebook
    average_days_between_visits DECIMAL(5, 1),
    loyalty_program_engagement DECIMAL(5, 2),
    
    -- Calculated Fields
    customer_lifetime_value DECIMAL(10, 2),
    churn_probability DECIMAL(5, 2),
    next_visit_prediction DATE,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_period UNIQUE(barbershop_id, customer_id, period_type, period_start)
);

-- Customer Cohorts (Cohort grouping and analysis)
CREATE TABLE IF NOT EXISTS customer_cohorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Cohort Definition
    cohort_name VARCHAR(255) NOT NULL,
    cohort_type VARCHAR(50) NOT NULL, -- 'acquisition', 'behavioral', 'demographic', 'custom'
    cohort_description TEXT,
    
    -- Cohort Criteria
    cohort_criteria JSONB NOT NULL,
    /* Example cohort_criteria format:
    {
        "acquisition_date_start": "2024-01-01",
        "acquisition_date_end": "2024-01-31",
        "acquisition_channel": "social_media",
        "age_range": {"min": 25, "max": 35},
        "service_preferences": ["haircut", "beard_trim"],
        "spending_tier": "high_value"
    }
    */
    
    -- Cohort Metrics
    total_customers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0,
    retention_rate DECIMAL(5, 2),
    average_lifetime_value DECIMAL(10, 2),
    churn_rate DECIMAL(5, 2),
    
    -- Cohort Performance by Period
    performance_data JSONB DEFAULT '{}',
    /* Example performance_data format:
    {
        "month_1": {"retention": 100, "revenue": 5000, "active": 50},
        "month_2": {"retention": 85, "revenue": 4250, "active": 42},
        "month_3": {"retention": 78, "revenue": 3900, "active": 39}
    }
    */
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    auto_update BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_cohort_per_shop UNIQUE(barbershop_id, cohort_name)
);

-- Customer Lifetime Value Calculations
CREATE TABLE IF NOT EXISTS clv_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- CLV Components
    historical_clv DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Actual spend to date
    predicted_clv DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Predicted future value
    total_clv DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Historical + Predicted
    
    -- Calculation Inputs
    average_order_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    purchase_frequency DECIMAL(8, 4) NOT NULL DEFAULT 0, -- Purchases per period
    customer_lifespan_months DECIMAL(6, 2) NOT NULL DEFAULT 0,
    gross_margin_percentage DECIMAL(5, 2) DEFAULT 70.00,
    
    -- Advanced Metrics
    churn_probability DECIMAL(5, 2) DEFAULT 0,
    retention_probability DECIMAL(5, 2) DEFAULT 100,
    discount_rate DECIMAL(5, 2) DEFAULT 10.00, -- For NPV calculation
    
    -- Prediction Model Info
    model_version VARCHAR(20) DEFAULT '1.0',
    model_confidence DECIMAL(5, 2), -- Confidence level of prediction
    prediction_horizon_months INTEGER DEFAULT 24,
    
    -- Calculation Details
    calculation_method VARCHAR(50) DEFAULT 'historical_average', -- 'historical_average', 'predictive_ml', 'cohort_based'
    calculation_date DATE NOT NULL,
    data_points_used INTEGER,
    
    -- Trends
    clv_trend VARCHAR(20) CHECK (clv_trend IN ('increasing', 'stable', 'decreasing')),
    trend_percentage DECIMAL(5, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_clv_per_customer UNIQUE(barbershop_id, customer_id, calculation_date)
);

-- Churn Predictions (ML model outputs for churn risk)
CREATE TABLE IF NOT EXISTS churn_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Prediction Results
    churn_probability DECIMAL(5, 2) NOT NULL CHECK (churn_probability >= 0 AND churn_probability <= 100),
    churn_risk_level VARCHAR(20) NOT NULL CHECK (churn_risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    predicted_churn_date DATE,
    
    -- Risk Factors
    primary_risk_factors TEXT[] NOT NULL DEFAULT '{}',
    risk_factor_scores JSONB DEFAULT '{}',
    /* Example risk_factor_scores format:
    {
        "declining_frequency": 85,
        "reduced_spending": 70,
        "no_recent_engagement": 60,
        "negative_feedback": 40,
        "competitor_activity": 30
    }
    */
    
    -- Model Information
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL,
    prediction_accuracy DECIMAL(5, 2), -- Historical accuracy of this model
    
    -- Input Features Used
    features_used JSONB NOT NULL,
    /* Example features_used format:
    {
        "recency_days": 45,
        "frequency_score": 3.2,
        "monetary_score": 450.00,
        "engagement_score": 0.3,
        "satisfaction_score": 4.2,
        "seasonality_factor": 0.8
    }
    */
    
    -- Intervention Recommendations
    recommended_actions TEXT[],
    intervention_priority INTEGER CHECK (intervention_priority >= 1 AND intervention_priority <= 5),
    
    -- Prediction Tracking
    prediction_date DATE NOT NULL,
    prediction_horizon_days INTEGER DEFAULT 90,
    is_prediction_active BOOLEAN DEFAULT true,
    
    -- Outcome Tracking (for model improvement)
    actual_outcome VARCHAR(20), -- 'churned', 'retained', 'unknown' (if still in prediction window)
    outcome_date DATE,
    prediction_accuracy_score DECIMAL(5, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Segments (Dynamic customer segmentation)
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Segment Definition
    segment_name VARCHAR(255) NOT NULL,
    segment_description TEXT,
    segment_type VARCHAR(50) NOT NULL, -- 'demographic', 'behavioral', 'value', 'lifecycle', 'custom'
    
    -- Segmentation Criteria
    segmentation_rules JSONB NOT NULL,
    /* Example segmentation_rules format:
    {
        "conditions": [
            {"field": "total_spent", "operator": ">=", "value": 500},
            {"field": "visit_frequency", "operator": ">=", "value": 1.5},
            {"field": "last_visit_days", "operator": "<=", "value": 30}
        ],
        "logic": "AND"
    }
    */
    
    -- Segment Metrics
    customer_count INTEGER DEFAULT 0,
    percentage_of_customer_base DECIMAL(5, 2) DEFAULT 0,
    average_clv DECIMAL(10, 2) DEFAULT 0,
    average_visit_frequency DECIMAL(5, 2) DEFAULT 0,
    churn_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Segment Performance Tracking
    revenue_contribution DECIMAL(10, 2) DEFAULT 0,
    revenue_percentage DECIMAL(5, 2) DEFAULT 0,
    growth_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Segment Settings
    is_active BOOLEAN DEFAULT true,
    auto_update BOOLEAN DEFAULT true,
    update_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
    
    -- Visual Settings
    color_code VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),
    
    -- Last Update
    last_calculated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_segment_per_shop UNIQUE(barbershop_id, segment_name)
);

-- Bridge table for customer segment assignments
CREATE TABLE IF NOT EXISTS customer_segment_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assignment_score DECIMAL(5, 2), -- How well customer fits segment (0-100)
    
    -- Assignment History
    previous_segment_id UUID REFERENCES customer_segments(id),
    segment_duration_days INTEGER,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_active_customer_segment UNIQUE(barbershop_id, customer_id, segment_id)
);

-- ============================================
-- 3. ENGAGEMENT AND MARKETING
-- ============================================

-- Campaign Definitions (Marketing campaign templates)
CREATE TABLE IF NOT EXISTS campaign_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Campaign Basics
    campaign_name VARCHAR(255) NOT NULL,
    campaign_description TEXT,
    campaign_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'multi_channel'
    campaign_category VARCHAR(50), -- 'promotional', 'retention', 'reactivation', 'nurture'
    
    -- Target Audience
    target_segments UUID[], -- Array of segment IDs
    target_criteria JSONB DEFAULT '{}',
    /* Example target_criteria format:
    {
        "customer_lifecycle_stage": ["active", "at_risk"],
        "last_visit_days": {"min": 30, "max": 90},
        "total_spent": {"min": 100},
        "engagement_score": {"min": 50},
        "custom_filters": []
    }
    */
    
    -- Campaign Content
    channels JSONB NOT NULL,
    /* Example channels format:
    {
        "email": {
            "subject": "We miss you!",
            "template_id": "reactivation_v1",
            "personalization": true
        },
        "sms": {
            "message": "Hi {first_name}, book your next appointment!",
            "short_url": true
        }
    }
    */
    
    -- Campaign Logic
    trigger_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'behavioral', 'lifecycle'
    trigger_criteria JSONB DEFAULT '{}',
    
    -- Timing & Frequency
    send_schedule JSONB DEFAULT '{}',
    frequency_cap JSONB DEFAULT '{}', -- Limits on how often customers can receive this campaign
    
    -- Campaign Goals
    primary_goal VARCHAR(100) NOT NULL, -- 'increase_bookings', 'reduce_churn', 'upsell', 'retention'
    success_metrics JSONB DEFAULT '{}',
    target_conversion_rate DECIMAL(5, 2),
    
    -- Campaign Settings
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    auto_optimize BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_campaign_per_shop UNIQUE(barbershop_id, campaign_name)
);

-- Campaign Executions (Running campaign instances)
CREATE TABLE IF NOT EXISTS campaign_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_definition_id UUID NOT NULL REFERENCES campaign_definitions(id) ON DELETE CASCADE,
    
    -- Execution Details
    execution_name VARCHAR(255) NOT NULL,
    execution_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'a_b_test', 'multivariate'
    
    -- Scheduling
    scheduled_start_time TIMESTAMPTZ,
    scheduled_end_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    
    -- Target Audience for this execution
    target_customer_count INTEGER DEFAULT 0,
    eligible_customer_count INTEGER DEFAULT 0,
    excluded_customer_count INTEGER DEFAULT 0,
    
    -- Execution Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'
    )),
    
    -- A/B Testing (if applicable)
    test_variants JSONB DEFAULT '{}',
    control_percentage DECIMAL(5, 2) DEFAULT 0,
    
    -- Performance Tracking
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_opened INTEGER DEFAULT 0,
    messages_clicked INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    
    -- Cost Tracking
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    actual_cost DECIMAL(10, 2) DEFAULT 0,
    
    -- Results
    conversion_rate DECIMAL(5, 2) DEFAULT 0,
    revenue_generated DECIMAL(10, 2) DEFAULT 0,
    roi DECIMAL(8, 2) DEFAULT 0,
    
    -- Execution Notes
    execution_notes TEXT,
    failure_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Responses (Customer responses to campaigns)
CREATE TABLE IF NOT EXISTS campaign_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    campaign_execution_id UUID NOT NULL REFERENCES campaign_executions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Message Details
    channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    message_id VARCHAR(255), -- External ID from email/SMS provider
    
    -- Delivery Tracking
    sent_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    -- Response Tracking
    responded_at TIMESTAMPTZ,
    response_type VARCHAR(50), -- 'booking', 'click', 'reply', 'unsubscribe', 'complaint'
    response_value VARCHAR(500), -- Actual response content if applicable
    
    -- Conversion Tracking
    converted BOOLEAN DEFAULT false,
    conversion_type VARCHAR(100), -- 'appointment_booked', 'product_purchased', 'referral_made'
    conversion_value DECIMAL(10, 2) DEFAULT 0,
    conversion_at TIMESTAMPTZ,
    attribution_model VARCHAR(50) DEFAULT 'last_touch',
    
    -- Message Content (for analysis)
    message_variant VARCHAR(50), -- A/B test variant if applicable
    subject_line TEXT,
    call_to_action VARCHAR(255),
    
    -- Engagement Metrics
    time_to_open INTEGER, -- Seconds between sent and opened
    time_to_click INTEGER, -- Seconds between opened and clicked
    time_to_convert INTEGER, -- Seconds between clicked and converted
    
    -- Device/Context
    device_type VARCHAR(50),
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Communications (All communications sent)
CREATE TABLE IF NOT EXISTS customer_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Communication Details
    communication_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app', 'phone', 'letter'
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    
    -- Message Content
    subject VARCHAR(500),
    message_content TEXT,
    content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'html', 'rich_text'
    
    -- Classification
    category VARCHAR(100), -- 'transactional', 'promotional', 'support', 'reminder', 'follow_up'
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Campaign Context
    campaign_execution_id UUID REFERENCES campaign_executions(id),
    is_automated BOOLEAN DEFAULT false,
    
    -- Staff Context
    sent_by_user_id UUID REFERENCES auth.users(id),
    department VARCHAR(50), -- 'marketing', 'support', 'operations', 'management'
    
    -- Delivery Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'failed', 'bounced'
    )),
    
    -- External References
    external_message_id VARCHAR(255), -- ID from email/SMS provider
    external_thread_id VARCHAR(255), -- For conversation threading
    
    -- Timing
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Response Tracking
    requires_response BOOLEAN DEFAULT false,
    response_deadline TIMESTAMPTZ,
    has_response BOOLEAN DEFAULT false,
    response_time_hours DECIMAL(8, 2),
    
    -- Cost Tracking
    cost DECIMAL(6, 4) DEFAULT 0, -- Cost per message
    provider VARCHAR(50), -- 'sendgrid', 'twilio', 'mailchimp', etc.
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Interactions (Every touchpoint logged)
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Interaction Basics
    interaction_type VARCHAR(100) NOT NULL,
    interaction_category VARCHAR(50) NOT NULL, -- 'digital', 'physical', 'communication', 'transaction'
    
    -- Interaction Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    outcome VARCHAR(100), -- 'positive', 'neutral', 'negative', 'pending'
    
    -- Context
    channel VARCHAR(50) NOT NULL, -- 'website', 'app', 'phone', 'in_store', 'email', 'social'
    touchpoint VARCHAR(100), -- Specific touchpoint within channel
    
    -- Location Context
    location_type VARCHAR(50), -- 'online', 'in_store', 'phone', 'event'
    physical_location VARCHAR(255),
    
    -- Staff Context
    staff_member_id UUID REFERENCES auth.users(id),
    department VARCHAR(50),
    
    -- Interaction Data
    interaction_data JSONB DEFAULT '{}',
    /* Example interaction_data format:
    {
        "page_visited": "/services",
        "time_spent_seconds": 120,
        "actions_taken": ["view_service", "add_to_cart"],
        "service_inquired": "beard_trim",
        "satisfaction_rating": 5,
        "follow_up_required": true
    }
    */
    
    -- Sentiment Analysis
    sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0
    sentiment_label VARCHAR(20), -- 'positive', 'neutral', 'negative'
    emotional_indicators TEXT[],
    
    -- Business Impact
    interaction_value DECIMAL(10, 2), -- Monetary value if applicable
    conversion_potential INTEGER CHECK (conversion_potential >= 1 AND conversion_potential <= 10),
    
    -- Follow-up Requirements
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_type VARCHAR(100),
    follow_up_deadline TIMESTAMPTZ,
    follow_up_assigned_to UUID REFERENCES auth.users(id),
    follow_up_completed BOOLEAN DEFAULT false,
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT true,
    resolution_notes TEXT,
    resolution_time_hours DECIMAL(8, 2),
    
    -- Duration
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. LOYALTY AND REWARDS
-- ============================================

-- Loyalty Programs (Program configurations)
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Program Basics
    program_name VARCHAR(255) NOT NULL,
    program_description TEXT,
    program_type VARCHAR(50) NOT NULL, -- 'points', 'visits', 'spending', 'tier', 'hybrid'
    
    -- Program Rules
    earning_rules JSONB NOT NULL,
    /* Example earning_rules format:
    {
        "points_per_dollar": 1,
        "bonus_multipliers": {
            "birthday_month": 2,
            "referral": 1.5,
            "first_visit": 3
        },
        "visit_rewards": {
            "every_5_visits": {"type": "discount", "value": 10, "unit": "percent"}
        }
    }
    */
    
    redemption_rules JSONB NOT NULL,
    /* Example redemption_rules format:
    {
        "minimum_points": 100,
        "redemption_options": [
            {"points": 500, "reward": "free_haircut"},
            {"points": 250, "reward": "50_percent_discount"},
            {"points": 100, "reward": "free_product"}
        ],
        "expiration_months": 12
    }
    */
    
    -- Program Settings
    is_active BOOLEAN DEFAULT true,
    auto_enroll_new_customers BOOLEAN DEFAULT true,
    enrollment_requirements JSONB DEFAULT '{}',
    
    -- Program Limits
    max_points_per_transaction INTEGER,
    max_points_per_day INTEGER,
    points_expiration_months INTEGER DEFAULT 12,
    
    -- Communication Settings
    welcome_message TEXT,
    earning_notifications BOOLEAN DEFAULT true,
    redemption_notifications BOOLEAN DEFAULT true,
    expiration_warnings BOOLEAN DEFAULT true,
    
    -- Program Analytics
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    total_points_issued BIGINT DEFAULT 0,
    total_points_redeemed BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_program_per_shop UNIQUE(barbershop_id, program_name)
);

-- Customer Loyalty Program Enrollments
CREATE TABLE IF NOT EXISTS loyalty_program_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Enrollment Details
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    enrollment_method VARCHAR(50), -- 'auto', 'manual', 'customer_request', 'staff_signup'
    
    -- Current Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),
    current_points BIGINT DEFAULT 0,
    lifetime_points_earned BIGINT DEFAULT 0,
    lifetime_points_redeemed BIGINT DEFAULT 0,
    
    -- Tier Information (if applicable)
    current_tier VARCHAR(100),
    tier_progress DECIMAL(5, 2) DEFAULT 0, -- Progress to next tier (0-100%)
    next_tier_threshold INTEGER,
    
    -- Member Benefits
    member_since DATE DEFAULT CURRENT_DATE,
    vip_status BOOLEAN DEFAULT false,
    special_perks JSONB DEFAULT '{}',
    
    -- Activity Tracking
    last_activity_date DATE,
    last_points_earned_date DATE,
    last_redemption_date DATE,
    
    -- Preferences
    communication_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_program UNIQUE(barbershop_id, customer_id, loyalty_program_id)
);

-- Loyalty Points (Point transactions)
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'bonus')),
    points_amount INTEGER NOT NULL, -- Positive for earned/bonus, negative for redeemed/expired
    
    -- Transaction Context
    source_type VARCHAR(100), -- 'appointment', 'purchase', 'referral', 'birthday', 'manual_adjustment'
    source_id UUID, -- ID of related record (appointment_id, transaction_id, etc.)
    
    -- Earning Context
    earning_rate DECIMAL(5, 2), -- Points per dollar if applicable
    base_amount DECIMAL(10, 2), -- Original amount that earned points
    multiplier DECIMAL(5, 2) DEFAULT 1.0, -- Any bonus multiplier applied
    
    -- Redemption Context
    redemption_value DECIMAL(10, 2), -- Dollar value of redemption
    redemption_type VARCHAR(100), -- What was redeemed
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    is_expired BOOLEAN DEFAULT false,
    
    -- Staff Context
    processed_by_user_id UUID REFERENCES auth.users(id),
    
    -- Running Balance
    balance_before INTEGER NOT NULL DEFAULT 0,
    balance_after INTEGER NOT NULL DEFAULT 0,
    
    -- Transaction Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Reversal Support
    is_reversed BOOLEAN DEFAULT false,
    reversed_by UUID REFERENCES loyalty_points(id),
    reversal_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Tiers (Tier definitions and benefits)
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    loyalty_program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Tier Details
    tier_name VARCHAR(100) NOT NULL,
    tier_description TEXT,
    tier_level INTEGER NOT NULL, -- 1 = lowest, higher numbers = higher tiers
    
    -- Tier Requirements
    qualification_criteria JSONB NOT NULL,
    /* Example qualification_criteria format:
    {
        "points_required": 1000,
        "visits_required": 10,
        "spending_required": 500,
        "time_period_months": 12,
        "maintain_criteria": "monthly"
    }
    */
    
    -- Tier Benefits
    benefits JSONB NOT NULL,
    /* Example benefits format:
    {
        "point_multiplier": 1.5,
        "discount_percentage": 10,
        "free_services": ["consultation"],
        "priority_booking": true,
        "exclusive_offers": true,
        "birthday_bonus": 500
    }
    */
    
    -- Tier Settings
    is_active BOOLEAN DEFAULT true,
    color_code VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),
    
    -- Tier Metrics
    current_members INTEGER DEFAULT 0,
    average_spending DECIMAL(10, 2) DEFAULT 0,
    retention_rate DECIMAL(5, 2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_tier_level UNIQUE(barbershop_id, loyalty_program_id, tier_level),
    CONSTRAINT unique_tier_name UNIQUE(barbershop_id, loyalty_program_id, tier_name)
);

-- Reward Redemptions (Redemption history)
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Redemption Details
    reward_type VARCHAR(100) NOT NULL, -- 'discount', 'free_service', 'product', 'cash_back'
    reward_name VARCHAR(255) NOT NULL,
    reward_description TEXT,
    
    -- Point Transaction
    points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
    point_transaction_id UUID REFERENCES loyalty_points(id),
    
    -- Redemption Value
    monetary_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5, 2),
    
    -- Usage Details
    redemption_code VARCHAR(50),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Application
    applied_to_appointment_id UUID REFERENCES appointments(id),
    applied_to_transaction_id UUID REFERENCES transactions(id),
    applied_by_user_id UUID REFERENCES auth.users(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    used_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Tracking
    usage_restrictions JSONB DEFAULT '{}',
    /* Example usage_restrictions format:
    {
        "valid_services": ["haircut", "beard_trim"],
        "minimum_purchase": 50,
        "cannot_combine": true,
        "weekday_only": false,
        "valid_barbers": []
    }
    */
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Tracking (Customer referral tracking)
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Referrer Information
    referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referrer_user_id UUID REFERENCES auth.users(id),
    
    -- Referee Information
    referee_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    referee_email VARCHAR(255),
    referee_phone VARCHAR(20),
    referee_name VARCHAR(255),
    
    -- Referral Details
    referral_code VARCHAR(50) NOT NULL,
    referral_method VARCHAR(50), -- 'email', 'sms', 'social', 'word_of_mouth', 'app_share'
    referral_source VARCHAR(100), -- Where the referral was made
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN (
        'sent', 'opened', 'clicked', 'signed_up', 'first_visit', 'qualified', 'rewarded', 'expired'
    )),
    
    -- Conversion Tracking
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    signed_up_at TIMESTAMPTZ,
    first_visit_at TIMESTAMPTZ,
    qualified_at TIMESTAMPTZ, -- When referral qualifies for reward
    
    -- Reward Information
    referrer_reward_type VARCHAR(50), -- 'points', 'discount', 'cash', 'free_service'
    referrer_reward_value DECIMAL(10, 2),
    referrer_reward_given BOOLEAN DEFAULT false,
    referrer_reward_given_at TIMESTAMPTZ,
    
    referee_reward_type VARCHAR(50),
    referee_reward_value DECIMAL(10, 2),
    referee_reward_given BOOLEAN DEFAULT false,
    referee_reward_given_at TIMESTAMPTZ,
    
    -- Qualification Requirements
    qualification_requirements JSONB DEFAULT '{}',
    /* Example qualification_requirements format:
    {
        "minimum_visits": 1,
        "minimum_spending": 50,
        "time_limit_days": 30,
        "must_complete_service": true
    }
    */
    
    -- Tracking
    expires_at TIMESTAMPTZ,
    campaign_id UUID REFERENCES campaign_executions(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_referral_code UNIQUE(barbershop_id, referral_code)
);

-- ============================================
-- 5. FEEDBACK AND SATISFACTION
-- ============================================

-- Customer Feedback (Surveys and reviews)
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Feedback Context
    appointment_id UUID REFERENCES appointments(id),
    barber_id UUID REFERENCES auth.users(id),
    service_id UUID REFERENCES services(id),
    
    -- Feedback Type
    feedback_type VARCHAR(50) NOT NULL, -- 'nps', 'csat', 'ces', 'review', 'complaint', 'suggestion'
    feedback_category VARCHAR(100), -- 'service_quality', 'staff_behavior', 'facility', 'booking_process'
    
    -- Ratings
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
    facility_rating INTEGER CHECK (facility_rating >= 1 AND facility_rating <= 5),
    booking_rating INTEGER CHECK (booking_rating >= 1 AND booking_rating <= 5),
    
    -- Detailed Feedback
    feedback_text TEXT,
    feedback_title VARCHAR(255),
    
    -- Specific Feedback Scores
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10), -- Net Promoter Score
    csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 5), -- Customer Satisfaction
    ces_score INTEGER CHECK (ces_score >= 1 AND ces_score <= 7), -- Customer Effort Score
    
    -- Feedback Collection
    collection_method VARCHAR(50), -- 'email', 'sms', 'app', 'in_person', 'phone', 'website'
    survey_id VARCHAR(255), -- External survey system ID
    
    -- Sentiment Analysis
    sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0
    sentiment_label VARCHAR(20), -- 'positive', 'neutral', 'negative'
    emotional_indicators TEXT[],
    key_phrases TEXT[],
    
    -- Public Display
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    display_name VARCHAR(100), -- How customer name appears publicly
    
    -- Response and Follow-up
    requires_response BOOLEAN DEFAULT false,
    response_priority INTEGER CHECK (response_priority >= 1 AND response_priority <= 5),
    assigned_to_user_id UUID REFERENCES auth.users(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
        'new', 'acknowledged', 'investigating', 'responded', 'resolved', 'escalated', 'closed'
    )),
    
    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_time_hours DECIMAL(8, 2),
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false, -- Verified as legitimate feedback
    verification_method VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPS Scores (Net Promoter Score tracking)
CREATE TABLE IF NOT EXISTS nps_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- NPS Details
    nps_score INTEGER NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
    nps_category VARCHAR(20) NOT NULL CHECK (nps_category IN ('detractor', 'passive', 'promoter')),
    
    -- Context
    survey_context VARCHAR(100), -- 'post_appointment', 'quarterly', 'annual', 'triggered'
    appointment_id UUID REFERENCES appointments(id),
    
    -- Question and Response
    nps_question TEXT NOT NULL,
    follow_up_comment TEXT,
    
    -- Collection Details
    survey_method VARCHAR(50) NOT NULL, -- 'email', 'sms', 'app', 'in_person'
    survey_campaign_id UUID REFERENCES campaign_executions(id),
    
    -- Response Timing
    survey_sent_at TIMESTAMPTZ,
    survey_completed_at TIMESTAMPTZ DEFAULT NOW(),
    response_time_hours DECIMAL(8, 2),
    
    -- Customer Context at Time of Survey
    customer_tenure_days INTEGER, -- Days since first visit
    customer_visit_count INTEGER, -- Total visits at time of survey
    customer_lifetime_value DECIMAL(10, 2), -- CLV at time of survey
    last_visit_days_ago INTEGER, -- Days since last visit
    
    -- Follow-up Actions
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_type VARCHAR(100), -- 'thank_you', 'investigate_issues', 'win_back', 'referral_request'
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_completed_at TIMESTAMPTZ,
    
    -- Impact Tracking
    influenced_retention BOOLEAN DEFAULT false,
    led_to_referral BOOLEAN DEFAULT false,
    generated_review BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satisfaction Metrics (CSAT scores)
CREATE TABLE IF NOT EXISTS satisfaction_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Satisfaction Context
    metric_type VARCHAR(50) NOT NULL, -- 'csat', 'ces', 'custom'
    measurement_context VARCHAR(100), -- 'overall', 'service_specific', 'staff_specific', 'process_specific'
    
    -- Related Records
    appointment_id UUID REFERENCES appointments(id),
    barber_id UUID REFERENCES auth.users(id),
    service_id UUID REFERENCES services(id),
    
    -- Satisfaction Scores
    primary_score INTEGER NOT NULL, -- Main satisfaction score
    scale_min INTEGER NOT NULL DEFAULT 1,
    scale_max INTEGER NOT NULL DEFAULT 5,
    
    -- Detailed Ratings
    detailed_scores JSONB DEFAULT '{}',
    /* Example detailed_scores format:
    {
        "timeliness": 5,
        "professionalism": 4,
        "skill_level": 5,
        "communication": 4,
        "cleanliness": 5,
        "value_for_money": 4
    }
    */
    
    -- Question and Response
    question_asked TEXT NOT NULL,
    response_comment TEXT,
    
    -- Collection Method
    collection_method VARCHAR(50) NOT NULL,
    survey_id VARCHAR(255),
    
    -- Benchmarking
    industry_benchmark DECIMAL(4, 2), -- Industry average for comparison
    historical_average DECIMAL(4, 2), -- Customer's historical average
    shop_average DECIMAL(4, 2), -- Shop's average at time of measurement
    
    -- Improvement Tracking
    improvement_areas TEXT[], -- Areas identified for improvement
    improvement_actions_taken TEXT[],
    
    -- Follow-up
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_type VARCHAR(100),
    follow_up_deadline DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    
    -- Trends
    trend_direction VARCHAR(20), -- 'improving', 'stable', 'declining'
    trend_significance DECIMAL(4, 2), -- Statistical significance of trend
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Responses (Business responses to reviews)
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Original Review Context
    customer_feedback_id UUID REFERENCES customer_feedback(id) ON DELETE CASCADE,
    external_review_id VARCHAR(255), -- ID from Google, Yelp, etc.
    review_platform VARCHAR(50), -- 'google', 'yelp', 'facebook', 'internal'
    original_rating INTEGER,
    original_review_text TEXT,
    
    -- Response Details
    response_text TEXT NOT NULL,
    response_tone VARCHAR(50), -- 'professional', 'friendly', 'apologetic', 'grateful'
    
    -- Response Authorship
    responder_user_id UUID NOT NULL REFERENCES auth.users(id),
    responder_role VARCHAR(50), -- 'owner', 'manager', 'staff', 'ai_assistant'
    
    -- Response Process
    response_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'escalated', 'template', 'custom'
    template_used VARCHAR(255), -- Template name if used
    requires_approval BOOLEAN DEFAULT false,
    approved_by_user_id UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Publication
    published_at TIMESTAMPTZ,
    publication_status VARCHAR(50) DEFAULT 'draft' CHECK (publication_status IN (
        'draft', 'pending_approval', 'approved', 'published', 'rejected'
    )),
    
    -- External Platform Details
    external_response_id VARCHAR(255), -- ID from external platform
    platform_specific_data JSONB DEFAULT '{}',
    
    -- Response Quality
    response_quality_score INTEGER CHECK (response_quality_score >= 1 AND response_quality_score <= 10),
    response_effectiveness VARCHAR(50), -- 'very_effective', 'effective', 'neutral', 'ineffective'
    
    -- Follow-up Impact
    customer_responded BOOLEAN DEFAULT false,
    customer_follow_up_text TEXT,
    rating_updated BOOLEAN DEFAULT false,
    new_rating INTEGER,
    
    -- Internal Notes
    internal_notes TEXT,
    escalation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

-- Customer Lifecycle Indexes
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_stages_barbershop ON customer_lifecycle_stages(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_barbershop_customer ON customer_health_scores(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_churn_risk ON customer_health_scores(barbershop_id, churn_risk);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_barbershop_customer ON customer_journeys(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_event_type ON customer_journeys(barbershop_id, event_type);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_created_at ON customer_journeys(barbershop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_milestones_barbershop_customer ON customer_milestones(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_milestones_type ON customer_milestones(barbershop_id, milestone_type);

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_customer_analytics_summary_barbershop_customer ON customer_analytics_summary(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_summary_period ON customer_analytics_summary(barbershop_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_customer_cohorts_barbershop ON customer_cohorts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clv_calculations_barbershop_customer ON clv_calculations(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_clv_calculations_date ON clv_calculations(barbershop_id, calculation_date);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_barbershop_customer ON churn_predictions(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_risk_level ON churn_predictions(barbershop_id, churn_risk_level);
CREATE INDEX IF NOT EXISTS idx_customer_segments_barbershop ON customer_segments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_assignments_barbershop_customer ON customer_segment_assignments(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_assignments_segment ON customer_segment_assignments(segment_id);

-- Engagement Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_definitions_barbershop ON campaign_definitions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_barbershop ON campaign_executions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions(barbershop_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_barbershop_customer ON campaign_responses(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_responses_execution ON campaign_responses(campaign_execution_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_barbershop_customer ON customer_communications(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON customer_communications(barbershop_id, communication_type);
CREATE INDEX IF NOT EXISTS idx_customer_communications_created_at ON customer_communications(barbershop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_barbershop_customer ON customer_interactions(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_type ON customer_interactions(barbershop_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_created_at ON customer_interactions(barbershop_id, created_at);

-- Loyalty Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_barbershop ON loyalty_programs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_program_enrollments_barbershop_customer ON loyalty_program_enrollments(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_program_enrollments_program ON loyalty_program_enrollments(loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_barbershop_customer ON loyalty_points(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_program ON loyalty_points(loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transaction_type ON loyalty_points(barbershop_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_created_at ON loyalty_points(barbershop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_barbershop_program ON loyalty_tiers(barbershop_id, loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_barbershop_customer ON reward_redemptions(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_program ON reward_redemptions(loyalty_program_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_barbershop_referrer ON referral_tracking(barbershop_id, referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referee ON referral_tracking(barbershop_id, referee_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_code ON referral_tracking(barbershop_id, referral_code);

-- Feedback Indexes
CREATE INDEX IF NOT EXISTS idx_customer_feedback_barbershop_customer ON customer_feedback(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_appointment ON customer_feedback(appointment_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(barbershop_id, overall_rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(barbershop_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_nps_scores_barbershop_customer ON nps_scores(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_nps_scores_category ON nps_scores(barbershop_id, nps_category);
CREATE INDEX IF NOT EXISTS idx_nps_scores_completed_at ON nps_scores(barbershop_id, survey_completed_at);
CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_barbershop_customer ON satisfaction_metrics(barbershop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_appointment ON satisfaction_metrics(appointment_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_barbershop ON review_responses(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_feedback ON review_responses(customer_feedback_id);

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Create RLS policies for shop owners and staff
-- Shop owners can manage all data for their shops
CREATE POLICY "Shop owners can manage customer lifecycle data" ON customer_lifecycle_stages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_lifecycle_stages.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer health scores" ON customer_health_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_health_scores.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer journeys" ON customer_journeys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_journeys.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer milestones" ON customer_milestones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_milestones.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage analytics summary" ON customer_analytics_summary
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_analytics_summary.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage cohorts" ON customer_cohorts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_cohorts.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage CLV calculations" ON clv_calculations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = clv_calculations.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage churn predictions" ON churn_predictions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = churn_predictions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer segments" ON customer_segments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_segments.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage segment assignments" ON customer_segment_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_segment_assignments.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage campaigns" ON campaign_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = campaign_definitions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage campaign executions" ON campaign_executions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = campaign_executions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage campaign responses" ON campaign_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = campaign_responses.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage communications" ON customer_communications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_communications.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage interactions" ON customer_interactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_interactions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage loyalty programs" ON loyalty_programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = loyalty_programs.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage loyalty enrollments" ON loyalty_program_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = loyalty_program_enrollments.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage loyalty points" ON loyalty_points
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = loyalty_points.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage loyalty tiers" ON loyalty_tiers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = loyalty_tiers.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage reward redemptions" ON reward_redemptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = reward_redemptions.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage referral tracking" ON referral_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = referral_tracking.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage customer feedback" ON customer_feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = customer_feedback.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage NPS scores" ON nps_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = nps_scores.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage satisfaction metrics" ON satisfaction_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = satisfaction_metrics.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Shop owners can manage review responses" ON review_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = review_responses.barbershop_id 
            AND barbershops.owner_id = (SELECT auth.uid())
        )
    );

-- Allow customers to view their own data (limited access)
CREATE POLICY "Customers can view their own health scores" ON customer_health_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_health_scores.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view their own journeys" ON customer_journeys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_journeys.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view their own milestones" ON customer_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = customer_milestones.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view their own loyalty data" ON loyalty_program_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = loyalty_program_enrollments.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view their own points" ON loyalty_points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = loyalty_points.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Customers can view their own redemptions" ON reward_redemptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = reward_redemptions.customer_id 
            AND customers.user_id = (SELECT auth.uid())
        )
    );

-- ============================================
-- 8. TRIGGERS FOR AUTOMATION
-- ============================================

-- Updated_at triggers for all tables with updated_at columns
CREATE TRIGGER update_customer_lifecycle_stages_updated_at BEFORE UPDATE ON customer_lifecycle_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_health_scores_updated_at BEFORE UPDATE ON customer_health_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_milestones_updated_at BEFORE UPDATE ON customer_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_analytics_summary_updated_at BEFORE UPDATE ON customer_analytics_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_cohorts_updated_at BEFORE UPDATE ON customer_cohorts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clv_calculations_updated_at BEFORE UPDATE ON clv_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_churn_predictions_updated_at BEFORE UPDATE ON churn_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON customer_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_definitions_updated_at BEFORE UPDATE ON campaign_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_executions_updated_at BEFORE UPDATE ON campaign_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_communications_updated_at BEFORE UPDATE ON customer_communications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_interactions_updated_at BEFORE UPDATE ON customer_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON loyalty_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_program_enrollments_updated_at BEFORE UPDATE ON loyalty_program_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_tiers_updated_at BEFORE UPDATE ON loyalty_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON reward_redemptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_tracking_updated_at BEFORE UPDATE ON referral_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_feedback_updated_at BEFORE UPDATE ON customer_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_satisfaction_metrics_updated_at BEFORE UPDATE ON satisfaction_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_responses_updated_at BEFORE UPDATE ON review_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. INITIAL DATA AND ENUMS
-- ============================================

-- Insert default customer lifecycle stages for barbershops
-- This will be done via application logic when a barbershop is created
-- to allow customization per barbershop

-- Default lifecycle stages template (reference for application logic):
/*
INSERT INTO customer_lifecycle_stages (barbershop_id, stage_name, stage_description, stage_order, criteria) VALUES
($1, 'New Lead', 'Customer has shown interest but not booked', 0, '{"visits_min": 0, "visits_max": 0}'),
($1, 'First Visit', 'Customer has booked first appointment', 1, '{"visits_min": 1, "visits_max": 1}'),
($1, 'Regular Customer', 'Customer visits regularly', 2, '{"visits_min": 2, "visits_max": 10, "days_since_last_visit": 60}'),
($1, 'VIP Customer', 'High value, frequent customer', 3, '{"visits_min": 11, "total_spent_min": 500}'),
($1, 'At Risk', 'Customer hasn\'t visited recently', 4, '{"days_since_last_visit": 90}'),
($1, 'Churned', 'Customer has likely churned', 5, '{"days_since_last_visit": 180}');
*/

-- Create function to automatically categorize NPS scores
CREATE OR REPLACE FUNCTION categorize_nps_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nps_category = CASE 
        WHEN NEW.nps_score >= 9 THEN 'promoter'
        WHEN NEW.nps_score >= 7 THEN 'passive'
        ELSE 'detractor'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categorize_nps_score_trigger 
    BEFORE INSERT OR UPDATE ON nps_scores
    FOR EACH ROW EXECUTE FUNCTION categorize_nps_score();

-- Create function to update loyalty points balance
CREATE OR REPLACE FUNCTION update_loyalty_points_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate balance after this transaction
    NEW.balance_after = NEW.balance_before + NEW.points_amount;
    
    -- Update the enrollment record with new current points
    UPDATE loyalty_program_enrollments 
    SET current_points = NEW.balance_after,
        last_activity_date = CURRENT_DATE,
        last_points_earned_date = CASE 
            WHEN NEW.transaction_type IN ('earned', 'bonus') THEN CURRENT_DATE
            ELSE last_points_earned_date
        END,
        last_redemption_date = CASE 
            WHEN NEW.transaction_type = 'redeemed' THEN CURRENT_DATE
            ELSE last_redemption_date
        END
    WHERE customer_id = NEW.customer_id 
    AND loyalty_program_id = NEW.loyalty_program_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loyalty_points_balance_trigger 
    BEFORE INSERT ON loyalty_points
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_points_balance();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary of created tables:
-- 1. Customer Lifecycle: customer_lifecycle_stages, customer_health_scores, customer_journeys, customer_milestones
-- 2. Analytics: customer_analytics_summary, customer_cohorts, clv_calculations, churn_predictions, customer_segments, customer_segment_assignments
-- 3. Engagement: campaign_definitions, campaign_executions, campaign_responses, customer_communications, customer_interactions
-- 4. Loyalty: loyalty_programs, loyalty_program_enrollments, loyalty_points, loyalty_tiers, reward_redemptions, referral_tracking
-- 5. Feedback: customer_feedback, nps_scores, satisfaction_metrics, review_responses

-- All tables include:
-- - Proper barbershop_id for multi-tenant isolation
-- - Comprehensive indexes for performance
-- - Row Level Security (RLS) policies
-- - Foreign key relationships
-- - Triggers for automated updates
-- - Detailed JSONB fields for flexibility
-- - Professional database design patterns

-- Next steps for implementation:
-- 1. Apply this migration to your Supabase database
-- 2. Create API endpoints in FastAPI for each table
-- 3. Build UI components for customer management
-- 4. Implement automated processes for health score calculation
-- 5. Set up campaign automation workflows
-- 6. Create analytics dashboards and reports