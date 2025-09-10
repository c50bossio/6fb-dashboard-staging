#!/usr/bin/env node

/**
 * Database Seeder Script
 * Creates realistic test data for testing dashboard components
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEMO_SHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedTestData() {
  console.log('🌱 Starting database seeding...')

  try {
    // Create sample customers
    console.log('👥 Creating sample customers...')
    const customers = [
      { name: 'John Smith', email: 'john@example.com', phone: '(555) 101-0001', total_visits: 8, total_spent: 640, vip_status: false },
      { name: 'Michael Johnson', email: 'mike@example.com', phone: '(555) 101-0002', total_visits: 15, total_spent: 1200, vip_status: true },
      { name: 'David Brown', email: 'david@example.com', phone: '(555) 101-0003', total_visits: 3, total_spent: 210, vip_status: false },
      { name: 'Robert Davis', email: 'robert@example.com', phone: '(555) 101-0004', total_visits: 1, total_spent: 45, vip_status: false },
      { name: 'James Wilson', email: 'james@example.com', phone: '(555) 101-0005', total_visits: 12, total_spent: 960, vip_status: true },
    ]

    const { error: customerError } = await supabase
      .from('customers')
      .upsert(customers.map(customer => ({
        ...customer,
        shop_id: DEMO_SHOP_ID,
        is_active: true,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_visit_at: customer.total_visits > 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null
      })), { onConflict: 'name,shop_id' })

    if (customerError) {
      console.error('❌ Error creating customers:', customerError)
    } else {
      console.log(`✅ ${customers.length} customers created`)
    }

    console.log('🎉 Database seeding completed successfully!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeder
seedTestData()
