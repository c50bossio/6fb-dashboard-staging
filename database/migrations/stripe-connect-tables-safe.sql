-- Safe Stripe Connect Migration for Your Schema
-- This version uses your actual table structure

-- ============================================================================
-- PAYOUT HISTORY TABLE (Safe Version)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID, -- References profiles.shop_id or barbershop_id
  barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payout_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'in_transit', 'paid', 'failed', 'canceled'
  description TEXT,
  failure_message TEXT,
  arrival_date TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payout_history_shop ON payout_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_barber ON payout_history(barber_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_status ON payout_history(status);
CREATE INDEX IF NOT EXISTS idx_payout_history_created_at ON payout_history(created_at DESC);

-- ============================================================================
-- INVOICE HISTORY TABLE (Safe Version)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT UNIQUE,
  customer_id TEXT, -- Stripe customer ID
  shop_id UUID, -- References profiles.shop_id or barbershop_id
  barber_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  description TEXT,
  invoice_number TEXT,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for invoice queries
CREATE INDEX IF NOT EXISTS idx_invoice_history_shop ON invoice_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_barber ON invoice_history(barber_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_status ON invoice_history(status);
CREATE INDEX IF NOT EXISTS idx_invoice_history_customer ON invoice_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created_at ON invoice_history(created_at DESC);

-- ============================================================================
-- STRIPE WEBHOOK EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  account_id TEXT, -- Connected account ID if applicable
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON stripe_webhook_events(created_at DESC);

-- ============================================================================
-- UPDATE FINANCIAL ARRANGEMENTS TABLE (Safe)
-- ============================================================================
-- Only add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' 
                   AND column_name = 'stripe_charges_enabled') THEN
        ALTER TABLE financial_arrangements ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' 
                   AND column_name = 'stripe_payouts_enabled') THEN
        ALTER TABLE financial_arrangements ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' 
                   AND column_name = 'stripe_account_type') THEN
        ALTER TABLE financial_arrangements ADD COLUMN stripe_account_type TEXT DEFAULT 'express';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' 
                   AND column_name = 'stripe_account_country') THEN
        ALTER TABLE financial_arrangements ADD COLUMN stripe_account_country TEXT DEFAULT 'US';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' 
                   AND column_name = 'last_payout_date') THEN
        ALTER TABLE financial_arrangements ADD COLUMN last_payout_date TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' 
                   AND column_name = 'total_payouts_amount') THEN
        ALTER TABLE financial_arrangements ADD COLUMN total_payouts_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (Safe)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE payout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    -- Payout History Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout_history' AND policyname = 'Users can view their own payouts') THEN
        CREATE POLICY "Users can view their own payouts" ON payout_history
          FOR SELECT USING (auth.uid() = barber_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout_history' AND policyname = 'Shop owners can view shop payouts') THEN
        CREATE POLICY "Shop owners can view shop payouts" ON payout_history
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() 
              AND (shop_id = payout_history.shop_id OR barbershop_id = payout_history.shop_id)
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout_history' AND policyname = 'Shop owners can create payouts') THEN
        CREATE POLICY "Shop owners can create payouts" ON payout_history
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() 
              AND (shop_id = shop_id OR barbershop_id = shop_id)
            )
          );
    END IF;
    
    -- Invoice History Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_history' AND policyname = 'Users can view their own invoices') THEN
        CREATE POLICY "Users can view their own invoices" ON invoice_history
          FOR SELECT USING (
            auth.uid() = barber_id OR 
            auth.uid() = created_by
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_history' AND policyname = 'Shop owners can manage shop invoices') THEN
        CREATE POLICY "Shop owners can manage shop invoices" ON invoice_history
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() 
              AND (shop_id = invoice_history.shop_id OR barbershop_id = invoice_history.shop_id)
            )
          );
    END IF;
    
END $$;

-- ============================================================================
-- FUNCTIONS FOR AUTOMATED UPDATES (Safe)
-- ============================================================================

-- Create function only if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payout_history_updated_at') THEN
        CREATE TRIGGER update_payout_history_updated_at 
          BEFORE UPDATE ON payout_history 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoice_history_updated_at') THEN
        CREATE TRIGGER update_invoice_history_updated_at 
          BEFORE UPDATE ON invoice_history 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Stripe Connect migration completed successfully!';
    RAISE NOTICE '   - Created: payout_history, invoice_history, stripe_webhook_events';
    RAISE NOTICE '   - Updated: financial_arrangements with new columns';
    RAISE NOTICE '   - Added: RLS policies and triggers';
END $$;