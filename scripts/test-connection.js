#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables manually
const envPath = join(__dirname, '../.env.local')
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Testing Supabase connection...')
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')

try {
  // Test basic connection
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  console.log('\n📋 Profiles table test:', error ? `❌ Error - ${JSON.stringify(error, null, 2)}` : `✅ Success (${data?.length || 0} records)`)
  
  // Check for barbershops table
  const { data: barbershops, error: barbershopsError } = await supabase.from('barbershops').select('*').limit(1)
  console.log('🏪 Barbershops table test:', barbershopsError ? `❌ Error - ${JSON.stringify(barbershopsError, null, 2)}` : `✅ Success (${barbershops?.length || 0} records)`)
  
  // Check for barbers table
  const { data: barbers, error: barbersError } = await supabase.from('barbers').select('*').limit(1)
  console.log('✂️  Barbers table test:', barbersError ? `❌ Error - ${JSON.stringify(barbersError, null, 2)}` : `✅ Success (${barbers?.length || 0} records)`)
  
  // Check for services table  
  const { data: services, error: servicesError } = await supabase.from('services').select('*').limit(1)
  console.log('💼 Services table test:', servicesError ? `❌ Error - ${JSON.stringify(servicesError, null, 2)}` : `✅ Success (${services?.length || 0} records)`)
  
  // Check for appointments table
  const { data: appointments, error: appointmentsError } = await supabase.from('appointments').select('*').limit(1)
  console.log('📅 Appointments table test:', appointmentsError ? `❌ Error - ${JSON.stringify(appointmentsError, null, 2)}` : `✅ Success (${appointments?.length || 0} records)`)
  
} catch (err) {
  console.error('❌ Connection test failed:', err.message)
  console.error('Full error:', err)
}