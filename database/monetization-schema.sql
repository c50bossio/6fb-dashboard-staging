-- Monetization System Database Schema
-- Supports marketplace, revenue sharing, and feature gates

-- Agent Purchases (Marketplace)
CREATE TABLE IF NOT EXISTS agent_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('agent', 'bundle', 'addon')),
    parent_bundle VARCHAR(100), -- If purchased as part of a bundle
    stripe_subscription_id VARCHAR(255),
    billing_period VARCHAR(20) CHECK (billing_period IN ('monthly', 'yearly', 'one_time')),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    capabilities JSONB, -- List of capabilities this purchase grants
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_agent_purchases_user (user_id),
    INDEX idx_agent_purchases_agent (agent_id),
    INDEX idx_agent_purchases_status (status),
    UNIQUE KEY unique_user_agent (user_id, agent_id, status)
);

-- Agent Usage Tracking (for usage-based billing)
CREATE TABLE IF NOT EXISTS agent_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(100) NOT NULL,
    usage_type VARCHAR(100) NOT NULL, -- 'campaign_creation', 'conversation', etc.
    quantity INTEGER NOT NULL DEFAULT 1,
    cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_agent_usage_user (user_id),
    INDEX idx_agent_usage_agent (agent_id),
    INDEX idx_agent_usage_created (created_at DESC)
);

-- Revenue Shares (for franchise/partnership models)
CREATE TABLE IF NOT EXISTS revenue_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    organization_id UUID,
    distribution JSONB NOT NULL, -- Detailed distribution breakdown
    payouts JSONB, -- Payout details and status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_revenue_shares_transaction (transaction_id),
    INDEX idx_revenue_shares_org (organization_id),
    INDEX idx_revenue_shares_status (status),
    INDEX idx_revenue_shares_created (created_at DESC)
);

-- Revenue Configurations (per organization)
CREATE TABLE IF NOT EXISTS revenue_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('franchise', 'partnership', 'commission', 'subscription_share', 'custom')),
    custom_splits JSONB, -- Custom split percentages if model_type = 'custom'
    minimum_fees JSONB, -- Minimum fee requirements
    auto_payout BOOLEAN DEFAULT TRUE,
    payout_schedule VARCHAR(20) DEFAULT 'daily' CHECK (payout_schedule IN ('daily', 'weekly', 'monthly', 'manual')),
    stripe_connect_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_revenue_config_org (organization_id)
);

-- Feature Usage Tracking (for feature gates)
CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_category VARCHAR(100) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    usage_type VARCHAR(100) NOT NULL DEFAULT 'request',
    quantity INTEGER NOT NULL DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_feature_usage_user (user_id),
    INDEX idx_feature_usage_feature (feature_category, feature_name),
    INDEX idx_feature_usage_created (created_at DESC)
);

-- Subscription Upgrades/Downgrades History
CREATE TABLE IF NOT EXISTS subscription_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_tier VARCHAR(50),
    to_tier VARCHAR(50) NOT NULL,
    change_type VARCHAR(20) CHECK (change_type IN ('upgrade', 'downgrade', 'cancel', 'reactivate')),
    reason TEXT,
    stripe_event_id VARCHAR(255),
    effective_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_subscription_changes_user (user_id),
    INDEX idx_subscription_changes_created (created_at DESC)
);

-- Billing Events Log
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID,
    event_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    stripe_event_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_billing_events_user (user_id),
    INDEX idx_billing_events_org (organization_id),
    INDEX idx_billing_events_created (created_at DESC)
);

-- Marketplace Transactions
CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_marketplace_trans_user (user_id),
    INDEX idx_marketplace_trans_item (item_id),
    INDEX idx_marketplace_trans_status (status)
);

-- Usage Quotas (cached limits per user)
CREATE TABLE IF NOT EXISTS usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL,
    feature_category VARCHAR(100) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    quota_limit INTEGER NOT NULL,
    current_usage INTEGER DEFAULT 0,
    reset_period VARCHAR(20) DEFAULT 'monthly',
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_feature (user_id, feature_category, feature_name),
    INDEX idx_usage_quotas_user (user_id)
);

-- Partner/Affiliate Tracking
CREATE TABLE IF NOT EXISTS partner_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL,
    referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,4) DEFAULT 0.20, -- 20% default commission
    total_earned DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_partner_referrals_partner (partner_id),
    INDEX idx_partner_referrals_code (referral_code)
);

-- Create Views for Analytics

-- Monthly Revenue by Agent
CREATE OR REPLACE VIEW v_monthly_agent_revenue AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    agent_id,
    item_type,
    COUNT(*) as purchases,
    SUM(price) as total_revenue,
    AVG(price) as avg_price
FROM agent_purchases
WHERE status = 'active'
GROUP BY DATE_TRUNC('month', created_at), agent_id, item_type
ORDER BY month DESC, total_revenue DESC;

-- User Feature Usage Summary
CREATE OR REPLACE VIEW v_user_feature_usage AS
SELECT 
    u.id as user_id,
    u.subscription_tier,
    fc.feature_category,
    fc.feature_name,
    COUNT(fu.id) as usage_count,
    SUM(fu.quantity) as total_quantity,
    MAX(fu.created_at) as last_used
FROM users u
LEFT JOIN feature_usage fu ON u.id = fu.user_id
LEFT JOIN (
    SELECT DISTINCT feature_category, feature_name 
    FROM feature_usage
) fc ON fu.feature_category = fc.feature_category 
    AND fu.feature_name = fc.feature_name
GROUP BY u.id, u.subscription_tier, fc.feature_category, fc.feature_name;

-- Revenue Share Analytics
CREATE OR REPLACE VIEW v_revenue_share_analytics AS
SELECT 
    organization_id,
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as transaction_count,
    SUM((distribution->>'platform_amount')::decimal) as platform_revenue,
    SUM((distribution->>'franchise_owner_amount')::decimal) as franchise_revenue,
    SUM((distribution->>'location_amount')::decimal) as location_revenue,
    AVG((distribution->>'platform_percentage')::decimal) as avg_platform_percentage
FROM revenue_shares
WHERE status = 'completed'
GROUP BY organization_id, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_agent_purchases_composite 
ON agent_purchases(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_usage_composite 
ON feature_usage(user_id, feature_category, feature_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_shares_composite 
ON revenue_shares(organization_id, status, created_at DESC);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_purchases_updated_at 
BEFORE UPDATE ON agent_purchases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_configurations_updated_at 
BEFORE UPDATE ON revenue_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_quotas_updated_at 
BEFORE UPDATE ON usage_quotas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to check and enforce usage quotas
CREATE OR REPLACE FUNCTION check_usage_quota(
    p_user_id UUID,
    p_feature_category VARCHAR,
    p_feature_name VARCHAR,
    p_quantity INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_quota RECORD;
    v_new_usage INTEGER;
BEGIN
    -- Get current quota
    SELECT * INTO v_quota
    FROM usage_quotas
    WHERE user_id = p_user_id
    AND feature_category = p_feature_category
    AND feature_name = p_feature_name;
    
    IF NOT FOUND THEN
        -- No quota set, allow usage
        RETURN TRUE;
    END IF;
    
    -- Check if quota would be exceeded
    v_new_usage := v_quota.current_usage + p_quantity;
    
    IF v_quota.quota_limit = -1 THEN
        -- Unlimited quota
        RETURN TRUE;
    END IF;
    
    IF v_new_usage > v_quota.quota_limit THEN
        -- Quota would be exceeded
        RETURN FALSE;
    END IF;
    
    -- Update current usage
    UPDATE usage_quotas
    SET current_usage = v_new_usage,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_quota.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas() RETURNS void AS $$
BEGIN
    UPDATE usage_quotas
    SET current_usage = 0,
        last_reset = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE reset_period = 'monthly'
    AND last_reset < DATE_TRUNC('month', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO revenue_configurations (organization_id, model_type, auto_payout, payout_schedule) VALUES
('00000000-0000-0000-0000-000000000001', 'franchise', true, 'daily'),
('00000000-0000-0000-0000-000000000002', 'partnership', true, 'weekly'),
('00000000-0000-0000-0000-000000000003', 'commission', true, 'monthly')
ON CONFLICT DO NOTHING;