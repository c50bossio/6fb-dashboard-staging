import { createClient } from '../../../../../lib/supabase'
export const dynamic = 'force-dynamic'
import { withAdminAuth, logAdminAction } from '../../../../../middleware/adminAuth'

/**
 * GET /api/admin/subscriptions/metrics
 * Returns comprehensive subscription and revenue metrics
 * Required: SUPER_ADMIN role
 */
async function getMetrics(request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
  
  try {
    const supabase = createClient()
    
    // Calculate date range based on period
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default: // 30d
        startDate.setDate(now.getDate() - 30)
    }

    // Get current subscription counts and revenue
    const { data: currentMetrics } = await supabase
      .from('users')
      .select(`
        subscription_tier,
        subscription_status,
        stripe_subscription_id,
        subscription_current_period_start,
        subscription_current_period_end,
        created_at
      `)
      .not('subscription_tier', 'is', null)

    // Calculate MRR by tier
    const tierPricing = {
      barber: 35,
      shop: 99,
      enterprise: 249
    }

    let totalMRR = 0
    let totalARR = 0
    let activeSubscriptions = 0
    let tierBreakdown = {
      barber: { count: 0, mrr: 0 },
      shop: { count: 0, mrr: 0 },
      enterprise: { count: 0, mrr: 0 }
    }
    let statusBreakdown = {
      active: 0,
      trialing: 0,
      past_due: 0,
      canceled: 0,
      inactive: 0
    }

    currentMetrics?.forEach(subscription => {
      const { subscription_tier, subscription_status } = subscription
      
      // Count status breakdown
      statusBreakdown[subscription_status] = (statusBreakdown[subscription_status] || 0) + 1
      
      // Calculate revenue for active subscriptions
      if (subscription_status === 'active' && subscription_tier in tierPricing) {
        const monthlyRevenue = tierPricing[subscription_tier]
        totalMRR += monthlyRevenue
        tierBreakdown[subscription_tier].count += 1
        tierBreakdown[subscription_tier].mrr += monthlyRevenue
        activeSubscriptions += 1
      }
    })

    totalARR = totalMRR * 12

    // Get subscription history for growth metrics
    const { data: subscriptionHistory } = await supabase
      .from('subscription_history')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Calculate growth metrics
    let newSubscriptions = 0
    let canceledSubscriptions = 0
    let dailyGrowth = {}

    subscriptionHistory?.forEach(record => {
      const date = record.created_at.split('T')[0]
      
      if (!dailyGrowth[date]) {
        dailyGrowth[date] = { new: 0, canceled: 0, net: 0 }
      }
      
      if (record.status === 'active') {
        newSubscriptions += 1
        dailyGrowth[date].new += 1
      } else if (record.status === 'canceled') {
        canceledSubscriptions += 1
        dailyGrowth[date].canceled += 1
      }
      
      dailyGrowth[date].net = dailyGrowth[date].new - dailyGrowth[date].canceled
    })

    // Calculate churn rate
    const totalSubscriptionsStart = activeSubscriptions + canceledSubscriptions - newSubscriptions
    const churnRate = totalSubscriptionsStart > 0 ? (canceledSubscriptions / totalSubscriptionsStart) * 100 : 0

    // Get recent signups
    const { data: recentSignups } = await supabase
      .from('users')
      .select('id, email, name, subscription_tier, created_at')
      .not('subscription_tier', 'is', null)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Get failed payments (payment issues)
    const { data: failedPayments } = await supabase
      .from('users')
      .select('id, email, name, subscription_tier, subscription_status, updated_at')
      .eq('subscription_status', 'past_due')
      .order('updated_at', { ascending: false })
      .limit(20)

    // Log admin action
    await logAdminAction(
      request.adminContext.userId,
      'SUBSCRIPTION_METRICS_VIEW',
      {
        period,
        totalMRR,
        activeSubscriptions
      }
    )

    return new Response(
      JSON.stringify({
        overview: {
          totalMRR: Math.round(totalMRR),
          totalARR: Math.round(totalARR),
          activeSubscriptions,
          churnRate: Math.round(churnRate * 100) / 100,
          newSubscriptions,
          canceledSubscriptions,
          netGrowth: newSubscriptions - canceledSubscriptions
        },
        tierBreakdown,
        statusBreakdown,
        growth: {
          period,
          dailyGrowth: Object.entries(dailyGrowth)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
        },
        recentSignups: recentSignups || [],
        paymentIssues: failedPayments || [],
        generatedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  } catch (error) {
    console.error('Admin subscription metrics error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch subscription metrics',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Export with admin auth wrapper
export const GET = withAdminAuth(getMetrics)