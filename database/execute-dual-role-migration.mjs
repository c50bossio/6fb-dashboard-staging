import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🚀 Executing Dual-Role Migration for Demo User')
console.log('=' .repeat(60))

async function executeMigration() {
  try {
    // Step 1: Verify demo user exists and has ENTERPRISE_OWNER role
    console.log('\n📋 Step 1: Verifying demo user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, barbershop_id')
      .eq('email', 'demo@barbershop.com')
      .single()

    if (profileError || !profile) {
      throw new Error(`Demo user not found: ${profileError?.message}`)
    }

    console.log(`✅ Found demo user: ${profile.full_name}`)
    console.log(`   Email: ${profile.email}`)
    console.log(`   Profile Role: ${profile.role}`)
    console.log(`   Organization ID: ${profile.organization_id}`)
    console.log(`   User ID: ${profile.id}`)

    if (profile.role !== 'ENTERPRISE_OWNER') {
      console.warn(`⚠️  Warning: Profile role is ${profile.role}, expected ENTERPRISE_OWNER`)
    }

    // Step 1.5: Sync demo user to public.users table (required for foreign key)
    console.log('\n📋 Step 1.5: Syncing demo user to public.users table...')
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', profile.id)
      .maybeSingle()

    if (!existingUser) {
      console.log('   Demo user not found in public.users, inserting...')
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role.toLowerCase(),  // Convert ENTERPRISE_OWNER → enterprise_owner
          created_at: new Date().toISOString()
        })

      if (userInsertError) {
        throw new Error(`Failed to sync user to public.users: ${userInsertError.message}`)
      }
      console.log('   ✅ Demo user synced to public.users table')
    } else {
      console.log('   ✅ Demo user already exists in public.users table')
    }

    // Step 2: Get all barbershops in the organization
    console.log('\n📋 Step 2: Finding all barbershops in organization...')
    const { data: shops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, city, state, organization_id')
      .or(`organization_id.eq.${profile.organization_id},id.eq.c5a58548-8f23-426c-bedc-49a83d238724`)

    if (shopsError) {
      throw new Error(`Failed to fetch barbershops: ${shopsError.message}`)
    }

    console.log(`✅ Found ${shops.length} barbershop(s):`)
    shops.forEach(shop => {
      console.log(`   - ${shop.name} (${shop.city}, ${shop.state})`)
    })

    // Step 3: Add barber role for each location
    console.log('\n📋 Step 3: Adding barber role for each location...')
    let successCount = 0
    let updateCount = 0

    for (const shop of shops) {
      // Check if entry exists
      const { data: existingStaff } = await supabase
        .from('barbershop_staff')
        .select('id, role, commission_rate')
        .eq('barbershop_id', shop.id)
        .eq('user_id', profile.id)
        .maybeSingle()

      const staffData = {
        barbershop_id: shop.id,
        user_id: profile.id,
        role: 'BARBER',
        permissions: {},
        commission_rate: 75,  // 75% commission
        is_active: true
      }

      if (existingStaff) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('barbershop_staff')
          .update({
            role: 'BARBER',
            commission_rate: 75.00,
            is_active: true
          })
          .eq('barbershop_id', shop.id)
          .eq('user_id', profile.id)

        if (updateError) {
          console.error(`❌ Failed to update ${shop.name}: ${updateError.message}`)
        } else {
          console.log(`✅ Updated barber role for: ${shop.name} (was: ${existingStaff.role}, commission: ${existingStaff.commission_rate})`)
          updateCount++
        }
      } else {
        // Insert new entry
        const { error: insertError } = await supabase
          .from('barbershop_staff')
          .insert(staffData)

        if (insertError) {
          console.error(`❌ Failed to add ${shop.name}: ${insertError.message}`)
        } else {
          console.log(`✅ Added barber role for: ${shop.name}`)
          successCount++
        }
      }
    }

    // Step 4: Verify the setup
    console.log('\n📋 Step 4: Verifying dual-role setup...')
    const { data: staffRoles, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        role,
        commission_rate,
        is_active,
        created_at,
        barbershops (
          name,
          city,
          state
        )
      `)
      .eq('user_id', profile.id)

    if (staffError) {
      throw new Error(`Failed to verify staff roles: ${staffError.message}`)
    }

    console.log(`\n✅ Demo user now has ${staffRoles.length} location-specific barber role(s):`)
    staffRoles.forEach(staff => {
      const shop = staff.barbershops
      console.log(`   - ${shop.name} (${shop.city}, ${shop.state})`)
      console.log(`     Role: ${staff.role}, Commission: ${(staff.commission_rate * 100).toFixed(0)}%, Active: ${staff.is_active}`)
    })

    // Step 5: Success summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 DUAL-ROLE SETUP COMPLETE!')
    console.log('='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(`   Profile Role: ${profile.role} (system-wide permissions)`)
    console.log(`   Location Roles: ${staffRoles.length} barber assignment(s)`)
    console.log(`   New Assignments: ${successCount}`)
    console.log(`   Updated Assignments: ${updateCount}`)
    console.log(`   Commission Rate: 75%`)

    console.log('\n✨ What This Enables:')
    console.log('   ✅ Enterprise Owner View: /dashboard')
    console.log('      → Manage all locations, analytics, staff')
    console.log('   ✅ Barber View: /barber/dashboard')
    console.log('      → Personal appointments, earnings (75% commission)')
    console.log('   ✅ Booking System: Appears in barber dropdown for appointments')
    console.log('   ✅ Financial Tracking: Owner barber earnings tracked separately')

    console.log('\n🚀 Next Steps:')
    console.log('   1. Navigate to: http://localhost:9999/barber/dashboard')
    console.log('   2. Login as: demo@barbershop.com')
    console.log('   3. Use shop selector to switch between locations')
    console.log('   4. View personal barber stats and appointments')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Execute migration
executeMigration()
