#!/usr/bin/env node

/**
 * Direct test to compare what Executive Overview and Analytics Dashboard receive
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:9999'

async function testDataConsistency() {
  console.log('\n🔍 Testing Dashboard Data Consistency\n')
  console.log('=' . repeat(50))
  
  try {
    // 1. Test what Analytics API returns (used by Analytics Dashboard)
    console.log('\n📊 Analytics API Data (/api/analytics/live-data):')
    const analyticsResponse = await fetch(`${BASE_URL}/api/analytics/live-data`)
    const analyticsData = await analyticsResponse.json()
    
    if (analyticsData.success && analyticsData.data) {
      console.log(`  Revenue: $${analyticsData.data.total_revenue || 0}`)
      console.log(`  Customers: ${analyticsData.data.total_customers || 0}`)
      console.log(`  Appointments: ${analyticsData.data.total_appointments || 0}`)
      console.log(`  Avg Ticket: $${analyticsData.data.average_service_price || 0}`)
    } else {
      console.log('  No data returned')
    }
    
    // 2. Import and test what getBusinessMetrics returns (used by Executive Overview)
    console.log('\n📈 Executive Overview Data (getBusinessMetrics):')
    const { getBusinessMetrics } = require('./lib/dashboard-data')
    const businessMetrics = await getBusinessMetrics('demo-shop-001')
    
    console.log(`  Revenue: $${businessMetrics.revenue || 0}`)
    console.log(`  Customers: ${businessMetrics.customers || 0}`)
    console.log(`  Appointments: ${businessMetrics.appointments || 0}`)
    console.log(`  Satisfaction: ${businessMetrics.satisfaction || 0}`)
    
    // 3. Compare the values
    console.log('\n⚖️ Comparison:')
    console.log('=' . repeat(50))
    
    const analyticsRevenue = analyticsData.data?.total_revenue || 0
    const executiveRevenue = businessMetrics.revenue || 0
    const revenueMatch = analyticsRevenue === executiveRevenue
    
    const analyticsCustomers = analyticsData.data?.total_customers || 0
    const executiveCustomers = businessMetrics.customers || 0
    const customersMatch = analyticsCustomers === executiveCustomers
    
    const analyticsAppointments = analyticsData.data?.total_appointments || 0
    const executiveAppointments = businessMetrics.appointments || 0
    const appointmentsMatch = analyticsAppointments === executiveAppointments
    
    console.log(`Revenue:      Analytics($${analyticsRevenue}) vs Executive($${executiveRevenue}) - ${revenueMatch ? '✅ MATCH' : '❌ MISMATCH'}`)
    console.log(`Customers:    Analytics(${analyticsCustomers}) vs Executive(${executiveCustomers}) - ${customersMatch ? '✅ MATCH' : '❌ MISMATCH'}`)
    console.log(`Appointments: Analytics(${analyticsAppointments}) vs Executive(${executiveAppointments}) - ${appointmentsMatch ? '✅ MATCH' : '❌ MISMATCH'}`)
    
    const allMatch = revenueMatch && customersMatch && appointmentsMatch
    
    console.log('\n' + '=' . repeat(50))
    if (allMatch) {
      console.log('✅ SUCCESS: Both dashboards show consistent data!')
    } else {
      console.log('❌ ISSUE: Dashboards still showing different data')
      console.log('\nNext steps:')
      console.log('1. Check if both are querying the same database tables')
      console.log('2. Verify the Analytics API is using the updated mapping')
      console.log('3. Clear any browser cache and refresh both dashboards')
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message)
  }
}

// Helper to repeat string
String.prototype.repeat = function(count) {
  return new Array(count + 1).join(this)
}

testDataConsistency().catch(console.error)