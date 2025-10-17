-- =============================================
-- NO-SHOW MANAGEMENT SYSTEM DATABASE SCHEMA (PostgreSQL)
-- =============================================
-- This migration creates all tables and relationships needed for the
-- comprehensive no-show management system including policies, strikes,
-- grace periods, recovery workflows, and analytics.
-- =============================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS no_show_fee_transactions CASCADE;
DROP TABLE IF EXISTS no_show_recovery_attempts CASCADE;
DROP TABLE IF EXISTS blocked_client_recovery CASCADE;
DROP TABLE IF EXISTS blocked_clients CASCADE;
DROP TABLE IF EXISTS client_strike_history CASCADE;
DROP TABLE IF EXISTS no_show_incidents CASCADE;
DROP TABLE IF EXISTS grace_period_rules CASCADE;
DROP TABLE IF EXISTS no_show_automation_rules CASCADE;
DROP TABLE IF EXISTS no_show_policies CASCADE;

-- =============================================
-- 1. NO-SHOW POLICIES TABLE
-- =============================================
-- Stores barbershop-specific no-show policies and thresholds
CREATE TABLE no_show_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Strike System Configuration
    strikes_before_block INTEGER DEFAULT 3,
    strike_expiry_days INTEGER DEFAULT 90, -- Strikes expire after X days
    strike_reset_period_days INTEGER DEFAULT 90,
    
    -- Fee Configuration
    no_show_fee_enabled BOOLEAN DEFAULT true,
    no_show_fee_amount DECIMAL(10, 2) DEFAULT 25.00,
    no_show_fee_type TEXT DEFAULT 'fixed' CHECK (no_show_fee_type IN ('fixed', 'percentage')),
    no_show_fee_percentage DECIMAL(5, 2) DEFAULT 50.00, -- If percentage type
    
    -- Late Cancellation Configuration
    late_cancel_fee_enabled BOOLEAN DEFAULT true,
    late_cancel_fee_amount DECIMAL(10, 2) DEFAULT 15.00,
    late_cancel_hours_threshold INTEGER DEFAULT 2,
    
    -- Grace Period Configuration
    grace_period_enabled BOOLEAN DEFAULT true,
    default_grace_minutes INTEGER DEFAULT 15,
    
    -- Notification Configuration
    send_warning_at_strikes INTEGER DEFAULT 2, -- Send warning after X strikes
    send_block_notification BOOLEAN DEFAULT true,
    manager_notification_email TEXT,
    
    -- Recovery Configuration
    allow_self_recovery BOOLEAN DEFAULT false,
    recovery_fee_amount DECIMAL(10, 2) DEFAULT 50.00,
    recovery_requires_deposit BOOLEAN DEFAULT true,
    recovery_deposit_amount DECIMAL(10, 2) DEFAULT 100.00,
    
    -- Automation Settings
    auto_charge_fees BOOLEAN DEFAULT false,
    auto_block_enabled BOOLEAN DEFAULT true,
    auto_send_notifications BOOLEAN DEFAULT true,
    
    -- Policy Metadata
    policy_name TEXT DEFAULT 'Standard No-Show Policy',
    name TEXT DEFAULT 'Standard No-Show Policy',
    policy_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    
    UNIQUE(barbershop_id, is_active) -- One active policy per barbershop
);

-- =============================================
-- 2. NO-SHOW INCIDENTS TABLE
-- =============================================
-- Records individual no-show incidents
CREATE TABLE no_show_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Incident Details
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    incident_time TIME DEFAULT CURRENT_TIME,
    incident_type TEXT DEFAULT 'no_show' CHECK (incident_type IN ('no_show', 'late_cancel', 'late_arrival')),
    service_name TEXT,
    service_price DECIMAL(10, 2),
    
    -- Late cancellation details
    was_late_cancel BOOLEAN DEFAULT false,
    notice_hours INTEGER, -- Hours of notice given for cancellation
    
    -- Grace Period Application
    grace_period_applied BOOLEAN DEFAULT false,
    arrived_minutes_late INTEGER, -- NULL if never arrived
    marked_as_late BOOLEAN DEFAULT false,
    
    -- Strike Information
    strikes_applied DECIMAL(3, 1) DEFAULT 1.0, -- Can be 0.5 for late cancels
    strikes_waived BOOLEAN DEFAULT false,
    
    -- Fee Information
    fee_charged BOOLEAN DEFAULT false,
    fee_amount DECIMAL(10, 2),
    fee_status TEXT DEFAULT 'pending' CHECK (fee_status IN ('pending', 'charged', 'waived', 'failed')),
    fee_charged_at TIMESTAMP WITH TIME ZONE,
    fee_transaction_id TEXT, -- Stripe charge ID
    fee_waived BOOLEAN DEFAULT false,
    fee_waived_by UUID REFERENCES profiles(id),
    fee_waived_at TIMESTAMP WITH TIME ZONE,
    fee_collected BOOLEAN DEFAULT false,
    
    -- Incident Resolution
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'strike_applied', 'excused', 'resolved')),
    resolution_type TEXT CHECK (resolution_type IN ('unresolved', 'fee_paid', 'waived', 'disputed')),
    resolution TEXT,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    notes TEXT,
    
    -- Tracking
    reported_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. CLIENT STRIKE HISTORY TABLE
-- =============================================
-- Tracks strike history and patterns for each client
CREATE TABLE client_strike_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Strike Tracking
    active_strikes DECIMAL(4, 1) DEFAULT 0, -- Can include half strikes
    total_strikes DECIMAL(4, 1) DEFAULT 0,
    strikes_this_month INTEGER DEFAULT 0,
    strikes_this_quarter INTEGER DEFAULT 0,
    strikes_this_year INTEGER DEFAULT 0,
    
    -- Important Dates
    first_strike_date TIMESTAMP WITH TIME ZONE,
    last_strike_date TIMESTAMP WITH TIME ZONE,
    last_reset_date TIMESTAMP WITH TIME ZONE,
    last_appointment_date TIMESTAMP WITH TIME ZONE,
    
    -- Client Segmentation
    client_segment TEXT DEFAULT 'new' CHECK (client_segment IN ('new', 'regular', 'vip', 'loyal', 'problematic')),
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    
    -- Risk Assessment
    risk_score INTEGER DEFAULT 0, -- 0-100 scale
    is_blocked BOOLEAN DEFAULT false,
    block_count INTEGER DEFAULT 0,
    last_block_date TIMESTAMP WITH TIME ZONE,
    block_lifted_at TIMESTAMP WITH TIME ZONE,
    recovery_completed BOOLEAN DEFAULT false,
    recovery_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Financial Impact
    total_fees_charged DECIMAL(10, 2) DEFAULT 0,
    total_fees_collected DECIMAL(10, 2) DEFAULT 0,
    outstanding_balance DECIMAL(10, 2) DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barbershop_id, client_id)
);

-- =============================================
-- 4. GRACE PERIOD RULES TABLE
-- =============================================
-- Defines grace periods for different client segments
CREATE TABLE grace_period_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Rule Configuration
    client_segment TEXT NOT NULL CHECK (client_segment IN ('new', 'regular', 'vip', 'loyal')),
    grace_minutes INTEGER DEFAULT 15,
    
    -- Conditions
    min_appointments_required INTEGER DEFAULT 0, -- Min appointments to qualify
    min_loyalty_points INTEGER DEFAULT 0, -- Min points to qualify
    min_spending_amount DECIMAL(10, 2) DEFAULT 0, -- Min total spending
    
    -- Advanced Rules
    allow_multiple_uses BOOLEAN DEFAULT true,
    max_uses_per_month INTEGER, -- NULL = unlimited
    reset_monthly BOOLEAN DEFAULT true,
    
    -- Metadata
    priority INTEGER DEFAULT 0, -- Higher priority rules apply first
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id)
);

-- =============================================
-- 5. BLOCKED CLIENTS TABLE
-- =============================================
-- Manages currently blocked clients
CREATE TABLE blocked_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Block Details
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP WITH TIME ZONE, -- NULL means permanent
    block_reason TEXT NOT NULL,
    strike_count_at_block DECIMAL(4, 1),
    
    -- Recovery Requirements
    requires_fee_payment BOOLEAN DEFAULT true,
    required_fee_amount DECIMAL(10, 2),
    requires_deposit BOOLEAN DEFAULT false,
    required_deposit_amount DECIMAL(10, 2),
    requires_manager_approval BOOLEAN DEFAULT false,
    
    -- Recovery Status
    recovery_initiated BOOLEAN DEFAULT false,
    recovery_initiated_at TIMESTAMP WITH TIME ZONE,
    recovery_completed_at TIMESTAMP WITH TIME ZONE,
    unblocked_at TIMESTAMP WITH TIME ZONE,
    unblocked_by UUID REFERENCES profiles(id),
    unblock_reason TEXT,
    
    -- Tracking
    blocked_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(barbershop_id, client_id, blocked_at)
);

-- =============================================
-- 6. BLOCKED CLIENT RECOVERY TABLE
-- =============================================
-- Tracks recovery workflows for blocked clients
CREATE TABLE blocked_client_recovery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocked_client_id UUID NOT NULL REFERENCES blocked_clients(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Recovery Process
    recovery_type TEXT DEFAULT 'manager_initiated' CHECK (recovery_type IN ('self_service', 'manager_initiated', 'automatic')),
    recovery_status TEXT DEFAULT 'pending' CHECK (recovery_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    initiated_by UUID REFERENCES profiles(id),
    
    -- Requirements Status
    fee_payment_required BOOLEAN DEFAULT false,
    fee_amount DECIMAL(10, 2),
    fee_paid BOOLEAN DEFAULT false,
    fee_payment_date TIMESTAMP WITH TIME ZONE,
    
    deposit_required BOOLEAN DEFAULT false,
    deposit_amount DECIMAL(10, 2),
    deposit_paid BOOLEAN DEFAULT false,
    deposit_payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Manager Approval
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Strikes Management
    strikes_reset BOOLEAN DEFAULT false,
    strikes_before_recovery DECIMAL(4, 1),
    strikes_after_recovery DECIMAL(4, 1),
    
    -- Communication
    recovery_email_sent BOOLEAN DEFAULT false,
    recovery_sms_sent BOOLEAN DEFAULT false,
    client_responded BOOLEAN DEFAULT false,
    client_response_date TIMESTAMP WITH TIME ZONE,
    
    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    
    -- Metadata
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 7. NO-SHOW RECOVERY ATTEMPTS TABLE
-- =============================================
-- Tracks communication attempts for recovery
CREATE TABLE no_show_recovery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_id UUID NOT NULL REFERENCES blocked_client_recovery(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Communication Details
    attempt_number INTEGER DEFAULT 1,
    communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'phone', 'in_person')),
    
    -- Message Content
    message_subject TEXT,
    message_content TEXT NOT NULL,
    
    -- Delivery Status
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_by UUID REFERENCES profiles(id),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Response Tracking
    client_responded BOOLEAN DEFAULT false,
    response_received_at TIMESTAMP WITH TIME ZONE,
    response_content TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. NO-SHOW FEE TRANSACTIONS TABLE
-- =============================================
-- Tracks all fee-related transactions
CREATE TABLE no_show_fee_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES no_show_incidents(id) ON DELETE SET NULL,
    
    -- Transaction Details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('no_show_fee', 'late_cancel_fee', 'recovery_fee', 'deposit')),
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Payment Processing
    payment_method TEXT CHECK (payment_method IN ('card', 'cash', 'transfer', 'waived')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    stripe_charge_id TEXT,
    stripe_refund_id TEXT,
    
    -- Processing Dates
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Refund Information
    refund_reason TEXT,
    refund_amount DECIMAL(10, 2),
    refunded_by UUID REFERENCES profiles(id),
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 9. NO-SHOW AUTOMATION RULES TABLE
-- =============================================
-- Defines automated actions for no-show management
CREATE TABLE no_show_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Rule Definition
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('strike_based', 'time_based', 'pattern_based')),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    -- Trigger Conditions
    trigger_strikes INTEGER, -- Trigger after X strikes
    trigger_days_since_incident INTEGER, -- Trigger X days after incident
    trigger_pattern TEXT, -- JSON pattern definition
    
    -- Actions to Take
    action_type TEXT NOT NULL CHECK (action_type IN ('send_notification', 'charge_fee', 'block_client', 'escalate', 'offer_recovery')),
    action_config JSONB, -- Configuration for the action
    
    -- Notification Settings (if action is notification)
    notification_template_id UUID,
    notification_channels TEXT[], -- Array of channels: email, sms, push
    
    -- Execution Tracking
    last_executed_at TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id)
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for no_show_policies
CREATE INDEX idx_policies_barbershop ON no_show_policies(barbershop_id);
CREATE INDEX idx_policies_active ON no_show_policies(is_active);

-- Indexes for no_show_incidents
CREATE INDEX idx_incidents_barbershop ON no_show_incidents(barbershop_id);
CREATE INDEX idx_incidents_client ON no_show_incidents(client_id);
CREATE INDEX idx_incidents_date ON no_show_incidents(incident_date);
CREATE INDEX idx_incidents_status ON no_show_incidents(status);
CREATE INDEX idx_incidents_unresolved ON no_show_incidents(barbershop_id, resolution_type) WHERE resolution_type = 'unresolved';

-- Indexes for client_strike_history
CREATE INDEX idx_strike_history_barbershop ON client_strike_history(barbershop_id);
CREATE INDEX idx_strike_history_client ON client_strike_history(client_id);
CREATE INDEX idx_strike_history_blocked ON client_strike_history(is_blocked);

-- Indexes for grace_period_rules
CREATE INDEX idx_grace_rules_barbershop ON grace_period_rules(barbershop_id);
CREATE INDEX idx_grace_rules_priority ON grace_period_rules(priority DESC);

-- Indexes for blocked_clients
CREATE INDEX idx_blocked_barbershop ON blocked_clients(barbershop_id);
CREATE INDEX idx_blocked_client ON blocked_clients(client_id);
CREATE INDEX idx_blocked_active ON blocked_clients(barbershop_id, blocked_at) WHERE unblocked_at IS NULL;

-- Indexes for blocked_client_recovery
CREATE INDEX idx_recovery_barbershop ON blocked_client_recovery(barbershop_id);
CREATE INDEX idx_recovery_client ON blocked_client_recovery(client_id);
CREATE INDEX idx_recovery_status ON blocked_client_recovery(recovery_status);

-- Indexes for no_show_recovery_attempts
CREATE INDEX idx_attempts_recovery ON no_show_recovery_attempts(recovery_id);
CREATE INDEX idx_attempts_client ON no_show_recovery_attempts(client_id);

-- Indexes for no_show_fee_transactions
CREATE INDEX idx_fee_trans_barbershop ON no_show_fee_transactions(barbershop_id);
CREATE INDEX idx_fee_trans_client ON no_show_fee_transactions(client_id);
CREATE INDEX idx_fee_trans_status ON no_show_fee_transactions(payment_status);

-- Indexes for no_show_automation_rules
CREATE INDEX idx_automation_barbershop ON no_show_automation_rules(barbershop_id);
CREATE INDEX idx_automation_active ON no_show_automation_rules(is_active);

-- =============================================
-- VERIFICATION QUERIES
-- Run these after migration to verify success:
-- =============================================

-- Check if tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%no_show%'
ORDER BY table_name;

-- Count tables created:
SELECT COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'no_show_policies',
  'no_show_incidents', 
  'client_strike_history',
  'grace_period_rules',
  'blocked_clients',
  'blocked_client_recovery',
  'no_show_recovery_attempts',
  'no_show_fee_transactions',
  'no_show_automation_rules'
);