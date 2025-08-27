#!/usr/bin/env node

/**
 * Verify Dashboard Data Consistency
 * Ensures Executive Overview and Analytics Dashboard show the same metrics
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:9999'

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
  )

  const analyticsData = await fetchLiveAnalytics()
  const dashboardData = await fetchDashboardMetrics()
  
  if (!analyticsData || !dashboardData) {
    )
    return
  }
  
  )
  }`)}`)
  }`)
  }`)

  )
  }`)
  } conversations`)
  }`)

  )

  if (analyticsData.revenue > 0 && analyticsData.customers === 0) {
    )
  }
  
  if (analyticsData.appointments > 0 && analyticsData.revenue === 0) {
    )
  }
  
  )

  if (analyticsData.revenue === 0) {
     + ' to populate test data')
    
  } else {
    )
    
  }
  
  )

  )
  )
  
}

verifyConsistency().catch(console.error)