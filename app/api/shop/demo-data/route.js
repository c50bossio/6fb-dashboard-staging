import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'edge'

// Demo barbershop ID constant
const DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getShopInfo(shopId) {
  try {
    const { data: shop, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (error || !shop) {
      // Return demo shop info if no real shop found
      return {
        id: DEMO_BARBERSHOP_ID,
        name: 'Elite Cuts Barbershop',
        address: '123 Main Street',
        city: 'Downtown',
        state: 'CA',
        phone: '(555) 123-4567',
        email: 'info@elitecuts.com',
        description: 'Premium barbershop providing exceptional grooming services'
      }
    }

    return shop
  } catch (error) {
    console.error('Error fetching shop info:', error)
    return {
      id: DEMO_BARBERSHOP_ID,
      name: 'Elite Cuts Barbershop',
      address: '123 Main Street',
      city: 'Downtown',
      state: 'CA'
    }
  }
}

async function getBarbers(shopId) {
  try {
    const { data: barbershopStaff, error } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        role,
        hire_date,
        is_active,
        users!inner (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('barbershop_id', shopId)
      .eq('role', 'BARBER')
      .eq('is_active', true)

    if (error || !barbershopStaff?.length) {
      // Return demo barbers if no real barbers found
      return [
        {
          id: '1',
          role: 'BARBER',
          is_active: true,
          users: {
            id: '1',
            email: 'marcus@elitecuts.com',
            full_name: 'Marcus Johnson',
            avatar_url: null
          },
          bookings_today: Math.floor(Math.random() * 8) + 2,
          revenue_today: Math.floor(Math.random() * 400) + 200
        },
        {
          id: '2',
          role: 'BARBER',
          is_active: true,
          users: {
            id: '2',
            email: 'david@elitecuts.com',
            full_name: 'David Rodriguez',
            avatar_url: null
          },
          bookings_today: Math.floor(Math.random() * 6) + 1,
          revenue_today: Math.floor(Math.random() * 350) + 150
        },
        {
          id: '3',
          role: 'BARBER',
          is_active: true,
          users: {
            id: '3',
            email: 'james@elitecuts.com',
            full_name: 'James Wilson',
            avatar_url: null
          },
          bookings_today: Math.floor(Math.random() * 7) + 1,
          revenue_today: Math.floor(Math.random() * 320) + 180
        }
      ]
    }

    // Get today's bookings and revenue for each barber
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const barbersWithMetrics = await Promise.all(
      barbershopStaff.map(async (staff) => {
        // Get today's appointments for this barber
        const { count: todayBookings } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barber_id', staff.users.id)
          .eq('barbershop_id', shopId)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .in('status', ['confirmed', 'completed', 'in_progress'])

        // Get today's revenue from transactions
        const { data: todayTransactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .eq('barber_id', staff.users.id)
          .eq('barbershop_id', shopId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .eq('status', 'completed')

        const todayRevenue = todayTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0

        return {
          ...staff,
          bookings_today: todayBookings || 0,
          revenue_today: Math.round(todayRevenue)
        }
      })
    )

    return barbersWithMetrics
  } catch (error) {
    console.error('Error fetching barbers:', error)
    // Return demo data on error
    return [
      {
        id: '1',
        role: 'BARBER',
        is_active: true,
        users: {
          full_name: 'Marcus Johnson',
          email: 'marcus@elitecuts.com',
          avatar_url: null
        },
        bookings_today: 4,
        revenue_today: 320
      }
    ]
  }
}

async function getMetrics(shopId) {
  try {
    // Get metrics from existing metrics API
    const metricsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shop/metrics`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    if (metricsResponse.ok) {
      const metricsData = await metricsResponse.json()
      return metricsData
    }

    // Fallback to basic calculations if metrics API fails
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get today's bookings
    const { count: todayBookings } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shopId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .in('status', ['confirmed', 'completed', 'in_progress'])

    // Get monthly revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyTransactions } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('barbershop_id', shopId)
      .gte('created_at', firstDayOfMonth.toISOString())
      .eq('status', 'completed')

    const monthlyRevenue = monthlyTransactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0

    // Get total customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_active', true)

    // Get active barbers count
    const { count: activeBarbers } = await supabase
      .from('barbershop_staff')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', shopId)
      .eq('role', 'BARBER')
      .eq('is_active', true)

    return {
      totalRevenue: Math.round(monthlyRevenue * 3.5), // Estimate total from monthly
      monthlyRevenue: Math.round(monthlyRevenue),
      todayBookings: todayBookings || 0,
      activeBarbers: activeBarbers || 0,
      totalClients: totalCustomers || 0,
      avgRating: 4.7,
      revenueChange: 12.5,
      bookingsChange: 8.3
    }

  } catch (error) {
    console.error('Error fetching metrics:', error)
    
    // Return demo metrics
    const currentHour = new Date().getHours()
    const isBusinessHours = currentHour >= 9 && currentHour <= 19
    
    return {
      totalRevenue: 145680,
      monthlyRevenue: 18750,
      todayBookings: isBusinessHours ? Math.floor(currentHour / 2) : 6,
      activeBarbers: 3,
      totalClients: 247,
      avgRating: 4.8,
      revenueChange: 12.5,
      bookingsChange: 8.3
    }
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shop_id') || DEMO_BARBERSHOP_ID

    // Fetch all data concurrently for better performance
    const [shopInfo, barbers, metrics] = await Promise.all([
      getShopInfo(shopId),
      getBarbers(shopId),
      getMetrics(shopId)
    ])

    return NextResponse.json({
      success: true,
      shopInfo,
      barbers,
      metrics,
      timestamp: new Date().toISOString(),
      source: 'database_with_demo_fallback'
    })

  } catch (error) {
    console.error('Error in shop demo-data API:', error)
    
    // Return complete demo data set on error
    return NextResponse.json({
      success: true,
      shopInfo: {
        id: DEMO_BARBERSHOP_ID,
        name: 'Elite Cuts Barbershop',
        address: '123 Main Street',
        city: 'Downtown',
        state: 'CA'
      },
      barbers: [
        {
          id: '1',
          users: {
            full_name: 'Marcus Johnson',
            email: 'marcus@elitecuts.com',
            avatar_url: null
          },
          bookings_today: 4,
          revenue_today: 320
        }
      ],
      metrics: {
        totalRevenue: 145680,
        monthlyRevenue: 18750,
        todayBookings: 6,
        activeBarbers: 3,
        totalClients: 247,
        avgRating: 4.8,
        revenueChange: 12.5,
        bookingsChange: 8.3
      },
      timestamp: new Date().toISOString(),
      source: 'demo_fallback'
    }, { status: 200 })
  }
}