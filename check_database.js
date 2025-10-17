#!/usr/bin/env node
/**
 * Check what data exists in the database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkDatabase() {
  console.log("🔍 Checking database contents...\n")
  
  try {
    // Check table structure first
    console.log("🗄️ Database Schema:")
    
    // Check if bookings table exists
    const { data: bookingsSchema, error: bookingsSchemaError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)
      
    console.log('Bookings table:', bookingsSchemaError ? 'NOT FOUND' : 'EXISTS')
    if (!bookingsSchemaError && bookingsSchema?.length > 0) {
      console.log('Sample booking columns:', Object.keys(bookingsSchema[0]))
    }
    
    // Check if appointments table exists (might be used instead)
    const { data: appointmentsSchema, error: appointmentsSchemaError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1)
      
    console.log('Appointments table:', appointmentsSchemaError ? 'NOT FOUND' : 'EXISTS')

    // Check barbershops
    console.log("\n📊 Barbershops:")
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('id, name, created_at')
      .limit(5)
    
    if (barbershopsError) {
      console.error('Error fetching barbershops:', barbershopsError)
    } else {
      console.log(`Found ${barbershops?.length || 0} barbershops:`)
      barbershops?.forEach(shop => {
        console.log(`  - ${shop.id}: ${shop.name} (created: ${shop.created_at})`)
      })
    }
    
    // Check profiles
    console.log("\n👤 Profiles:")
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, barbershop_id, barbershop_id')
      .limit(5)
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    } else {
      console.log(`Found ${profiles?.length || 0} profiles:`)
      profiles?.forEach(profile => {
        console.log(`  - ${profile.id}: ${profile.email} (shop: ${profile.barbershop_id || profile.barbershop_id || 'none'})`)
      })
    }

    // Check services
    console.log("\n✂️ Services:")
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, barbershop_id, barbershop_id, price')
      .limit(10)
      
    if (servicesError) {
      console.error('Error fetching services:', servicesError)
    } else {
      console.log(`Found ${services?.length || 0} services:`)
      services?.forEach(service => {
        console.log(`  - ${service.id}: ${service.name} ($${service.price}) (shop: ${service.barbershop_id || service.barbershop_id})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
  }
}

checkDatabase().catch(console.error)