import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    const shopId = barbershop.id

    // Check actual data completion - data-driven approach like competitors
    const status = {
      business: {
        complete: !!(barbershop.name && barbershop.address && barbershop.phone),
        data: {
          name: barbershop.name,
          address: barbershop.address,
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

    // Add missing fields for business
    if (!barbershop.name) status.business.missing.push('Business name')
    if (!barbershop.address) status.business.missing.push('Address')  
    if (!barbershop.phone) status.business.missing.push('Phone number')

    // Check services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('shop_id', shopId)
      .eq('is_active', true)
    
    status.services.count = services?.length || 0
    status.services.complete = status.services.count > 0
    if (!status.services.complete) {
      status.services.missing.push('Add at least one service')
    }

    // Check operating hours
    const { data: hours } = await supabase
      .from('barbershop_hours')
      .select('*')
      .eq('barbershop_id', shopId)
    
    const hasValidHours = hours && hours.length > 0 && 
      hours.some(h => h.is_open && h.open_time && h.close_time)
    
    status.hours.complete = hasValidHours
    status.hours.data = hours
    if (!status.hours.complete) {
      status.hours.missing.push('Set operating hours for at least one day')
    }

    // Check staff/barbers
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, email')
      .eq('shop_id', shopId)
      .eq('is_active', true)
    
    status.staff.count = barbers?.length || 0
    status.staff.complete = status.staff.count > 0
    if (!status.staff.complete) {
      status.staff.missing.push('Add at least one barber')
    }

    // Check Stripe connection
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('account_id, onboarding_completed')
      .eq('barbershop_id', shopId)
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
      barbershop_id: shopId
    })

  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}