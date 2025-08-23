-- ==========================================
-- Simple Processing Fee Toggle
-- ==========================================
-- Allows barbershops to choose whether they absorb processing fees
-- or pass them to customers (industry standard practice)

-- Add toggle to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS customer_pays_processing_fee BOOLEAN DEFAULT FALSE;

-- Add description field for customer-facing fee explanation
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS processing_fee_description TEXT 
  DEFAULT 'This fee helps cover payment processing costs';

-- Track who paid the fee for each transaction (for analytics)
ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS fee_paid_by TEXT DEFAULT 'barbershop' 
  CHECK (fee_paid_by IN ('barbershop', 'customer')),
ADD COLUMN IF NOT EXISTS processing_fee_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_amount DECIMAL(10,2);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_payment_intents_fee_paid_by 
  ON payment_intents(barbershop_id, fee_paid_by, created_at);

-- Analytics view to track fee acceptance rates
CREATE OR REPLACE VIEW processing_fee_analytics AS
SELECT 
  barbershop_id,
  COUNT(*) FILTER (WHERE fee_paid_by = 'customer') as customer_paid_count,
  COUNT(*) FILTER (WHERE fee_paid_by = 'barbershop') as barbershop_paid_count,
  COUNT(*) as total_transactions,
  ROUND(
    COUNT(*) FILTER (WHERE fee_paid_by = 'customer')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as customer_acceptance_rate,
  SUM(processing_fee_amount) FILTER (WHERE fee_paid_by = 'customer') as total_fees_from_customers,
  SUM(processing_fee_amount) FILTER (WHERE fee_paid_by = 'barbershop') as total_fees_absorbed
FROM payment_intents
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY barbershop_id;

-- Add comment for documentation
COMMENT ON COLUMN barbershops.customer_pays_processing_fee IS 
  'When TRUE, processing fees (2.9% + $0.30) are added to customer total. When FALSE, fees are deducted from barbershop payout.';

-- Grant permissions
GRANT SELECT ON processing_fee_analytics TO authenticated;
GRANT UPDATE (customer_pays_processing_fee, processing_fee_description) ON barbershops TO authenticated;