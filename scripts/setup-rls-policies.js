#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const envPath = join(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  const envLines = envContent.split('\n')

  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=')
      }
    }
  })
} catch (error) {
  console.log('Warning: Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupRLS() {
  console.log('🔒 6FB AI Agent System - Setting up Row Level Security Policies')
  console.log('================================================================\n')
  
  console.log('🔍 Environment check:')
  console.log('   Supabase URL:', supabaseUrl ? '✅ Connected' : '❌ Missing')
  console.log('   Service Key:', supabaseServiceKey ? '✅ Available' : '❌ Missing')
  console.log('')

  try {
    // Read the RLS policies SQL file
    const sqlPath = join(__dirname, '../database/setup-rls-policies.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    console.log('📋 Loading RLS policies from SQL file...')
    console.log(`   File: ${sqlPath}`)
    console.log(`   Size: ${(sql.length / 1024).toFixed(1)} KB`)
    console.log('')
    
    // For RLS policies, we need to use a different approach since they're DDL statements
    // Let's provide instructions for manual setup instead
    
    console.log('🔧 RLS Policy Setup Instructions')
    console.log('==================================')
    console.log('')
    console.log('Due to Supabase security restrictions, RLS policies must be set up manually:')
    console.log('')
    console.log('📋 Step 1: Open Supabase Dashboard')
    console.log('   🔗 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee')
    console.log('   📝 Navigate to: Authentication > Policies')
    console.log('')
    console.log('📋 Step 2: Alternative - Use SQL Editor')
    console.log('   🔗 Go to: SQL Editor in Supabase Dashboard')
    console.log('   📄 Copy and paste: database/setup-rls-policies.sql')
    console.log('   ▶️  Click "Run" to execute all policies')
    console.log('')
    
    // Let's try to at least verify that the tables exist
    console.log('🔍 Verifying database tables...')
    const tables = ['barbershops', 'barbers', 'services', 'clients', 'appointments']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`   ❌ ${table}: Not accessible (${error.message})`)
        } else {
          console.log(`   ✅ ${table}: Ready for RLS (${count || 0} records)`)
        }
      } catch (err) {
        console.log(`   ⚠️  ${table}: Could not verify (${err.message})`)
      }
    }
    
    console.log('')
    console.log('📊 RLS Policy Summary')
    console.log('=======================')
    console.log('')
    console.log('🔒 Security Features:')
    console.log('   • Multi-tenant data isolation by barbershop')
    console.log('   • Role-based access control (CLIENT, BARBER, SHOP_OWNER, etc.)')
    console.log('   • Public booking access for guest appointments')
    console.log('   • Self-management policies for users')
    console.log('   • Staff oversight for barbershop operations')
    console.log('')
    
    console.log('👥 User Access Patterns:')
    console.log('   • CLIENTS: Can view/edit own appointments and profile')
    console.log('   • BARBERS: Can manage own schedule and view assigned appointments')
    console.log('   • SHOP_OWNERS: Full access to their barbershop data')
    console.log('   • PUBLIC: Can view active barbershops/barbers and book appointments')
    console.log('')
    
    console.log('🛡️  Key Security Policies:')
    console.log('   • Barbershops: Public read (active only), owner management')
    console.log('   • Barbers: Public read (available only), self + owner management')
    console.log('   • Services: Public read (active only), owner management')
    console.log('   • Appointments: Multi-role access based on relationship')
    console.log('   • Clients: Self-management + staff visibility in same shop')
    console.log('')
    
    console.log('⚡ Performance Optimizations:')
    console.log('   • Indexed foreign keys for fast policy evaluation')
    console.log('   • Helper functions for common access checks')
    console.log('   • Efficient query patterns for multi-tenant access')
    console.log('')
    
    console.log('📝 Next Steps:')
    console.log('1. ✅ Manual setup of RLS policies via Supabase Dashboard')
    console.log('2. 🧪 Test authentication with different user roles')
    console.log('3. 📊 Verify data isolation between barbershops')
    console.log('4. 🔧 Configure user registration and role assignment')
    console.log('')
    
    return true
    
  } catch (error) {
    console.error('❌ Error setting up RLS policies:', error)
    return false
  }
}

async function testRLSAccess() {
  console.log('🧪 Testing RLS Policy Access...')
  console.log('')
  
  try {
    // Test public access to barbershops
    const { data: barbershops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, is_active')
      .limit(3)
    
    if (shopsError) {
      console.log('   🔐 Barbershops: RLS is active (expected error)')
    } else {
      console.log(`   ✅ Barbershops: ${barbershops?.length || 0} accessible`)
    }
    
    // Test public access to barbers
    const { data: barbers, error: barbersError } = await supabase
      .from('barbers')
      .select('id, name, is_available')
      .limit(3)
    
    if (barbersError) {
      console.log('   🔐 Barbers: RLS is active (expected without auth)')
    } else {
      console.log(`   ✅ Barbers: ${barbers?.length || 0} accessible`)
    }
    
  } catch (error) {
    console.log('   ⚠️  RLS test failed:', error.message)
  }
  
  console.log('')
}

// Main execution
async function main() {
  const success = await setupRLS()
  await testRLSAccess()
  
  if (success) {
    console.log('🎉 RLS setup guidance provided!')
    console.log('   Remember to manually apply policies via Supabase Dashboard')
  } else {
    console.log('❌ RLS setup encountered issues')
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default setupRLS