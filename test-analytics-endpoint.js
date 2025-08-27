#!/usr/bin/env node
// Test script for the enhanced products analytics endpoint

const testAnalyticsEndpoint = async () => {
  const baseUrl = 'http://localhost:3000'

  // Test regular products endpoint (backward compatibility)
  :')
  try {
    const response = await fetch(`${baseUrl}/api/shop/products`)
    const data = await response.json()

  } catch (error) {
    
  }
  
  // Test analytics-enhanced endpoint
  
  try {
    const response = await fetch(`${baseUrl}/api/shop/products?include_analytics=true&period_days=30`)
    const data = await response.json()

    if (data.analytics) {

    }
    
  } catch (error) {
    
  }
  
  // Test different period parameters
  
  for (const period of [7, 30, 90]) {
    try {
      const response = await fetch(`${baseUrl}/api/shop/products?include_analytics=true&period_days=${period}`)
      const data = await response.json()
      
    } catch (error) {
      
    }
  }

}

// Run if called directly
if (require.main === module) {
  testAnalyticsEndpoint().catch(console.error)
}

module.exports = { testAnalyticsEndpoint }