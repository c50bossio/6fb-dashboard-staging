#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
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

console.log('🎯 Creating Sample Barbershop Data')
console.log('==================================\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function generateSampleData() {
  try {
    console.log('🏪 Creating sample barbershop...')
    
    const barbershopData = {
      name: 'The Classic Cut',
      slug: 'classic-cut-demo',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      phone: '(555) 123-4567',
      email: 'info@classiccut.com',
      is_active: true
    }

    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .upsert(barbershopData, { 
        onConflict: 'slug',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (shopError) {
      console.log('📋 Note: Tables may need to be created first')
      console.log('   Run the database setup in Supabase Dashboard:')
      console.log('   1. Go to SQL Editor')
      console.log('   2. Paste database/setup-calendar-tables.sql')
      console.log('   3. Run the query')
      console.log('')
      console.log('   Error details:', shopError.message)
      return false
    }

    console.log(`   ✅ Created: ${barbershop.name}`)

    console.log('\n✂️  Creating sample services...')
    const services = [
      { name: 'Classic Haircut', price: 35, duration_minutes: 30, category: 'Hair' },
      { name: 'Beard Trim', price: 25, duration_minutes: 20, category: 'Beard' },
      { name: 'Hair & Beard Combo', price: 55, duration_minutes: 45, category: 'Package' }
    ]

    for (const service of services) {
      const { error } = await supabase
        .from('services')
        .upsert({
          barbershop_id: barbershop.id,
          ...service,
          is_active: true
        })

      if (!error) {
        console.log(`   ✅ Created: ${service.name} - $${service.price}`)
      }
    }

    console.log('\n🎉 Sample data created successfully!')
    console.log('🔗 Test the calendar: http://localhost:9999/dashboard/calendar')
    console.log('')

    return true

  } catch (error) {
    console.error('❌ Error generating sample data:', error.message)
    return false
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSampleData()
}

export default generateSampleData