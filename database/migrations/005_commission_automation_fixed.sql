-- Commission Automation Tables (FIXED VERSION)
-- These tables enable automatic commission calculation and payout tracking
-- Fixed to handle potential foreign key issues

-- Commission transactions - records every commission calculation from payments
CREATE TABLE IF NOT EXISTS commission_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id TEXT NOT NULL,
    arrangement_id UUID, -- Removed foreign key constraint
    barber_id UUID NOT NULL,
    barbershop_id UUID NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    shop_amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2),
    arrangement_type TEXT NOT NULL DEFAULT 'commission',
    status TEXT NOT NULL DEFAULT 'pending_payout',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    paid_out_at TIMESTAMPTZ,
    payout_transaction_id UUID
);

-- Barber commission balances - running balance of what each barber is owed
CREATE TABLE IF NOT EXISTS barber_commission_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL,
    barbershop_id UUID NOT NULL,
    pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(barber_id, barbershop_id)
);

-- Payout transactions - tracks actual payouts to barbers (if not exists)
CREATE TABLE IF NOT EXISTS payout_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL,
    barbershop_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payout_method TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_transfer_id TEXT,
    reference_number TEXT,
    notes TEXT,
    initiated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    metadata JSONB
);

-- Add check constraints (safer than foreign keys for this migration)
DO $$ 
BEGIN
    -- Add check constraints for arrangement_type if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'commission_transactions_arrangement_type_check'
    ) THEN
        ALTER TABLE commission_transactions 
        ADD CONSTRAINT commission_transactions_arrangement_type_check 
        CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid'));
    END IF;

    -- Add check constraints for status if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'commission_transactions_status_check'
    ) THEN
        ALTER TABLE commission_transactions 
        ADD CONSTRAINT commission_transactions_status_check 
        CHECK (status IN ('pending_payout', 'paid_out', 'cancelled'));
    END IF;

    -- Add check constraints for payout_method if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payout_transactions_payout_method_check'
    ) THEN
        ALTER TABLE payout_transactions 
        ADD CONSTRAINT payout_transactions_payout_method_check 
        CHECK (payout_method IN ('stripe_transfer', 'manual', 'cash', 'check', 'venmo', 'cashapp'));
    END IF;

    -- Add check constraints for status if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payout_transactions_status_check'
    ) THEN
        ALTER TABLE payout_transactions 
        ADD CONSTRAINT payout_transactions_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_transactions_payment_intent ON commission_transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_barber ON commission_transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_barbershop ON commission_transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_status ON commission_transactions(status);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_created_at ON commission_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barber ON barber_commission_balances(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barbershop ON barber_commission_balances(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_payout_transactions_barber ON payout_transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_barbershop ON payout_transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_status ON payout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_created_at ON payout_transactions(created_at);

-- RLS Policies
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_commission_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;

-- Commission transactions policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commission_transactions' 
        AND policyname = 'Users can view their shop commission transactions'
    ) THEN
        CREATE POLICY "Users can view their shop commission transactions" ON commission_transactions
            FOR SELECT TO authenticated
            USING (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
                OR
                barber_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commission_transactions' 
        AND policyname = 'Shop owners can insert commission transactions'
    ) THEN
        CREATE POLICY "Shop owners can insert commission transactions" ON commission_transactions
            FOR INSERT TO authenticated
            WITH CHECK (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Barber commission balances policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'barber_commission_balances' 
        AND policyname = 'Users can view their commission balances'
    ) THEN
        CREATE POLICY "Users can view their commission balances" ON barber_commission_balances
            FOR SELECT TO authenticated
            USING (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
                OR
                barber_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'barber_commission_balances' 
        AND policyname = 'Shop owners can manage barber balances'
    ) THEN
        CREATE POLICY "Shop owners can manage barber balances" ON barber_commission_balances
            FOR ALL TO authenticated
            USING (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Payout transactions policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payout_transactions' 
        AND policyname = 'Users can view their payout transactions'
    ) THEN
        CREATE POLICY "Users can view their payout transactions" ON payout_transactions
            FOR SELECT TO authenticated
            USING (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
                OR
                barber_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payout_transactions' 
        AND policyname = 'Shop owners can manage payouts'
    ) THEN
        CREATE POLICY "Shop owners can manage payouts" ON payout_transactions
            FOR ALL TO authenticated
            USING (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated timestamp triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_barber_commission_balances_updated_at'
    ) THEN
        CREATE TRIGGER update_barber_commission_balances_updated_at 
            BEFORE UPDATE ON barber_commission_balances 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add commission tracking to existing financial arrangements table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_arrangements' AND column_name = 'total_commissions_earned') THEN
        ALTER TABLE financial_arrangements 
        ADD COLUMN total_commissions_earned DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN last_commission_date TIMESTAMPTZ;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Commission automation tables created successfully!';
END $$;