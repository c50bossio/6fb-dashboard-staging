import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/no-show/strikes
 * Fetch client strike history for the barbershop
 * Optional query params:
 * - client_id: Filter by specific client
 * - is_blocked: Filter by blocked status
 * - min_strikes: Filter by minimum strike count
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
    const isBlocked = searchParams.get('is_blocked')
    const minStrikes = searchParams.get('min_strikes')
    
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
      .from('client_strike_history')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email,
          phone,
          created_at
        )
      `)
      .eq('barbershop_id', profile.barbershop_id)
      .order('active_strikes', { ascending: false })
    
    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    if (isBlocked !== null) {
      query = query.eq('is_blocked', isBlocked === 'true')
    }
    
    if (minStrikes) {
      query = query.gte('active_strikes', parseInt(minStrikes))
    }
    
    const { data: strikes, error: strikesError } = await query
    
    if (strikesError) throw strikesError

    // Get recent incidents for each client
    const clientIds = strikes.map(s => s.client_id)
    const { data: recentIncidents } = await supabase
      .from('no_show_incidents')
      .select('*')
      .eq('barbershop_id', profile.barbershop_id)
      .in('client_id', clientIds)
      .order('incident_date', { ascending: false })
      .limit(100)
    
    // Group incidents by client
    const incidentsByClient = {}
    recentIncidents?.forEach(incident => {
      if (!incidentsByClient[incident.client_id]) {
        incidentsByClient[incident.client_id] = []
      }
      incidentsByClient[incident.client_id].push(incident)
    })
    
    // Combine data
    const strikesWithIncidents = strikes.map(strike => ({
      ...strike,
      recent_incidents: incidentsByClient[strike.client_id] || []
    }))

    return NextResponse.json({
      strikes: strikesWithIncidents,
      summary: {
        total_clients: strikes.length,
        blocked_clients: strikes.filter(s => s.is_blocked).length,
        high_risk_clients: strikes.filter(s => s.risk_score > 0.7).length,
        total_outstanding_fees: strikes.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0)
      }
    })
    
  } catch (error) {
    console.error('Error fetching strike history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch strike history' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/no-show/strikes
 * Record a new no-show incident and update strikes
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { 
      client_id,
      appointment_id,
      service_name,
      service_price,
      incident_date,
      incident_time,
      arrived_minutes_late,
      fee_amount
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Get policy settings
    const { data: policy } = await supabase
      .from('no_show_policies')
      .select('*')
      .eq('barbershop_id', profile.barbershop_id)
      .eq('is_active', true)
      .single()
    
    const effectivePolicy = policy || {
      strikes_before_block: 3,
      strike_expiry_days: 90,
      no_show_fee_enabled: true,
      no_show_fee_amount: 25.00,
      grace_period_enabled: true,
      default_grace_minutes: 15
    }

    // Check if within grace period
    const withinGracePeriod = arrived_minutes_late && 
      arrived_minutes_late <= effectivePolicy.default_grace_minutes

    // Begin transaction
    const barbershopId = profile.barbershop_id
    
    // 1. Create no-show incident
    const { data: incident, error: incidentError } = await supabase
      .from('no_show_incidents')
      .insert({
        barbershop_id: barbershopId,
        client_id,
        appointment_id,
        barber_id: user.id,
        incident_date: incident_date || new Date().toISOString().split('T')[0],
        incident_time: incident_time || new Date().toTimeString().split(' ')[0],
        service_name,
        service_price,
        arrived_minutes_late,
        marked_as_late: withinGracePeriod,
        grace_period_applied: withinGracePeriod,
        fee_charged: !withinGracePeriod && effectivePolicy.no_show_fee_enabled,
        fee_amount: !withinGracePeriod ? (fee_amount || effectivePolicy.no_show_fee_amount) : 0,
        fee_status: !withinGracePeriod && effectivePolicy.no_show_fee_enabled ? 'pending' : null,
        strike_counted: !withinGracePeriod,
        resolution_type: withinGracePeriod ? 'waived' : 'unresolved'
      })
      .select()
      .single()
    
    if (incidentError) throw incidentError

    // 2. Update or create strike history (only if not within grace period)
    if (!withinGracePeriod) {
      // Get current strike history
      const { data: currentHistory } = await supabase
        .from('client_strike_history')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('client_id', client_id)
        .single()
      
      if (currentHistory) {
        // Calculate active strikes (non-expired)
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() - effectivePolicy.strike_expiry_days)
        
        // Update existing history
        const newActiveStrikes = currentHistory.active_strikes + 1
        const newTotalStrikes = currentHistory.total_strikes + 1
        const shouldBlock = newActiveStrikes >= effectivePolicy.strikes_before_block
        
        const { error: updateError } = await supabase
          .from('client_strike_history')
          .update({
            total_strikes: newTotalStrikes,
            active_strikes: newActiveStrikes,
            last_strike_date: new Date().toISOString(),
            is_blocked: shouldBlock || currentHistory.is_blocked,
            blocked_at: shouldBlock && !currentHistory.is_blocked ? new Date().toISOString() : currentHistory.blocked_at,
            blocked_reason: shouldBlock && !currentHistory.is_blocked ? 
              `Exceeded maximum allowed no-shows (${newActiveStrikes} strikes)` : currentHistory.blocked_reason,
            outstanding_balance: currentHistory.outstanding_balance + (fee_amount || effectivePolicy.no_show_fee_amount),
            risk_score: Math.min(1, newActiveStrikes * 0.25), // Simple risk calculation
            updated_at: new Date().toISOString()
          })
          .eq('id', currentHistory.id)
        
        if (updateError) throw updateError
        
        // Update incident with strike number
        await supabase
          .from('no_show_incidents')
          .update({ strike_number: newActiveStrikes })
          .eq('id', incident.id)
        
        // If auto-blocked, create blocked client record
        if (shouldBlock && !currentHistory.is_blocked) {
          await supabase
            .from('blocked_clients')
            .insert({
              barbershop_id: barbershopId,
              client_id,
              block_reason: `Exceeded maximum allowed no-shows (${newActiveStrikes} strikes)`,
              strike_count_at_block: newActiveStrikes,
              requires_fee_payment: true,
              required_fee_amount: effectivePolicy.recovery_fee_amount || 50.00,
              requires_deposit: effectivePolicy.recovery_requires_deposit,
              required_deposit_amount: effectivePolicy.recovery_deposit_amount || 100.00,
              blocked_by: user.id
            })
        }
      } else {
        // Create new strike history
        const { error: createError } = await supabase
          .from('client_strike_history')
          .insert({
            barbershop_id: barbershopId,
            client_id,
            total_strikes: 1,
            active_strikes: 1,
            last_strike_date: new Date().toISOString(),
            is_blocked: false,
            outstanding_balance: fee_amount || effectivePolicy.no_show_fee_amount,
            risk_score: 0.25,
            client_segment: 'regular'
          })
        
        if (createError) throw createError
        
        // Update incident with strike number
        await supabase
          .from('no_show_incidents')
          .update({ strike_number: 1 })
          .eq('id', incident.id)
      }
    }

    // 3. Create fee transaction if applicable
    if (!withinGracePeriod && effectivePolicy.no_show_fee_enabled) {
      await supabase
        .from('no_show_fee_transactions')
        .insert({
          barbershop_id: barbershopId,
          client_id,
          incident_id: incident.id,
          transaction_type: 'charge',
          amount: fee_amount || effectivePolicy.no_show_fee_amount,
          payment_status: 'pending',
          description: `No-show fee for ${service_name} on ${incident_date}`,
          initiated_by: user.id
        })
    }

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'record_no_show',
        details: {
          barbershop_id: barbershopId,
          client_id,
          appointment_id,
          within_grace_period: withinGracePeriod,
          strike_counted: !withinGracePeriod
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      incident,
      within_grace_period: withinGracePeriod,
      message: withinGracePeriod ? 
        'Late arrival recorded (within grace period)' : 
        'No-show incident recorded successfully' 
    })
    
  } catch (error) {
    console.error('Error recording no-show incident:', error)
    return NextResponse.json(
      { error: 'Failed to record no-show incident' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/no-show/strikes
 * Update strike history (reset strikes, adjust risk score, etc.)
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
      client_id,
      action, // 'reset_strikes', 'reduce_strikes', 'adjust_risk', 'unblock'
      strike_reduction_amount, // for 'reduce_strikes' action
      reason
    } = await request.json()
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barbershopId = profile.barbershop_id
    
    switch (action) {
      case 'reset_strikes':
        // Reset strikes for the client
        const { data: resetResult, error: resetError } = await supabase
          .from('client_strike_history')
          .update({
            active_strikes: 0,
            last_strike_date: null,
            is_blocked: false,
            blocked_at: null,
            blocked_reason: null,
            block_lifted_at: new Date().toISOString(),
            risk_score: 0,
            notes: `Strikes reset by ${user.email}: ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('client_id', client_id)
          .select()
        
        if (resetError) {
          console.error('Error resetting strike history:', resetError)
          return NextResponse.json({ 
            error: 'Failed to reset strike history',
            details: resetError.message 
          }, { status: 500 })
        }
        
        if (!resetResult || resetResult.length === 0) {
          console.error('No records updated for strike reset')
          return NextResponse.json({ 
            error: 'No client strike history found to reset' 
          }, { status: 404 })
        }
        
        // Remove from blocked clients
        const { error: resetUnblockError } = await supabase
          .from('blocked_clients')
          .update({
            blocked_until: new Date().toISOString(),
            unblocked_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('client_id', client_id)
        
        if (resetUnblockError) {
          console.error('Error unblocking client during reset:', resetUnblockError)
          // Don't fail the operation if unblocking fails
        }
        
        break
      
      case 'reduce_strikes':
        // Validate reduction amount
        if (!strike_reduction_amount || strike_reduction_amount < 1) {
          return NextResponse.json({ error: 'Invalid strike reduction amount' }, { status: 400 })
        }
        
        // Get current strike count - if no record exists, create one with zero strikes
        let { data: currentHistory, error: historyError } = await supabase
          .from('client_strike_history')
          .select('active_strikes, total_strikes, notes, is_blocked, blocked_at, blocked_reason, last_strike_date')
          .eq('barbershop_id', barbershopId)
          .eq('client_id', client_id)
          .single()
        
        // If no history record exists, create one with zero strikes
        if (historyError && historyError.code === 'PGRST116') {
          const { data: newHistory, error: createError } = await supabase
            .from('client_strike_history')
            .insert({
              barbershop_id: barbershopId,
              client_id: client_id,
              total_strikes: 0,
              active_strikes: 0,
              is_blocked: false,
              outstanding_balance: 0,
              risk_score: 0,
              client_segment: 'regular'
            })
            .select('active_strikes, total_strikes, notes, is_blocked, blocked_at, blocked_reason, last_strike_date')
            .single()
          
          if (createError) {
            console.error('Error creating strike history:', createError)
            return NextResponse.json({ error: 'Failed to create client strike history' }, { status: 500 })
          }
          
          currentHistory = newHistory
        } else if (historyError || !currentHistory) {
          console.error('Error fetching strike history:', historyError)
          return NextResponse.json({ error: 'Failed to fetch client strike history' }, { status: 500 })
        }
        
        // Validate reduction amount doesn't exceed current strikes
        if (strike_reduction_amount > currentHistory.active_strikes) {
          return NextResponse.json({ 
            error: `Cannot reduce ${strike_reduction_amount} strikes. Client only has ${currentHistory.active_strikes} active strikes.` 
          }, { status: 400 })
        }
        
        const newActiveStrikes = Math.max(0, currentHistory.active_strikes - strike_reduction_amount)
        const shouldUnblock = newActiveStrikes === 0
        
        // Update strike history with partial reduction
        const { data: updateResult, error: updateError } = await supabase
          .from('client_strike_history')
          .update({
            active_strikes: newActiveStrikes,
            last_strike_date: newActiveStrikes === 0 ? null : currentHistory.last_strike_date,
            is_blocked: shouldUnblock ? false : currentHistory.is_blocked,
            blocked_at: shouldUnblock ? null : currentHistory.blocked_at,
            blocked_reason: shouldUnblock ? null : currentHistory.blocked_reason,
            block_lifted_at: shouldUnblock ? new Date().toISOString() : null,
            risk_score: Math.max(0, newActiveStrikes * 0.25), // Recalculate risk score
            notes: `${currentHistory.notes || ''}\n[${new Date().toISOString()}] Strikes reduced by ${strike_reduction_amount} (${currentHistory.active_strikes} → ${newActiveStrikes}) by ${user.email}: ${reason}`.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('client_id', client_id)
          .select()
        
        if (updateError) {
          console.error('Error updating strike history:', updateError)
          return NextResponse.json({ 
            error: 'Failed to update strike history',
            details: updateError.message 
          }, { status: 500 })
        }
        
        if (!updateResult || updateResult.length === 0) {
          console.error('No records updated for strike reduction')
          return NextResponse.json({ 
            error: 'No client strike history found to update' 
          }, { status: 404 })
        }
        
        // If strikes reduced to zero, unblock the client
        if (shouldUnblock) {
          const { error: unblockError } = await supabase
            .from('blocked_clients')
            .update({
              blocked_until: new Date().toISOString(),
              unblocked_by: user.id,
              notes: `Unblocked due to strike reduction to zero`,
              updated_at: new Date().toISOString()
            })
            .eq('barbershop_id', barbershopId)
            .eq('client_id', client_id)
          
          if (unblockError) {
            console.error('Error unblocking client:', unblockError)
            // Don't fail the whole operation if unblocking fails
          }
        }
        
        break
      
      case 'unblock':
        // Unblock the client without resetting strikes
        const { data: unblockResult, error: unblockHistoryError } = await supabase
          .from('client_strike_history')
          .update({
            is_blocked: false,
            block_lifted_at: new Date().toISOString(),
            notes: `Unblocked by ${user.email}: ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('client_id', client_id)
          .select()
        
        if (unblockHistoryError) {
          console.error('Error unblocking client in history:', unblockHistoryError)
          return NextResponse.json({ 
            error: 'Failed to unblock client in strike history',
            details: unblockHistoryError.message 
          }, { status: 500 })
        }
        
        if (!unblockResult || unblockResult.length === 0) {
          console.error('No records updated for client unblock')
          return NextResponse.json({ 
            error: 'No client strike history found to unblock' 
          }, { status: 404 })
        }
        
        // Update blocked clients record
        const { error: unblockClientsError } = await supabase
          .from('blocked_clients')
          .update({
            blocked_until: new Date().toISOString(),
            unblocked_by: user.id,
            notes: reason,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('client_id', client_id)
        
        if (unblockClientsError) {
          console.error('Error updating blocked clients record:', unblockClientsError)
          // Don't fail the operation if this update fails
        }
        
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action. Supported actions: reset_strikes, reduce_strikes, unblock' }, { status: 400 })
    }

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: `strike_management_${action}`,
        details: {
          barbershop_id: barbershopId,
          client_id,
          strike_reduction_amount: action === 'reduce_strikes' ? strike_reduction_amount : undefined,
          reason
        },
        created_at: new Date().toISOString()
      })

    // Create action-specific success message
    let successMessage
    switch (action) {
      case 'reset_strikes':
        successMessage = 'Client strikes reset successfully. Client is now unblocked.'
        break
      case 'reduce_strikes':
        successMessage = `Successfully removed ${strike_reduction_amount} strike${strike_reduction_amount > 1 ? 's' : ''} from client.`
        break
      case 'unblock':
        successMessage = 'Client unblocked successfully.'
        break
      default:
        successMessage = 'Client strikes updated successfully.'
    }

    return NextResponse.json({ 
      success: true,
      action,
      strike_reduction_amount: action === 'reduce_strikes' ? strike_reduction_amount : undefined,
      message: successMessage
    })
    
  } catch (error) {
    console.error('Error updating strike history:', error)
    return NextResponse.json(
      { error: 'Failed to update strike history' },
      { status: 500 }
    )
  }
}