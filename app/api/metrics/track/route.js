import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { posthog } from '@/lib/posthog/server'
export const runtime = 'edge'

// GDPR-compliant production metrics tracking endpoint
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      event,
      properties = {},
      userId,
      sessionId,
      consent = {},
      metadata = {}
    } = body

    // GDPR Consent Check - Only track if user has given appropriate consent
    if (!consent.analytics && !consent.performance) {
      return NextResponse.json({ 
        success: false, 
        message: 'Analytics consent required for tracking' 
      }, { status: 403 })
    }

    // Validate required fields
    if (!event || !sessionId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event name and sessionId are required' 
      }, { status: 400 })
    }

    // Get client IP and user agent for fraud detection (GDPR compliant)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = forwarded ? forwarded.split(',')[0] : realIP || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Enhanced properties with production context
    const enhancedProperties = {
      ...properties,
      session_id: sessionId,
      user_id: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      client_ip: clientIP,
      user_agent: userAgent,
      consent_analytics: consent.analytics || false,
      consent_performance: consent.performance || false,
      consent_marketing: consent.marketing || false,
      page_url: metadata.url || '',
      page_referrer: metadata.referrer || '',
      viewport_width: metadata.viewportWidth || null,
      viewport_height: metadata.viewportHeight || null,
      screen_resolution: metadata.screenResolution || null,
      device_type: metadata.deviceType || 'unknown',
      connection_type: metadata.connectionType || 'unknown',
      platform: process.env.NODE_ENV === 'production' ? 'bookedbarber.com' : 'development'
    }

    // Store in Supabase for detailed analysis (if consent given)
    let supabaseResult = null
    if (consent.analytics) {
      try {
        const supabase = createServerClient()
        supabaseResult = await supabase
          .from('metrics_events')
          .insert([{
            event_name: event,
            properties: enhancedProperties,
            user_id: userId || null,
            session_id: sessionId,
            created_at: new Date().toISOString(),
            consent_level: consent,
            is_production: process.env.NODE_ENV === 'production'
          }])
          .select()
      } catch (supabaseError) {
        console.error('Supabase metrics storage error:', supabaseError)
        // Don't fail the request if Supabase fails
      }
    }

    // Track with PostHog for real-time analytics (if consent given)
    let posthogResult = null
    if (consent.analytics && posthog) {
      try {
        posthogResult = await posthog.capture({
          distinctId: userId || sessionId,
          event: event,
          properties: enhancedProperties
        })
      } catch (posthogError) {
        console.error('PostHog tracking error:', posthogError)
        // Don't fail the request if PostHog fails
      }
    }

    // Production Metrics Specific Events - Enhanced Tracking
    await trackProductionSpecificEvents(event, enhancedProperties, consent)

    return NextResponse.json({ 
      success: true,
      tracked: {
        supabase: !!supabaseResult,
        posthog: !!posthogResult,
        production_metrics: true
      },
      consent_respected: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Metrics tracking error:', error)
    
    // Track error occurrence (without sensitive data)
    try {
      if (posthog) {
        await posthog.capture({
          distinctId: 'system',
          event: 'metrics_tracking_error',
          properties: {
            error_type: error.name,
            error_message: error.message,
            timestamp: new Date().toISOString(),
            endpoint: '/api/metrics/track'
          }
        })
      }
    } catch (errorTrackingError) {
      console.error('Error tracking error:', errorTrackingError)
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}

// Track production-specific conversion and performance metrics
async function trackProductionSpecificEvents(event, properties, consent) {
  if (!consent.analytics) return

  try {
    const supabase = createServerClient()
    
    // Conversion Funnel Tracking
    if (event === 'pricing_page_viewed') {
      await supabase.from('conversion_funnel').upsert({
        session_id: properties.session_id,
        user_id: properties.user_id === 'anonymous' ? null : properties.user_id,
        step: 'pricing_viewed',
        timestamp: new Date().toISOString(),
        properties: {
          time_on_page_start: new Date().toISOString(),
          referrer: properties.page_referrer,
          utm_source: properties.utm_source,
          utm_medium: properties.utm_medium,
          utm_campaign: properties.utm_campaign
        }
      })
    }

    if (event === 'plan_hovered') {
      await supabase.from('plan_interactions').insert({
        session_id: properties.session_id,
        user_id: properties.user_id === 'anonymous' ? null : properties.user_id,
        plan_name: properties.plan_name,
        interaction_type: 'hover',
        hover_duration: properties.hover_duration,
        timestamp: new Date().toISOString(),
        device_type: properties.device_type
      })
    }

    if (event === 'plan_clicked_without_completion') {
      await supabase.from('plan_interactions').insert({
        session_id: properties.session_id,
        user_id: properties.user_id === 'anonymous' ? null : properties.user_id,
        plan_name: properties.plan_name,
        interaction_type: 'click_no_completion',
        timestamp: new Date().toISOString(),
        abandonment_reason: properties.abandonment_reason || 'unknown',
        time_to_abandonment: properties.time_to_abandonment
      })
    }

    // OAuth Completion Tracking
    if (event === 'oauth_started') {
      await supabase.from('oauth_funnel').upsert({
        session_id: properties.session_id,
        oauth_provider: properties.provider,
        step: 'started',
        timestamp: new Date().toISOString(),
        referrer_url: properties.page_referrer
      })
    }

    if (event === 'oauth_completed') {
      await supabase.from('oauth_funnel').upsert({
        session_id: properties.session_id,
        oauth_provider: properties.provider,
        step: 'completed',
        timestamp: new Date().toISOString(),
        success: true,
        completion_time: properties.completion_time
      })
    }

    // Stripe Checkout Tracking
    if (event === 'stripe_checkout_started') {
      await supabase.from('payment_funnel').insert({
        session_id: properties.session_id,
        user_id: properties.user_id === 'anonymous' ? null : properties.user_id,
        step: 'checkout_started',
        plan_name: properties.plan_name,
        amount: properties.amount,
        currency: properties.currency || 'USD',
        timestamp: new Date().toISOString()
      })
    }

    if (event === 'stripe_checkout_abandoned') {
      await supabase.from('payment_funnel').insert({
        session_id: properties.session_id,
        user_id: properties.user_id === 'anonymous' ? null : properties.user_id,
        step: 'checkout_abandoned',
        abandonment_stage: properties.abandonment_stage,
        time_in_checkout: properties.time_in_checkout,
        timestamp: new Date().toISOString()
      })
    }

    // Page Performance Tracking
    if (event === 'page_performance') {
      await supabase.from('page_performance').insert({
        session_id: properties.session_id,
        page_url: properties.page_url,
        load_time: properties.load_time,
        first_contentful_paint: properties.first_contentful_paint,
        largest_contentful_paint: properties.largest_contentful_paint,
        cumulative_layout_shift: properties.cumulative_layout_shift,
        first_input_delay: properties.first_input_delay,
        connection_type: properties.connection_type,
        device_type: properties.device_type,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Production-specific metrics tracking error:', error)
    // Don't throw - let the main function complete
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    service: 'metrics-tracking',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      gdpr_compliance: true,
      conversion_tracking: true,
      performance_monitoring: true,
      real_time_analytics: true
    }
  })
}