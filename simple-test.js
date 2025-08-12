#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function simpleTest() {
  console.log('🧪 Simple test...')

  try {
    // Try minimal insert
    const { data, error } = await supabase
      .from('marketing_accounts')
      .insert({
        owner_id: 'test-user-001',
        owner_type: 'shop',
        account_name: 'Test Account'
      })
      .select()

    if (error) {
      console.log('❌ Error:', error)
    } else {
      console.log('✅ Success:', data)
    }

  } catch (error) {
    console.error('❌ Exception:', error)
  }
}

simpleTest().catch(console.error)