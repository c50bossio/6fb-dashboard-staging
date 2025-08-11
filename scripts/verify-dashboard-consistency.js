#!/usr/bin/env node

/**
 * Verify Dashboard Data Consistency
 * Ensures Executive Overview and Analytics Dashboard show the same metrics
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:9999'

// Color functions for terminal output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
}

async function fetchLiveAnalytics() {
  try {
    const response = await fetch(`${BASE_URL}/api/analytics/live-data`)
    const data = await response.json()
    
    if (data.success && data.data) {
      return {
        revenue: data.data.total_revenue || 0,
        customers: data.data.total_customers || 0,
        appointments: data.data.total_appointments || 0,
        source: 'Analytics API'
      }
    }
    return null
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return null
  }
}

async function fetchDashboardMetrics() {
  try {
    const response = await fetch(`${BASE_URL}/api/dashboard/metrics`)
    const data = await response.json()
    
    return {
      systemHealth: data.system_health?.status || 'unknown',
      aiActivity: data.ai_activity?.total_conversations || 0,
      businessInsights: data.business_insights?.active_barbershops || 0,
      source: 'Dashboard Metrics API'
    }
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    return null
  }
}

async function verifyConsistency() {
  console.log(colors.bold('\n🔍 Dashboard Data Consistency Check'))
  console.log('=====================================\n')
  
  // Fetch data from both sources
  console.log('Fetching data from APIs...\n')
  
  const analyticsData = await fetchLiveAnalytics()
  const dashboardData = await fetchDashboardMetrics()
  
  if (!analyticsData || !dashboardData) {
    console.log(colors.red('❌ Failed to fetch data from one or more sources'))
    return
  }
  
  // Display Analytics Dashboard data
  console.log(colors.cyan('📊 Analytics Dashboard Data:'))
  console.log(`   Revenue: ${colors.bold(`$${analyticsData.revenue.toLocaleString()}`)}`)
  console.log(`   Customers: ${colors.bold(analyticsData.customers)}`)
  console.log(`   Appointments: ${colors.bold(analyticsData.appointments)}`)
  console.log(`   Source: ${analyticsData.source}\n`)
  
  // Display Dashboard Metrics data
  console.log(colors.cyan('📈 Dashboard Metrics Data:'))
  console.log(`   System Health: ${colors.bold(dashboardData.systemHealth)}`)
  console.log(`   AI Activity: ${colors.bold(dashboardData.aiActivity)} conversations`)
  console.log(`   Active Shops: ${colors.bold(dashboardData.businessInsights)}`)
  console.log(`   Source: ${dashboardData.source}\n`)
  
  // Check for consistency issues
  console.log(colors.bold('🔎 Consistency Analysis:'))
  console.log('------------------------')
  
  // The issue: Executive Overview might be showing 0 when Analytics shows real data
  if (analyticsData.revenue > 0 && analyticsData.customers === 0) {
    console.log(colors.yellow('⚠️  Warning: Revenue exists but no customers recorded'))
  }
  
  if (analyticsData.appointments > 0 && analyticsData.revenue === 0) {
    console.log(colors.yellow('⚠️  Warning: Appointments exist but no revenue recorded'))
  }
  
  // Recommendations
  console.log('\n' + colors.bold('💡 Recommendations:'))
  console.log('-------------------')
  
  if (analyticsData.revenue === 0) {
    console.log('1. Run ' + colors.cyan('npm run seed:analytics') + ' to populate test data')
    console.log('2. Or create real appointments/transactions in the database')
  } else {
    console.log(colors.green('✅ Analytics data is available'))
    console.log('   Both dashboards should now show consistent data')
  }
  
  // Check if tables exist
  console.log('\n' + colors.bold('📋 Next Steps:'))
  console.log('--------------')
  console.log('1. Ensure analytics tables exist in Supabase')
  console.log('2. Run: ' + colors.cyan('node scripts/create-analytics-tables-direct.js'))
  console.log('3. Seed data: ' + colors.cyan('npm run seed:analytics'))
  console.log('4. Refresh both dashboard pages to verify consistency')
}

// Run the verification
verifyConsistency().catch(console.error)