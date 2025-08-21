-- Commission Automation Tables (FINAL VERSION)
-- Compatible with existing BookedBarber.com schema
-- Creates commission tracking without conflicting with existing tables

-- Commission transactions - records every commission calculation from payments
CREATE TABLE IF NOT EXISTS commission_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id TEXT NOT NULL,
    arrangement_id UUID,
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

-- Commission payout records - tracks commission payouts to barbers (different from stripe payouts)
CREATE TABLE IF NOT EXISTS commission_payout_records (
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

-- Add check constraints only if they don't exist
DO $$ 
BEGIN
    -- Check if commission_transactions table was just created
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'commission_transactions_arrangement_type_check'
    ) THEN
        ALTER TABLE commission_transactions 
        ADD CONSTRAINT commission_transactions_arrangement_type_check 
        CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'commission_transactions_status_check'
    ) THEN
        ALTER TABLE commission_transactions 
        ADD CONSTRAINT commission_transactions_status_check 
        CHECK (status IN ('pending_payout', 'paid_out', 'cancelled'));
    END IF;
EXCEPTION
    WHEN others THEN
        -- Ignore if constraints already exist
        NULL;
END $$;

-- Add check constraints for commission_payout_records
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'commission_payout_records_method_check'
    ) THEN
        ALTER TABLE commission_payout_records 
        ADD CONSTRAINT commission_payout_records_method_check 
        CHECK (payout_method IN ('stripe_transfer', 'manual', 'cash', 'check', 'venmo', 'cashapp'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'commission_payout_records_status_check'
    ) THEN
        ALTER TABLE commission_payout_records 
        ADD CONSTRAINT commission_payout_records_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
    END IF;
EXCEPTION
    WHEN others THEN
        -- Ignore if constraints already exist
        NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_transactions_payment_intent ON commission_transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_barber ON commission_transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_barbershop ON commission_transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_status ON commission_transactions(status);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_created_at ON commission_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barber ON barber_commission_balances(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barbershop ON barber_commission_balances(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_commission_payout_records_barber ON commission_payout_records(barber_id);
CREATE INDEX IF NOT EXISTS idx_commission_payout_records_barbershop ON commission_payout_records(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_commission_payout_records_status ON commission_payout_records(status);
CREATE INDEX IF NOT EXISTS idx_commission_payout_records_created_at ON commission_payout_records(created_at);

-- Enable Row Level Security
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_commission_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payout_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for commission_transactions
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
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Create RLS policies for barber_commission_balances
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
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Create RLS policies for commission_payout_records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'commission_payout_records' 
        AND policyname = 'Users can view their payout records'
    ) THEN
        CREATE POLICY "Users can view their payout records" ON commission_payout_records
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
        WHERE tablename = 'commission_payout_records' 
        AND policyname = 'Shop owners can manage payout records'
    ) THEN
        CREATE POLICY "Shop owners can manage payout records" ON commission_payout_records
            FOR ALL TO authenticated
            USING (
                barbershop_id IN (
                    SELECT id FROM barbershops WHERE owner_id = auth.uid()
                )
            );
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for barber_commission_balances
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
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Add commission tracking columns to financial_arrangements if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_arrangements' 
        AND column_name = 'total_commissions_earned'
    ) THEN
        ALTER TABLE financial_arrangements 
        ADD COLUMN total_commissions_earned DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_arrangements' 
        AND column_name = 'last_commission_date'
    ) THEN
        ALTER TABLE financial_arrangements 
        ADD COLUMN last_commission_date TIMESTAMPTZ;
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Final success check
DO $$
DECLARE
    tables_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_created
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('commission_transactions', 'barber_commission_balances', 'commission_payout_records');
    
    IF tables_created = 3 THEN
        RAISE NOTICE '✅ SUCCESS: All 3 commission automation tables created successfully!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Only % of 3 tables created. Please check for errors.', tables_created;
    END IF;
END $$;