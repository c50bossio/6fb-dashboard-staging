/**
 * Database Analytics Service
 * Centralized database queries for dashboard components
 * NO MOCK/DEMO DATA - All functions require real barbershop IDs
 */

import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ==========================================
// CORE METRICS QUERIES
// ==========================================

/**
 * Get comprehensive business metrics for a barbershop
 */
export async function getBusinessMetrics(barbershopId) {
  if (!barbershopId) throw new Error('barbershopId is required')

  try {
    console.log('📊 Fetching business metrics for:', barbershopId)

    // Fetch core data in parallel for better performance
    const [customersResult, appointmentsResult, transactionsResult, staffResult] = await Promise.all([
      supabase
        .from('customers')
        .select('id, total_spent, total_visits, created_at, last_visit_at, is_active')
        .eq('shop_id', barbershopId)
        .eq('is_active', true),
      
      supabase
        .from('appointments')
        .select('id, start_time, end_time, status, service_price, barber_id, created_at')
        .eq('barbershop_id', barbershopId),
      
      supabase
        .from('transactions')
        .select('id, total_amount, tip_amount, tax_amount, created_at, status, type')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed'),
      
      supabase
        .from('barbershop_staff')
        .select('id, user_id, role, is_active')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
    ])

    const customers = customersResult.data || []
    const appointments = appointmentsResult.data || []
    const transactions = transactionsResult.data || []
    const staff = staffResult.data || []

    // Calculate time-based metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))

    // Revenue Metrics
    const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)
    const monthlyRevenue = transactions
      .filter(t => new Date(t.created_at) >= thisMonth)
      .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)
    const weeklyRevenue = transactions
      .filter(t => new Date(t.created_at) >= thisWeek)
      .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)

    // Customer Metrics
    const totalCustomers = customers.length
    const newCustomersThisMonth = customers
      .filter(c => new Date(c.created_at) >= thisMonth).length
    const activeCustomers = customers
      .filter(c => c.last_visit_at && new Date(c.last_visit_at) >= thisWeek).length

    // Appointment Metrics  
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(a => a.status === 'completed').length
    const todayAppointments = appointments
      .filter(a => {
        const aptDate = new Date(a.start_time)
        return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }).length
    const monthlyAppointments = appointments
      .filter(a => new Date(a.start_time) >= thisMonth).length

    // Staff Metrics
    const totalStaff = staff.length
    const barbers = staff.filter(s => s.role === 'BARBER')
    const totalBarbers = barbers.length

    // Calculate averages
    const avgServicePrice = totalRevenue > 0 && completedAppointments > 0 ? 
      totalRevenue / completedAppointments : 0
    const avgCustomerValue = totalRevenue > 0 && totalCustomers > 0 ?
      totalRevenue / totalCustomers : 0

    const metrics = {
      // Revenue
      totalRevenue: Math.round(totalRevenue),
      monthlyRevenue: Math.round(monthlyRevenue),
      weeklyRevenue: Math.round(weeklyRevenue),
      avgServicePrice: Math.round(avgServicePrice),
      
      // Customers
      totalCustomers,
      newCustomersThisMonth,
      activeCustomers,
      avgCustomerValue: Math.round(avgCustomerValue),
      
      // Appointments
      totalAppointments,
      completedAppointments,
      todayAppointments,
      monthlyAppointments,
      completionRate: totalAppointments > 0 ? 
        Math.round((completedAppointments / totalAppointments) * 100) : 0,
      
      // Staff
      totalStaff,
      totalBarbers,
      
      // Calculated fields
      revenuePerBarber: totalBarbers > 0 ? Math.round(totalRevenue / totalBarbers) : 0,
      appointmentsPerDay: totalAppointments > 0 ? Math.round(totalAppointments / 30) : 0,
      
      // Data freshness
      lastUpdated: new Date().toISOString(),
      dataSource: 'database'
    }

    console.log('📊 Calculated metrics:', metrics)
    return metrics

  } catch (error) {
    console.error('❌ Error fetching business metrics:', error)
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalCustomers: 0,
      totalAppointments: 0,
      totalBarbers: 0,
      dataSource: 'error',
      error: error.message
    }
  }
}

/**
 * Get customer analytics and segmentation
 */
export async function getCustomerAnalytics(barbershopId) {
  if (!barbershopId) throw new Error('barbershopId is required')

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', barbershopId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    const now = new Date()
    const twoMonthsAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000))

    // Segment customers
    const segments = {
      vip: customers.filter(c => c.total_visits >= 10 || c.vip_status),
      regular: customers.filter(c => c.total_visits >= 3 && c.total_visits < 10 && 
        (!c.last_visit_at || new Date(c.last_visit_at) > twoMonthsAgo)),
      new: customers.filter(c => c.total_visits <= 2),
      lapsed: customers.filter(c => c.last_visit_at && 
        new Date(c.last_visit_at) <= twoMonthsAgo && c.total_visits >= 3)
    }

    return {
      totalCustomers: customers.length,
      segments: {
        vip: segments.vip.length,
        regular: segments.regular.length,
        new: segments.new.length,
        lapsed: segments.lapsed.length
      },
      customers,
      lastUpdated: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Error fetching customer analytics:', error)
    return {
      totalCustomers: 0,
      segments: { vip: 0, regular: 0, new: 0, lapsed: 0 },
      customers: [],
      error: error.message
    }
  }
}

/**
 * Get appointment analytics and trends
 */
export async function getAppointmentAnalytics(barbershopId) {
  if (!barbershopId) throw new Error('barbershopId is required')

  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('start_time', { ascending: false })

    if (error) throw error

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Status breakdown
    const statusCounts = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1
      return acc
    }, {})

    // Time-based metrics
    const todayAppointments = appointments.filter(a => {
      const aptDate = new Date(a.start_time)
      return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    })

    const weeklyAppointments = appointments.filter(a => new Date(a.start_time) >= thisWeek)
    const monthlyAppointments = appointments.filter(a => new Date(a.start_time) >= thisMonth)

    return {
      total: appointments.length,
      today: todayAppointments.length,
      thisWeek: weeklyAppointments.length,
      thisMonth: monthlyAppointments.length,
      statusBreakdown: statusCounts,
      completionRate: appointments.length > 0 ? 
        Math.round(((statusCounts.completed || 0) / appointments.length) * 100) : 0,
      lastUpdated: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Error fetching appointment analytics:', error)
    return {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      statusBreakdown: {},
      completionRate: 0,
      error: error.message
    }
  }
}

/**
 * Get financial analytics and revenue trends
 */
export async function getFinancialAnalytics(barbershopId) {
  if (!barbershopId) throw new Error('barbershopId is required')

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))

    // Revenue calculations
    const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)
    const totalTips = transactions.reduce((sum, t) => sum + (parseFloat(t.tip_amount) || 0), 0)
    const totalTax = transactions.reduce((sum, t) => sum + (parseFloat(t.tax_amount) || 0), 0)

    const thisMonthRevenue = transactions
      .filter(t => new Date(t.created_at) >= thisMonth)
      .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)

    const lastMonthRevenue = transactions
      .filter(t => {
        const date = new Date(t.created_at)
        return date >= lastMonth && date < thisMonth
      })
      .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)

    const weeklyRevenue = transactions
      .filter(t => new Date(t.created_at) >= thisWeek)
      .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)

    // Calculate growth
    const monthOverMonthGrowth = lastMonthRevenue > 0 ? 
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    return {
      totalRevenue: Math.round(totalRevenue),
      thisMonthRevenue: Math.round(thisMonthRevenue),
      weeklyRevenue: Math.round(weeklyRevenue),
      totalTips: Math.round(totalTips),
      totalTax: Math.round(totalTax),
      monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 100) / 100,
      transactionCount: transactions.length,
      avgTransactionValue: transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0,
      lastUpdated: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Error fetching financial analytics:', error)
    return {
      totalRevenue: 0,
      thisMonthRevenue: 0,
      weeklyRevenue: 0,
      totalTips: 0,
      monthOverMonthGrowth: 0,
      error: error.message
    }
  }
}

/**
 * Get staff performance analytics
 */
export async function getStaffAnalytics(barbershopId) {
  if (!barbershopId) throw new Error('barbershopId is required')

  try {
    const { data: staff, error } = await supabase
      .from('barbershop_staff')
      .select(`
        *,
        users!inner (
          id,
          email,
          full_name
        )
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (error) throw error

    // Get appointment counts per barber
    const staffWithMetrics = await Promise.all(
      staff.map(async (staffMember) => {
        const { count: appointmentCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barber_id', staffMember.user_id)
          .eq('barbershop_id', barbershopId)

        const { data: revenue } = await supabase
          .from('transactions')
          .select('total_amount')
          .eq('barber_id', staffMember.user_id)
          .eq('barbershop_id', barbershopId)
          .eq('status', 'completed')

        const totalRevenue = revenue?.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0) || 0

        return {
          ...staffMember,
          appointmentCount: appointmentCount || 0,
          totalRevenue: Math.round(totalRevenue),
          avgRevenuePerAppointment: appointmentCount > 0 ? Math.round(totalRevenue / appointmentCount) : 0
        }
      })
    )

    return {
      totalStaff: staff.length,
      barbers: staffWithMetrics.filter(s => s.role === 'BARBER'),
      staff: staffWithMetrics,
      lastUpdated: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Error fetching staff analytics:', error)
    return {
      totalStaff: 0,
      barbers: [],
      staff: [],
      error: error.message
    }
  }
}

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardAnalytics(barbershopId) {
  if (!barbershopId) throw new Error('barbershopId is required')

  try {
    console.log('📊 Fetching comprehensive dashboard analytics for:', barbershopId)

    const [business, customers, appointments, financial, staff] = await Promise.all([
      getBusinessMetrics(barbershopId),
      getCustomerAnalytics(barbershopId),
      getAppointmentAnalytics(barbershopId),
      getFinancialAnalytics(barbershopId),
      getStaffAnalytics(barbershopId)
    ])

    return {
      business,
      customers,
      appointments,
      financial,
      staff,
      barbershopId,
      lastUpdated: new Date().toISOString(),
      dataSource: 'database_comprehensive'
    }

  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error)
    return {
      business: { totalRevenue: 0, totalCustomers: 0, totalAppointments: 0 },
      customers: { totalCustomers: 0, segments: {} },
      appointments: { total: 0, today: 0 },
      financial: { totalRevenue: 0 },
      staff: { totalStaff: 0 },
      error: error.message
    }
  }
}