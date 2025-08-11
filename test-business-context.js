#!/usr/bin/env node

// Load environment variables
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local file
try {
  const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      if (value && !process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (error) {
  console.warn('Could not load .env.local:', error.message)
}

// Test script to debug AI Business Context Service
import { AIBusinessContextService } from './lib/ai-business-context.js'

async function testBusinessContext() {
  console.log('🧪 Testing AI Business Context Service...')
  
  // Debug environment variables
  console.log('\n🔍 Environment Check:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing')
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables')
    return
  }
  
  try {
    const aiBusinessContext = new AIBusinessContextService()
    
    console.log('\n📊 Getting business context...')
    const context = await aiBusinessContext.getBusinessContext('demo-shop-001')
    
    console.log('\n✅ Business Context Results:')
    console.log('='.repeat(50))
    
    // Test bookings data
    console.log('\n📅 BOOKINGS DATA:')
    console.log(`Today's bookings: ${context.bookings?.total_today || 0}`)
    console.log(`This week's bookings: ${context.bookings?.total_week || 0}`)
    console.log(`Next appointment:`, context.bookings?.next_appointment || 'None')
    
    // Test analytics data  
    console.log('\n📈 ANALYTICS DATA:')
    console.log(`Total revenue: $${context.analytics?.trends?.total_revenue || 0}`)
    console.log(`Total customers: ${context.analytics?.trends?.total_customers || 0}`)
    console.log(`Total appointments: ${context.analytics?.trends?.total_appointments || 0}`)
    
    // Test revenue data
    console.log('\n💰 REVENUE DATA:')
    console.log(`Today's revenue: $${context.revenue?.today_revenue || 0}`)
    console.log(`Monthly revenue: $${context.revenue?.monthly_revenue || 0}`)
    
    // Test AI system prompt
    console.log('\n🤖 AI SYSTEM PROMPT:')
    const prompt = await aiBusinessContext.getAISystemPrompt('demo-shop-001')
    console.log('System prompt length:', prompt.length)
    console.log('Prompt preview:', prompt.substring(0, 200) + '...')
    
    // Test specific weekly appointments query
    console.log('\n📆 TESTING WEEKLY APPOINTMENTS:')
    const weeklyBookings = context.bookings?.week_bookings || []
    console.log(`Total appointments this week: ${weeklyBookings.length}`)
    
    if (weeklyBookings.length > 0) {
      console.log('\nDetailed appointment breakdown:')
      weeklyBookings.forEach((booking, index) => {
        console.log(`${index + 1}. ${booking.customer_name} - ${booking.service_name || 'Service not specified'} - ${new Date(booking.start_time).toLocaleString()}`)
      })
    } else {
      console.log('⚠️ No appointments found in database')
    }
    
  } catch (error) {
    console.error('❌ Error testing business context:', error)
    console.error('Stack trace:', error.stack)
  }
}

testBusinessContext()