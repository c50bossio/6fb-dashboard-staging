-- ==========================================
-- HOUSE ACCOUNT SYSTEM MIGRATION
-- ==========================================
-- This migration adds comprehensive support for:
-- 1. Customer house accounts (tab/deferred payment functionality)
-- 2. Account transaction tracking
-- 3. Credit limit management
-- 4. Payment term enforcement
-- 5. Account status management

-- ==========================================
-- CUSTOMER ACCOUNTS TABLE
-- ==========================================
-- Core table for managing customer house accounts
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Account Balance Management
  current_balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  credit_limit DECIMAL(10,2) DEFAULT 500.00 NOT NULL,
  available_credit DECIMAL(10,2) GENERATED ALWAYS AS (credit_limit - current_balance) STORED,
  
  -- Account Configuration
  account_number VARCHAR(20) UNIQUE NOT NULL, -- Human-readable account number
  payment_terms VARCHAR(20) DEFAULT 'net_7' CHECK (payment_terms IN ('net_3', 'net_7', 'net_14', 'net_30')),
  auto_suspend_threshold DECIMAL(10,2) DEFAULT 50.00, -- Auto-suspend if balance exceeds this
  
  -- Account Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed', 'frozen')),
  suspension_reason TEXT,
  
  -- Payment Settings
  preferred_payment_method VARCHAR(20) DEFAULT 'card' CHECK (preferred_payment_method IN ('card', 'cash', 'ach', 'check')),
  payment_method_id VARCHAR(255), -- Stripe payment method ID for auto-collection
  auto_collect_enabled BOOLEAN DEFAULT false,
  
  -- Account History
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_charge_date TIMESTAMP WITH TIME ZONE,
  account_opened_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(customer_id, barbershop_id), -- One account per customer per barbershop
  CHECK (current_balance >= 0),
  CHECK (credit_limit > 0),
  CHECK (auto_suspend_threshold >= 0)
);

-- Auto-generate account numbers
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TRIGGER AS $$
DECLARE
  barbershop_prefix TEXT;
  next_number INTEGER;
BEGIN
  -- Get barbershop prefix (first 3 characters of name, uppercase)
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
  INTO barbershop_prefix
  FROM barbershops
  WHERE id = NEW.barbershop_id;
  
  -- Get next sequential number for this barbershop
  SELECT COALESCE(MAX(CAST(RIGHT(account_number, 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM customer_accounts
  WHERE barbershop_id = NEW.barbershop_id
  AND account_number LIKE barbershop_prefix || '%';
  
  -- Generate account number: PREFIX-NNNN (e.g., TOM-0001, ELI-0042)
  NEW.account_number := barbershop_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_account_number_trigger
  BEFORE INSERT ON customer_accounts
  FOR EACH ROW
  WHEN (NEW.account_number IS NULL OR NEW.account_number = '')
  EXECUTE FUNCTION generate_account_number();

-- ==========================================
-- ACCOUNT TRANSACTIONS TABLE
-- ==========================================
-- Track all transactions on customer accounts
CREATE TABLE IF NOT EXISTS public.account_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('charge', 'payment', 'adjustment', 'fee', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL, -- Account balance after this transaction
  
  -- Transaction Context
  description TEXT NOT NULL,
  reference_type VARCHAR(20) CHECK (reference_type IN ('appointment', 'pos_sale', 'manual', 'auto_charge', 'late_fee')),
  reference_id UUID, -- ID of appointment, pos_sale, etc.
  
  -- Payment Processing
  payment_intent_id VARCHAR(255), -- Stripe payment intent if applicable
  payment_method VARCHAR(20) CHECK (payment_method IN ('card', 'cash', 'ach', 'check', 'adjustment')),
  payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Authorization & Audit
  authorized_by UUID REFERENCES auth.users(id), -- Staff member who authorized
  authorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (amount != 0), -- No zero-amount transactions
  CHECK (
    CASE 
      WHEN transaction_type IN ('charge', 'fee') THEN amount > 0
      WHEN transaction_type IN ('payment', 'refund') THEN amount < 0
      ELSE true -- adjustments can be positive or negative
    END
  )
);

-- Function to update account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  account_record customer_accounts%ROWTYPE;
  new_balance DECIMAL(10,2);
BEGIN
  -- Get current account info
  SELECT * INTO account_record
  FROM customer_accounts
  WHERE id = NEW.account_id;
  
  -- Calculate new balance
  new_balance := account_record.current_balance + NEW.amount;
  
  -- Update balance_after field
  NEW.balance_after := new_balance;
  
  -- Update account balance
  UPDATE customer_accounts
  SET 
    current_balance = new_balance,
    last_charge_date = CASE WHEN NEW.transaction_type IN ('charge', 'fee') THEN NOW() ELSE last_charge_date END,
    last_payment_date = CASE WHEN NEW.transaction_type IN ('payment', 'refund') THEN NOW() ELSE last_payment_date END,
    updated_at = NOW()
  WHERE id = NEW.account_id;
  
  -- Auto-suspend if over threshold
  IF new_balance > account_record.auto_suspend_threshold AND account_record.status = 'active' THEN
    UPDATE customer_accounts
    SET 
      status = 'suspended',
      suspension_reason = 'Balance exceeded auto-suspend threshold: $' || account_record.auto_suspend_threshold,
      updated_at = NOW()
    WHERE id = NEW.account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_balance_trigger
  BEFORE INSERT ON account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- ==========================================
-- ACCOUNT PAYMENT SCHEDULES TABLE
-- ==========================================
-- Track payment due dates and reminders
CREATE TABLE IF NOT EXISTS public.account_payment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  
  -- Schedule Details
  balance_snapshot DECIMAL(10,2) NOT NULL, -- Balance at time of schedule creation
  payment_due_date DATE NOT NULL,
  minimum_payment DECIMAL(10,2), -- Minimum payment required
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  
  -- Reminder System
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (balance_snapshot > 0),
  CHECK (amount_paid >= 0),
  CHECK (minimum_payment >= 0)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_barbershop_id ON customer_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON customer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_balance ON customer_accounts(current_balance);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON account_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_reference ON account_transactions(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_account_id ON account_payment_schedules(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON account_payment_schedules(payment_due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON account_payment_schedules(status);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_payment_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access accounts for barbershops they're associated with
CREATE POLICY customer_accounts_barbershop_access ON customer_accounts
  FOR ALL TO authenticated
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY account_transactions_barbershop_access ON account_transactions
  FOR ALL TO authenticated
  USING (
    account_id IN (
      SELECT ca.id FROM customer_accounts ca
      WHERE ca.barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        UNION
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY payment_schedules_barbershop_access ON account_payment_schedules
  FOR ALL TO authenticated
  USING (
    account_id IN (
      SELECT ca.id FROM customer_accounts ca
      WHERE ca.barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND is_active = true
        UNION
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
      )
    )
  );

-- ==========================================
-- UTILITY FUNCTIONS
-- ==========================================

-- Function to get account summary
CREATE OR REPLACE FUNCTION get_account_summary(account_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'account_id', ca.id,
    'account_number', ca.account_number,
    'customer_name', c.name,
    'current_balance', ca.current_balance,
    'credit_limit', ca.credit_limit,
    'available_credit', ca.available_credit,
    'status', ca.status,
    'last_payment_date', ca.last_payment_date,
    'last_charge_date', ca.last_charge_date,
    'transaction_count', (
      SELECT COUNT(*) FROM account_transactions WHERE account_id = ca.id
    ),
    'overdue_amount', COALESCE((
      SELECT SUM(balance_snapshot - amount_paid)
      FROM account_payment_schedules
      WHERE account_id = ca.id 
      AND status IN ('pending', 'partial') 
      AND payment_due_date < CURRENT_DATE
    ), 0)
  ) INTO result
  FROM customer_accounts ca
  JOIN customers c ON ca.customer_id = c.id
  WHERE ca.id = account_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if customer can charge amount
CREATE OR REPLACE FUNCTION can_charge_account(account_uuid UUID, charge_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  account_info customer_accounts%ROWTYPE;
BEGIN
  SELECT * INTO account_info
  FROM customer_accounts
  WHERE id = account_uuid;
  
  -- Account must exist and be active
  IF NOT FOUND OR account_info.status != 'active' THEN
    RETURN false;
  END IF;
  
  -- Check if charge would exceed credit limit
  IF (account_info.current_balance + charge_amount) > account_info.credit_limit THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INITIAL DATA & CONFIGURATION
-- ==========================================

-- Create system configuration for house accounts
INSERT INTO public.system_settings (key, value, description) VALUES
('house_accounts_enabled', 'true', 'Enable house account functionality globally'),
('default_credit_limit', '500.00', 'Default credit limit for new house accounts'),
('default_payment_terms', 'net_7', 'Default payment terms for new accounts'),
('auto_suspend_threshold', '50.00', 'Auto-suspend accounts when balance exceeds limit by this amount'),
('overdue_fee_amount', '25.00', 'Late fee charged on overdue accounts'),
('reminder_days_before_due', '3,1', 'Days before due date to send reminders (comma-separated)')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

COMMENT ON TABLE customer_accounts IS 'House accounts for customers to charge services and pay later';
COMMENT ON TABLE account_transactions IS 'All transactions on customer house accounts including charges and payments';
COMMENT ON TABLE account_payment_schedules IS 'Payment schedules and reminders for house accounts';

-- Migration metadata
INSERT INTO schema_migrations (version, applied_at) VALUES ('007_house_account_system', NOW())
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();