#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// // Debug log removed for production
const barbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'

// Test with service role key
// // Debug log removed for production
const serviceClient = createClient(supabaseUrl, serviceKey)
const { data: serviceData, error: serviceError } = await serviceClient
  .from('barbershop_staff')
  .select(`
    id,
    user_id,
    barbershop_id,
    role,
    is_active,
    created_at
  `)
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)
  .order('created_at', { ascending: true })

// // Debug log removed for production
if (serviceError) // // Debug log removed for production
if (serviceData && serviceData.length > 0) {
  // // Debug log removed for production
}

// // Debug log removed for production
const anonClient = createClient(supabaseUrl, anonKey)
const { data: anonData, error: anonError } = await anonClient
  .from('barbershop_staff')
  .select(`
    id,
    user_id,
    barbershop_id,
    role,
    is_active,
    created_at
  `)
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)
  .order('created_at', { ascending: true })

// // Debug log removed for production
if (anonError) // // Debug log removed for production
if (anonData && anonData.length > 0) {
  // // Debug log removed for production
}

// // Debug log removed for production
const { data: simpleData, error: simpleError } = await serviceClient
  .from('barbershop_staff')
  .select('*')
  .eq('barbershop_id', barbershopId)

// // Debug log removed for production
')
if (simpleError) // // Debug log removed for production
if (simpleData) {
  simpleData.forEach(s => {
    // // Debug log removed for production
})
}