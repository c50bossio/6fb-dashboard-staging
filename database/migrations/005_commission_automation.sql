-- Commission Automation Tables
-- These tables enable automatic commission calculation and payout tracking

-- Commission transactions - records every commission calculation from payments
CREATE TABLE IF NOT EXISTS commission_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id TEXT NOT NULL,
    arrangement_id UUID NOT NULL REFERENCES financial_arrangements(id),
    barber_id UUID NOT NULL,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    payment_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    shop_amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2),
    arrangement_type TEXT NOT NULL CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'pending_payout' CHECK (status IN ('pending_payout', 'paid_out', 'cancelled')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    paid_out_at TIMESTAMPTZ,
    payout_transaction_id UUID
);

-- Barber commission balances - running balance of what each barber is owed
CREATE TABLE IF NOT EXISTS barber_commission_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(barber_id, barbershop_id)
);

-- Payout transactions - tracks actual payouts to barbers
CREATE TABLE IF NOT EXISTS payout_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    amount DECIMAL(10,2) NOT NULL,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('stripe_transfer', 'manual', 'cash', 'check', 'venmo', 'cashapp')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    stripe_transfer_id TEXT,
    reference_number TEXT,
    notes TEXT,
    initiated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    metadata JSONB
);

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
CREATE POLICY "Users can view their shop's commission transactions" ON commission_transactions
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
        )
        OR
        barber_id = (SELECT auth.uid())
    );

CREATE POLICY "Shop owners can insert commission transactions" ON commission_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Barber commission balances policies
CREATE POLICY "Users can view their commission balances" ON barber_commission_balances
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
        )
        OR
        barber_id = (SELECT auth.uid())
    );

CREATE POLICY "Shop owners can manage barber balances" ON barber_commission_balances
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Payout transactions policies
CREATE POLICY "Users can view their payout transactions" ON payout_transactions
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
        )
        OR
        barber_id = (SELECT auth.uid())
    );

CREATE POLICY "Shop owners can manage payouts" ON payout_transactions
    FOR ALL TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
        )
    );

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated timestamp triggers
CREATE TRIGGER update_barber_commission_balances_updated_at 
    BEFORE UPDATE ON barber_commission_balances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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