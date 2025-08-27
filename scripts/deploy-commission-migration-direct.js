const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.production' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createCommissionTables() {

  try {
    // 1. Create commission_transactions table
    
    await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS commission_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_intent_id TEXT NOT NULL,
          arrangement_id UUID NOT NULL,
          barber_id UUID NOT NULL,
          barbershop_id UUID NOT NULL,
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
      `
    })

    // 2. Create barber_commission_balances table
    
    await supabase.rpc('exec_sql', {
      query: `
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
      `
    })

    // 3. Create indexes

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_payment_intent ON commission_transactions(payment_intent_id)',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_barber ON commission_transactions(barber_id)',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_barbershop ON commission_transactions(barbershop_id)',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_status ON commission_transactions(status)',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_created_at ON commission_transactions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barber ON barber_commission_balances(barber_id)',
      'CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barbershop ON barber_commission_balances(barbershop_id)'
    ]

    for (const indexSQL of indexes) {
      await supabase.rpc('exec_sql', { query: indexSQL })
    }

    // 4. Enable RLS
    
    await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY'
    })
    await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE barber_commission_balances ENABLE ROW LEVEL SECURITY'
    })

    // 5. Create RLS policies

    // Commission transactions policies
    await supabase.rpc('exec_sql', {
      query: `
        CREATE POLICY "Users can view their shop commission transactions" ON commission_transactions
          FOR SELECT TO authenticated
          USING (
            barbershop_id IN (
              SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
            )
            OR
            barber_id = (SELECT auth.uid())
          );
      `
    })

    await supabase.rpc('exec_sql', {
      query: `
        CREATE POLICY "Shop owners can insert commission transactions" ON commission_transactions
          FOR INSERT TO authenticated
          WITH CHECK (
            barbershop_id IN (
              SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
            )
          );
      `
    })

    // Barber commission balances policies
    await supabase.rpc('exec_sql', {
      query: `
        CREATE POLICY "Users can view their commission balances" ON barber_commission_balances
          FOR SELECT TO authenticated
          USING (
            barbershop_id IN (
              SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
            )
            OR
            barber_id = (SELECT auth.uid())
          );
      `
    })

    await supabase.rpc('exec_sql', {
      query: `
        CREATE POLICY "Shop owners can manage barber balances" ON barber_commission_balances
          FOR ALL TO authenticated
          USING (
            barbershop_id IN (
              SELECT id FROM barbershops WHERE owner_id = (SELECT auth.uid())
            )
          );
      `
    })

    // 6. Create updated_at trigger
    
    await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    })

    await supabase.rpc('exec_sql', {
      query: `
        CREATE TRIGGER update_barber_commission_balances_updated_at 
          BEFORE UPDATE ON barber_commission_balances 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    })

    // 7. Verify tables exist and are accessible

    const { data: commissionTest } = await supabase
      .from('commission_transactions')
      .select('*')
      .limit(0)
    
    const { data: balanceTest } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .limit(0)

    const { data: payoutTest } = await supabase
      .from('payout_transactions')
      .select('*')
      .limit(0)

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

createCommissionTables()