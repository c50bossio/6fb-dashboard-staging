#!/usr/bin/env node

/**
 * Automated Financial Fields Migration using Supabase REST API
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addFieldsDirectly() {
  try {

    // Test if new fields already exist
    const { data: testFields, error: testError } = await supabase
      .from('barbershop_staff')
      .select('id, arrangement_type, rent_frequency, hybrid_base_rent')
      .limit(1)
    
    if (!testError) {

      return true
    }

    // Since we can't run DDL directly through the client, we'll create a workaround
    // by attempting to insert a record that would fail without the fields

    return false
    
  } catch (error) {
    console.error('❌ Error during migration check:', error.message)
    return false
  }
}

const migrationSuccess = await addFieldsDirectly()

if (!migrationSuccess) {

  ')

   DEFAULT \'commission\';')
   DEFAULT \'monthly\';')
  ')
  ')
  ')

}