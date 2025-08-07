-- UNIFIED DATABASE SCHEMA
-- Consolidates all 50 table types from 25 separate databases
-- Created: 2025-07-31
-- Purpose: Single source of truth for all system data

-- ===========================================
-- CORE SYSTEM TABLES
-- ===========================================

-- USERS TABLE (consolidated from 5 different versions)
-- Unified schema incorporating all fields from different versions
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    user_type TEXT DEFAULT 'customer', -- customer, barber, admin
    shop_id INTEGER,
    preferences TEXT, -- JSON format
    avatar_url TEXT,
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT 0,
    phone_verified BOOLEAN DEFAULT 0,
    
    -- Indexes for performance
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- BUSINESS ENTITIES
-- ===========================================

-- BARBERSHOPS/LOCATIONS TABLE (consolidated)
CREATE TABLE IF NOT EXISTS barbershops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    business_hours TEXT, -- JSON format
    coordinates TEXT, -- JSON format for lat/lng
    social_media TEXT, -- JSON format
    description TEXT,
    logo_url TEXT
);

-- BARBERS TABLE
CREATE TABLE IF NOT EXISTS barbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    specialties TEXT, -- JSON format
    experience_years INTEGER,
    hourly_rate DECIMAL(10,2),
    commission_rate DECIMAL(5,2),
    availability TEXT, -- JSON format
    bio TEXT,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- SERVICES TABLE (consolidated from 2 versions with schema differences)
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2),
    duration_minutes INTEGER,
    category TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT,
    booking_buffer_minutes INTEGER DEFAULT 15,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- BARBER SERVICES JUNCTION TABLE (consolidated from 2 versions)
CREATE TABLE IF NOT EXISTS barber_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    custom_price DECIMAL(10,2), -- Override base service price
    is_available BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(barber_id, service_id)
);

-- ===========================================
-- BOOKING SYSTEM
-- ===========================================

-- APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    barber_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled, no_show
    total_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
    payment_id TEXT,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (barber_id) REFERENCES barbers(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- WAITLIST TABLE
CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    service_id INTEGER,
    preferred_date DATE,
    preferred_time TIME,
    barber_preference INTEGER, -- barber_id or NULL for any
    status TEXT DEFAULT 'active', -- active, matched, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    notified_at TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (barber_preference) REFERENCES barbers(id)
);

-- BOOKING HISTORY TABLE
CREATE TABLE IF NOT EXISTS booking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    appointment_id INTEGER,
    service_frequency INTEGER, -- days between bookings
    preferred_barber INTEGER,
    spending_pattern DECIMAL(10,2),
    satisfaction_rating INTEGER, -- 1-5
    last_booking_date DATE,
    total_bookings INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (preferred_barber) REFERENCES barbers(id)
);

-- ===========================================
-- AI & INTELLIGENCE TABLES
-- ===========================================

-- AI RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL, -- service, barber, time_slot, pricing
    recommendation_data TEXT NOT NULL, -- JSON format
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT 0,
    feedback_rating INTEGER, -- 1-5 if customer provides feedback
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AI CUSTOMER INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS ai_customer_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    insight_type TEXT NOT NULL, -- behavior, preference, risk, value
    insight_data TEXT NOT NULL, -- JSON format
    confidence_level TEXT, -- high, medium, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AI LEARNING FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS ai_learning_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER,
    customer_id INTEGER NOT NULL,
    feedback_type TEXT NOT NULL, -- positive, negative, neutral
    feedback_data TEXT, -- JSON format
    learning_weight DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (recommendation_id) REFERENCES ai_recommendations(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- BOOKING PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS booking_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    preferred_days TEXT, -- JSON array
    preferred_times TEXT, -- JSON array
    preferred_barbers TEXT, -- JSON array of barber_ids
    preferred_services TEXT, -- JSON array of service_ids
    notification_preferences TEXT, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- SMART RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS smart_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    recommendation_engine TEXT, -- algorithm used
    recommended_service INTEGER,
    recommended_barber INTEGER,
    recommended_time TIMESTAMP,
    recommendation_score DECIMAL(5,2),
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    accepted BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (recommended_service) REFERENCES services(id),
    FOREIGN KEY (recommended_barber) REFERENCES barbers(id)
);

-- BOOKING PATTERNS TABLE
CREATE TABLE IF NOT EXISTS booking_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    pattern_type TEXT, -- weekly, monthly, seasonal
    pattern_data TEXT, -- JSON format
    confidence DECIMAL(3,2),
    last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- ===========================================
-- ANALYTICS & BUSINESS INTELLIGENCE
-- ===========================================

-- PREDICTIVE ANALYTICS TABLES
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    service_id INTEGER,
    forecast_date DATE NOT NULL,
    predicted_demand INTEGER,
    confidence_interval TEXT, -- JSON format
    model_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actual_demand INTEGER, -- filled after the date passes
    accuracy_score DECIMAL(5,2), -- calculated after actual data available
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS dynamic_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    time_slot TIMESTAMP,
    base_price DECIMAL(10,2),
    suggested_price DECIMAL(10,2),
    demand_multiplier DECIMAL(3,2),
    pricing_strategy TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    applied BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS business_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    insight_category TEXT, -- revenue, customer, efficiency, growth
    insight_title TEXT,
    insight_description TEXT,
    impact_level TEXT, -- high, medium, low
    recommended_actions TEXT, -- JSON array
    data_points TEXT, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    acted_upon BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

CREATE TABLE IF NOT EXISTS seasonal_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    pattern_type TEXT, -- daily, weekly, monthly, yearly
    pattern_data TEXT, -- JSON format
    service_id INTEGER,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    snapshot_date DATE,
    metrics_data TEXT NOT NULL, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- ===========================================
-- CUSTOMER BEHAVIOR & ENGAGEMENT
-- ===========================================

-- CUSTOMER BEHAVIOR TABLE
CREATE TABLE IF NOT EXISTS customer_behavior (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    behavior_type TEXT, -- booking, cancellation, no_show, review, referral
    behavior_data TEXT, -- JSON format
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    source TEXT, -- web, mobile, api
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- ===========================================
-- MARKETING CAMPAIGNS (consolidated from 11 databases!)
-- ===========================================

-- CUSTOMERS TABLE (Marketing-specific customer data)
CREATE TABLE IF NOT EXISTS marketing_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- Link to main users table if exists
    shop_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    tags TEXT, -- JSON array
    segments TEXT, -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opted_in_email BOOLEAN DEFAULT 1,
    opted_in_sms BOOLEAN DEFAULT 1,
    last_engagement TIMESTAMP,
    engagement_score INTEGER DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    UNIQUE(email, shop_id)
);

-- CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    campaign_name TEXT NOT NULL,
    campaign_type TEXT, -- email, sms, push, automation
    subject TEXT,
    content TEXT,
    target_segments TEXT, -- JSON array
    scheduled_at TIMESTAMP,
    status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- CAMPAIGN SENDS TABLE (tracking individual sends)
CREATE TABLE IF NOT EXISTS marketing_campaign_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
    opened BOOLEAN DEFAULT 0,
    clicked BOOLEAN DEFAULT 0,
    converted BOOLEAN DEFAULT 0,
    unsubscribed BOOLEAN DEFAULT 0,
    error_message TEXT,
    
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES marketing_customers(id) ON DELETE CASCADE
);

-- ===========================================
-- AGENT SYSTEM & COORDINATION
-- ===========================================

-- AGENT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS agent_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    shop_id INTEGER,
    customer_id INTEGER,
    agent_type TEXT, -- booking, marketing, analytics, support
    status TEXT DEFAULT 'active', -- active, completed, failed, transferred
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    session_data TEXT, -- JSON format
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- AGENT CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS agent_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    message_type TEXT, -- user, agent, system
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agent_name TEXT,
    confidence_score DECIMAL(3,2),
    intent_detected TEXT,
    entities_extracted TEXT, -- JSON format
    
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);

-- AGENT COORDINATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS agent_coordination_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    from_agent TEXT,
    to_agent TEXT,
    handoff_reason TEXT,
    context_data TEXT, -- JSON format
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT 1,
    
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id)
);

-- AGENT PERFORMANCE METRICS TABLE
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    shop_id INTEGER,
    metric_date DATE,
    conversations_handled INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    average_resolution_time DECIMAL(10,2), -- in seconds
    customer_satisfaction DECIMAL(3,2), -- average rating
    handoff_rate DECIMAL(5,2), -- percentage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- BUSINESS OBJECTIVES TABLE
CREATE TABLE IF NOT EXISTS business_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    objective_type TEXT, -- revenue, bookings, retention, efficiency
    objective_title TEXT,
    target_value DECIMAL(15,2),
    current_value DECIMAL(15,2) DEFAULT 0,
    deadline DATE,
    status TEXT DEFAULT 'active', -- active, completed, paused, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AGENT HANDOFFS TABLE
CREATE TABLE IF NOT EXISTS agent_handoffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    from_agent_type TEXT,
    to_agent_type TEXT,
    handoff_trigger TEXT, -- complexity, specialty, escalation
    customer_context TEXT, -- JSON format
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolution_time INTEGER, -- seconds to complete after handoff
    success_rating INTEGER, -- 1-5
    
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id)
);

-- ===========================================
-- CHAT & MESSAGING SYSTEM
-- ===========================================

-- CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    shop_id INTEGER,
    session_token TEXT UNIQUE,
    status TEXT DEFAULT 'active', -- active, ended, transferred
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    session_summary TEXT,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    sender_type TEXT, -- customer, agent, system
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_by_customer BOOLEAN DEFAULT 0,
    read_by_agent BOOLEAN DEFAULT 0,
    message_metadata TEXT, -- JSON format
    
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- AGENTIC SESSIONS TABLE
CREATE TABLE IF NOT EXISTS agentic_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    shop_id INTEGER,
    agent_stack TEXT, -- JSON array of agents involved
    objective TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    outcome_summary TEXT,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AGENTIC MESSAGES TABLE
CREATE TABLE IF NOT EXISTS agentic_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    agent_name TEXT,
    message_type TEXT, -- input, output, internal, coordination
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time DECIMAL(10,3), -- seconds
    confidence_score DECIMAL(3,2),
    
    FOREIGN KEY (session_id) REFERENCES agentic_sessions(id) ON DELETE CASCADE
);

-- LEARNING INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS learning_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    insight_type TEXT, -- pattern, improvement, error, success
    insight_data TEXT, -- JSON format
    confidence_level DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied BOOLEAN DEFAULT 0,
    feedback_score INTEGER, -- if validated by human
    
    FOREIGN KEY (session_id) REFERENCES agentic_sessions(id)
);

-- ===========================================
-- ANALYTICS DASHBOARD (consolidated from 4 databases!)
-- ===========================================

-- AGENT METRICS TABLE
CREATE TABLE IF NOT EXISTS dashboard_agent_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    agent_type TEXT,
    metric_date DATE,
    interactions_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    average_response_time DECIMAL(10,2),
    customer_satisfaction DECIMAL(3,2),
    conversion_rate DECIMAL(5,2),
    revenue_attributed DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- ROI ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS dashboard_roi_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    analysis_period TEXT, -- daily, weekly, monthly, quarterly
    period_start DATE,
    period_end DATE,
    total_investment DECIMAL(15,2),
    total_revenue DECIMAL(15,2),
    roi_percentage DECIMAL(8,2),
    roi_category TEXT, -- marketing, ai, automation, staff
    breakdown_data TEXT, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- CROSS AGENT INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS dashboard_cross_agent_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    insight_title TEXT,
    involved_agents TEXT, -- JSON array
    insight_summary TEXT,
    impact_score DECIMAL(3,2),
    recommended_actions TEXT, -- JSON array
    implementation_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- PERFORMANCE TRENDS TABLE
CREATE TABLE IF NOT EXISTS dashboard_performance_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    metric_name TEXT,
    trend_period TEXT, -- 7d, 30d, 90d, 1y
    trend_direction TEXT, -- up, down, stable
    trend_percentage DECIMAL(8,2),
    data_points TEXT, -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AGENT INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS dashboard_agent_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    interaction_date DATE,
    agent_type TEXT,
    customer_id INTEGER,
    interaction_outcome TEXT,
    duration_seconds INTEGER,
    complexity_score INTEGER, -- 1-10
    satisfaction_rating INTEGER, -- 1-5
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- EXECUTIVE DASHBOARD TABLE
CREATE TABLE IF NOT EXISTS dashboard_executive_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    report_date DATE,
    kpi_data TEXT NOT NULL, -- JSON format with all KPIs
    alerts TEXT, -- JSON array of important alerts
    recommendations TEXT, -- JSON array of AI recommendations
    goals_progress TEXT, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- ===========================================
-- AI MONETIZATION & BILLING
-- ===========================================

-- AI USAGE RECORDS TABLE
CREATE TABLE IF NOT EXISTS ai_usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    customer_id INTEGER,
    usage_type TEXT, -- recommendation, prediction, analysis, automation
    api_calls INTEGER DEFAULT 1,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    billing_cycle TEXT,
    service_used TEXT, -- gpt-4, claude, custom-model
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- CUSTOMER AI QUOTAS TABLE
CREATE TABLE IF NOT EXISTS customer_ai_quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    quota_type TEXT, -- monthly, daily, per-service
    quota_limit INTEGER,
    quota_used INTEGER DEFAULT 0,
    reset_date DATE,
    overage_allowed BOOLEAN DEFAULT 0,
    overage_rate DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AI ROI METRICS TABLE
CREATE TABLE IF NOT EXISTS ai_roi_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    metric_period TEXT, -- daily, weekly, monthly
    period_start DATE,
    period_end DATE,
    ai_investment DECIMAL(15,2),
    revenue_increase DECIMAL(15,2),
    cost_savings DECIMAL(15,2),
    efficiency_gain DECIMAL(8,2), -- percentage
    customer_satisfaction_impact DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- AI BILLING CYCLES TABLE
CREATE TABLE IF NOT EXISTS ai_billing_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    total_usage_cost DECIMAL(15,2),
    subscription_cost DECIMAL(15,2),
    overage_cost DECIMAL(15,2) DEFAULT 0,
    total_billed DECIMAL(15,2),
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    
    FOREIGN KEY (shop_id) REFERENCES barbershops(id)
);

-- ===========================================
-- INTEGRATION & SYNC TABLES
-- ===========================================

-- CALENDAR SYNC TABLE
CREATE TABLE IF NOT EXISTS calendar_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    calendar_provider TEXT, -- google, outlook, apple
    external_calendar_id TEXT,
    sync_token TEXT,
    last_sync TIMESTAMP,
    sync_status TEXT DEFAULT 'active', -- active, error, disabled
    sync_settings TEXT, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SOCIAL AUTH TABLE
CREATE TABLE IF NOT EXISTS social_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT, -- google, facebook, apple
    external_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(provider, external_id)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Appointment-related indexes
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Marketing-related indexes
CREATE INDEX IF NOT EXISTS idx_marketing_customers_email ON marketing_customers(email);
CREATE INDEX IF NOT EXISTS idx_marketing_customers_shop_id ON marketing_customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_shop_id ON marketing_campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_sends_campaign_id ON marketing_campaign_sends(campaign_id);

-- Agent-related indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_shop_id ON agent_sessions(shop_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_session_id ON agent_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Analytics-related indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_agent_metrics_shop_id ON dashboard_agent_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_roi_analysis_shop_id ON dashboard_roi_analysis(shop_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_records_shop_id ON ai_usage_records(shop_id);

-- ===========================================
-- TRIGGERS FOR DATA INTEGRITY
-- ===========================================

-- Update timestamps automatically
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_appointments_timestamp 
    AFTER UPDATE ON appointments
    BEGIN
        UPDATE appointments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_barbershops_timestamp 
    AFTER UPDATE ON barbershops
    BEGIN
        UPDATE barbershops SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Automatically update booking history when appointments change
CREATE TRIGGER IF NOT EXISTS update_booking_history_on_appointment
    AFTER UPDATE ON appointments
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
        INSERT OR REPLACE INTO booking_history (
            customer_id, shop_id, appointment_id, 
            last_booking_date, total_bookings
        ) VALUES (
            NEW.customer_id, NEW.shop_id, NEW.id,
            NEW.appointment_date,
            COALESCE((SELECT total_bookings FROM booking_history 
                     WHERE customer_id = NEW.customer_id AND shop_id = NEW.shop_id), 0) + 1
        );
    END;