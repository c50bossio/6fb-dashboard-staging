#!/usr/bin/env node

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function analyzeServiceData() {

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

    services.forEach(service => {
      `)
    })
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, service_id, customer_id, start_time, end_time, status')
      .eq('barbershop_id', 'demo-shop-001')
      .eq('is_test', true)
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return
    }

    const serviceIds = new Set(services.map(s => s.id))
    const orphanedBookings = bookings.filter(booking => 
      booking.service_id && !serviceIds.has(booking.service_id)
    )
    
    const nullServiceBookings = bookings.filter(booking => !booking.service_id)

    if (orphanedBookings.length > 0) {
      
      orphanedBookings.slice(0, 5).forEach(booking => {
        `)
      })
    }
    
    if (nullServiceBookings.length > 0) {
      
      nullServiceBookings.slice(0, 5).forEach(booking => {
        
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

  if (orphanedBookingIds.length === 0 && nullServiceBookingIds.length === 0) {
    
    return
  }
  
  const availableServices = servicesList.filter(s => s.name !== "Unknown Service")
  
  if (availableServices.length === 0) {
    
    return
  }
  
  .join(', ')}`)
  
  if (orphanedBookingIds.length > 0) {

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
        
      }
    }
  }
  
  if (nullServiceBookingIds.length > 0) {

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
        
      }
    }
  }
}

async function verifyFixes() {

  const analysis = await analyzeServiceData()
  
  if (analysis && analysis.orphanedBookings === 0 && analysis.nullServiceBookings === 0) {
    
    return true
  } else {
    
    return false
  }
}

async function main() {

  try {
    const analysis = await analyzeServiceData()
    
    if (!analysis) {
      console.error('❌ Failed to analyze service data')
      process.exit(1)
    }
    
    if (analysis.orphanedBookings > 0 || analysis.nullServiceBookings > 0) {

      ')

      await fixOrphanedBookings(
        analysis.services,
        analysis.orphanedBookingIds,
        analysis.nullServiceBookingIds
      )
      
      const success = await verifyFixes()
      
      if (success) {

      } else {
        
      }
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

main().catch(console.error)