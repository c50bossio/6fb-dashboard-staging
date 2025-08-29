import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import UsageTracker from '@/lib/usage-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * GET /api/v1/billing/usage
 * Returns detailed usage history
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
    const months = parseInt(searchParams.get('months')) || 6

    // Get billing history
    const history = await UsageTracker.getBillingHistory(userId, months)

    // Get current usage for comparison
    const currentUsage = await UsageTracker.getCurrentUsage(userId)

    return NextResponse.json({
      current: currentUsage,
      history: history,
      summary: {
        totalPeriods: history.length,
        averageMonthlyUsage: {
          ai: Math.floor(history.reduce((sum, period) => sum + period.usage.ai, 0) / history.length),
          sms: Math.floor(history.reduce((sum, period) => sum + period.usage.sms, 0) / history.length),
          email: Math.floor(history.reduce((sum, period) => sum + period.usage.email, 0) / history.length)
        },
        totalCosts: {
          usage: history.reduce((sum, period) => sum + period.totalCost, 0),
          subscription: history.reduce((sum, period) => sum + period.subscriptionFee, 0),
          total: history.reduce((sum, period) => sum + period.grandTotal, 0)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching usage history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage history', details: error.message },
      { status: 500 }
    )
  }
}