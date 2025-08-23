-- Campaign Credits System Tables
-- Implements Booksy-style credit allocation from payment processing

-- Campaign credits balance table
CREATE TABLE IF NOT EXISTS campaign_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  sms_credits INTEGER NOT NULL DEFAULT 0,
  email_credits INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'professional', 'enterprise')),
  total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_earned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(barbershop_id)
);

-- Credit allocation log for audit trail
CREATE TABLE IF NOT EXISTS credit_allocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  payment_intent_id TEXT NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  platform_markup DECIMAL(10,2) NOT NULL,
  campaign_fund_allocation DECIMAL(10,2) NOT NULL,
  sms_credits_earned INTEGER NOT NULL,
  email_credits_earned INTEGER NOT NULL,
  allocation_type TEXT NOT NULL DEFAULT 'payment_processing',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(payment_intent_id)
);

-- Campaign usage tracking
CREATE TABLE IF NOT EXISTS campaign_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
  campaign_id UUID,
  sms_used INTEGER NOT NULL DEFAULT 0,
  emails_used INTEGER NOT NULL DEFAULT 0,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_credits_barbershop ON campaign_credits(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_credit_allocation_log_barbershop ON credit_allocation_log(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_credit_allocation_log_created ON credit_allocation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_usage_barbershop_month ON campaign_usage(barbershop_id, month);

-- RLS Policies
ALTER TABLE campaign_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_allocation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_usage ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_credits
CREATE POLICY "Barbershop owners can view their credits"
  ON campaign_credits FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops 
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Policies for credit_allocation_log
CREATE POLICY "Barbershop owners can view their allocation log"
  ON credit_allocation_log FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops 
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Policies for campaign_usage
CREATE POLICY "Barbershop owners can view their usage"
  ON campaign_usage FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops 
      WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Function to get monthly payment volume
CREATE OR REPLACE FUNCTION get_monthly_payment_volume(shop_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  volume DECIMAL;
BEGIN
  SELECT COALESCE(SUM(payment_amount), 0) INTO volume
  FROM credit_allocation_log
  WHERE barbershop_id = shop_id
  AND created_at >= date_trunc('month', CURRENT_DATE)
  AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';
  
  RETURN volume;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign usage stats
CREATE OR REPLACE FUNCTION get_campaign_usage_stats(shop_id UUID)
RETURNS TABLE(
  sms_sent INTEGER,
  emails_sent INTEGER,
  campaigns_run INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(sms_used), 0)::INTEGER as sms_sent,
    COALESCE(SUM(emails_used), 0)::INTEGER as emails_sent,
    COALESCE(COUNT(DISTINCT campaign_id), 0)::INTEGER as campaigns_run
  FROM campaign_usage
  WHERE barbershop_id = shop_id
  AND month = date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;