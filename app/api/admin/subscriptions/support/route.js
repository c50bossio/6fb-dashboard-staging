import { createClient } from '../../../../../lib/supabase'
import { withAdminAuth, logAdminAction } from '../../../../../middleware/adminAuth'
export const runtime = 'edge'

/**
 * GET /api/admin/subscriptions/support
 * Returns support tickets related to subscriptions and billing
 * POST /api/admin/subscriptions/support
 * Creates internal support ticket or updates existing one
 * Required: SUPER_ADMIN role
 */

async function getSupportTickets(request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open'
  const priority = searchParams.get('priority') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  
  const offset = (page - 1) * limit

  try {
    const supabase = createClient()
    
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:users!support_tickets_user_id_fkey(
          id,
          email,
          name,
          subscription_tier,
          subscription_status
        )
      `)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    query = query.or('category.eq.billing,category.eq.subscription,category.eq.payment')

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: supportTickets, error } = await query

    if (error) {
      console.error('Database error fetching support tickets:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch support tickets',
          details: error.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { count: totalCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq(status !== 'all' ? 'status' : 'id', status !== 'all' ? status : 'id')
      .eq(priority ? 'priority' : 'id', priority || 'id')
      .or('category.eq.billing,category.eq.subscription,category.eq.payment')

    await logAdminAction(
      request.adminContext.userId,
      'SUPPORT_TICKETS_VIEW',
      {
        status,
        priority,
        page,
        resultsCount: supportTickets?.length || 0
      }
    )

    return new Response(
      JSON.stringify({
        supportTickets: supportTickets || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasNext: offset + limit < (totalCount || 0),
          hasPrev: page > 1
        },
        filters: {
          status,
          priority
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Admin support tickets error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function createSupportTicket(request) {
  try {
    const body = await request.json()
    const { 
      action, 
      ticketId, 
      userId, 
      subject, 
      description, 
      priority = 'medium',
      category = 'billing',
      status = 'open',
      response
    } = body

    const supabase = createClient()

    if (action === 'create') {
      if (!userId || !subject || !description) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: userId, subject, description' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject,
          description,
          priority,
          category,
          status,
          created_by_admin: true,
          admin_user_id: request.adminContext.userId,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          user:users!support_tickets_user_id_fkey(
            id,
            email,
            name,
            subscription_tier,
            subscription_status
          )
        `)
        .single()

      if (error) {
        throw error
      }

      await logAdminAction(
        request.adminContext.userId,
        'SUPPORT_TICKET_CREATE',
        {
          ticketId: ticket.id,
          targetUserId: userId,
          subject,
          category,
          priority
        }
      )

      return new Response(
        JSON.stringify({
          success: true,
          ticket,
          message: 'Support ticket created successfully'
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )

    } else if (action === 'update') {
      if (!ticketId) {
        return new Response(
          JSON.stringify({ error: 'Missing ticketId for update' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const updateData = {}
      if (status) updateData.status = status
      if (priority) updateData.priority = priority
      if (response) {
        updateData.admin_response = response
        updateData.admin_responded_at = new Date().toISOString()
        updateData.admin_user_id = request.adminContext.userId
      }
      updateData.updated_at = new Date().toISOString()

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select(`
          *,
          user:users!support_tickets_user_id_fkey(
            id,
            email,
            name,
            subscription_tier,
            subscription_status
          )
        `)
        .single()

      if (error) {
        throw error
      }

      await logAdminAction(
        request.adminContext.userId,
        'SUPPORT_TICKET_UPDATE',
        {
          ticketId,
          updates: updateData,
          hasResponse: !!response
        }
      )

      return new Response(
        JSON.stringify({
          success: true,
          ticket,
          message: 'Support ticket updated successfully'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    } else if (action === 'escalate') {
      if (!ticketId) {
        return new Response(
          JSON.stringify({ error: 'Missing ticketId for escalation' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .update({
          priority: 'high',
          status: 'escalated',
          escalated_at: new Date().toISOString(),
          admin_user_id: request.adminContext.userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error) {
        throw error
      }

      await logAdminAction(
        request.adminContext.userId,
        'SUPPORT_TICKET_ESCALATE',
        {
          ticketId,
          escalatedAt: new Date().toISOString()
        }
      )

      return new Response(
        JSON.stringify({
          success: true,
          ticket,
          message: 'Support ticket escalated successfully'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    } else {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Admin support management error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process support request',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const GET = withAdminAuth(getSupportTickets)
export const POST = withAdminAuth(createSupportTicket)