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

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user's role and permissions
    const { data: user } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build query based on permissions
    let query = supabase
      .from('marketing_campaigns')
      .select(`
        *,
        billing_account:marketing_accounts(
          id,
          account_name,
          owner_type
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter based on user role and permissions
    if (user.role === 'enterprise_owner') {
      // Can see all campaigns in enterprise
      query = query.eq('created_by', userId)
    } else if (user.role === 'shop_owner') {
      // Can see shop campaigns
      query = query.eq('created_by', userId)
    } else {
      // Barbers - only see their own
      query = query.eq('created_by', userId)
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
      scheduled_at,
      estimated_cost
    } = body

    // Validate required fields
    if (!user_id || !name || !type || !message) {
      return NextResponse.json(
        { error: 'user_id, name, type, and message are required' },
        { status: 400 }
      )
    }

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .insert([{
        created_by: user_id,
        billing_account_id,
        name,
        type,
        status: 'draft',
        audience_type: audience_type || 'all',
        audience_filters: audience_filters || {},
        subject,
        message,
        scheduled_at,
        estimated_cost: estimated_cost || 0
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

    return NextResponse.json({
      campaign,
      message: 'Campaign created successfully'
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

    if (!id || !user_id) {
      return NextResponse.json(
        { error: 'id and user_id are required' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: 'You do not have permission to edit this campaign' },
        { status: 403 }
      )
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