#!/usr/bin/env node

/**
 * Verify that the Unified Context System tables were created successfully
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyTables() {
  console.log('🔍 Verifying Unified Context System tables...\n')

  const tables = [
    'organizations',
    'organization_members',
    'user_context_preferences'
  ]

  let allSuccess = true

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: Not found or not accessible`)
        console.log(`   Error: ${error.message}`)
        allSuccess = false
      } else {
        console.log(`✅ ${table}: Exists (${count || 0} rows)`)
      }
    } catch (err) {
      console.log(`❌ ${table}: Error checking table`)
      console.log(`   ${err.message}`)
      allSuccess = false
    }
  }

  console.log('\n' + '='.repeat(60))

  if (allSuccess) {
    console.log('✅ All tables verified successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh your application in the browser')
    console.log('   2. The 404 error should now be gone')
    console.log('   3. Context preferences will persist across sessions')
  } else {
    console.log('⚠️  Some tables could not be verified')
    console.log('   Check the errors above and re-run the SQL script if needed')
  }
}

verifyTables()
