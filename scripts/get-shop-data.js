#!/usr/bin/env node

import 'dotenv/config'
import supabaseQuery from '../lib/supabase-query.js'

async function getShopData() {
  console.log('🏪 Getting real barbershop data...\n')
  
  const shops = await supabaseQuery.queryTable('barbershops', { limit: 5, select: 'id, name' })
  console.log('Available barbershop IDs:')
  if (shops.data) {
    shops.data.forEach((shop, i) => {
      console.log(`${i + 1}. ${shop.id} - ${shop.name}`)
    })
  }
  
  // Check data for the first shop
  if (shops.data && shops.data.length > 0) {
    const shopId = shops.data[0].id
    console.log(`\n📊 Checking data for: ${shops.data[0].name} (${shopId})`)
    
    const appointments = await supabaseQuery.queryTable('appointments', { 
      filter: { barbershop_id: shopId }, 
      limit: 10,
      select: 'id, status, total_amount, created_at'
    })
    console.log(`Appointments: ${appointments.data?.length || 0}`)
    
    const customers = await supabaseQuery.queryTable('customers', { 
      filter: { barbershop_id: shopId }, 
      limit: 10,
      select: 'id, full_name, total_spent, total_visits'
    })
    console.log(`Customers: ${customers.data?.length || 0}`)
    
    if (customers.data && customers.data.length > 0) {
      console.log('\nSample customer data:')
      customers.data.slice(0, 3).forEach(c => {
        console.log(`  - ${c.full_name}: $${c.total_spent || 0} (${c.total_visits || 0} visits)`)
      })
    }
    
    if (appointments.data && appointments.data.length > 0) {
      console.log('\nSample appointments:')
      appointments.data.slice(0, 3).forEach(a => {
        console.log(`  - ${a.status}: $${a.total_amount || 0}`)
      })
    }
    
    // Calculate totals
    const totalRevenue = customers.data?.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0) || 0
    const totalAppointments = appointments.data?.length || 0
    const totalCustomers = customers.data?.length || 0
    
    console.log(`\n💰 Analytics Summary:`)
    console.log(`  Total Revenue: $${totalRevenue}`)
    console.log(`  Total Appointments: ${totalAppointments}`)
    console.log(`  Total Customers: ${totalCustomers}`)
    
    console.log(`\n🎯 Use this shop ID in analytics API: ${shopId}`)
    
    return shopId
  }
}

getShopData().catch(console.error)