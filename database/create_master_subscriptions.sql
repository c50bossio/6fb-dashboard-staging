-- Master Subscriptions Table Creation
-- This consolidates all fragmented subscription systems into a single source of truth
-- Supports both individual barber subscriptions and barbershop-level subscriptions

-- ==============================================
-- CREATE MASTER SUBSCRIPTIONS TABLE
-- ==============================================

-- Drop existing fragmented subscription tables if they exist (backup first)
-- CREATE TABLE IF NOT EXISTS subscription_backup_fragments AS 
-- SELECT 'profiles_subscriptions' as source, id, * FROM profiles WHERE subscription_status IS NOT NULL
-- UNION ALL 
-- SELECT 'user_subscriptions' as source, * FROM user_subscriptions WHERE TRUE;

-- Create the unified subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Subscription holder (exactly one must be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID, -- Will reference barbershops table
  
  -- Subscription tier and status
  tier TEXT NOT NULL CHECK (tier IN ('trial', 'basic', 'professional', 'enterprise', 'barber_individual')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'paused')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  
  -- Pricing
  price_per_month DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  
  -- Feature limits based on subscription tier
  max_staff INTEGER DEFAULT 1,
  max_services INTEGER DEFAULT 10,
  max_appointments_per_month INTEGER DEFAULT 100,
  max_locations INTEGER DEFAULT 1,
  ai_quota_per_month INTEGER DEFAULT 100,
  sms_quota_per_month INTEGER DEFAULT 50,
  email_quota_per_month INTEGER DEFAULT 500,
  
  -- Advanced features
  has_analytics BOOLEAN DEFAULT TRUE,
  has_marketing_tools BOOLEAN DEFAULT FALSE,
  has_api_access BOOLEAN DEFAULT FALSE,
  has_white_label BOOLEAN DEFAULT FALSE,
  has_multi_location BOOLEAN DEFAULT FALSE,
  has_advanced_reporting BOOLEAN DEFAULT FALSE,
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  
  -- Trial management
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_days_remaining INTEGER DEFAULT 0,
  
  -- Billing periods
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  next_billing_date TIMESTAMPTZ,
  
  -- Subscription lifecycle
  started_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Usage tracking
  usage_data JSONB DEFAULT '{}',
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT subscription_holder_check 
    CHECK ((user_id IS NOT NULL AND barbershop_id IS NULL) OR 
           (user_id IS NULL AND barbershop_id IS NOT NULL)),
  
  -- Unique active subscription per holder
  CONSTRAINT unique_active_subscription 
    EXCLUDE (user_id WITH =, barbershop_id WITH =) 
    WHERE (status IN ('active', 'trialing', 'past_due'))
);

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_subscriptions_barbershop_id ON subscriptions(barbershop_id) WHERE barbershop_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_billing ON subscriptions(current_period_end, status);
CREATE INDEX idx_subscriptions_trial ON subscriptions(trial_end_date) WHERE trial_end_date IS NOT NULL;

-- ==============================================
-- CREATE SUBSCRIPTION TIERS REFERENCE
-- ==============================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  monthly_price DECIMAL(8,2) NOT NULL,
  yearly_price DECIMAL(8,2),
  setup_fee DECIMAL(8,2) DEFAULT 0.00,
  
  -- Limits
  max_staff INTEGER DEFAULT 1,
  max_services INTEGER DEFAULT 10,
  max_appointments_per_month INTEGER DEFAULT 100,
  max_locations INTEGER DEFAULT 1,
  ai_quota_per_month INTEGER DEFAULT 100,
  sms_quota_per_month INTEGER DEFAULT 50,
  email_quota_per_month INTEGER DEFAULT 500,
  
  -- Features
  features JSONB DEFAULT '[]',
  
  -- Stripe integration
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INSERT DEFAULT SUBSCRIPTION TIERS
-- ==============================================

INSERT INTO subscription_tiers (tier_name, display_name, description, monthly_price, yearly_price, max_staff, max_services, max_appointments_per_month, max_locations, ai_quota_per_month, sms_quota_per_month, email_quota_per_month, features, sort_order) VALUES 

-- Trial tier (free for 14 days)
('trial', 'Free Trial', '14-day free trial with full access', 0.00, 0.00, 2, 20, 50, 1, 50, 25, 100, 
 '["basic_booking", "client_management", "calendar_sync", "basic_analytics"]', 1),

-- Individual barber tier
('barber_individual', 'Individual Barber', 'Perfect for solo barbers and freelancers', 29.99, 299.99, 1, 15, 200, 1, 200, 100, 500,
 '["booking_management", "client_management", "payment_processing", "calendar_sync", "basic_analytics", "social_media_tools"]', 2),

-- Basic shop tier
('basic', 'Basic Shop', 'Great for small barbershops', 79.99, 799.99, 3, 25, 500, 1, 500, 200, 1000,
 '["multi_staff_management", "advanced_booking", "inventory_tracking", "payment_processing", "analytics_dashboard", "marketing_tools"]', 3),

-- Professional tier
('professional', 'Professional', 'Advanced features for growing businesses', 149.99, 1499.99, 8, 50, 1500, 2, 1000, 500, 2500,
 '["advanced_analytics", "multi_location", "staff_scheduling", "loyalty_programs", "advanced_marketing", "api_access"]', 4),

-- Enterprise tier
('enterprise', 'Enterprise', 'Full-featured solution for large operations', 299.99, 2999.99, 25, 100, 5000, 10, 2500, 1000, 10000,
 '["unlimited_features", "white_label", "custom_integrations", "priority_support", "advanced_reporting", "multi_location", "franchise_management"]', 5);

-- ==============================================
-- CREATE SUBSCRIPTION USAGE TRACKING
-- ==============================================

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Usage metrics
  usage_period_start TIMESTAMPTZ NOT NULL,
  usage_period_end TIMESTAMPTZ NOT NULL,
  
  -- Tracked usage
  appointments_created INTEGER DEFAULT 0,
  staff_members_active INTEGER DEFAULT 0,
  services_active INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  -- Overage tracking
  appointments_overage INTEGER DEFAULT 0,
  ai_overage INTEGER DEFAULT 0,
  sms_overage INTEGER DEFAULT 0,
  email_overage INTEGER DEFAULT 0,
  
  -- Metadata
  raw_usage_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique per subscription per period
  UNIQUE(subscription_id, usage_period_start, usage_period_end)
);

CREATE INDEX idx_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX idx_usage_period ON subscription_usage(usage_period_start, usage_period_end);

-- ==============================================
-- CREATE TRIGGERS AND FUNCTIONS
-- ==============================================

-- Function to update subscription updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for subscriptions table
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- Trigger for subscription_tiers table
CREATE TRIGGER update_subscription_tiers_updated_at 
    BEFORE UPDATE ON subscription_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- Function to calculate trial days remaining
CREATE OR REPLACE FUNCTION update_trial_days_remaining()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.trial_end_date IS NOT NULL THEN
        NEW.trial_days_remaining = GREATEST(0, 
            EXTRACT(days FROM (NEW.trial_end_date - NOW()))::INTEGER
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update trial days remaining
CREATE TRIGGER calculate_trial_days_remaining 
    BEFORE INSERT OR UPDATE OF trial_end_date ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_trial_days_remaining();

-- ==============================================
-- CREATE HELPER VIEWS
-- ==============================================

-- View for active subscriptions with tier information
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    s.*,
    st.display_name as tier_display_name,
    st.description as tier_description,
    st.features as tier_features,
    CASE 
        WHEN s.user_id IS NOT NULL THEN 'user'
        WHEN s.barbershop_id IS NOT NULL THEN 'barbershop'
        ELSE 'unknown'
    END as subscription_type
FROM subscriptions s
LEFT JOIN subscription_tiers st ON s.tier = st.tier_name
WHERE s.status IN ('active', 'trialing', 'past_due');

-- View for subscription usage summary
CREATE OR REPLACE VIEW subscription_usage_summary AS
SELECT 
    s.id as subscription_id,
    s.tier,
    s.status,
    su.appointments_created,
    su.staff_members_active,
    su.ai_requests,
    su.sms_sent,
    su.emails_sent,
    -- Calculate usage percentages
    CASE 
        WHEN st.max_appointments_per_month > 0 
        THEN (su.appointments_created::FLOAT / st.max_appointments_per_month * 100)
        ELSE 0 
    END as appointments_usage_percent,
    CASE 
        WHEN st.ai_quota_per_month > 0 
        THEN (su.ai_requests::FLOAT / st.ai_quota_per_month * 100)
        ELSE 0 
    END as ai_usage_percent
FROM subscriptions s
LEFT JOIN subscription_tiers st ON s.tier = st.tier_name
LEFT JOIN subscription_usage su ON s.id = su.subscription_id
    AND su.usage_period_start <= NOW()
    AND su.usage_period_end >= NOW()
WHERE s.status IN ('active', 'trialing');

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all subscription tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "users_own_subscriptions" ON subscriptions
    FOR ALL USING (
        auth.uid() = user_id OR 
        barbershop_id IN (
            SELECT barbershop_id FROM profiles WHERE id = auth.uid()
        ) OR
        barbershop_id IN (
            SELECT barbershop_id FROM barbershop_staff 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy: Everyone can read subscription tiers (for pricing page)
CREATE POLICY "public_subscription_tiers" ON subscription_tiers
    FOR SELECT USING (is_active = true);

-- Policy: Users can see usage for their own subscriptions
CREATE POLICY "users_own_usage" ON subscription_usage
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM subscriptions 
            WHERE user_id = auth.uid() OR barbershop_id IN (
                SELECT barbershop_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- ==============================================
-- MIGRATION HELPER FUNCTIONS
-- ==============================================

-- Function to migrate existing subscription data
CREATE OR REPLACE FUNCTION migrate_existing_subscriptions()
RETURNS TEXT AS $$
DECLARE
    migration_count INTEGER := 0;
    error_count INTEGER := 0;
    rec RECORD;
BEGIN
    -- Migrate from profiles table subscription data
    FOR rec IN 
        SELECT id, subscription_status, trial_started_at, trial_expires_at,
               ai_agent_subscription_tier, ai_agent_monthly_quota
        FROM profiles 
        WHERE subscription_status IS NOT NULL 
           OR ai_agent_subscription_tier IS NOT NULL
    LOOP
        BEGIN
            INSERT INTO subscriptions (
                user_id,
                tier,
                status,
                trial_start_date,
                trial_end_date,
                ai_quota_per_month,
                created_at
            ) VALUES (
                rec.id,
                COALESCE(rec.ai_agent_subscription_tier, 'trial'),
                CASE 
                    WHEN rec.subscription_status = 'trial' THEN 'trialing'
                    WHEN rec.subscription_status = 'active' THEN 'active'
                    ELSE 'active'
                END,
                rec.trial_started_at,
                rec.trial_expires_at,
                COALESCE(rec.ai_agent_monthly_quota, 100),
                NOW()
            )
            ON CONFLICT DO NOTHING;
            
            migration_count := migration_count + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Error migrating subscription for user %: %', rec.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN format('Migrated %s subscriptions with %s errors', migration_count, error_count);
END;
$$ LANGUAGE plpgsql;

-- Function to validate subscription data integrity
CREATE OR REPLACE FUNCTION validate_subscription_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    count INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check for duplicate active subscriptions
    RETURN QUERY
    WITH duplicates AS (
        SELECT user_id, barbershop_id, COUNT(*) as cnt
        FROM subscriptions 
        WHERE status IN ('active', 'trialing', 'past_due')
        GROUP BY user_id, barbershop_id
        HAVING COUNT(*) > 1
    )
    SELECT 
        'duplicate_active_subscriptions'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        format('%s holders with duplicate active subscriptions', COUNT(*))::TEXT
    FROM duplicates;
    
    -- Check for subscriptions without valid holders
    RETURN QUERY
    SELECT 
        'invalid_subscription_holders'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        format('%s subscriptions with invalid holder constraints', COUNT(*))::TEXT
    FROM subscriptions 
    WHERE (user_id IS NULL AND barbershop_id IS NULL) 
       OR (user_id IS NOT NULL AND barbershop_id IS NOT NULL);
    
    -- Check for expired trials still marked as trialing
    RETURN QUERY
    SELECT 
        'expired_trials'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
        COUNT(*)::INTEGER,
        format('%s expired trials still marked as trialing', COUNT(*))::TEXT
    FROM subscriptions 
    WHERE status = 'trialing' AND trial_end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Log successful creation
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MASTER SUBSCRIPTIONS TABLE CREATED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Successfully created unified subscription system:';
    RAISE NOTICE '• subscriptions (master table)';
    RAISE NOTICE '• subscription_tiers (pricing plans)';
    RAISE NOTICE '• subscription_usage (usage tracking)';
    RAISE NOTICE '• Helper views and functions';
    RAISE NOTICE '• Row Level Security policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run migrate_existing_subscriptions() to import data';
    RAISE NOTICE '2. Run validate_subscription_integrity() to check data';
    RAISE NOTICE '3. Update application code to use new subscription system';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;