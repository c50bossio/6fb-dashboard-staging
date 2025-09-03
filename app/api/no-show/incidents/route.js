import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/no-show/incidents
 * Fetch no-show incidents for the barbershop
 * Optional query params:
 * - client_id: Filter by specific client
 * - start_date: Filter by date range start
 * - end_date: Filter by date range end
 * - status: Filter by fee_status (pending, charged, waived, failed)
 * - resolution_type: Filter by resolution (unresolved, fee_paid, waived, disputed)
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const feeStatus = searchParams.get('status')
    const resolutionType = searchParams.get('resolution_type')
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('no_show_incidents')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email,
          phone
        ),
        barber:profiles!barber_id(
          id,
          full_name,
          email
        ),
        appointment:appointments(
          id,
          scheduled_at,
          service_id
        )
      `)
      .eq('barbershop_id', profile.barbershop_id)
      .order('incident_date', { ascending: false })
      .order('incident_time', { ascending: false })
    
    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    if (startDate) {
      query = query.gte('incident_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('incident_date', endDate)
    }
    
    if (feeStatus) {
      query = query.eq('fee_status', feeStatus)
    }
    
    if (resolutionType) {
      query = query.eq('resolution_type', resolutionType)
    }
    
    const { data: incidents, error: incidentsError } = await query
    
    if (incidentsError) throw incidentsError

    // Calculate summary statistics
    const summary = {
      total_incidents: incidents.length,
      grace_period_applied: incidents.filter(i => i.grace_period_applied).length,
      fees_charged: incidents.filter(i => i.fee_charged).length,
      total_fee_amount: incidents.reduce((sum, i) => sum + (i.fee_amount || 0), 0),
      pending_fees: incidents.filter(i => i.fee_status === 'pending').length,
      charged_fees: incidents.filter(i => i.fee_status === 'charged').length,
      waived_fees: incidents.filter(i => i.fee_status === 'waived').length,
      unresolved: incidents.filter(i => i.resolution_type === 'unresolved').length
    }

    return NextResponse.json({
      incidents,
      summary
    })
    
  } catch (error) {
    console.error('Error fetching no-show incidents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch no-show incidents' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/no-show/incidents/[id]
 * Update a no-show incident (resolve, waive fee, etc.)
 */
export async function PUT(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      incident_id,
      resolution_type, // 'fee_paid', 'waived', 'disputed'
      resolution_notes,
      fee_status, // 'charged', 'waived', 'failed'
      fee_charged_at,
      fee_transaction_id
    } = await request.json()
    
    if (!incident_id) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 })
    }
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization - only managers and owners can update incidents
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify incident belongs to this barbershop
    const { data: incident, error: incidentError } = await supabase
      .from('no_show_incidents')
      .select('*')
      .eq('id', incident_id)
      .eq('barbershop_id', profile.barbershop_id)
      .single()
    
    if (incidentError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    }
    
    if (resolution_type) {
      updateData.resolution_type = resolution_type
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = user.id
    }
    
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes
    }
    
    if (fee_status) {
      updateData.fee_status = fee_status
      
      // If waiving fee, update fee_charged to false
      if (fee_status === 'waived') {
        updateData.fee_charged = false
        updateData.fee_amount = 0
      }
    }
    
    if (fee_charged_at) {
      updateData.fee_charged_at = fee_charged_at
    }
    
    if (fee_transaction_id) {
      updateData.fee_transaction_id = fee_transaction_id
    }

    // Update the incident
    const { data: updatedIncident, error: updateError } = await supabase
      .from('no_show_incidents')
      .update(updateData)
      .eq('id', incident_id)
      .select()
      .single()
    
    if (updateError) throw updateError

    // If fee was waived, update strike history to reduce outstanding balance
    if (fee_status === 'waived' && incident.fee_amount > 0) {
      const { error: balanceError } = await supabase
        .from('client_strike_history')
        .update({
          outstanding_balance: supabase.sql`outstanding_balance - ${incident.fee_amount}`,
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', profile.barbershop_id)
        .eq('client_id', incident.client_id)
      
      if (balanceError) {
        console.error('Error updating outstanding balance:', balanceError)
        // Don't fail the operation if balance update fails
      }
    }

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'update_no_show_incident',
        details: {
          barbershop_id: profile.barbershop_id,
          incident_id,
          resolution_type,
          fee_status,
          previous_status: incident.resolution_type
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      incident: updatedIncident,
      message: 'Incident updated successfully' 
    })
    
  } catch (error) {
    console.error('Error updating no-show incident:', error)
    return NextResponse.json(
      { error: 'Failed to update no-show incident' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/no-show/incidents/[id]
 * Delete a no-show incident (soft delete or reverse)
 */
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('id')
    
    if (!incidentId) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 })
    }
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization - only owners can delete incidents
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify incident belongs to this barbershop
    const { data: incident, error: incidentError } = await supabase
      .from('no_show_incidents')
      .select('*')
      .eq('id', incidentId)
      .eq('barbershop_id', profile.barbershop_id)
      .single()
    
    if (incidentError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    // If incident counted as a strike, reverse it
    if (incident.strike_counted) {
      const { error: strikeError } = await supabase
        .from('client_strike_history')
        .update({
          active_strikes: supabase.sql`GREATEST(0, active_strikes - 1)`,
          total_strikes: supabase.sql`GREATEST(0, total_strikes - 1)`,
          outstanding_balance: supabase.sql`GREATEST(0, outstanding_balance - ${incident.fee_amount || 0})`,
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', profile.barbershop_id)
        .eq('client_id', incident.client_id)
      
      if (strikeError) {
        console.error('Error reversing strike:', strikeError)
        // Don't fail the operation if strike reversal fails
      }
    }

    // Delete the incident
    const { error: deleteError } = await supabase
      .from('no_show_incidents')
      .delete()
      .eq('id', incidentId)
    
    if (deleteError) throw deleteError

    // Delete any associated fee transactions
    await supabase
      .from('no_show_fee_transactions')
      .delete()
      .eq('incident_id', incidentId)

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'delete_no_show_incident',
        details: {
          barbershop_id: profile.barbershop_id,
          incident_id: incidentId,
          client_id: incident.client_id,
          strike_counted: incident.strike_counted,
          fee_amount: incident.fee_amount
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      message: 'No-show incident deleted and strike reversed successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting no-show incident:', error)
    return NextResponse.json(
      { error: 'Failed to delete no-show incident' },
      { status: 500 }
    )
  }
}