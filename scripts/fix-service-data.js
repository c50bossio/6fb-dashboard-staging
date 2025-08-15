#!/usr/bin/env node

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function analyzeServiceData() {
  console.log('🔍 Analyzing service data inconsistencies...')
  
  try {
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('is_test', true)
      .order('name')
    
    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return
    }
    
    console.log(`📋 Found ${services.length} services:`)
    services.forEach(service => {
      console.log(`  - ${service.name} (${service.duration_minutes}min, $${service.price})`)
    })
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, service_id, customer_id, start_time, end_time, status')
      .eq('shop_id', 'demo-shop-001')
      .eq('is_test', true)
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return
    }
    
    console.log(`\n📅 Found ${bookings.length} bookings`)
    
    const serviceIds = new Set(services.map(s => s.id))
    const orphanedBookings = bookings.filter(booking => 
      booking.service_id && !serviceIds.has(booking.service_id)
    )
    
    const nullServiceBookings = bookings.filter(booking => !booking.service_id)
    
    console.log(`\n❌ Found ${orphanedBookings.length} bookings with invalid service_id references`)
    console.log(`❌ Found ${nullServiceBookings.length} bookings with NULL service_id`)
    
    if (orphanedBookings.length > 0) {
      console.log('\n🔍 Sample orphaned bookings:')
      orphanedBookings.slice(0, 5).forEach(booking => {
        console.log(`  - Booking ${booking.id}: service_id=${booking.service_id} (not found in services table)`)
      })
    }
    
    if (nullServiceBookings.length > 0) {
      console.log('\n🔍 Sample NULL service bookings:')
      nullServiceBookings.slice(0, 5).forEach(booking => {
        console.log(`  - Booking ${booking.id}: service_id=NULL`)
      })
    }
    
    return {
      totalServices: services.length,
      totalBookings: bookings.length,
      orphanedBookings: orphanedBookings.length,
      nullServiceBookings: nullServiceBookings.length,
      services: services,
      orphanedBookingIds: orphanedBookings.map(b => b.id),
      nullServiceBookingIds: nullServiceBookings.map(b => b.id)
    }
    
  } catch (error) {
    console.error('Error analyzing service data:', error)
  }
}

async function fixOrphanedBookings(servicesList, orphanedBookingIds, nullServiceBookingIds) {
  console.log('\n🔧 Fixing orphaned bookings...')
  
  if (orphanedBookingIds.length === 0 && nullServiceBookingIds.length === 0) {
    console.log('✅ No orphaned bookings to fix!')
    return
  }
  
  const availableServices = servicesList.filter(s => s.name !== "Unknown Service")
  
  if (availableServices.length === 0) {
    console.log('❌ No valid services available to assign to orphaned bookings')
    return
  }
  
  console.log(`📋 Available services for assignment: ${availableServices.map(s => s.name).join(', ')}`)
  
  if (orphanedBookingIds.length > 0) {
    console.log(`\n🔧 Fixing ${orphanedBookingIds.length} bookings with invalid service_id...`)
    
    for (const bookingId of orphanedBookingIds) {
      const randomService = availableServices[Math.floor(Math.random() * availableServices.length)]
      
      const { error } = await supabase
        .from('bookings')
        .update({
          service_id: randomService.id,
          price: randomService.price,
          duration_minutes: randomService.duration_minutes
        })
        .eq('id', bookingId)
      
      if (error) {
        console.error(`❌ Failed to fix booking ${bookingId}:`, error)
      } else {
        console.log(`✅ Fixed booking ${bookingId} -> assigned ${randomService.name}`)
      }
    }
  }
  
  if (nullServiceBookingIds.length > 0) {
    console.log(`\n🔧 Fixing ${nullServiceBookingIds.length} bookings with NULL service_id...`)
    
    for (const bookingId of nullServiceBookingIds) {
      const randomService = availableServices[Math.floor(Math.random() * availableServices.length)]
      
      const { error } = await supabase
        .from('bookings')
        .update({
          service_id: randomService.id,
          price: randomService.price,
          duration_minutes: randomService.duration_minutes
        })
        .eq('id', bookingId)
      
      if (error) {
        console.error(`❌ Failed to fix booking ${bookingId}:`, error)
      } else {
        console.log(`✅ Fixed booking ${bookingId} -> assigned ${randomService.name}`)
      }
    }
  }
}

async function verifyFixes() {
  console.log('\n✅ Verifying fixes...')
  
  const analysis = await analyzeServiceData()
  
  if (analysis && analysis.orphanedBookings === 0 && analysis.nullServiceBookings === 0) {
    console.log('🎉 All service data issues have been resolved!')
    return true
  } else {
    console.log(`❌ Still have issues: ${analysis?.orphanedBookings || 0} orphaned, ${analysis?.nullServiceBookings || 0} NULL`)
    return false
  }
}

async function main() {
  console.log('🚀 Service Data Cleanup Tool')
  console.log('This script identifies and fixes bookings with invalid or missing service data\n')
  
  try {
    const analysis = await analyzeServiceData()
    
    if (!analysis) {
      console.error('❌ Failed to analyze service data')
      process.exit(1)
    }
    
    if (analysis.orphanedBookings > 0 || analysis.nullServiceBookings > 0) {
      console.log('\n❓ Do you want to fix these issues? This will:')
      console.log('   - Assign random valid services to orphaned bookings')
      console.log('   - Update pricing and duration based on assigned service')
      console.log('   - Only affect test data (is_test=true)')
      
      console.log('\n🔧 Proceeding with automatic fixes...')
      
      await fixOrphanedBookings(
        analysis.services,
        analysis.orphanedBookingIds,
        analysis.nullServiceBookingIds
      )
      
      const success = await verifyFixes()
      
      if (success) {
        console.log('\n🎉 Service data cleanup completed successfully!')
        console.log('\n💡 Next steps:')
        console.log('   - Refresh your calendar page to see the updated service filter')
        console.log('   - The "Unknown Service" option should no longer appear in filters')
        console.log('   - All appointments should now have proper service names')
      } else {
        console.log('\n⚠️  Some issues may remain. Please review the output above.')
      }
    } else {
      console.log('\n✅ No service data issues found. Everything looks good!')
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

main().catch(console.error)