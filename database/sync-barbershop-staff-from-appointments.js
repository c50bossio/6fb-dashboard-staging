#!/usr/bin/env node

/**
 * CRITICAL FIX: Sync barbershop_staff table with appointments data
 *
 * Problem: Appointments reference barbers (profiles.id) but calendar loads resources
 * from barbershop_staff. When barbers exist in profiles but not barbershop_staff,
 * appointments can't render on the calendar.
 *
 * Solution: This script finds all unique barber-location pairs from appointments
 * and ensures they exist in barbershop_staff table.
 *
 * Run with: node database/sync-barbershop-staff-from-appointments.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function syncBarbershopStaff() {
  console.log('🔄 Starting barbershop_staff sync from appointments...\n')

  try {
    // Step 1: Get all unique barber-location pairs from appointments
    console.log('📊 Step 1: Analyzing appointments data...')

    const { data: barberLocationPairs, error: queryError } = await supabase
      .from('appointments')
      .select('barber_id, barbershop_id')

    if (queryError) {
      throw new Error(`Failed to query appointments: ${queryError.message}`)
    }

    // Get unique pairs
    const uniquePairs = [...new Map(
      barberLocationPairs.map(pair => [
        `${pair.barber_id}-${pair.barbershop_id}`,
        pair
      ])
    ).values()]

    console.log(`   Found ${barberLocationPairs.length} total appointments`)
    console.log(`   Identified ${uniquePairs.length} unique barber-location pairs\n`)

    // Step 2: Get barber names for better logging
    console.log('👤 Step 2: Fetching barber details...')

    const barberIds = [...new Set(uniquePairs.map(p => p.barber_id))]
    const { data: barbers, error: barbersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', barberIds)

    if (barbersError) {
      throw new Error(`Failed to fetch barbers: ${barbersError.message}`)
    }

    const barberMap = new Map(barbers.map(b => [b.id, b]))
    console.log(`   Loaded ${barbers.length} barber profiles\n`)

    // Step 3: Check which pairs already exist in barbershop_staff
    console.log('🔍 Step 3: Checking existing barbershop_staff entries...')

    const { data: existingStaff, error: existingError } = await supabase
      .from('barbershop_staff')
      .select('user_id, barbershop_id, is_active')

    if (existingError) {
      throw new Error(`Failed to query barbershop_staff: ${existingError.message}`)
    }

    const existingSet = new Set(
      existingStaff.map(s => `${s.user_id}-${s.barbershop_id}`)
    )

    console.log(`   Found ${existingStaff.length} existing staff entries\n`)

    // Step 4: Identify missing entries
    const missingPairs = uniquePairs.filter(pair =>
      !existingSet.has(`${pair.barber_id}-${pair.barbershop_id}`)
    )

    if (missingPairs.length === 0) {
      console.log('✅ All barber-location pairs already exist in barbershop_staff!')
      console.log('   No migration needed.\n')
      return
    }

    console.log(`⚠️  Found ${missingPairs.length} missing entries that need to be added:\n`)

    // Group by barbershop for better display
    const missingByShop = missingPairs.reduce((acc, pair) => {
      if (!acc[pair.barbershop_id]) acc[pair.barbershop_id] = []
      acc[pair.barbershop_id].push(pair)
      return acc
    }, {})

    // Get barbershop names
    const shopIds = Object.keys(missingByShop)
    const { data: shops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, city')
      .in('id', shopIds)

    if (shopsError) {
      console.warn('   Warning: Could not fetch barbershop names')
    }

    const shopMap = new Map(shops?.map(s => [s.id, s]) || [])

    // Display missing entries by shop
    for (const [shopId, pairs] of Object.entries(missingByShop)) {
      const shop = shopMap.get(shopId)
      const shopName = shop ? `${shop.name} (${shop.city})` : shopId.slice(0, 8)
      console.log(`   📍 ${shopName}:`)

      pairs.forEach(pair => {
        const barber = barberMap.get(pair.barber_id)
        const barberName = barber ? barber.full_name || barber.email : pair.barber_id.slice(0, 8)
        console.log(`      - ${barberName}`)
      })
      console.log()
    }

    // Step 5: Insert missing entries
    console.log(`🔨 Step 5: Inserting ${missingPairs.length} missing staff entries...\n`)

    const staffEntries = missingPairs.map(pair => {
      const barber = barberMap.get(pair.barber_id)

      return {
        user_id: pair.barber_id,
        barbershop_id: pair.barbershop_id,
        role: 'BARBER',
        is_active: true,
        commission_rate: 60.0, // Default 60% commission
        permissions: {}, // Empty permissions object
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Insert in batches of 100 to avoid payload size limits
    const batchSize = 100
    let insertedCount = 0

    for (let i = 0; i < staffEntries.length; i += batchSize) {
      const batch = staffEntries.slice(i, i + batchSize)

      const { data: inserted, error: insertError } = await supabase
        .from('barbershop_staff')
        .insert(batch)
        .select()

      if (insertError) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError.message)
        throw insertError
      }

      insertedCount += inserted.length
      console.log(`   ✓ Inserted batch ${i / batchSize + 1} (${inserted.length} entries)`)
    }

    console.log(`\n✅ Successfully inserted ${insertedCount} staff entries!\n`)

    // Step 6: Verification
    console.log('🔍 Step 6: Verifying migration...')

    const { data: updatedStaff, error: verifyError } = await supabase
      .from('barbershop_staff')
      .select('user_id, barbershop_id')

    if (verifyError) {
      console.warn('   Warning: Could not verify migration')
    } else {
      const updatedSet = new Set(
        updatedStaff.map(s => `${s.user_id}-${s.barbershop_id}`)
      )

      const stillMissing = uniquePairs.filter(pair =>
        !updatedSet.has(`${pair.barber_id}-${pair.barbershop_id}`)
      )

      if (stillMissing.length === 0) {
        console.log('   ✅ All barber-location pairs now exist in barbershop_staff!')
      } else {
        console.warn(`   ⚠️  ${stillMissing.length} pairs still missing (may need manual review)`)
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total appointments analyzed:        ${barberLocationPairs.length}`)
    console.log(`Unique barber-location pairs:       ${uniquePairs.length}`)
    console.log(`Existing staff entries (before):    ${existingStaff.length}`)
    console.log(`Missing entries found:              ${missingPairs.length}`)
    console.log(`New entries inserted:               ${insertedCount}`)
    console.log(`Total staff entries (after):        ${existingStaff.length + insertedCount}`)
    console.log('='.repeat(60))
    console.log('\n✅ Migration completed successfully!\n')

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the migration
syncBarbershopStaff()
  .then(() => {
    console.log('👋 Exiting...')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  })
