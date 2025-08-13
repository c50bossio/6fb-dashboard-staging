import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'
import { withAdminAuth, logAdminAction } from '../../../../../middleware/adminAuth'

/**
 * GET /api/admin/subscriptions/list
 * Returns paginated list of all subscriptions with search/filter capabilities
 * Required: SUPER_ADMIN role
 */
async function getSubscriptions(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
  const search = searchParams.get('search') || ''
  const tier = searchParams.get('tier') || ''
  const status = searchParams.get('status') || ''
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  
  const offset = (page - 1) * limit

  try {
    const supabase = createClient()
    
    // Build base query
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        subscription_tier,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_current_period_start,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        payment_method_last4,
        payment_method_brand,
        sms_credits_included,
        sms_credits_used,
        email_credits_included,
        email_credits_used,
        ai_tokens_included,
        ai_tokens_used,
        staff_limit,
        current_staff_count,
        created_at,
        updated_at
      `)
      
    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }
    
    // Apply tier filter
    if (tier) {
      query = query.eq('subscription_tier', tier.toLowerCase())
    }
    
    // Apply status filter
    if (status) {
      query = query.eq('subscription_status', status.toLowerCase())
    }
    
    // Apply sorting
    const validSortColumns = ['created_at', 'updated_at', 'email', 'name', 'subscription_tier', 'subscription_status']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })
    
    // Get total count before pagination
    const { count: totalCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    
    const { data: subscriptions, error } = await query
    
    if (error) throw error
    
    // Get summary statistics
    const { data: stats } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .in('subscription_status', ['active', 'trialing', 'past_due'])
    
    const summary = {
      total: totalCount || 0,
      active: stats?.filter(s => s.subscription_status === 'active').length || 0,
      trialing: stats?.filter(s => s.subscription_status === 'trialing').length || 0,
      past_due: stats?.filter(s => s.subscription_status === 'past_due').length || 0,
      individual: stats?.filter(s => s.subscription_tier === 'individual').length || 0,
      shop: stats?.filter(s => s.subscription_tier === 'shop').length || 0,
      enterprise: stats?.filter(s => s.subscription_tier === 'enterprise').length || 0
    }
    
    // Log admin action
    await logAdminAction(request, 'view_subscriptions', {
      page,
      limit,
      search,
      tier,
      status
    })
    
    return NextResponse.json({
      success: true,
      data: {
        subscriptions: subscriptions || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasMore: offset + limit < (totalCount || 0)
        },
        summary
      }
    })
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch subscriptions',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Export with admin auth wrapper
export const GET = withAdminAuth(getSubscriptions)