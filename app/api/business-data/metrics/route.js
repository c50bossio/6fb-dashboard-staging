/**
 * Unified Business Data API Endpoint
 * Provides consistent business metrics for both dashboard and AI agents
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge'

// Simple rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map();

// Input validation helper
function validateInput(barbershopId, format) {
  // Validate barbershop_id (should be alphanumeric or null)
  if (barbershopId && !/^[a-zA-Z0-9_-]+$/.test(barbershopId)) {
    throw new Error('Invalid barbershop_id format');
  }
  
  // Validate format parameter
  const validFormats = ['dashboard', 'ai', 'json'];
  if (!validFormats.includes(format)) {
    throw new Error('Invalid format parameter');
  }
  
  return true;
}

// Simple rate limiting (100 requests per minute per IP)
function checkRateLimit(clientIP) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = `${clientIP}-${minute}`;
  
  const requests = rateLimitStore.get(key) || 0;
  if (requests >= 100) {
    throw new Error('Rate limit exceeded');
  }
  
  rateLimitStore.set(key, requests + 1);
  
  // Clean old entries (deterministic cleanup)
  if ((requests % 100) === 0) { // Clean every 100 requests
    for (const [k, v] of rateLimitStore.entries()) {
      const keyMinute = k.split('-')[1];
      if (minute - parseInt(keyMinute) > 5) { // Remove entries older than 5 minutes
        rateLimitStore.delete(k);
      }
    }
  }
}

export async function GET(request) {
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    checkRateLimit(clientIP);
    
    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const forceRefresh = searchParams.get('force_refresh') === 'true';
    const format = searchParams.get('format') || 'dashboard'; // dashboard, ai, json
    
    // Input validation
    validateInput(barbershopId, format);

    // Try to get data from Python backend unified business service
    let businessData;
    
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${pythonServiceUrl}/business-data/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id: barbershopId || null,
          force_refresh: forceRefresh,
          format: format
        }),
        timeout: 10000,
      });
      
      if (response.ok) {
        businessData = await response.json();
      } else {
        throw new Error(`Python service responded with ${response.status}`);
      }
      
    } catch (pythonError) {
      console.warn('Python business data service unavailable, using consistent fallback:', pythonError.message);
      
      // Use consistent fallback data that matches UnifiedBusinessMetrics
      businessData = getUnifiedBusinessMetrics(format);
    }

    // Handle different response formats
    if (format === 'ai') {
      return NextResponse.json({
        success: true,
        data: businessData.formatted_summary || businessData.ai_summary,
        meta: {
          barbershop_id: barbershopId,
          data_source: businessData.data_source || 'unified_fallback',
          timestamp: new Date().toISOString(),
        }
      });
    }
    
    if (format === 'dashboard') {
      return NextResponse.json({
        success: true,
        data: businessData.dashboard_data || businessData.data || businessData,
        meta: {
          barbershop_id: barbershopId,
          force_refresh: forceRefresh,
          data_source: businessData.data_source || 'unified_fallback',
          cache_status: businessData.cache_status,
          timestamp: new Date().toISOString(),
        }
      });
    }
    
    // Default JSON format
    return NextResponse.json({
      success: true,
      data: businessData,
      meta: {
        barbershop_id: barbershopId,
        force_refresh: forceRefresh,
        data_source: businessData.data_source || 'unified_fallback',
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Unified business data error:', error);
    
    // Handle specific error types
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait and try again.',
        timestamp: new Date().toISOString(),
      }, { status: 429 });
    }
    
    if (error.message.includes('Invalid')) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch unified business data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Get unified business metrics - NO MOCK DATA POLICY
 */
function getUnifiedBusinessMetrics(format) {
  // NO MOCK DATA - return empty state with helpful instructions
  const baseMetrics = {
    // Core Revenue Metrics - all zeros until real data exists
    monthly_revenue: 0,
    daily_revenue: 0,
    weekly_revenue: 0,
    total_revenue: 0,
    service_revenue: 0,
    tip_revenue: 0,
    revenue_growth: 0,
    average_service_price: 0,
    
    // Appointment Analytics - all zeros
    total_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0,
    no_show_appointments: 0,
    pending_appointments: 0,
    confirmed_appointments: 0,
    appointment_completion_rate: 0,
    average_appointments_per_day: 0,
    
    // Customer Metrics - all zeros
    total_customers: 0,
    new_customers_this_month: 0,
    returning_customers: 0,
    customer_retention_rate: 0,
    average_customer_lifetime_value: 0,
    
    // Staff Performance - empty data
    total_barbers: 0,
    active_barbers: 0,
    top_performing_barber: "No data",
    average_service_duration: 0,
    
    // Business Intelligence - empty arrays and zeros
    peak_booking_hours: [],
    most_popular_services: [],
    busiest_days: [],
    occupancy_rate: 0,
    
    // Financial Health - zeros
    payment_success_rate: 0,
    outstanding_payments: 0,
    
    // Metadata
    last_updated: new Date().toISOString(),
    data_source: 'no_data',
    data_freshness: 'empty',
    data_available: false,
    message: 'Backend service unavailable. Please ensure Python backend is running on port 8001.',
    instructions: [
      'Start the Python backend service',
      'Ensure database connection is configured',
      'Create bookings and services in the database',
      'Wait for data to populate'
    ]
  };

  if (format === 'ai') {
    const aiSummary = `
BUSINESS METRICS STATUS

⚠️ NO DATA AVAILABLE

The backend service is currently unavailable. Business metrics cannot be retrieved at this time.

REQUIRED ACTIONS:
${baseMetrics.instructions.map(instruction => `• ${instruction}`).join('\n')}

Once the backend service is running and database contains booking data, real-time metrics will be available including:
• Revenue performance tracking
• Appointment analytics
• Customer base insights
• Staff performance metrics
• Business intelligence reports

Data Source: ${baseMetrics.data_source.toUpperCase()} | Status: ${baseMetrics.data_freshness.toUpperCase()}
`;

    return {
      ai_summary: aiSummary.trim(),
      raw_data: baseMetrics,
      data_source: baseMetrics.data_source
    };
  }

  if (format === 'dashboard') {
    return {
      dashboard_data: baseMetrics,
      data_source: baseMetrics.data_source,
      cache_status: {
        cache_entries: 1,
        database_type: 'unified'
      }
    };
  }

  return baseMetrics;
}

/**
 * POST endpoint for triggering data refresh
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { barbershop_id, refresh_cache, format } = body;

    // Try to trigger refresh in Python unified business service
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${pythonServiceUrl}/business-data/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id,
          refresh_cache: refresh_cache !== false,
          format
        }),
        timeout: 15000,
      });
      
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          success: true,
          message: 'Unified business data refresh triggered successfully',
          data: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(`Python service responded with ${response.status}`);
      }
      
    } catch (pythonError) {
      console.warn('Python unified business service unavailable for refresh:', pythonError.message);
      
      return NextResponse.json({
        success: true,
        message: 'Unified business data refresh request received (fallback mode)',
        data: {
          refresh_triggered: false,
          reason: 'Python service unavailable',
          fallback_mode: true
        },
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Unified business data refresh error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger unified business data refresh',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}