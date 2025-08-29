import { NextResponse } from 'next/server'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    
    // Generate realistic demo analytics data for landing page preview
    const currentDate = new Date()
    const monthlyRevenue = 8450 + Math.floor(Math.random() * 2000) // $8,450 - $10,450
    const averageTicket = 65 + Math.floor(Math.random() * 20) // $65 - $85
    const totalCustomers = 156 + Math.floor(Math.random() * 50) // 156 - 206
    const totalAppointments = 234 + Math.floor(Math.random() * 100) // 234 - 334
    
    const analyticsData = {
      // Revenue metrics
      monthly_revenue: monthlyRevenue,
      daily_revenue: Math.floor(monthlyRevenue / 30),
      total_revenue: monthlyRevenue * 3, // 3 months
      average_service_price: averageTicket,
      
      // Customer metrics
      total_customers: totalCustomers,
      new_customers_this_month: Math.floor(totalCustomers * 0.15), // 15% new
      returning_customers: Math.floor(totalCustomers * 0.57), // 57% returning
      customer_retention_rate: 68 + Math.floor(Math.random() * 15), // 68-83%
      average_customer_lifetime_value: averageTicket * 2.4, // $156 LTV
      
      // Appointment metrics
      total_appointments: totalAppointments,
      appointments_today: Math.floor(Math.random() * 12) + 6, // 6-18 today
      average_appointments_per_day: Math.floor(totalAppointments / 30),
      appointment_completion_rate: 94 + Math.floor(Math.random() * 5), // 94-99%
      
      // Operational metrics
      active_barbers: 3,
      occupancy_rate: 75 + Math.floor(Math.random() * 15), // 75-90%
      payment_success_rate: 97 + Math.floor(Math.random() * 3), // 97-100%
      
      // Metadata
      last_updated: currentDate.toISOString(),
      data_source: 'demo_preview',
      shop_id: 'preview-analytics'
    }
    
    // Format response based on requested format
    if (format === 'formatted') {
      return NextResponse.json({
        success: true,
        data: {
          formatted_metrics: analyticsData,
          meta: {
            generated_at: currentDate.toISOString(),
            type: 'preview_demo',
            purpose: 'landing_page_showcase'
          }
        }
      })
    }
    
    // Default response
    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        generated_at: currentDate.toISOString(),
        type: 'preview_demo',
        purpose: 'landing_page_showcase'
      }
    })
    
  } catch (error) {
    console.error('Error generating analytics preview:', error)
    
    // Return fallback data even on error
    return NextResponse.json({
      success: false,
      error: 'Failed to generate preview data',
      data: {
        monthly_revenue: 8450,
        daily_revenue: 340,
        total_revenue: 24680,
        average_service_price: 65,
        total_customers: 156,
        new_customers_this_month: 24,
        returning_customers: 89,
        customer_retention_rate: 68,
        average_customer_lifetime_value: 158,
        total_appointments: 234,
        appointments_today: 8,
        average_appointments_per_day: 12,
        appointment_completion_rate: 94,
        active_barbers: 3,
        occupancy_rate: 78,
        payment_success_rate: 97
      }
    }, { status: 200 }) // Still return 200 with fallback data
  }
}