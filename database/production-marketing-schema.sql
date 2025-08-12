-- Production Marketing Campaign System Schema
-- Complete database schema with performance optimizations and compliance features

-- ===============================================
-- MARKETING CAMPAIGNS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Campaign basics
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'queued', 'sending', 'completed', 'paused', 'cancelled', 'failed'
    )),
    
    -- Campaign content
    subject TEXT,
    message TEXT NOT NULL,
    html_content TEXT,
    template_id TEXT,
    
    -- Targeting
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT,
    enterprise_id TEXT,
    segment_id UUID,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    send_immediately BOOLEAN DEFAULT false,
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Queue management
    queue_id TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    batch_size INTEGER DEFAULT 100,
    batch_delay_ms INTEGER DEFAULT 1000,
    
    -- Tracking
    recipients_count INTEGER DEFAULT 0,
    queued_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    complained_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_send_time_ms INTEGER,
    avg_delivery_time_ms INTEGER,
    
    -- Billing
    estimated_cost DECIMAL(10,4),
    actual_cost DECIMAL(10,4),
    platform_fee DECIMAL(10,4),
    stripe_charge_id TEXT,
    
    -- Compliance
    include_unsubscribe BOOLEAN DEFAULT true,
    compliance_footer TEXT,
    suppression_list_checked BOOLEAN DEFAULT false,
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ===============================================
-- CAMPAIGN RECIPIENTS TABLE (Optimized for scale)
-- ===============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    -- Recipient details
    customer_id TEXT,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    
    -- Personalization data
    personalization JSONB DEFAULT '{}',
    
    -- Delivery tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'queued', 'sending', 'sent', 'delivered', 'opened', 
        'clicked', 'bounced', 'failed', 'unsubscribed', 'complained'
    )),
    
    -- Queue management
    queue_position INTEGER,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    queued_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Provider tracking
    provider TEXT CHECK (provider IN ('sendgrid', 'twilio', 'ses', 'mailgun')),
    message_id TEXT,
    provider_message_id TEXT,
    provider_status TEXT,
    provider_response JSONB,
    
    -- Error handling
    error_code TEXT,
    error_message TEXT,
    error_details JSONB,
    
    -- Engagement tracking
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    clicks JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- MARKETING BILLING RECORDS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_billing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Billing details
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    campaign_id UUID REFERENCES marketing_campaigns(id),
    
    -- Cost breakdown
    service_type TEXT NOT NULL CHECK (service_type IN ('email', 'sms', 'push')),
    recipient_count INTEGER NOT NULL,
    base_cost_per_unit DECIMAL(10,6) NOT NULL,
    base_cost_total DECIMAL(10,4) NOT NULL,
    markup_rate DECIMAL(5,2) NOT NULL,
    platform_fee DECIMAL(10,4) NOT NULL,
    total_charge DECIMAL(10,4) NOT NULL,
    profit_margin DECIMAL(5,2),
    
    -- Payment
    stripe_charge_id TEXT,
    stripe_invoice_id TEXT,
    payment_method_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'
    )),
    payment_date TIMESTAMP WITH TIME ZONE,
    refund_amount DECIMAL(10,4),
    refund_date TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    credits_used INTEGER,
    credits_remaining INTEGER,
    
    -- Metadata
    description TEXT,
    invoice_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Billing period
    billing_month INTEGER,
    billing_year INTEGER,
    billing_period_start DATE,
    billing_period_end DATE
);

-- ===============================================
-- CUSTOMER SEGMENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Segment details
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Segment type
    segment_type TEXT DEFAULT 'dynamic' CHECK (segment_type IN ('static', 'dynamic')),
    
    -- Segment criteria (JSON query)
    criteria JSONB NOT NULL DEFAULT '{}',
    sql_query TEXT,
    
    -- Customer cache (for static segments)
    customer_ids JSONB DEFAULT '[]',
    customer_count INTEGER DEFAULT 0,
    
    -- Refresh settings (for dynamic segments)
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval_hours INTEGER DEFAULT 24,
    last_refreshed TIMESTAMP WITH TIME ZONE,
    next_refresh TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    campaigns_used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- EMAIL UNSUBSCRIBES TABLE (CAN-SPAM Compliance)
-- ===============================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    owner_id TEXT,
    owner_type TEXT,
    barbershop_id TEXT,
    
    -- Unsubscribe details
    unsubscribe_type TEXT DEFAULT 'all' CHECK (unsubscribe_type IN ('all', 'marketing', 'transactional')),
    reason TEXT,
    feedback TEXT,
    
    -- Source tracking
    campaign_id UUID REFERENCES marketing_campaigns(id),
    unsubscribe_method TEXT CHECK (unsubscribe_method IN ('link', 'reply', 'manual', 'complaint', 'bounce')),
    
    -- Timestamps
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resubscribed_at TIMESTAMP WITH TIME ZONE,
    
    -- Compliance
    ip_address INET,
    user_agent TEXT,
    
    UNIQUE(email, owner_id, unsubscribe_type)
);

-- ===============================================
-- SMS OPT_OUTS TABLE (TCPA Compliance)
-- ===============================================
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    owner_id TEXT,
    owner_type TEXT,
    barbershop_id TEXT,
    
    -- Opt-out details
    opt_out_type TEXT DEFAULT 'all' CHECK (opt_out_type IN ('all', 'marketing', 'appointment')),
    keyword TEXT,
    
    -- Source tracking
    campaign_id UUID REFERENCES marketing_campaigns(id),
    opt_out_method TEXT CHECK (opt_out_method IN ('keyword', 'manual', 'complaint')),
    
    -- Timestamps
    opted_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opted_in_at TIMESTAMP WITH TIME ZONE,
    
    -- Compliance
    consent_proof TEXT,
    
    UNIQUE(phone, owner_id, opt_out_type)
);

-- ===============================================
-- CAMPAIGN QUEUE TABLE (Job Queue Management)
-- ===============================================
CREATE TABLE IF NOT EXISTS campaign_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    -- Queue details
    queue_name TEXT DEFAULT 'default',
    job_type TEXT NOT NULL CHECK (job_type IN ('send', 'retry', 'webhook', 'analytics')),
    priority INTEGER DEFAULT 5,
    
    -- Job data
    job_data JSONB NOT NULL,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
    )),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Worker tracking
    worker_id TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- WEBHOOK EVENTS TABLE (Delivery Tracking)
-- ===============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Event source
    provider TEXT NOT NULL CHECK (provider IN ('sendgrid', 'twilio', 'stripe')),
    event_type TEXT NOT NULL,
    event_id TEXT,
    
    -- Related entities
    campaign_id UUID REFERENCES marketing_campaigns(id),
    recipient_id UUID REFERENCES campaign_recipients(id),
    message_id TEXT,
    
    -- Event data
    event_data JSONB NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    
    -- Security
    signature TEXT,
    verified BOOLEAN DEFAULT false,
    
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider, event_id)
);

-- ===============================================
-- PERFORMANCE INDEXES
-- ===============================================

-- Campaign indexes
CREATE INDEX idx_campaigns_owner ON marketing_campaigns(owner_id, owner_type);
CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON marketing_campaigns(scheduled_for) 
    WHERE status = 'scheduled';
CREATE INDEX idx_campaigns_created ON marketing_campaigns(created_at DESC);

-- Recipient indexes
CREATE INDEX idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_recipients_status ON campaign_recipients(status);
CREATE INDEX idx_recipients_customer ON campaign_recipients(customer_id);
CREATE INDEX idx_recipients_email ON campaign_recipients(email);
CREATE INDEX idx_recipients_phone ON campaign_recipients(phone);
CREATE INDEX idx_recipients_queue ON campaign_recipients(campaign_id, queue_position) 
    WHERE status = 'queued';

-- Billing indexes
CREATE INDEX idx_billing_owner ON marketing_billing_records(owner_id, owner_type);
CREATE INDEX idx_billing_campaign ON marketing_billing_records(campaign_id);
CREATE INDEX idx_billing_period ON marketing_billing_records(billing_year, billing_month);
CREATE INDEX idx_billing_status ON marketing_billing_records(payment_status);

-- Segment indexes
CREATE INDEX idx_segments_owner ON customer_segments(owner_id);
CREATE INDEX idx_segments_refresh ON customer_segments(next_refresh) 
    WHERE auto_refresh = true;

-- Unsubscribe indexes
CREATE INDEX idx_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX idx_unsubscribes_owner ON email_unsubscribes(owner_id);

-- Opt-out indexes
CREATE INDEX idx_optouts_phone ON sms_opt_outs(phone);
CREATE INDEX idx_optouts_owner ON sms_opt_outs(owner_id);

-- Queue indexes
CREATE INDEX idx_queue_status ON campaign_queue(status, scheduled_for) 
    WHERE status IN ('pending', 'processing');
CREATE INDEX idx_queue_campaign ON campaign_queue(campaign_id);
CREATE INDEX idx_queue_locked ON campaign_queue(locked_until) 
    WHERE status = 'processing';

-- Webhook indexes
CREATE INDEX idx_webhooks_campaign ON webhook_events(campaign_id);
CREATE INDEX idx_webhooks_processed ON webhook_events(processed, received_at);

-- ===============================================
-- ROW LEVEL SECURITY
-- ===============================================

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- TRIGGERS FOR UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recipients_updated_at
    BEFORE UPDATE ON campaign_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_segments_updated_at
    BEFORE UPDATE ON customer_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_queue_updated_at
    BEFORE UPDATE ON campaign_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();