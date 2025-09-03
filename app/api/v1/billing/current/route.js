import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import UsageTracker from '@/lib/usage-tracker'

export const runtime = 'nodejs'

/**
 * GET /api/v1/billing/current
 * Returns current billing cycle data with real usage calculations
 */
export async function GET(request) {
  try {
    // Get Supabase session
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    
    // Context-aware parameters
    const context = searchParams.get('context') // 'organization', 'location', 'resource'
    const organizationId = searchParams.get('organizationId')
    
    // Get current usage and billing data (context-aware if organization level)
    let currentUsage
    if (context === 'organization' && organizationId) {
      // For organization context, aggregate usage across all organization members
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
      
      if (orgMembers?.length > 0) {
        // Get usage for all organization members (simplified for now)
        currentUsage = await UsageTracker.getCurrentUsage(userId) // Primary account holder
        // TODO: Aggregate usage across all org members when organization billing is fully implemented
      } else {
        currentUsage = await UsageTracker.getCurrentUsage(userId)
      }
    } else {
      currentUsage = await UsageTracker.getCurrentUsage(userId)
    }
    
    if (!currentUsage) {
      return NextResponse.json({ error: 'Unable to fetch billing data' }, { status: 500 })
    }

    // Format response for frontend consumption
    const response = {
      period: currentUsage.period,
      subscription: {
        tier: currentUsage.usage.ai.limit > 5000 ? 
          (currentUsage.usage.ai.limit > 20000 ? 'ENTERPRISE' : 'PROFESSIONAL') : 
          (currentUsage.usage.ai.limit > 0 ? 'INDIVIDUAL' : 'FREE'),
        status: 'active',
        nextBillingDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      },
      usage: {
        ai: {
          tokens: currentUsage.usage.ai.tokens,
          limit: currentUsage.usage.ai.limit,
          percentage: currentUsage.usage.ai.percentage,
          cost: currentUsage.usage.ai.cost
        },
        sms: {
          messages: currentUsage.usage.sms.messages,
          limit: currentUsage.usage.sms.limit,
          percentage: currentUsage.usage.sms.percentage,
          cost: currentUsage.usage.sms.cost
        },
        email: {
          sent: currentUsage.usage.email.sent,
          limit: currentUsage.usage.email.limit,
          percentage: currentUsage.usage.email.percentage,
          cost: currentUsage.usage.email.cost
        }
      },
      costs: {
        currentPeriod: currentUsage.totals.cost,
        subscriptionFee: currentUsage.totals.subscriptionFee,
        total: currentUsage.totals.cost + currentUsage.totals.subscriptionFee
      },
      alerts: await UsageTracker.checkUsageLimits(userId),
      
      // Context metadata
      context: {
        type: context || 'individual',
        scope: context === 'organization' ? 'Organization billing' : 'Individual billing'
      }
    }

    // Add organization-specific billing data if applicable
    if (context === 'organization' && organizationId) {
      response.organization = {
        id: organizationId,
        billingModel: 'enterprise', // TODO: Get from organization settings
        memberCount: 1, // TODO: Get actual member count
        totalUsage: currentUsage.totals // TODO: Aggregate across org members
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching current billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/billing/current
 * Track a usage event in real-time
 */
export async function POST(request) {
  try {
    // Get Supabase session
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { eventType, quantity, metadata = {} } = await request.json()

    // Validate required fields
    if (!eventType || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, quantity' },
        { status: 400 }
      )
    }

    // Validate event type
    const validEventTypes = ['ai_tokens', 'sms_sent', 'email_sent']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Track the usage event
    const event = await UsageTracker.trackUsage(userId, eventType, quantity, metadata)

    // Get updated usage data
    const updatedUsage = await UsageTracker.getCurrentUsage(userId)

    // Check for usage warnings
    const warnings = await UsageTracker.checkUsageLimits(userId)

    return NextResponse.json({
      success: true,
      event,
      usage: updatedUsage,
      warnings
    })

  } catch (error) {
    console.error('Error tracking usage event:', error)
    return NextResponse.json(
      { error: 'Failed to track usage event', details: error.message },
      { status: 500 }
    )
  }
}