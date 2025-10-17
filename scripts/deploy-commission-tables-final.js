#!/usr/bin/env node

/**
 * Final Commission Tables Deployment
 * Manually deploys commission automation tables using Node.js Supabase client
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.production' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function deployCommissionTables() {

  try {
    // 1. Commission Transactions Table

    const commissionTransactionSQL = `
      CREATE TABLE commission_transactions (
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
    `

    await supabase.rpc('exec_sql', { query: commissionTransactionSQL })

    // 2. Barber Commission Balances Table

    const balanceSQL = `
      CREATE TABLE barber_commission_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barber_id UUID NOT NULL,
        barbershop_id UUID NOT NULL,
        pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
        last_transaction_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `

    await supabase.rpc('exec_sql', { query: balanceSQL })

    // 3. Add unique constraint

    const uniqueConstraintSQL = `
      ALTER TABLE barber_commission_balances 
      ADD CONSTRAINT unique_barber_shop UNIQUE (barber_id, barbershop_id);
    `

    try {
      await supabase.rpc('exec_sql', { query: uniqueConstraintSQL })
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        
      } else {
        
      }
    }

    // 4. Create indexes

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_payment_intent ON commission_transactions(payment_intent_id);',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_barber ON commission_transactions(barber_id);',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_barbershop ON commission_transactions(barbershop_id);',
      'CREATE INDEX IF NOT EXISTS idx_commission_transactions_status ON commission_transactions(status);',
      'CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barber ON barber_commission_balances(barber_id);',
      'CREATE INDEX IF NOT EXISTS idx_barber_commission_balances_barbershop ON barber_commission_balances(barbershop_id);'
    ]

    for (const indexSQL of indexes) {
      try {
        await supabase.rpc('exec_sql', { query: indexSQL })
      } catch (error) {
        if (!error.message.includes('already exists')) {
          
        }
      }
    }

    // 5. Enable RLS

    const rlsSQL = [
      'ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE barber_commission_balances ENABLE ROW LEVEL SECURITY;'
    ]

    for (const sql of rlsSQL) {
      try {
        await supabase.rpc('exec_sql', { query: sql })
      } catch (error) {
        if (!error.message.includes('already exists')) {
          
        }
      }
    }

    // 6. Create RLS policies

    const policies = [
      `CREATE POLICY "Users can view their shop commission transactions" ON commission_transactions
       FOR SELECT TO authenticated
       USING (
         barbershop_id IN (
           SELECT id FROM barbershops WHERE owner_id = auth.uid()
         )
         OR
         barber_id = auth.uid()
       );`,
      
      `CREATE POLICY "Shop owners can insert commission transactions" ON commission_transactions
       FOR INSERT TO authenticated
       WITH CHECK (
         barbershop_id IN (
           SELECT id FROM barbershops WHERE owner_id = auth.uid()
         )
       );`,
      
      `CREATE POLICY "Users can view their commission balances" ON barber_commission_balances
       FOR SELECT TO authenticated
       USING (
         barbershop_id IN (
           SELECT id FROM barbershops WHERE owner_id = auth.uid()
         )
         OR
         barber_id = auth.uid()
       );`,
      
      `CREATE POLICY "Shop owners can manage barber balances" ON barber_commission_balances
       FOR ALL TO authenticated
       USING (
         barbershop_id IN (
           SELECT id FROM barbershops WHERE owner_id = auth.uid()
         )
       );`
    ]

    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', { query: policy })
      } catch (error) {
        if (!error.message.includes('already exists')) {
          
        }
      }
    }

    // 7. Verify deployment

    const { data: commissionTest } = await supabase
      .from('commission_transactions')
      .select('*')
      .limit(0)
    
    const { data: balanceTest } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .limit(0)

    return true

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED:', error.message)
    console.error('Full error:', error)
    return false
  }
}

// Run deployment
if (require.main === module) {
  deployCommissionTables()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Deployment execution failed:', error)
      process.exit(1)
    })
}

module.exports = { deployCommissionTables }