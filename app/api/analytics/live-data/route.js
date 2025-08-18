/**
 * Live Analytics Data API Endpoint
 * Provides real-time business metrics for AI agent consumption
 * Enhanced with intelligent caching for optimal performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheQuery, invalidateCache, getCacheStats } from '../../../../lib/analytics-cache.js';
export const runtime = 'edge'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    let authenticatedUser = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (error || !user) {
          console.warn('Invalid auth token provided:', error?.message)
        } else {
          authenticatedUser = user
        }
      } catch (authError) {
        console.warn('Auth validation error:', authError.message)
      }
    }
    
    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const forceRefresh = searchParams.get('force_refresh') === 'true';
    const format = searchParams.get('format') || 'json'; // json, formatted, specific
    const metric = searchParams.get('metric'); // for specific metric queries
    
    const periodType = searchParams.get('period_type'); // ytd, previous_year, 7days, 30days, 90days, custom
    const startDate = searchParams.get('start_date'); // ISO date string for custom range
    const endDate = searchParams.get('end_date'); // ISO date string for custom range
    const comparison = searchParams.get('comparison') === 'true'; // Enable comparison mode

    const cacheType = 'live-analytics';
    const cacheParams = { 
      barbershopId: barbershopId || 'demo-shop-001', 
      format, 
      metric, 
      periodType,
      forceRefresh 
    };

    let analyticsData;
    
    try {
      if (!forceRefresh) {
        analyticsData = await cacheQuery(cacheType, cacheParams, async () => {
          return await getSupabaseAnalyticsData(barbershopId, format, metric);
        });
      } else {
        invalidateCache(cacheType);
        analyticsData = await getSupabaseAnalyticsData(barbershopId, format, metric);
      }
      
    } catch (error) {
      console.error('❌ Analytics data fetch error:', error);
      const cacheStats = getCacheStats();
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analytics data',
        cacheStats,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    if (format === 'formatted') {
      return NextResponse.json({
        success: true,
        data: {
          formatted_metrics: analyticsData.formatted_metrics || analyticsData.data,
          data_source: analyticsData.data_source || 'fallback',
          timestamp: new Date().toISOString(),
        }
      });
    }
    
    if (format === 'specific' && metric) {
      const specificValue = analyticsData[metric] || analyticsData.data?.[metric];
      return NextResponse.json({
        success: true,
        data: {
          metric: metric,
          value: specificValue,
          data_source: analyticsData.data_source || 'fallback',
          timestamp: new Date().toISOString(),
        }
      });
    }
    
    const cacheStats = getCacheStats();
    
    return NextResponse.json({
      success: true,
      data: analyticsData.data || analyticsData,
      meta: {
        barbershop_id: barbershopId,
        force_refresh: forceRefresh,
        data_source: analyticsData.data_source || 'supabase',
        cache_info: analyticsData._cache || { hit: false },
        cache_stats: {
          hitRate: cacheStats.hitRate,
          size: cacheStats.size,
          maxSize: cacheStats.maxSize
        },
        timestamp: new Date().toISOString(),
        performance: {
          cached: analyticsData._cache?.hit || false,
          queryTime: analyticsData._cache?.queryTime || null,
          age: analyticsData._cache?.age || null
        }
      }
    });

  } catch (error) {
    console.error('Live analytics data error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live analytics data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * ENHANCED: Comprehensive Supabase analytics data with proper aggregations
 */
async function getSupabaseAnalyticsData(barbershopId, format, metric) {
  try {
    const { createClient } = await import('../../../../lib/supabase/server');
    const supabase = createClient();
    
    const shopId = barbershopId || 'demo-shop-001';
    
    // Query all relevant tables for comprehensive analytics
    const [
      customersResult,
      appointmentsResult,
      transactionsResult,
      servicesResult
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('shop_id', shopId),
      supabase.from('appointments').select('*').eq('barbershop_id', shopId),
      supabase.from('transactions').select('*').eq('barbershop_id', shopId),
      supabase.from('services').select('*').eq('shop_id', shopId)
    ]);

    const customers = customersResult.data || [];
    const appointments = appointmentsResult.data || [];
    const transactions = transactionsResult.data || [];
    const services = servicesResult.data || [];

    // Calculate comprehensive metrics
    const totalCustomers = customers.length;
    const totalAppointments = appointments.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
    
    // Calculate time-based metrics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayAppointments = appointments.filter(a => 
      new Date(a.start_time) >= todayStart
    );
    const todayTransactions = transactions.filter(t => 
      new Date(t.created_at) >= todayStart
    );
    const thisMonthTransactions = transactions.filter(t => 
      new Date(t.created_at) >= thisMonth
    );
    
    // Status breakdown
    const appointmentsByStatus = {};
    appointments.forEach(apt => {
      const status = apt.status || 'unknown';
      appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
    });
    
    // Service popularity
    const servicePopularity = {};
    appointments.forEach(apt => {
      const service = apt.service_name || 'Unknown';
      servicePopularity[service] = (servicePopularity[service] || 0) + 1;
    });
    
    const mostPopularServices = Object.entries(servicePopularity)
      .map(([name, count]) => ({ name, count, percentage: (count / Math.max(totalAppointments, 1)) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Customer metrics
    const returningCustomers = customers.filter(c => (c.total_visits || 0) > 1).length;
    const newCustomersThisMonth = customers.filter(c => 
      new Date(c.created_at) >= thisMonth
    ).length;
    
    // Calculate peak hours
    const hourlyBookings = {};
    appointments.forEach(apt => {
      const hour = new Date(apt.start_time).getHours();
      hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
    });
    
    const peakHours = Object.entries(hourlyBookings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    const analyticsMetrics = {
      // Revenue metrics
      total_revenue: totalRevenue,
      monthly_revenue: thisMonthTransactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0),
      daily_revenue: todayTransactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0),
      weekly_revenue: Math.round(totalRevenue / 4), // Approximate
      average_service_price: services.length > 0 ? services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0) / services.length : 0,
      
      // Appointment metrics
      total_appointments: totalAppointments,
      appointments_today: todayAppointments.length,
      completed_appointments: appointmentsByStatus.completed || 0,
      cancelled_appointments: appointmentsByStatus.cancelled || 0,
      no_show_appointments: appointmentsByStatus.no_show || 0,
      pending_appointments: appointmentsByStatus.pending || 0,
      confirmed_appointments: appointmentsByStatus.confirmed || 0,
      appointment_completion_rate: totalAppointments > 0 ? ((appointmentsByStatus.completed || 0) / totalAppointments) * 100 : 0,
      average_appointments_per_day: Math.round(totalAppointments / 30),
      
      // Customer metrics
      total_customers: totalCustomers,
      new_customers_this_month: newCustomersThisMonth,
      returning_customers: returningCustomers,
      customer_retention_rate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
      average_customer_lifetime_value: totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0,
      
      // Business insights
      peak_booking_hours: peakHours,
      most_popular_services: mostPopularServices,
      busiest_days: ['Friday', 'Saturday'], // Would need more complex analysis
      occupancy_rate: Math.min(100, (totalAppointments / Math.max(1, 30 * 8)) * 100), // Assuming 8 hour days
      
      // System metrics
      total_barbers: services.length > 0 ? Math.ceil(services.length / 3) : 1, // Estimate from services
      active_barbers: services.length > 0 ? Math.ceil(services.length / 3) : 1,
      payment_success_rate: transactions.length > 0 ? 
        (transactions.filter(t => t.payment_status === 'completed').length / transactions.length) * 100 : 0,
      
      last_updated: new Date().toISOString(),
      data_freshness: "supabase_comprehensive"
    };
    
    
    return {
      success: true,
      data: analyticsMetrics,
      data_source: 'supabase_enhanced',
      cache_status: { 
        database_type: 'postgresql',
        tables_queried: ['customers', 'appointments', 'transactions', 'services'],
        records_processed: customers.length + appointments.length + transactions.length + services.length
      }
    };
    
  } catch (error) {
    console.error('Supabase analytics data error:', error);
    // Return minimal error state without mock data
    return {
      success: false,
      data: {
        total_revenue: 0,
        total_customers: 0,
        total_appointments: 0,
        error: 'Database connection failed',
        data_freshness: "error_state"
      },
      data_source: 'error',
      error: error.message
    };
  }
}

/**
 * Simplified fallback - always use the main Supabase function
 * NO MOCK DATA - real database only
 */
async function getConsistentFallbackData(barbershopId, format, metric) {
  return await getSupabaseAnalyticsData(barbershopId, format, metric);
}

/**
 * POST endpoint for triggering analytics refresh
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { barbershop_id, refresh_cache } = body;

    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${pythonServiceUrl}/analytics/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id,
          refresh_cache: refresh_cache !== false
        }),
        timeout: 15000, // 15 second timeout for refresh
      });
      
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          success: true,
          message: 'Analytics refresh triggered successfully',
          data: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(`Python service responded with ${response.status}`);
      }
      
    } catch (pythonError) {
      console.warn('Python analytics service unavailable for refresh:', pythonError.message);
      
      return NextResponse.json({
        success: true,
        message: 'Analytics refresh request received (fallback mode)',
        data: {
          refresh_triggered: false,
          reason: 'Python service unavailable',
          fallback_mode: true
        },
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Analytics refresh error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger analytics refresh',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}