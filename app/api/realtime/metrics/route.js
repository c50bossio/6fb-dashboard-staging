import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate real-time metrics
    const metrics = generateRealtimeMetrics()
    
    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
      userId: user.id
    })

  } catch (error) {
    console.error('Real-time metrics error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { event, data } = await request.json()
    
    // Handle real-time metric events
    const response = await handleMetricEvent(event, data, user.id)
    
    return NextResponse.json({
      success: true,
      event,
      response,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Real-time metric event error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateRealtimeMetrics() {
  const now = new Date()
  const currentHour = now.getHours()
  
  // Simulate realistic barbershop metrics with time patterns
  const isPeakHour = (10 <= currentHour <= 14) || (17 <= currentHour <= 19)
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  
  const peakMultiplier = isPeakHour ? 1.5 : 0.7
  const weekendMultiplier = isWeekend ? 1.3 : 1.0
  
  const baseRevenue = 450 * peakMultiplier * weekendMultiplier
  const baseBookings = 12 * peakMultiplier * weekendMultiplier
  
  return {
    // Core business metrics
    totalRevenue: Math.round((baseRevenue + Math.random() * 100 - 50) * 100) / 100,
    dailyBookings: Math.floor(baseBookings + Math.random() * 5 - 2),
    activeCustomers: Math.floor(Math.random() * 30) + 15,
    satisfactionRating: Math.round((4.1 + Math.random() * 0.7) * 10) / 10,
    
    // Operational metrics
    utilizationRate: Math.round((0.65 + Math.random() * 0.3) * 100) / 100,
    averageWaitTime: Math.floor(Math.random() * 20) + 5,
    currentHour,
    isPeakHour,
    
    // Service performance
    trendingServices: [
      {
        name: 'Haircut + Beard Trim',
        bookings: Math.floor(Math.random() * 8) + 8,
        revenue: Math.floor(Math.random() * 400) + 300,
        trend: Math.random() > 0.5 ? 'up' : 'stable'
      },
      {
        name: 'Premium Styling',
        bookings: Math.floor(Math.random() * 6) + 3,
        revenue: Math.floor(Math.random() * 250) + 200,
        trend: Math.random() > 0.3 ? 'up' : 'down'
      },
      {
        name: 'Quick Trim',
        bookings: Math.floor(Math.random() * 8) + 5,
        revenue: Math.floor(Math.random() * 200) + 150,
        trend: 'stable'
      }
    ],
    
    // Hourly revenue pattern (last 7 hours)
    hourlyRevenue: Array.from({ length: 7 }, (_, i) => {
      const hour = Math.max(0, currentHour - 6 + i)
      const isHourPeak = (10 <= hour <= 14) || (17 <= hour <= 19)
      const hourlyBase = isHourPeak ? 60 : 25
      
      return {
        hour: hour.toString().padStart(2, '0') + ':00',
        revenue: Math.floor(Math.random() * 30) + hourlyBase,
        bookings: Math.floor(Math.random() * 3) + (isHourPeak ? 3 : 1)
      }
    }),
    
    // Customer insights
    customerMetrics: {
      newCustomers: Math.floor(Math.random() * 5) + 2,
      returningCustomers: Math.floor(Math.random() * 15) + 8,
      averageSpend: Math.round((35 + Math.random() * 20) * 100) / 100,
      loyaltyRate: Math.round((0.73 + Math.random() * 0.15) * 100) / 100
    },
    
    // Live activity indicators
    liveActivity: {
      activeBookings: Math.floor(Math.random() * 4) + 1,
      queueLength: Math.floor(Math.random() * 6),
      currentServices: [
        'Haircut in progress',
        'Beard styling',
        'Consultation'
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      nextAvailable: `${Math.floor(Math.random() * 45) + 15} minutes`
    },
    
    // Performance indicators
    kpis: {
      revenueTarget: {
        current: Math.round(baseRevenue),
        target: 500,
        progress: Math.min(Math.round((baseRevenue / 500) * 100), 100)
      },
      bookingTarget: {
        current: Math.floor(baseBookings),
        target: 15,
        progress: Math.min(Math.round((baseBookings / 15) * 100), 100)
      },
      satisfactionTarget: {
        current: Math.round((4.1 + Math.random() * 0.7) * 10) / 10,
        target: 4.5,
        progress: Math.min(Math.round(((4.1 + Math.random() * 0.7) / 4.5) * 100), 100)
      }
    }
  }
}

async function handleMetricEvent(event, data, userId) {
  // Handle different types of real-time metric events
  switch (event) {
    case 'refresh_metrics':
      return {
        action: 'metrics_refreshed',
        newMetrics: generateRealtimeMetrics(),
        message: 'Dashboard metrics refreshed successfully'
      }
      
    case 'subscribe_metric':
      return {
        action: 'subscription_active', 
        metric: data.metricType,
        interval: data.interval || '5s',
        message: `Subscribed to ${data.metricType} updates`
      }
      
    case 'unsubscribe_metric':
      return {
        action: 'subscription_cancelled',
        metric: data.metricType,
        message: `Unsubscribed from ${data.metricType} updates`
      }
      
    case 'metric_alert':
      return {
        action: 'alert_configured',
        metric: data.metricType,
        threshold: data.threshold,
        message: `Alert configured for ${data.metricType}`
      }
      
    default:
      return {
        action: 'event_received',
        event,
        message: 'Event processed successfully'
      }
  }
}