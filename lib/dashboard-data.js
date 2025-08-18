
import { createClient } from './supabase/server'

// ==========================================
// ==========================================

export async function getBusinessMetrics(barbershopId = 'demo-shop-001', timeRange = '30d') {
  const supabase = createClient()
  
  try {
    const ranges = {
      '1d': 1,
      '7d': 7, 
      '30d': 30,
      '90d': 90
    }
    const days = ranges[timeRange] || 30
    
    const { data, error } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      try {
        
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('shop_id', barbershopId)
        
        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('shop_id', barbershopId)
        
        const { data: barbers } = await supabase
          .from('barbers')
          .select('*')
          .eq('shop_id', barbershopId)
        
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', barbershopId)
          .limit(1)
        
          customers: customers?.length || 0,
          services: services?.length || 0,
          barbers: barbers?.length || 0,
          barbershop: barbershop?.length || 0
        })
        
        const totalCustomers = customers?.length || 0
        const totalServices = services?.length || 0
        const totalBarbers = barbers?.length || 0
        
        const avgCustomerSpend = customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) / Math.max(1, totalCustomers) || 0
        const totalRevenue = customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0
        
        const totalAppointments = customers?.reduce((sum, c) => sum + (c.total_visits || 0), 0) || 0
        
        const avgServicePrice = services?.reduce((sum, s) => sum + (s.price || 0), 0) / Math.max(1, totalServices) || 0
        
          totalRevenue,
          totalCustomers,
          totalAppointments,
          avgServicePrice
        })
        
        return {
          revenue: Math.round(totalRevenue),
          customers: totalCustomers,
          appointments: totalAppointments,
          satisfaction: 4.5, // Default until we have review data
          dailyRevenue: Math.round(totalRevenue / Math.max(1, days)),
          todayBookings: Math.round(totalAppointments * 0.1), // Estimate 10% are today
          capacityUtilization: totalAppointments > 0 ? Math.round((totalAppointments / (totalBarbers * days * 8)) * 100) : 0,
          avgServicePrice: Math.round(avgServicePrice),
          activeBarbers: totalBarbers
        }
      } catch (fallbackError) {
        console.warn('Could not fetch real barbershop data:', fallbackError)
        return {
          revenue: 0,
          customers: 0, 
          appointments: 0,
          satisfaction: 0
        }
      }
    }
    
    const totals = data.reduce((acc, metric) => ({
      revenue: acc.revenue + parseFloat(metric.total_revenue || 0),
      customers: acc.customers + (metric.total_customers || 0),
      appointments: acc.appointments + (metric.total_appointments || 0),
      satisfaction_sum: acc.satisfaction_sum + parseFloat(metric.avg_satisfaction_score || 0),
      satisfaction_count: acc.satisfaction_count + (metric.avg_satisfaction_score > 0 ? 1 : 0)
    }), { revenue: 0, customers: 0, appointments: 0, satisfaction_sum: 0, satisfaction_count: 0 })
    
    return {
      revenue: Math.round(totals.revenue),
      customers: totals.customers,
      appointments: totals.appointments,
      satisfaction: totals.satisfaction_count > 0 ? 
        Math.round((totals.satisfaction_sum / totals.satisfaction_count) * 100) / 100 : 0
    }
    
  } catch (error) {
    console.error('Failed to get business metrics:', error)
    return { revenue: 0, customers: 0, appointments: 0, satisfaction: 0 }
  }
}

// ==========================================
// ==========================================

export async function getAIInsights(barbershopId = 'demo-shop-001', limit = 10) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('priority', { ascending: false }) // high priority first
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return data || []
    
  } catch (error) {
    console.error('Failed to get AI insights:', error)
    return [] // Return empty array instead of mock data
  }
}

// ==========================================
// ==========================================

export async function getAIAgents(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_enabled', true)
      .order('last_activity_at', { ascending: false })
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return []
    }
    
    return data.map(agent => ({
      name: agent.agent_name,
      status: agent.status,
      lastInsight: agent.last_insight || 'No recent insights',
      type: agent.agent_type,
      confidence: agent.avg_confidence_score || 0,
      totalInsights: agent.total_insights_generated || 0
    }))
    
  } catch (error) {
    console.error('Failed to get AI agents:', error)
    return [] // Return empty array instead of mock data
  }
}

// ==========================================
// ==========================================

export async function getBusinessRecommendations(barbershopId = 'demo-shop-001', limit = 5) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('business_recommendations')
      .select(`
        *,
        ai_agents(agent_name, agent_type)
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_implemented', false)
      .order('impact_level', { ascending: false })
      .order('confidence_score', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return []
    }
    
    return data.map(rec => ({
      title: rec.title,
      impact: rec.impact_level,
      revenue: rec.revenue_potential_monthly ? `+$${Math.round(rec.revenue_potential_monthly)}/month` : 'TBD',
      confidence: rec.confidence_score || 0,
      description: rec.description,
      effort: rec.implementation_effort,
      timeToImplement: rec.time_to_implement_days
    }))
    
  } catch (error) {
    console.error('Failed to get business recommendations:', error)
    return [] // Return empty array instead of mock data
  }
}

// ==========================================
// ==========================================

export async function getAnalyticsData(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data: locationData, error: locationError } = await supabase
      .from('location_performance')
      .select(`
        barbershops(name),
        revenue,
        efficiency_score
      `)
      .eq('date', new Date().toISOString().split('T')[0])
    
    if (locationError) throw locationError
    
    const { data: servicesData, error: servicesError } = await supabase
      .from('trending_services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('date', new Date().toISOString().split('T')[0])
      .order('total_bookings', { ascending: false })
    
    if (servicesError) throw servicesError
    
    return {
      revenue_by_location: locationData?.map(loc => ({
        location: loc.barbershops?.name || 'Unknown Location',
        revenue: parseFloat(loc.revenue || 0),
        efficiency: parseFloat(loc.efficiency_score || 0)
      })) || [],
      
      trending_services: servicesData?.map(service => ({
        service: service.service_name,
        bookings: service.total_bookings || 0,
        growth: parseFloat(service.growth_rate || 0)
      })) || []
    }
    
  } catch (error) {
    console.error('Failed to get analytics data:', error)
    return {
      revenue_by_location: [],
      trending_services: []
    }
  }
}

// ==========================================
// ==========================================

export async function getPredictiveData(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data: recentMetrics, error } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    if (error) throw error
    
    if (!recentMetrics || recentMetrics.length === 0) {
      return {
        predictions: {
          next_week_revenue: 0,
          next_week_bookings: 0,
          busy_periods: []
        }
      }
    }
    
    const avgDailyRevenue = recentMetrics.reduce((sum, m) => sum + parseFloat(m.total_revenue || 0), 0) / recentMetrics.length
    const avgDailyBookings = recentMetrics.reduce((sum, m) => sum + (m.total_appointments || 0), 0) / recentMetrics.length
    
    return {
      predictions: {
        next_week_revenue: Math.round(avgDailyRevenue * 7),
        next_week_bookings: Math.round(avgDailyBookings * 7),
        busy_periods: ['Monday 10-12', 'Friday 2-5', 'Saturday 9-1'] // This could be calculated from appointment patterns
      }
    }
    
  } catch (error) {
    console.error('Failed to get predictive data:', error)
    return {
      predictions: {
        next_week_revenue: 0,
        next_week_bookings: 0,
        busy_periods: []
      }
    }
  }
}

// ==========================================
// ==========================================

export async function getLocationPerformance() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('location_performance')
      .select(`
        *,
        barbershops(name)
      `)
      .eq('date', new Date().toISOString().split('T')[0])
      .order('efficiency_score', { ascending: false })
    
    if (error) throw error
    
    return data?.map(location => ({
      name: location.barbershops?.name || 'Unknown Location',
      efficiency: parseFloat(location.efficiency_score || 0),
      rating: parseFloat(location.customer_rating || 0),
      revenue: parseFloat(location.revenue || 0)
    })) || []
    
  } catch (error) {
    console.error('Failed to get location performance:', error)
    return [] // Return empty array instead of mock data
  }
}

// ==========================================
// ==========================================

export async function getRealtimeMetrics(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('realtime_metrics')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('timestamp', { ascending: false })
      .limit(1)
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return {
        active_appointments: 0,
        waiting_customers: 0,
        available_barbers: 0,
        next_available: 'No data'
      }
    }
    
    const latest = data[0]
    return {
      active_appointments: latest.active_appointments || 0,
      waiting_customers: latest.waiting_customers || 0,
      available_barbers: latest.available_barbers || 0,
      next_available: latest.next_available_slot ? 
        new Date(latest.next_available_slot).toLocaleTimeString() : 'No data'
    }
    
  } catch (error) {
    console.error('Failed to get realtime metrics:', error)
    return {
      active_appointments: 0,
      waiting_customers: 0,
      available_barbers: 0,
      next_available: 'No data'
    }
  }
}

// ==========================================
// ==========================================

export async function getDashboardModeData(mode, barbershopId = 'demo-shop-001') {
  try {
    switch (mode) {
      case 'executive':
        const [metrics, insights] = await Promise.all([
          getBusinessMetrics(barbershopId),
          getAIInsights(barbershopId, 5)
        ])
        return { metrics, insights }
        
      case 'ai_insights':
        const [agents, aiInsights, recommendations] = await Promise.all([
          getAIAgents(barbershopId),
          getAIInsights(barbershopId, 10),
          getBusinessRecommendations(barbershopId, 5)
        ])
        return { agents, insights: aiInsights, recommendations }
        
      case 'analytics':
        const [liveData, predictive, performance] = await Promise.all([
          getAnalyticsData(barbershopId),
          getPredictiveData(barbershopId),
          getLocationPerformance()
        ])
        return { liveData, predictive, performance }
        
      case 'predictive':
        const predictions = await getPredictiveData(barbershopId)
        return predictions
        
      case 'operations':
        const [appointments, alerts, realtime] = await Promise.all([
          getAppointments(barbershopId), // Would need to implement
          getActiveAlerts(barbershopId), // Would need to implement  
          getRealtimeMetrics(barbershopId)
        ])
        return { appointments: appointments || [], alerts: alerts || [], realtime }
        
      default:
        return {}
    }
  } catch (error) {
    console.error(`Failed to get dashboard mode data for ${mode}:`, error)
    return {} // Return empty object instead of mock data
  }
}

// ==========================================
// ==========================================

async function getAppointments(barbershopId) {
  return []
}

async function getActiveAlerts(barbershopId) {
  return []
}

// ==========================================
// ==========================================

export async function checkDashboardTablesExist() {
  const supabase = createClient()
  
  try {
    const checks = await Promise.allSettled([
      supabase.from('business_metrics').select('id').limit(1),
      supabase.from('ai_insights').select('id').limit(1),
      supabase.from('ai_agents').select('id').limit(1),
      supabase.from('business_recommendations').select('id').limit(1),
      supabase.from('realtime_metrics').select('id').limit(1)
    ])
    
    const results = checks.map((check, index) => ({
      table: ['business_metrics', 'ai_insights', 'ai_agents', 'business_recommendations', 'realtime_metrics'][index],
      exists: check.status === 'fulfilled',
      error: check.status === 'rejected' ? check.reason?.message : null
    }))
    
    return {
      allTablesExist: results.every(r => r.exists),
      tableStatus: results
    }
    
  } catch (error) {
    console.error('Failed to check dashboard tables:', error)
    return {
      allTablesExist: false,
      error: error.message
    }
  }
}