-- Marketing Campaign System Schema
-- Complete database schema for marketing campaigns, accounts, and analytics

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- MARKETING ACCOUNTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Account ownership
    owner_id TEXT NOT NULL, -- User ID who owns this account
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT, -- Reference to barbershop if applicable
    enterprise_id TEXT, -- Reference to enterprise if applicable
    
    -- Account details
    account_name TEXT NOT NULL,
    description TEXT,
    
    -- Service provider configuration
    provider TEXT NOT NULL DEFAULT 'sendgrid', -- sendgrid, mailgun, ses, etc.
    api_key_encrypted TEXT, -- Encrypted API key
    api_secret_encrypted TEXT, -- Encrypted API secret (if needed)
    
    -- SendGrid specific settings
    sendgrid_api_key_encrypted TEXT,
    sendgrid_from_email TEXT DEFAULT 'noreply@bookedbarber.com',
    sendgrid_from_name TEXT DEFAULT 'BookedBarber',
    sendgrid_template_id TEXT,
    
    -- Twilio specific settings
    twilio_account_sid TEXT,
    twilio_auth_token_encrypted TEXT,
    twilio_phone_number TEXT,
    
    -- Billing configuration
    stripe_customer_id TEXT, -- Stripe customer for billing
    billing_email TEXT,
    payment_method_id TEXT, -- Default payment method
    billing_address JSONB,
    
    -- Usage controls
    monthly_spend_limit DECIMAL(10,2) DEFAULT 1000.00,
    daily_send_limit INTEGER DEFAULT 10000,
    require_approval_above DECIMAL(10,2) DEFAULT 100.00, -- Require approval for campaigns above this cost
    
    -- Account permissions
    authorized_users TEXT[], -- Array of user IDs who can use this account
    
    -- Status and configuration
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_method TEXT, -- email, phone, manual
    verified_at TIMESTAMPTZ,
    
    -- Compliance settings
    include_unsubscribe_link BOOLEAN DEFAULT true,
    include_company_address BOOLEAN DEFAULT true,
    company_address TEXT,
    gdpr_compliant BOOLEAN DEFAULT true,
    
    -- Usage tracking
    total_campaigns_sent INTEGER DEFAULT 0,
    total_emails_sent INTEGER DEFAULT 0,
    total_sms_sent INTEGER DEFAULT 0,
    total_spent DECIMAL(10,4) DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- MARKETING PAYMENT METHODS TABLE  
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Stripe payment method details
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    
    -- Card details (for display only)
    card_brand TEXT, -- visa, mastercard, amex, etc.
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Billing address
    billing_address JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- MARKETING CAMPAIGNS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Campaign ownership and billing
    created_by TEXT NOT NULL, -- User ID who created the campaign
    billing_account_id UUID REFERENCES marketing_accounts(id) NOT NULL,
    
    -- Campaign details
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'pending_approval', 'approved', 'active', 'completed', 'failed', 'cancelled')),
    
    -- Content
    subject TEXT, -- For email campaigns
    message TEXT NOT NULL, -- Email HTML or SMS text
    message_text TEXT, -- Plain text version for emails
    media_urls TEXT[], -- For SMS campaigns with media
    
    -- Sender details
    from_email TEXT,
    from_name TEXT,
    reply_to_email TEXT,
    
    -- Template and personalization
    template_id TEXT, -- Reference to email template
    personalization_data JSONB DEFAULT '{}'::jsonb,
    
    -- Audience targeting
    audience_type TEXT NOT NULL CHECK (audience_type IN ('all', 'segment', 'custom')),
    audience_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    audience_count INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    send_immediately BOOLEAN DEFAULT false,
    timezone TEXT DEFAULT 'UTC',
    
    -- Cost estimation and billing
    estimated_cost DECIMAL(10,4) DEFAULT 0,
    final_cost DECIMAL(10,4) DEFAULT 0,
    platform_fee DECIMAL(10,4) DEFAULT 0,
    service_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Campaign execution
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_details TEXT,
    
    -- Performance metrics (will be populated from analytics)
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    delivery_rate DECIMAL(5,4) DEFAULT 0,
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Campaign settings
    track_opens BOOLEAN DEFAULT true,
    track_clicks BOOLEAN DEFAULT true,
    include_unsubscribe BOOLEAN DEFAULT true,
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'shop', 'enterprise')),
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by TEXT, -- User ID who approved
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CAMPAIGN RECIPIENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
    
    -- Recipient details
    customer_id TEXT, -- Reference to customer if exists
    email_address TEXT,
    phone_number TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    
    -- Personalization data for this recipient
    personalization_data JSONB DEFAULT '{}'::jsonb,
    
    -- Delivery tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed')),
    external_message_id TEXT, -- SendGrid/Twilio message ID
    error_message TEXT,
    
    -- Engagement tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Delivery metadata
    user_agent TEXT, -- For web-based actions
    ip_address INET, -- For web-based actions
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CAMPAIGN ANALYTICS TABLE (Enhanced)
-- ===============================================
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
    
    -- Analytics period (daily, hourly, real-time)
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    granularity TEXT DEFAULT 'campaign' CHECK (granularity IN ('campaign', 'daily', 'hourly')),
    
    -- Volume metrics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    
    -- Engagement metrics
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    total_spam_reports INTEGER DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5,4) DEFAULT 0,
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    bounce_rate DECIMAL(5,4) DEFAULT 0,
    unsubscribe_rate DECIMAL(5,4) DEFAULT 0,
    spam_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Cost tracking
    service_cost DECIMAL(10,4) DEFAULT 0,
    platform_fee DECIMAL(10,4) DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    cost_per_delivered DECIMAL(10,6) DEFAULT 0,
    
    -- Performance benchmarking
    industry_avg_open_rate DECIMAL(5,4),
    industry_avg_click_rate DECIMAL(5,4),
    performance_score DECIMAL(5,2), -- 0-100 score compared to benchmarks
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, period_start, granularity)
);

-- ===============================================
-- MARKETING BILLING RECORDS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_billing_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Campaign and account references
    campaign_id UUID REFERENCES marketing_campaigns(id) NOT NULL,
    billing_account_id UUID REFERENCES marketing_accounts(id) NOT NULL,
    
    -- Stripe transaction details
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'disputed', 'refunded')),
    
    -- Cost breakdown
    amount_charged DECIMAL(10,4) NOT NULL,
    platform_fee DECIMAL(10,4) NOT NULL,
    service_cost DECIMAL(10,4) NOT NULL,
    
    -- Volume metrics
    recipients_count INTEGER NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Billing metadata
    billing_period TEXT, -- e.g., "2024-01"
    invoice_id TEXT,
    receipt_url TEXT,
    
    -- Refunds and disputes
    refund_amount DECIMAL(10,4) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    
    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disputed', 'refunded', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CUSTOMER SEGMENTS TABLE (Enhanced)
-- ===============================================
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Ownership
    created_by TEXT NOT NULL, -- User ID
    barbershop_id TEXT, -- If shop-specific
    enterprise_id TEXT, -- If enterprise-wide
    
    -- Segment details
    name TEXT NOT NULL,
    description TEXT,
    segment_type TEXT DEFAULT 'dynamic' CHECK (segment_type IN ('dynamic', 'static')),
    
    -- Segment criteria (JSON filter rules)
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Segment statistics
    customer_count INTEGER DEFAULT 0,
    email_count INTEGER DEFAULT 0, -- Customers with valid emails
    sms_count INTEGER DEFAULT 0, -- Customers with valid phones
    last_calculated_at TIMESTAMPTZ,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    auto_update BOOLEAN DEFAULT true, -- Automatically recalculate segment
    update_frequency INTEGER DEFAULT 24, -- Hours between updates
    
    -- Usage tracking
    campaigns_sent INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Visibility
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'shop', 'enterprise')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CUSTOMER SEGMENT MEMBERS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS customer_segment_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE NOT NULL,
    customer_id TEXT NOT NULL,
    
    -- Member details (cached for performance)
    email_address TEXT,
    phone_number TEXT,
    first_name TEXT,
    last_name TEXT,
    
    -- Segment membership tracking
    added_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    added_by_criteria JSONB, -- Which criteria matched
    manual_addition BOOLEAN DEFAULT false, -- Was manually added vs. criteria match
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(segment_id, customer_id)
);

-- ===============================================
-- EMAIL UNSUBSCRIBES TABLE (Global)
-- ===============================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Email and optional customer reference
    email_address TEXT NOT NULL,
    customer_id TEXT, -- If customer exists in system
    
    -- Unsubscribe context
    campaign_id UUID REFERENCES marketing_campaigns(id),
    barbershop_id TEXT, -- Specific to a shop
    enterprise_id TEXT, -- Or enterprise-wide
    unsubscribe_scope TEXT DEFAULT 'global' CHECK (unsubscribe_scope IN ('global', 'shop', 'enterprise', 'campaign')),
    
    -- Unsubscribe details
    reason TEXT,
    source TEXT DEFAULT 'email_link', -- email_link, manual, api, import
    user_agent TEXT,
    ip_address INET,
    
    -- Resubscribe tracking
    resubscribed_at TIMESTAMPTZ,
    resubscribed_by TEXT, -- User ID who resubscribed them
    resubscribe_source TEXT, -- manual, customer_request, etc.
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(email_address, unsubscribe_scope, barbershop_id, enterprise_id)
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Marketing Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_id ON marketing_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_type ON marketing_accounts(owner_type);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_barbershop_id ON marketing_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_enterprise_id ON marketing_accounts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_active ON marketing_accounts(is_active);

-- Marketing Payment Methods Indexes  
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON marketing_payment_methods(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON marketing_payment_methods(is_default, is_active);

-- Marketing Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_billing_account ON marketing_campaigns(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON marketing_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON marketing_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON marketing_campaigns(created_at);

-- Campaign Recipients Indexes
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_customer_id ON campaign_recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON campaign_recipients(email_address);
CREATE INDEX IF NOT EXISTS idx_recipients_phone ON campaign_recipients(phone_number);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_sent_at ON campaign_recipients(sent_at);

-- Campaign Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_period_start ON campaign_analytics(period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_granularity ON campaign_analytics(granularity);

-- Billing Records Indexes
CREATE INDEX IF NOT EXISTS idx_billing_records_campaign_id ON marketing_billing_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_account_id ON marketing_billing_records(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_created_at ON marketing_billing_records(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_records_payment_status ON marketing_billing_records(payment_status);

-- Customer Segments Indexes
CREATE INDEX IF NOT EXISTS idx_segments_created_by ON customer_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_segments_barbershop_id ON customer_segments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_segments_enterprise_id ON customer_segments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_segments_active ON customer_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_segments_auto_update ON customer_segments(auto_update);

-- Segment Members Indexes
CREATE INDEX IF NOT EXISTS idx_segment_members_segment_id ON customer_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_customer_id ON customer_segment_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_active ON customer_segment_members(is_active);

-- Email Unsubscribes Indexes
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON email_unsubscribes(email_address);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_customer_id ON email_unsubscribes(customer_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_campaign_id ON email_unsubscribes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_scope ON email_unsubscribes(unsubscribe_scope);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_active ON email_unsubscribes(is_active);

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Function to calculate campaign analytics from recipients
CREATE OR REPLACE FUNCTION update_campaign_analytics(campaign_id_param UUID)
RETURNS void AS $$
BEGIN
    -- Update campaign summary metrics from recipients
    UPDATE marketing_campaigns 
    SET 
        total_sent = (
            SELECT COUNT(*) FROM campaign_recipients 
            WHERE campaign_id = campaign_id_param AND sent_at IS NOT NULL
        ),
        total_delivered = (
            SELECT COUNT(*) FROM campaign_recipients 
            WHERE campaign_id = campaign_id_param AND delivered_at IS NOT NULL
        ),
        total_failed = (
            SELECT COUNT(*) FROM campaign_recipients 
            WHERE campaign_id = campaign_id_param AND status = 'failed'
        ),
        total_opened = (
            SELECT COUNT(*) FROM campaign_recipients 
            WHERE campaign_id = campaign_id_param AND opened_at IS NOT NULL
        ),
        total_clicked = (
            SELECT COUNT(*) FROM campaign_recipients 
            WHERE campaign_id = campaign_id_param AND clicked_at IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = campaign_id_param;
    
    -- Calculate rates
    UPDATE marketing_campaigns
    SET
        delivery_rate = CASE 
            WHEN total_sent > 0 THEN (total_delivered::DECIMAL / total_sent::DECIMAL)
            ELSE 0 
        END,
        open_rate = CASE 
            WHEN total_delivered > 0 THEN (total_opened::DECIMAL / total_delivered::DECIMAL)
            ELSE 0 
        END,
        click_rate = CASE 
            WHEN total_delivered > 0 THEN (total_clicked::DECIMAL / total_delivered::DECIMAL)
            ELSE 0 
        END,
        success_rate = CASE 
            WHEN total_sent > 0 THEN (total_delivered::DECIMAL / total_sent::DECIMAL)
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update segment member counts
CREATE OR REPLACE FUNCTION update_segment_counts(segment_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE customer_segments
    SET 
        customer_count = (
            SELECT COUNT(*) FROM customer_segment_members 
            WHERE segment_id = segment_id_param AND is_active = true
        ),
        email_count = (
            SELECT COUNT(*) FROM customer_segment_members 
            WHERE segment_id = segment_id_param AND is_active = true AND email_address IS NOT NULL
        ),
        sms_count = (
            SELECT COUNT(*) FROM customer_segment_members 
            WHERE segment_id = segment_id_param AND is_active = true AND phone_number IS NOT NULL
        ),
        last_calculated_at = NOW(),
        updated_at = NOW()
    WHERE id = segment_id_param;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- TRIGGERS
-- ===============================================

-- Update campaign analytics when recipients change
CREATE OR REPLACE FUNCTION trigger_update_campaign_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the affected campaign
    PERFORM update_campaign_analytics(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.campaign_id
            ELSE NEW.campaign_id
        END
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipients_analytics
    AFTER INSERT OR UPDATE OR DELETE ON campaign_recipients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_campaign_analytics();

-- Update segment counts when members change
CREATE OR REPLACE FUNCTION trigger_update_segment_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update segment counts for the affected segment
    PERFORM update_segment_counts(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.segment_id
            ELSE NEW.segment_id
        END
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_segment_members_counts
    AFTER INSERT OR UPDATE OR DELETE ON customer_segment_members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_segment_counts();

-- Update account usage statistics
CREATE OR REPLACE FUNCTION trigger_update_account_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account usage when campaign is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE marketing_accounts
        SET 
            total_campaigns_sent = total_campaigns_sent + 1,
            total_emails_sent = total_emails_sent + CASE WHEN NEW.type = 'email' THEN NEW.total_sent ELSE 0 END,
            total_sms_sent = total_sms_sent + CASE WHEN NEW.type = 'sms' THEN NEW.total_sent ELSE 0 END,
            total_spent = total_spent + COALESCE(NEW.final_cost, 0),
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.billing_account_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_account_usage
    AFTER UPDATE ON marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_account_usage();

-- ===============================================
-- SEED DATA FOR TESTING
-- ===============================================

-- Insert default marketing account for testing
INSERT INTO marketing_accounts (
    id,
    owner_id,
    owner_type,
    account_name,
    description,
    provider,
    sendgrid_from_email,
    sendgrid_from_name,
    is_active,
    is_verified
) VALUES (
    uuid_generate_v4(),
    'test-user-id',
    'shop',
    'Test Marketing Account',
    'Default marketing account for testing',
    'sendgrid',
    'test@example.com',
    'Test Barbershop',
    true,
    true
) ON CONFLICT DO NOTHING;

-- Insert sample customer segment
INSERT INTO customer_segments (
    id,
    created_by,
    name,
    description,
    criteria,
    segment_type,
    is_active
) VALUES (
    uuid_generate_v4(),
    'test-user-id',
    'All Customers',
    'All active customers with email opt-in',
    '{"email_opt_in": true, "is_active": true}'::jsonb,
    'dynamic',
    true
) ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE marketing_accounts IS 'Marketing service accounts and billing configuration';
COMMENT ON TABLE marketing_campaigns IS 'Email and SMS marketing campaigns';
COMMENT ON TABLE campaign_recipients IS 'Individual recipients and delivery tracking';
COMMENT ON TABLE campaign_analytics IS 'Campaign performance metrics and analytics';
COMMENT ON TABLE customer_segments IS 'Customer segmentation for targeted marketing';
COMMENT ON TABLE email_unsubscribes IS 'Global email unsubscribe management';
COMMENT ON TABLE marketing_billing_records IS 'Billing and payment tracking for campaigns';

-- Grant permissions for the application
-- Note: In production, use more restrictive permissions
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;