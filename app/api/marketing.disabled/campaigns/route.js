import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Fetch campaigns based on user permissions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    // First, get user's role and permissions
    const { data: user } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get custom roles/permissions
    const { data: customRoles } = await supabase
      .from('user_custom_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    // Build query based on permissions
    let query = supabase
      .from('marketing_campaigns')
      .select(`
        *,
        billing_account:marketing_accounts(
          id,
          account_name,
          owner_type,
          card_last4
        ),
        analytics:campaign_analytics(
          total_sent,
          total_delivered,
          total_opened,
          delivery_rate,
          open_rate
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter based on user role and permissions
    if (user.role === 'enterprise_owner') {
      // Can see all campaigns in enterprise
      if (user.enterprise_id) {
        const { data: shopIds } = await supabase
          .from('barbershops')
          .select('id')
          .eq('enterprise_id', user.enterprise_id)
        
        const shopIdList = shopIds?.map(s => s.id) || []
        
        query = query.or(`created_by.eq.${userId},billing_account_id.in.(${
          await getAccountIdsForShops(shopIdList)
        })`)
      }
    } else if (user.role === 'shop_owner') {
      // Can see shop campaigns and optionally personal
      const { data: shopAccounts } = await supabase
        .from('marketing_accounts')
        .select('id')
        .eq('barbershop_id', user.barbershop_id)
      
      const accountIds = shopAccounts?.map(a => a.id) || []
      query = query.or(`created_by.eq.${userId},billing_account_id.in.(${accountIds.join(',')})`)
      
    } else {
      // Barbers - only see their own unless granted permission
      if (customRoles?.can_view_shop_campaigns) {
        const { data: shopAccounts } = await supabase
          .from('marketing_accounts')
          .select('id')
          .eq('barbershop_id', user.barbershop_id)
        
        const accountIds = shopAccounts?.map(a => a.id) || []
        query = query.or(`created_by.eq.${userId},billing_account_id.in.(${accountIds.join(',')})`)
      } else {
        query = query.eq('created_by', userId)
      }
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: campaigns, error } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: error.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('marketing_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)

    return NextResponse.json({
      campaigns: campaigns || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    })

  } catch (error) {
    console.error('Error in campaigns API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new campaign
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      user_id,
      billing_account_id,
      name,
      type,
      audience_type,
      audience_filters,
      subject,
      message,
      template_id,
      scheduled_at,
      estimated_cost
    } = body

    // Verify user has access to billing account
    const hasAccess = await verifyBillingAccess(user_id, billing_account_id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to use this billing account' },
        { status: 403 }
      )
    }

    // Check if approval is needed
    const { data: billingAccount } = await supabase
      .from('marketing_accounts')
      .select('require_approval_above')
      .eq('id', billing_account_id)
      .single()

    const requiresApproval = billingAccount?.require_approval_above && 
                            estimated_cost > billingAccount.require_approval_above

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .insert([{
        created_by: user_id,
        billing_account_id,
        name,
        type,
        status: requiresApproval ? 'pending_approval' : 'draft',
        audience_type,
        audience_filters,
        subject,
        message,
        template_id,
        scheduled_at,
        estimated_cost,
        visibility: 'private'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to create campaign', details: error.message },
        { status: 500 }
      )
    }

    // Calculate audience count
    const audienceCount = await calculateAudienceCount(audience_type, audience_filters)
    
    // Update campaign with audience count
    await supabase
      .from('marketing_campaigns')
      .update({ audience_count: audienceCount })
      .eq('id', campaign.id)

    return NextResponse.json({
      campaign,
      message: requiresApproval 
        ? 'Campaign created and pending approval'
        : 'Campaign created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update campaign
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, user_id, ...updateData } = body

    // Verify user can edit this campaign
    const { data: campaign } = await supabase
      .from('marketing_campaigns')
      .select('created_by, status')
      .eq('id', id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.created_by !== user_id) {
      // Check if user has manage permissions
      const canManage = await checkManagePermission(user_id, id)
      if (!canManage) {
        return NextResponse.json(
          { error: 'You do not have permission to edit this campaign' },
          { status: 403 }
        )
      }
    }

    // Can't edit sent campaigns
    if (campaign.status === 'completed' || campaign.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot edit active or completed campaigns' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabase
      .from('marketing_campaigns')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to update campaign', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      campaign: updated,
      message: 'Campaign updated successfully'
    })

  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Cancel/delete campaign
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')

    // Verify ownership
    const { data: campaign } = await supabase
      .from('marketing_campaigns')
      .select('created_by, status')
      .eq('id', id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.created_by !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own campaigns' },
        { status: 403 }
      )
    }

    if (campaign.status === 'completed' || campaign.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active or completed campaigns' },
        { status: 400 }
      )
    }

    // Soft delete - update status to cancelled
    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json(
        { error: 'Failed to delete campaign', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Campaign cancelled successfully'
    })

  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper functions
async function verifyBillingAccess(userId, billingAccountId) {
  const { data: account } = await supabase
    .from('marketing_accounts')
    .select('owner_id, owner_type, barbershop_id, authorized_users')
    .eq('id', billingAccountId)
    .single()

  if (!account) return false

  // Check if user is owner
  if (account.owner_id === userId) return true

  // Check if user is in authorized users
  if (account.authorized_users?.includes(userId)) return true

  // Check custom permissions
  const { data: customRoles } = await supabase
    .from('user_custom_roles')
    .select('can_use_shop_billing, can_use_enterprise_billing')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (account.owner_type === 'shop' && customRoles?.can_use_shop_billing) {
    return true
  }

  if (account.owner_type === 'enterprise' && customRoles?.can_use_enterprise_billing) {
    return true
  }

  return false
}

async function calculateAudienceCount(audienceType, filters) {
  let query = supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (audienceType === 'segment' && filters?.segment) {
    // Apply segment filter
    if (filters.segment === 'vip') {
      query = query.eq('vip_status', true)
    } else if (filters.segment === 'new') {
      query = query.lte('total_visits', 1)
    } else if (filters.segment === 'lapsed') {
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      query = query.lt('last_visit_at', sixtyDaysAgo.toISOString())
    }
  }

  if (filters?.shop_id) {
    query = query.eq('shop_id', filters.shop_id)
  }

  const { count } = await query
  return count || 0
}

async function checkManagePermission(userId, campaignId) {
  const { data: user } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (user?.role === 'enterprise_owner' || user?.role === 'shop_owner') {
    return true
  }

  const { data: customRoles } = await supabase
    .from('user_custom_roles')
    .select('can_manage_shop_campaigns, can_manage_enterprise_campaigns')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  return customRoles?.can_manage_shop_campaigns || customRoles?.can_manage_enterprise_campaigns
}

async function getAccountIdsForShops(shopIds) {
  const { data: accounts } = await supabase
    .from('marketing_accounts')
    .select('id')
    .in('barbershop_id', shopIds)

  return accounts?.map(a => a.id).join(',') || ''
}