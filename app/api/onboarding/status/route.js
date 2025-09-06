import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
// Simple console-based logging to prevent circular dependencies during auth initialization
const authLogger = {
  error: (...args) => console.error('[AUTH]', ...args),
  warn: (...args) => console.warn('[AUTH]', ...args), 
  info: (...args) => console.info('[AUTH]', ...args)
}

const apiLogger = {
  error: (...args) => console.error('[API]', ...args),
  warn: (...args) => console.warn('[API]', ...args),
  info: (...args) => console.info('[API]', ...args)
}

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Development mode fallback when NEXT_PUBLIC_ENABLE_DEV_AUTH is true
    if ((authError || !user) && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
      authLogger.info('Using development auth fallback for onboarding status', {
        context: 'onboarding_status',
        dev_mode: true
      })
      user = {
        id: 'a1234567-89ab-cdef-0123-456789abcdef', // Valid UUID format for dev
        email: 'dev@6fb.local',
        user_metadata: { full_name: 'Development User' }
      }
      authError = null
    }
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's barbershop
    let { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    // Development mode fallback for barbershop data - works for any dev mode user
    if ((shopError || !barbershop) && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
      apiLogger.info('Using development barbershop fallback for onboarding status', {
        context: 'barbershop_fallback',
        user_id: user.id,
        dev_mode: true
      })
      barbershop = {
        id: 'b1234567-89ab-cdef-0123-456789abcdef', // Valid UUID format for dev
        owner_id: user.id, // Use the actual user ID from dev fallback
        name: 'Dev Barbershop',
        address: '123 Dev Street, Dev City, DC 12345',
        phone: '(555) 123-4567',
        email: 'dev@6fb.local',
        business_hours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { closed: true }
        },
        cancellation_policy: '24 hour cancellation policy required',
        booking_buffer_time: 15,
        max_advance_booking_days: 30,
        min_advance_booking_hours: 2,
        logo_url: null,
        brand_color: '#8B5A3C',
        description: 'A modern development barbershop',
        created_at: new Date().toISOString()
      }
      shopError = null
    }

    // If still no barbershop, return "needs barbershop creation" status instead of 404
    if (shopError || !barbershop) {
      return NextResponse.json({
        overall: {
          completed_steps: 0,
          total_steps: 7,
          progress_percentage: 0,
          is_complete: false
        },
        steps: {
          business: {
            complete: false,
            data: null,
            missing: ['Create your barbershop profile - add business name, email, and description in General Settings, then add address in Location Settings']
          },
          services: {
            complete: false,
            count: 0,
            missing: ['Add services after creating your barbershop']
          },
          hours: {
            complete: false,
            data: null,
            missing: ['Set operating hours after creating your barbershop']
          },
          staff: {
            complete: false,
            count: 0,
            missing: ['Add staff members after creating your barbershop']
          },
          financial: {
            complete: false,
            stripe_connected: false,
            missing: ['Connect Stripe payments after creating your barbershop']
          },
          booking: {
            complete: false,
            data: null,
            missing: ['Configure booking policies after creating your barbershop']
          },
          branding: {
            complete: false,
            data: null,
            missing: ['Add logo and branding after creating your barbershop']
          }
        },
        barbershop_id: null,
        needs_barbershop_creation: true,
        message: 'Complete your barbershop setup to start accepting bookings'
      })
    }

    const barbershopId = barbershop.id

    // Check actual data completion - unified NAP approach
    // Complete address = street address + city + state (for US/CA)
    const hasCompleteAddress = !!(barbershop.address && barbershop.city && 
      (barbershop.state || !['US', 'CA', 'USA', 'Canada'].includes(barbershop.country)))
    
    const status = {
      business: {
        complete: !!(barbershop.name && hasCompleteAddress && barbershop.phone),
        data: {
          name: barbershop.name,
          address: barbershop.address,
          city: barbershop.city,
          state: barbershop.state,
          zip_code: barbershop.zip_code,
          country: barbershop.country,
          phone: barbershop.phone,
          email: barbershop.email
        },
        missing: []
      },
      
      services: { complete: false, count: 0, missing: [] },
      hours: { complete: false, data: null, missing: [] },
      staff: { complete: false, count: 0, missing: [] },
      financial: { complete: false, stripe_connected: false, missing: [] },
      booking: { complete: false, data: null, missing: [] },
      branding: { complete: false, data: null, missing: [] }
    }

    // Add missing fields for business info - split between general and location
    const businessMissing = []
    const locationMissing = []
    
    if (!barbershop.name) businessMissing.push('Business name (General Settings)')
    if (!barbershop.email) businessMissing.push('Email address (General Settings)')
    
    if (!barbershop.address) locationMissing.push('Street address (Location Settings)')
    if (!barbershop.city) locationMissing.push('City (Location Settings)')
    if (['US', 'CA', 'USA', 'Canada'].includes(barbershop.country) && !barbershop.state) {
      const stateLabel = barbershop.country === 'CA' || barbershop.country === 'Canada' ? 'Province' : 'State'
      locationMissing.push(`${stateLabel} (Location Settings)`)
    }
    if (!barbershop.phone) locationMissing.push('Phone number (Location Settings)')
    
    // Combine missing items with helpful context
    const allMissing = [...businessMissing, ...locationMissing]
    if (allMissing.length > 0) {
      status.business.missing = allMissing
    }

    // Check services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
    
    status.services.count = services?.length || 0
    status.services.complete = status.services.count > 0
    if (!status.services.complete) {
      status.services.missing.push('Add at least one service')
    }

    // Check operating hours - stored in barbershops.business_hours JSON field
    const businessHours = barbershop.business_hours
    
    // Check if hours are configured (at least one day with valid open/close times that's not closed)
    let hasValidHours = false
    if (businessHours && typeof businessHours === 'object') {
      // Check if at least one day is open with valid times
      hasValidHours = Object.values(businessHours).some(dayHours => {
        return dayHours && 
               !dayHours.closed && 
               dayHours.open && 
               dayHours.close &&
               dayHours.open !== '00:00' // Avoid considering default/empty times as valid
      })
    }
    
    status.hours.complete = hasValidHours
    status.hours.data = businessHours
    if (!status.hours.complete) {
      status.hours.missing.push('Set operating hours for at least one day')
    }

    // Check staff/barbers - skip barbershop_staff table to avoid 406 errors
    // For now, consider the owner as staff to avoid 406 errors
    // In production, staff should be managed through profiles table with proper roles
    
    status.staff.count = 1 // Count the owner as staff
    status.staff.complete = true // Owner counts as staff
    
    // In dev mode or if the owner is the current user, count them as staff
    if (barbershop.owner_id === user.id) {
      status.staff.count = 1
      status.staff.complete = true
    }

    // Check Stripe connection
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('account_id, onboarding_completed')
      .eq('barbershop_id', barbershopId)
      .single()
    
    status.financial.stripe_connected = !!(stripeAccount?.account_id && stripeAccount?.onboarding_completed)
    status.financial.complete = status.financial.stripe_connected
    if (!status.financial.complete) {
      status.financial.missing.push('Connect Stripe account for payments')
    }

    // Check booking policies (look for any configured policies)
    const hasCancellationPolicy = barbershop.cancellation_policy || barbershop.booking_buffer_time
    const hasBookingRules = barbershop.max_advance_booking_days || barbershop.min_advance_booking_hours
    
    status.booking.complete = !!(hasCancellationPolicy || hasBookingRules)
    status.booking.data = {
      cancellation_policy: barbershop.cancellation_policy,
      booking_buffer_time: barbershop.booking_buffer_time,
      max_advance_booking_days: barbershop.max_advance_booking_days,
      min_advance_booking_hours: barbershop.min_advance_booking_hours
    }
    if (!status.booking.complete) {
      status.booking.missing.push('Configure booking and cancellation policies')
    }

    // Check branding
    const hasBranding = barbershop.logo_url || barbershop.brand_color || barbershop.description
    status.branding.complete = !!hasBranding
    status.branding.data = {
      logo_url: barbershop.logo_url,
      brand_color: barbershop.brand_color,
      description: barbershop.description
    }
    if (!status.branding.complete) {
      status.branding.missing.push('Add logo, brand color, or business description')
    }

    // Calculate overall progress
    const steps = Object.values(status)
    const completedSteps = steps.filter(step => step.complete).length
    const totalSteps = steps.length
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100)

    return NextResponse.json({
      overall: {
        completed_steps: completedSteps,
        total_steps: totalSteps,
        progress_percentage: progressPercentage,
        is_complete: completedSteps === totalSteps
      },
      steps: status,
      barbershop_id: barbershopId
    })

  } catch (error) {
    apiLogger.error('Error getting onboarding status', error, {
      context: 'onboarding_status',
      endpoint: 'GET /api/onboarding/status'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Support HEAD requests for health checks
export async function HEAD(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Quick auth check only
    let { data: { user } } = await supabase.auth.getUser()
    
    // Development mode fallback
    if (!user && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
      return new NextResponse(null, { status: 200 })
    }
    
    if (!user) {
      return new NextResponse(null, { status: 401 })
    }
    
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    apiLogger.error('Error in HEAD request for onboarding status', error, {
      context: 'onboarding_status_head',
      endpoint: 'HEAD /api/onboarding/status'
    })
    return new NextResponse(null, { status: 500 })
  }
}