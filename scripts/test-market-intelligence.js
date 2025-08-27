#!/usr/bin/env node

/**
 * Test script for Market Intelligence System
 * Verifies all components are properly integrated
 */

const fetch = require('node-fetch')
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testMarketIntelligence() {

  // Test location: New York City (high cost area)
  const testLocationNYC = {
    lat: 40.7128,
    lng: -74.0060,
    city: 'New York',
    state: 'NY',
    zip_code: '10001'
  }
  
  // Test location: Phoenix (moderate cost area)
  const testLocationPhoenix = {
    lat: 33.4484,
    lng: -112.0740,
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85001'
  }

  await testLocation(testLocationNYC)

  await testLocation(testLocationPhoenix)

}

async function testLocation(location) {
  try {
    // Test 1: Internal market data API
    
    const internalResponse = await fetch('http://localhost:9999/api/market/internal-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, businessType: 'barbershop' })
    })
    
    if (internalResponse.ok) {
      const internalData = await internalResponse.json()
      
      .length : 0}`)
    } else {
      
    }
    
    // Test 2: Competitor analysis API
    
    const competitorResponse = await fetch('http://localhost:9999/api/market/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, businessType: 'barbershop', radius: 3000 })
    })
    
    if (competitorResponse.ok) {
      const competitorData = await competitorResponse.json()

    } else {
      
    }
    
    // Test 3: Demographics API
    
    const demographicsResponse = await fetch('http://localhost:9999/api/market/demographics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    })
    
    if (demographicsResponse.ok) {
      const demographicsData = await demographicsResponse.json()

    } else {
      
    }
    
    // Test 4: Enhanced pricing suggestions API
    
    const pricingResponse = await fetch('http://localhost:9999/api/suggestions/pricing-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessType: 'barbershop',
        location,
        services: ['Haircut', 'Beard Trim', 'VIP Package'],
        includeAIAnalysis: true
      })
    })
    
    if (pricingResponse.ok) {
      const pricingData = await pricingResponse.json()

      if (pricingData.pricing) {
        
        Object.entries(pricingData.pricing).forEach(([service, data]) => {
          
        })
      }
      
      if (pricingData.real_market_data) {
        
      }
      
      if (pricingData.ai_analysis) {
        `)
      }
    } else {
      
    }
    
  } catch (error) {
    console.error('  ✗ Test failed:', error.message)
  }
}

// Database connectivity test
async function testDatabaseConnectivity() {

  try {
    // Test barbershops table
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('id, name, latitude, longitude')
      .limit(5)
    
    if (barbershopsError) throw barbershopsError

    // Test services table
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price, shop_id')
      .limit(5)
    
    if (servicesError) throw servicesError

    // Check for location data
    const shopsWithLocation = barbershops.filter(shop => 
      shop.latitude !== null && shop.longitude !== null
    )

  } catch (error) {
    console.error('  ✗ Database test failed:', error.message)
  }
}

// Run tests
async function runTests() {

  await testDatabaseConnectivity()
  await testMarketIntelligence()

  ')

}

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Execute tests
runTests().catch(console.error)