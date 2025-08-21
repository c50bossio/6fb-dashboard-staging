import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json, csv
    const periodDays = searchParams.get('period_days') || '30'
    const includeDetails = searchParams.get('include_details') === 'true'

    // Get comprehensive analytics data
    const dashboardResponse = await fetch(`${request.url.split('/api')[0]}/api/shop/analytics/dashboard?period_days=${periodDays}`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    })

    if (!dashboardResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    const analyticsData = await dashboardResponse.json()

    // Generate timestamp for export
    const timestamp = new Date().toISOString().split('T')[0]
    const shopName = 'Barbershop' // Could get from user profile

    if (format === 'csv') {
      // Generate CSV export
      let csvContent = `Analytics Report - ${shopName}\n`
      csvContent += `Export Date: ${timestamp}\n`
      csvContent += `Period: ${periodDays} days\n\n`

      // Summary metrics
      csvContent += `SUMMARY METRICS\n`
      csvContent += `Metric,Value\n`
      csvContent += `Total Revenue,$${analyticsData.summary?.total_revenue || 0}\n`
      csvContent += `Total Appointments,${analyticsData.summary?.total_appointments || 0}\n`
      csvContent += `Total Customers,${analyticsData.summary?.total_customers || 0}\n`
      csvContent += `Average Appointment Value,$${analyticsData.summary?.average_appointment_value || 0}\n`
      csvContent += `Customer Retention Rate,${analyticsData.summary?.customer_retention_rate || 0}%\n\n`

      // Daily revenue breakdown
      if (includeDetails && analyticsData.daily_revenue) {
        csvContent += `DAILY REVENUE\n`
        csvContent += `Date,Revenue\n`
        Object.entries(analyticsData.daily_revenue).forEach(([date, revenue]) => {
          csvContent += `${date},$${revenue}\n`
        })
        csvContent += `\n`
      }

      // Popular services
      if (analyticsData.popular_services?.length > 0) {
        csvContent += `POPULAR SERVICES\n`
        csvContent += `Service,Bookings,Percentage\n`
        analyticsData.popular_services.forEach(service => {
          csvContent += `${service.service},${service.count},${service.percentage}%\n`
        })
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${shopName}-analytics-${timestamp}.csv"`
        }
      })
    }

    // JSON export (default)
    const exportData = {
      export_info: {
        shop_name: shopName,
        export_date: timestamp,
        period_days: parseInt(periodDays),
        format: 'json',
        include_details: includeDetails
      },
      analytics: analyticsData,
      generated_insights: {
        revenue_trend: analyticsData.summary?.total_revenue > 0 ? 'positive' : 'neutral',
        busiest_day: null, // Could calculate from daily_revenue
        top_service: analyticsData.popular_services?.[0]?.service || 'N/A',
        growth_indicator: analyticsData.growth_metrics?.revenue_growth > 0 ? 'growing' : 'stable'
      }
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="${shopName}-analytics-${timestamp}.json"`
      }
    })

  } catch (error) {
    console.error('Error in analytics export:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    )
  }
}