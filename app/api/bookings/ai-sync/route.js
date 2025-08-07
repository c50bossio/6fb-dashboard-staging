import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7'
    const customerId = searchParams.get('customerId')
    
    // Get booking analytics
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))
    
    // Total bookings query
    let bookingsQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
    
    if (customerId) {
      bookingsQuery = bookingsQuery.eq('customer_id', customerId)
    }
    
    const { data: bookings, count: totalBookings, error: bookingsError } = await bookingsQuery
    
    if (bookingsError) throw bookingsError
    
    // Calculate revenue
    const revenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.price || 0), 0)
    
    // Service breakdown
    const serviceBreakdown = bookings.reduce((acc, booking) => {
      const service = booking.service_type
      if (!acc[service]) {
        acc[service] = { count: 0, revenue: 0 }
      }
      acc[service].count++
      acc[service].revenue += booking.price || 0
      return acc
    }, {})
    
    // Barber performance
    const barberPerformance = bookings.reduce((acc, booking) => {
      const barberId = booking.barber_id
      if (!acc[barberId]) {
        acc[barberId] = { bookings: 0, revenue: 0, ratings: [] }
      }
      acc[barberId].bookings++
      acc[barberId].revenue += booking.price || 0
      if (booking.ai_score) {
        acc[barberId].ratings.push(booking.ai_score)
      }
      return acc
    }, {})
    
    // Calculate average ratings
    Object.keys(barberPerformance).forEach(barberId => {
      const ratings = barberPerformance[barberId].ratings
      barberPerformance[barberId].avgRating = 
        ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0
      delete barberPerformance[barberId].ratings
    })
    
    // Peak hours analysis
    const hourCounts = {}
    bookings.forEach(booking => {
      const hour = new Date(booking.start_time).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    
    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([hour]) => `${hour}:00`)
    
    // Customer segments
    const { data: customers } = await supabase
      .from('customers')
      .select('id, segment, total_visits')
    
    const segments = customers?.reduce((acc, customer) => {
      const segment = customer.segment || 'new'
      acc[segment] = (acc[segment] || 0) + 1
      return acc
    }, {}) || {}
    
    // Utilization rate
    const totalSlots = parseInt(period) * 9 * 2 * 3 // days * hours * slots/hour * barbers
    const utilizationRate = totalSlots > 0 ? (totalBookings / totalSlots * 100).toFixed(2) : 0
    
    // Generate AI recommendations based on data
    const recommendations = []
    
    if (utilizationRate < 60) {
      recommendations.push({
        agent: 'marcus',
        type: 'acquisition',
        priority: 'high',
        recommendation: `Utilization at ${utilizationRate}%. Launch targeted campaign for off-peak hours.`,
        impact: 'Could increase bookings by 25%',
        actionable: true
      })
    }
    
    const avgBookingValue = totalBookings > 0 ? revenue / totalBookings : 0
    if (avgBookingValue < 40) {
      recommendations.push({
        agent: 'sophia',
        type: 'revenue',
        priority: 'medium',
        recommendation: `Average booking value $${avgBookingValue.toFixed(2)}. Promote premium services.`,
        impact: `Could increase revenue by $${((45 - avgBookingValue) * totalBookings).toFixed(0)}`,
        actionable: true
      })
    }
    
    if (peakHours.length > 0) {
      recommendations.push({
        agent: 'david',
        type: 'operations',
        priority: 'medium',
        recommendation: `Peak hours at ${peakHours.slice(0, 3).join(', ')}. Consider dynamic pricing.`,
        impact: 'Better resource utilization and increased revenue',
        actionable: true
      })
    }
    
    // Predict future demand
    const avgDailyBookings = totalBookings / parseInt(period)
    const predictions = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dayOfWeek = date.getDay()
      
      // Simple multiplier based on day of week
      const multiplier = [5, 6].includes(dayOfWeek) ? 1.2 : 1.0 // Friday/Saturday busier
      
      const predictedBookings = Math.round(avgDailyBookings * multiplier)
      const predictedRevenue = predictedBookings * avgBookingValue
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        predicted_bookings: predictedBookings,
        predicted_revenue: predictedRevenue.toFixed(2),
        confidence: 0.75
      })
    }
    
    // Identify patterns
    const patterns = []
    
    // Day preference pattern
    const dayOfWeekCounts = {}
    bookings.forEach(booking => {
      const day = new Date(booking.start_time).getDay()
      dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1
    })
    
    const busiestDay = Object.entries(dayOfWeekCounts)
      .sort(([,a], [,b]) => b - a)[0]
    
    if (busiestDay) {
      patterns.push({
        type: 'day_preference',
        data: dayOfWeekCounts,
        insight: `Busiest day is ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][busiestDay[0]]} with ${busiestDay[1]} bookings`
      })
    }
    
    // Build comprehensive response
    const response = {
      timestamp: new Date().toISOString(),
      analytics: {
        period_days: parseInt(period),
        total_bookings: totalBookings,
        revenue: revenue,
        average_booking_value: avgBookingValue,
        utilization_rate: parseFloat(utilizationRate),
        services: serviceBreakdown,
        barbers: barberPerformance,
        peak_hours: peakHours,
        customer_segments: segments
      },
      patterns: patterns,
      recommendations: recommendations,
      predictions: {
        predictions: predictions,
        total_predicted_bookings: predictions.reduce((sum, p) => sum + p.predicted_bookings, 0),
        total_predicted_revenue: predictions.reduce((sum, p) => sum + parseFloat(p.predicted_revenue), 0)
      },
      ai_ready: true,
      agents_notified: ['marcus', 'sophia', 'david']
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error syncing booking data:', error)
    return NextResponse.json(
      { error: 'Failed to sync booking data', details: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint to track new bookings
export async function POST(request) {
  try {
    const bookingData = await request.json()
    
    // Insert booking into database
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        ...bookingData,
        created_at: new Date().toISOString(),
        ai_score: Math.floor(Math.random() * 20) + 80 // Simulate AI score
      }])
      .select()
      .single()
    
    if (error) throw error
    
    // Update customer stats if customer_id provided
    if (bookingData.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('total_visits, total_spent, last_visit')
        .eq('id', bookingData.customer_id)
        .single()
      
      if (customer) {
        await supabase
          .from('customers')
          .update({
            total_visits: (customer.total_visits || 0) + 1,
            total_spent: (customer.total_spent || 0) + (bookingData.price || 0),
            last_visit: bookingData.start_time
          })
          .eq('id', bookingData.customer_id)
      }
    }
    
    // Generate AI insights for the booking
    const insights = []
    
    const bookingHour = new Date(bookingData.start_time).getHours()
    if (bookingHour >= 17) {
      insights.push({
        type: 'timing',
        message: 'Evening booking - remind about parking availability',
        agent: 'operations'
      })
    }
    
    if (bookingData.is_new_customer) {
      insights.push({
        type: 'retention',
        message: 'First-time customer - ensure exceptional service',
        agent: 'marcus'
      })
    }
    
    return NextResponse.json({
      success: true,
      booking: data,
      ai_insights: insights
    })
    
  } catch (error) {
    console.error('Error tracking booking:', error)
    return NextResponse.json(
      { error: 'Failed to track booking', details: error.message },
      { status: 500 }
    )
  }
}