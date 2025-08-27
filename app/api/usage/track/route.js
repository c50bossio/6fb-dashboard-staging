import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { trackAIUsage, trackSMSUsage, trackEmailUsage } from '@/lib/usage-middleware'

export const runtime = 'nodejs'

/**
 * POST /api/usage/track
 * Universal usage tracking endpoint for the entire application
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
    const { type, quantity, metadata = {} } = await request.json()

    // Validate required fields
    if (!type || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: type, quantity' },
        { status: 400 }
      )
    }

    let result
    
    switch (type) {
      case 'ai':
      case 'ai_tokens':
        result = await trackAIUsage(userId, metadata.provider || 'unknown', quantity, metadata)
        break
        
      case 'sms':
      case 'sms_sent':
        result = await trackSMSUsage(userId, metadata.recipient, metadata.messageType || 'general', metadata)
        break
        
      case 'email':
      case 'email_sent':
        result = await trackEmailUsage(userId, metadata.recipient, metadata.emailType || 'general', metadata)
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid usage type. Must be one of: ai, sms, email` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      warnings: result.warnings || [],
      tracked: {
        userId,
        type,
        quantity,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error tracking usage:', error)
    return NextResponse.json(
      { error: 'Failed to track usage', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/usage/track
 * Get current usage status for the authenticated user
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
    
    // Import here to avoid circular dependencies
    const { checkUsageLimitsForUser } = await import('@/lib/usage-middleware')
    const warnings = await checkUsageLimitsForUser(userId)

    return NextResponse.json({
      userId,
      warnings,
      trackingEnabled: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting usage status:', error)
    return NextResponse.json(
      { error: 'Failed to get usage status', details: error.message },
      { status: 500 }
    )
  }
}