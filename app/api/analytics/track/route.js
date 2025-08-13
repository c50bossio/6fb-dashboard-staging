import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper function to parse user agent
function parseUserAgent(userAgent) {
  const ua = userAgent?.toLowerCase() || ''
  
  let deviceType = 'desktop'
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile'
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet'
  }

  let browser = 'unknown'
  if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari')) browser = 'Safari'
  else if (ua.includes('edge')) browser = 'Edge'
  else if (ua.includes('opera')) browser = 'Opera'

  let os = 'unknown'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('ios')) os = 'iOS'

  return { deviceType, browser, os }
}

// Helper function to get geographic data from IP (simplified)
async function getGeographicData(ipAddress) {
  // In production, you would use a service like:
  // - ipapi.co
  // - ipinfo.io 
  // - MaxMind GeoIP
  
  try {
    // Example with ipapi.co (free tier)
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const data = await response.json()
    
    return {
      country: data.country_code || null,
      region: data.region || null,
      city: data.city || null
    }
  } catch (error) {
    console.error('Geographic lookup failed:', error)
    return {
      country: null,
      region: null, 
      city: null
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const headersList = headers()
    
    const {
      linkId,
      eventType, // 'click', 'view', 'conversion', 'share'
      sessionId,
      bookingId = null,
      conversionValue = null,
      referrer = null,
      utmSource = null,
      utmMedium = null,
      utmCampaign = null,
      utmTerm = null,
      utmContent = null
    } = body

    // Validate required fields
    if (!linkId || !eventType) {
      return NextResponse.json(
        { error: 'linkId and eventType are required' },
        { status: 400 }
      )
    }

    // Validate event type
    const validEventTypes = ['click', 'view', 'conversion', 'share', 'qr_scan']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid eventType. Must be one of: ' + validEventTypes.join(', ') },
        { status: 400 }
      )
    }

    // Extract request information
    const userAgent = headersList.get('user-agent')
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     headersList.get('cf-connecting-ip') ||
                     '127.0.0.1'

    // Parse user agent for device info
    const { deviceType, browser, os } = parseUserAgent(userAgent)
    
    // Get geographic data (async)
    const geoData = await getGeographicData(ipAddress.split(',')[0])

    // Verify the booking link exists and is active
    const { data: bookingLink, error: linkError } = await supabase
      .from('booking_links')
      .select('id, active, barber_id')
      .eq('id', linkId)
      .single()

    if (linkError || !bookingLink) {
      return NextResponse.json(
        { error: 'Booking link not found' },
        { status: 404 }
      )
    }

    if (!bookingLink.active) {
      return NextResponse.json(
        { error: 'Booking link is not active' },
        { status: 403 }
      )
    }

    // Insert analytics record
    const analyticsData = {
      link_id: linkId,
      event_type: eventType,
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: ipAddress.split(',')[0], // Get first IP if multiple
      referrer: referrer,
      booking_id: bookingId,
      conversion_value: conversionValue ? parseFloat(conversionValue) : null,
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      device_type: deviceType,
      browser: browser,
      os: os,
      timestamp: new Date().toISOString()
    }

    const { data: analyticsRecord, error: insertError } = await supabase
      .from('link_analytics')
      .insert(analyticsData)
      .select()
      .single()

    if (insertError) {
      console.error('Analytics insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to track event', details: insertError.message },
        { status: 500 }
      )
    }

    // If this is a conversion event, also create booking attribution
    if (eventType === 'conversion' && bookingId) {
      await supabase
        .from('booking_attributions')
        .insert({
          booking_id: bookingId,
          link_id: linkId,
          source: 'booking_link',
          medium: 'organic', // Could be 'qr_code' if from QR scan
          campaign: bookingLink.name || 'direct',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_term: utmTerm,
          utm_content: utmContent
        })
    }

    // The database trigger will automatically update the counters in booking_links table
    // So we don't need to manually update clicks/conversions here

    return NextResponse.json({
      success: true,
      data: {
        analyticsId: analyticsRecord.id,
        eventType: eventType,
        timestamp: analyticsRecord.timestamp,
        linkId: linkId
      }
    })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// Get analytics summary for a specific link
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')
    const days = parseInt(searchParams.get('days')) || 30

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId parameter is required' },
        { status: 400 }
      )
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get analytics summary
    const { data: analytics, error } = await supabase
      .from('link_analytics')
      .select('*')
      .eq('link_id', linkId)
      .gte('timestamp', startDate.toISOString())

    if (error) {
      throw error
    }

    // Process analytics data
    const summary = {
      totalEvents: analytics.length,
      clicks: analytics.filter(a => a.event_type === 'click').length,
      views: analytics.filter(a => a.event_type === 'view').length,
      conversions: analytics.filter(a => a.event_type === 'conversion').length,
      qrScans: analytics.filter(a => a.event_type === 'qr_scan').length,
      totalRevenue: analytics
        .filter(a => a.event_type === 'conversion')
        .reduce((sum, a) => sum + (parseFloat(a.conversion_value) || 0), 0),
      
      // Device breakdown
      devices: {
        mobile: analytics.filter(a => a.device_type === 'mobile').length,
        tablet: analytics.filter(a => a.device_type === 'tablet').length,
        desktop: analytics.filter(a => a.device_type === 'desktop').length
      },
      
      // Top countries
      countries: analytics.reduce((acc, a) => {
        if (a.country) {
          acc[a.country] = (acc[a.country] || 0) + 1
        }
        return acc
      }, {}),
      
      // Hourly distribution
      hourlyDistribution: analytics.reduce((acc, a) => {
        const hour = a.hour_of_day
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {}),
      
      // Daily trend
      dailyTrend: analytics.reduce((acc, a) => {
        const date = new Date(a.timestamp).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { clicks: 0, conversions: 0, revenue: 0 }
        }
        if (a.event_type === 'click') acc[date].clicks++
        if (a.event_type === 'conversion') {
          acc[date].conversions++
          acc[date].revenue += parseFloat(a.conversion_value) || 0
        }
        return acc
      }, {})
    }

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', message: error.message },
      { status: 500 }
    )
  }
}