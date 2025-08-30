import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/no-show/recovery
 * Fetch recovery workflows for blocked clients
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
    const status = searchParams.get('status')
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Build query for recovery workflows
    let query = supabase
      .from('blocked_client_recovery')
      .select(`
        *,
        blocked_client:blocked_clients(
          id,
          blocked_at,
          block_reason,
          strike_count_at_block
        ),
        customer:customers(
          id,
          name,
          email,
          phone
        ),
        recovery_attempts:no_show_recovery_attempts(
          id,
          attempt_number,
          communication_type,
          sent_at,
          delivery_status,
          client_responded
        )
      `)
      .eq('barberbarbershop_id', profile.barbershop_id)
      .order('initiated_at', { ascending: false })
    
    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    if (status) {
      query = query.eq('recovery_status', status)
    }
    
    const { data: recoveries, error: recoveriesError } = await query
    
    if (recoveriesError) throw recoveriesError

    // Get summary statistics
    const stats = {
      total_recoveries: recoveries.length,
      pending: recoveries.filter(r => r.recovery_status === 'pending').length,
      in_progress: recoveries.filter(r => r.recovery_status === 'in_progress').length,
      completed: recoveries.filter(r => r.recovery_status === 'completed').length,
      failed: recoveries.filter(r => r.recovery_status === 'failed').length,
      total_fees_recovered: recoveries
        .filter(r => r.fee_paid)
        .reduce((sum, r) => sum + (r.fee_amount || 0), 0)
    }

    return NextResponse.json({
      recoveries,
      stats
    })
    
  } catch (error) {
    console.error('Error fetching recovery workflows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recovery workflows' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/no-show/recovery
 * Initiate recovery workflow for blocked client
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
      recovery_type = 'manager_initiated',
      send_email = true,
      send_sms = true,
      custom_message
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barberbarbershopId = profile.barbershop_id

    // Check if client is blocked
    const { data: blockedClient, error: blockedError } = await supabase
      .from('blocked_clients')
      .select('*')
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('client_id', client_id)
      .single()
    
    if (blockedError || !blockedClient) {
      return NextResponse.json({ error: 'Client is not blocked' }, { status: 400 })
    }

    // Check if recovery already exists
    const { data: existingRecovery } = await supabase
      .from('blocked_client_recovery')
      .select('id')
      .eq('blocked_client_id', blockedClient.id)
      .in('recovery_status', ['pending', 'in_progress'])
      .single()
    
    if (existingRecovery) {
      return NextResponse.json({ 
        error: 'Recovery workflow already in progress for this client' 
      }, { status: 400 })
    }

    // Get policy for recovery requirements
    const { data: policy } = await supabase
      .from('no_show_policies')
      .select('*')
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true)
      .single()
    
    const effectivePolicy = policy || {
      recovery_fee_amount: 50.00,
      recovery_requires_deposit: true,
      recovery_deposit_amount: 100.00
    }

    // Create recovery workflow
    const { data: recovery, error: recoveryError } = await supabase
      .from('blocked_client_recovery')
      .insert({
        blocked_client_id: blockedClient.id,
        barberbarbershop_id: barberbarbershopId,
        client_id,
        recovery_type,
        recovery_status: 'pending',
        fee_payment_required: blockedClient.requires_fee_payment,
        fee_amount: blockedClient.required_fee_amount || effectivePolicy.recovery_fee_amount,
        deposit_required: blockedClient.requires_deposit || effectivePolicy.recovery_requires_deposit,
        deposit_amount: blockedClient.required_deposit_amount || effectivePolicy.recovery_deposit_amount,
        requires_approval: blockedClient.requires_manager_approval,
        initiated_by: user.id,
        recovery_email_sent: false,
        recovery_sms_sent: false
      })
      .select()
      .single()
    
    if (recoveryError) throw recoveryError

    // Get client contact info
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email, phone')
      .eq('id', client_id)
      .single()

    // Send recovery notifications
    const notifications = []
    
    if (send_email && customer?.email) {
      // Create email notification attempt
      const emailAttempt = await supabase
        .from('no_show_recovery_attempts')
        .insert({
          recovery_id: recovery.id,
          barberbarbershop_id: barberbarbershopId,
          client_id,
          attempt_number: 1,
          communication_type: 'email',
          message_subject: 'Your Account Recovery Options',
          message_content: custom_message || generateRecoveryEmailContent(
            customer.name,
            blockedClient.strike_count_at_block,
            recovery.fee_amount,
            recovery.deposit_amount
          ),
          sent_by: user.id,
          delivery_status: 'pending'
        })
        .select()
        .single()
      
      notifications.push(emailAttempt.data)
      
      // Mark email as sent
      await supabase
        .from('blocked_client_recovery')
        .update({ recovery_email_sent: true })
        .eq('id', recovery.id)
    }
    
    if (send_sms && customer?.phone) {
      // Create SMS notification attempt
      const smsAttempt = await supabase
        .from('no_show_recovery_attempts')
        .insert({
          recovery_id: recovery.id,
          barberbarbershop_id: barberbarbershopId,
          client_id,
          attempt_number: 1,
          communication_type: 'sms',
          message_content: custom_message || generateRecoverySMSContent(
            customer.name,
            recovery.fee_amount
          ),
          sent_by: user.id,
          delivery_status: 'pending'
        })
        .select()
        .single()
      
      notifications.push(smsAttempt.data)
      
      // Mark SMS as sent
      await supabase
        .from('blocked_client_recovery')
        .update({ recovery_sms_sent: true })
        .eq('id', recovery.id)
    }

    // Update recovery status to in_progress
    await supabase
      .from('blocked_client_recovery')
      .update({ 
        recovery_status: 'in_progress',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', recovery.id)

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'initiate_recovery_workflow',
        details: {
          barberbarbershop_id: barberbarbershopId,
          client_id,
          recovery_id: recovery.id,
          notifications_sent: notifications.length
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      recovery,
      notifications,
      message: 'Recovery workflow initiated successfully' 
    })
    
  } catch (error) {
    console.error('Error initiating recovery workflow:', error)
    return NextResponse.json(
      { error: 'Failed to initiate recovery workflow' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/no-show/recovery
 * Update recovery workflow status
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
      recovery_id,
      action, // 'approve', 'complete', 'cancel', 'payment_received'
      notes
    } = await request.json()
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Get recovery details
    const { data: recovery, error: recoveryError } = await supabase
      .from('blocked_client_recovery')
      .select('*')
      .eq('id', recovery_id)
      .eq('barberbarbershop_id', profile.barbershop_id)
      .single()
    
    if (recoveryError || !recovery) {
      return NextResponse.json({ error: 'Recovery workflow not found' }, { status: 404 })
    }

    let updateData = {
      last_updated_at: new Date().toISOString()
    }
    
    switch (action) {
      case 'approve':
        // Manager approval
        const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
        if (!authorizedRoles.includes(profile.role)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
        
        updateData = {
          ...updateData,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes
        }
        break
      
      case 'payment_received':
        // Mark payment as received
        updateData = {
          ...updateData,
          fee_paid: true,
          fee_payment_date: new Date().toISOString()
        }
        
        // Update outstanding balance in strike history
        await supabase
          .from('client_strike_history')
          .update({
            outstanding_balance: 0,
            updated_at: new Date().toISOString()
          })
          .eq('barberbarbershop_id', profile.barbershop_id)
          .eq('client_id', recovery.client_id)
        
        break
      
      case 'complete':
        // Complete recovery and unblock client
        updateData = {
          ...updateData,
          recovery_status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: notes,
          strikes_reset: true
        }
        
        // Unblock the client
        await supabase
          .from('blocked_clients')
          .update({
            blocked_until: new Date().toISOString(),
            recovery_completed_at: new Date().toISOString(),
            unblocked_by: user.id
          })
          .eq('barberbarbershop_id', profile.barbershop_id)
          .eq('client_id', recovery.client_id)
        
        // Reset strikes in history
        await supabase
          .from('client_strike_history')
          .update({
            active_strikes: 0,
            is_blocked: false,
            block_lifted_at: new Date().toISOString(),
            recovery_completed: true,
            recovery_completed_at: new Date().toISOString(),
            risk_score: 0,
            updated_at: new Date().toISOString()
          })
          .eq('barberbarbershop_id', profile.barbershop_id)
          .eq('client_id', recovery.client_id)
        
        break
      
      case 'cancel':
        // Cancel recovery workflow
        updateData = {
          ...updateData,
          recovery_status: 'cancelled',
          completion_notes: notes
        }
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update recovery workflow
    const { error: updateError } = await supabase
      .from('blocked_client_recovery')
      .update(updateData)
      .eq('id', recovery_id)
    
    if (updateError) throw updateError

    // Log the action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: `recovery_workflow_${action}`,
        details: {
          barberbarbershop_id: profile.barbershop_id,
          recovery_id,
          client_id: recovery.client_id,
          notes
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      message: `Recovery workflow ${action} successful` 
    })
    
  } catch (error) {
    console.error('Error updating recovery workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update recovery workflow' },
      { status: 500 }
    )
  }
}

// Helper function to generate recovery email content
function generateRecoveryEmailContent(clientName, strikeCount, feeAmount, depositAmount) {
  return `
Dear ${clientName},

Your account has been temporarily blocked due to ${strikeCount} no-show incidents. We value your business and would like to offer you the opportunity to restore your booking privileges.

To reactivate your account, please:
1. Pay the outstanding no-show fee of $${feeAmount}
${depositAmount > 0 ? `2. Provide a deposit of $${depositAmount} for future appointments` : ''}

Once these requirements are met, your account will be restored and you can continue booking appointments.

Please contact us if you have any questions or would like to discuss your situation.

Best regards,
The Team
  `
}

// Helper function to generate recovery SMS content
function generateRecoverySMSContent(clientName, feeAmount) {
  return `Hi ${clientName}, your account is blocked due to no-shows. Pay $${feeAmount} to restore booking privileges. Reply HELP for assistance.`
}