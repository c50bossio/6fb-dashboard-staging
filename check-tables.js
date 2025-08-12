#!/usr/bin/env node

/**
 * Check what tables exist in Supabase
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function checkTables() {
  console.log('🔍 Checking available tables...')
  
  const tablesToCheck = [
    'marketing_accounts',
    'marketing_payment_methods',
    'marketing_campaigns', 
    'campaign_recipients',
    'marketing_billing_records',
    'customer_segments',
    'email_unsubscribes'
  ]
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: exists (${data || 0} rows)`)
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`)
    }
  }
}

checkTables().catch(console.error)