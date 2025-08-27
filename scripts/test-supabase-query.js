#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing Supabase queries for Tomb45 Channelside staff\n')

const barbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'

// Test with service role key
console.log('1. Testing with SERVICE ROLE key:')
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

console.log('   Result:', serviceData?.length || 0, 'staff found')
if (serviceError) console.log('   Error:', serviceError)
if (serviceData && serviceData.length > 0) {
  console.log('   First staff:', serviceData[0])
}

console.log('\n2. Testing with ANON key:')
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

console.log('   Result:', anonData?.length || 0, 'staff found')
if (anonError) console.log('   Error:', anonError)
if (anonData && anonData.length > 0) {
  console.log('   First staff:', anonData[0])
}

console.log('\n3. Testing simple query with service role:')
const { data: simpleData, error: simpleError } = await serviceClient
  .from('barbershop_staff')
  .select('*')
  .eq('barbershop_id', barbershopId)

console.log('   Result:', simpleData?.length || 0, 'total staff (active and inactive)')
if (simpleError) console.log('   Error:', simpleError)
if (simpleData) {
  simpleData.forEach(s => {
    console.log(`   - ${s.id}: active=${s.is_active}, role=${s.role}`)
  })
}