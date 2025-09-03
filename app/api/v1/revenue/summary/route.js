import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenant } from '@/lib/tenant-resolver-client'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    
    // Context-aware parameters
    const context = searchParams.get('context') // 'organization', 'location', 'resource'
    const organizationId = searchParams.get('organizationId')
    const locationId = searchParams.get('locationId') || searchParams.get('barbershopId')
    const resourceId = searchParams.get('resourceId')

    // Legacy parameter support
    const barbershopId = searchParams.get('barbershopId')

    // Determine query scope based on context
    let queryScope = null
    let resolvedBarbershopId = barbershopId || locationId

    if (context === 'organization' && organizationId) {
      // Organization-level: aggregate all locations
      const { data: orgLocations } = await supabase
        .from('barbershops')
        .select('id')
        .eq('organization_id', organizationId)
      
      if (!orgLocations?.length) {
        return NextResponse.json({ error: 'No locations found for organization' }, { status: 404 })
      }
      
      queryScope = {
        type: 'organization',
        locationIds: orgLocations.map(loc => loc.id),
        organizationId
      }
    } else if (context === 'resource' && resourceId) {
      // Resource-level: specific barber/staff member
      const { data: staffRecord } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', resourceId)
        .single()
      
      if (!staffRecord) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
      }
      
      queryScope = {
        type: 'resource',
        barbershopId: staffRecord.barbershop_id,
        resourceId
      }
      resolvedBarbershopId = staffRecord.barbershop_id
    } else {
      // Location-level (default) or legacy support
      if (!resolvedBarbershopId) {
        const tenant = await getTenant(session.user.id, { supabase })
        resolvedBarbershopId = tenant.barbershopId
      }
      
      if (!resolvedBarbershopId) {
        return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
      }
      
      queryScope = {
        type: 'location',
        barbershopId: resolvedBarbershopId
      }
    }

    // Get revenue data for different time periods
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Build context-aware queries
    const buildPaymentQuery = (baseQuery, dateFilter) => {
      let query = baseQuery.select('amount, payment_method, status, barbershop_id, barber_id')
        .eq('status', 'completed')
      
      if (dateFilter.gte) query = query.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) query = query.lte('created_at', dateFilter.lte)
      
      if (queryScope.type === 'organization') {
        // Organization: include all locations
        query = query.in('barbershop_id', queryScope.locationIds)
      } else if (queryScope.type === 'resource') {
        // Resource: filter by specific barber
        query = query.eq('barbershop_id', queryScope.barbershopId)
          .eq('barber_id', queryScope.resourceId)
      } else {
        // Location: single barbershop
        query = query.eq('barbershop_id', queryScope.barbershopId)
      }
      
      return query
    }

    // Fetch revenue data with context awareness
    const [
      { data: todayPayments },
      { data: weekPayments },
      { data: monthPayments },
      { data: lastMonthPayments }
    ] = await Promise.all([
      buildPaymentQuery(supabase.from('payments'), { gte: today.toISOString() }),
      buildPaymentQuery(supabase.from('payments'), { gte: weekStart.toISOString() }),
      buildPaymentQuery(supabase.from('payments'), { gte: monthStart.toISOString() }),
      buildPaymentQuery(supabase.from('payments'), { 
        gte: lastMonthStart.toISOString(), 
        lte: lastMonthEnd.toISOString() 
      })
    ])

    // Check Stripe Connect status based on context
    let stripeAccount = null
    if (queryScope.type === 'organization') {
      // Organization: check if any location has Stripe connected
      const { data: stripeAccounts } = await supabase
        .from('stripe_accounts')
        .select('account_id, onboarding_completed, charges_enabled, barbershop_id')
        .in('barbershop_id', queryScope.locationIds)
      
      const connectedAccounts = stripeAccounts?.filter(acc => 
        acc.onboarding_completed && acc.charges_enabled
      ) || []
      
      stripeAccount = {
        account_id: connectedAccounts.length > 0 ? 'multiple' : null,
        onboarding_completed: connectedAccounts.length > 0,
        charges_enabled: connectedAccounts.length > 0,
        connectedLocations: connectedAccounts.length,
        totalLocations: queryScope.locationIds.length
      }
    } else {
      // Location or Resource: single barbershop
      const { data: singleAccount } = await supabase
        .from('stripe_accounts')
        .select('account_id, onboarding_completed, charges_enabled')
        .eq('barbershop_id', queryScope.barbershopId)
        .single()
      
      stripeAccount = singleAccount
    }

    // Calculate totals
    const dailyRevenue = todayPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    const weeklyRevenue = weekPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    const monthlyRevenue = monthPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    const lastMonthRevenue = lastMonthPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

    // Calculate growth percentages
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100) 
      : 0

    // Payment method breakdown
    const paymentMethods = weekPayments?.reduce((acc, payment) => {
      const method = payment.payment_method || 'card'
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {}) || {}

    // Enhance response with context metadata
    const response = {
      // Core metrics
      connected: stripeAccount?.onboarding_completed && stripeAccount?.charges_enabled,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      growth: {
        monthly: monthlyGrowth
      },
      paymentMethods,
      totalTransactions: weekPayments?.length || 0,
      stripeAccountId: stripeAccount?.account_id || null,
      
      // Context metadata
      context: {
        type: queryScope.type,
        scope: queryScope.type === 'organization' 
          ? `${queryScope.locationIds.length} locations`
          : queryScope.type === 'resource' 
            ? 'Individual barber'
            : 'Single location'
      }
    }

    // Add organization-specific data
    if (queryScope.type === 'organization') {
      response.locations = {
        total: stripeAccount?.totalLocations || 0,
        connected: stripeAccount?.connectedLocations || 0,
        revenue: queryScope.locationIds.map(locationId => {
          const locationPayments = weekPayments?.filter(p => p.barbershop_id === locationId) || []
          const locationRevenue = locationPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
          return {
            locationId,
            weeklyRevenue: locationRevenue,
            transactionCount: locationPayments.length
          }
        }).sort((a, b) => b.weeklyRevenue - a.weeklyRevenue)
      }
    }

    // Add resource-specific data
    if (queryScope.type === 'resource') {
      response.barber = {
        resourceId: queryScope.resourceId,
        barbershopId: queryScope.barbershopId,
        personalShare: {
          daily: dailyRevenue,
          weekly: weeklyRevenue,
          monthly: monthlyRevenue
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Revenue summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' }, 
      { status: 500 }
    )
  }
}