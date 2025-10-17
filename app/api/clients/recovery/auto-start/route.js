import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/clients/recovery/auto-start
 * Automated client recovery flow initiation for blocked/high-risk clients
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      client_id,
      recovery_trigger = 'no_show_incident', // 'no_show_incident', 'strike_threshold', 'payment_failure', 'manual'
      incident_id = null,
      recovery_type = 'standard', // 'standard', 'express', 'premium'
      auto_execute = true, // Whether to start the flow immediately
      custom_parameters = {},
      skip_initial_delay = false
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role, full_name')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner', 'staff']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barbershopId = profile.barbershop_id

    // Get client information and current status
    const clientData = await getClientRecoveryInfo(supabase, client_id, barbershopId)
    
    if (!clientData.success) {
      return NextResponse.json({ 
        error: clientData.error || 'Failed to get client information' 
      }, { status: 400 })
    }

    const { client, strikeHistory, automationSettings } = clientData.data

    // Check if recovery flow automation is enabled
    if (!automationSettings?.recovery_flow_automation?.enabled) {
      return NextResponse.json({
        success: false,
        message: 'Recovery flow automation is disabled',
        manual_process_available: true
      })
    }

    const recoverySettings = automationSettings.recovery_flow_automation

    // Check if client is eligible for automated recovery
    const eligibilityCheck = await checkRecoveryEligibility({
      client,
      strikeHistory,
      recovery_trigger,
      recovery_type,
      recoverySettings,
      supabase,
      barbershopId
    })

    if (!eligibilityCheck.eligible) {
      return NextResponse.json({
        success: false,
        eligible: false,
        reason: eligibilityCheck.reason,
        alternative_actions: eligibilityCheck.alternatives || []
      })
    }

    // Create recovery flow record
    const recoveryFlow = await createRecoveryFlow({
      client_id,
      barbershopId,
      recovery_trigger,
      recovery_type,
      incident_id,
      initiated_by: user.id,
      custom_parameters,
      recoverySettings,
      supabase
    })

    if (!recoveryFlow.success) {
      return NextResponse.json({
        error: 'Failed to create recovery flow',
        details: recoveryFlow.error
      }, { status: 500 })
    }

    let executionResult = null

    // Auto-execute the recovery flow if requested
    if (auto_execute) {
      executionResult = await executeRecoveryFlow({
        recovery_id: recoveryFlow.data.id,
        client,
        strikeHistory,
        recoverySettings,
        skip_initial_delay,
        supabase,
        barbershopId
      })
    }

    // Log the recovery initiation
    await logRecoveryInitiation({
      recovery_id: recoveryFlow.data.id,
      client_id,
      barbershopId,
      trigger: recovery_trigger,
      initiated_by: user.id,
      auto_executed: auto_execute,
      execution_result: executionResult,
      supabase
    })

    return NextResponse.json({
      success: true,
      recovery_id: recoveryFlow.data.id,
      recovery_type,
      eligible: true,
      auto_executed: auto_execute,
      execution_result: executionResult,
      estimated_completion: calculateEstimatedCompletion(recoverySettings, recovery_type),
      next_steps: generateNextSteps(recoveryFlow.data, executionResult),
      message: auto_execute 
        ? 'Recovery flow initiated and started successfully'
        : 'Recovery flow created, manual start required'
    })
    
  } catch (error) {
    console.error('Error initiating recovery flow:', error)
    return NextResponse.json(
      { error: 'Failed to initiate recovery flow', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/clients/recovery/auto-start
 * Get recovery flow status and history
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const client_id = url.searchParams.get('client_id')
    const recovery_id = url.searchParams.get('recovery_id')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit')) || 20
    
    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barbershopId = profile.barbershop_id

    let query = supabase
      .from('client_recovery_flows')
      .select(`
        *,
        customers(name, email),
        profiles:initiated_by(full_name)
      `)
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (client_id) {
      query = query.eq('client_id', client_id)
    }
    
    if (recovery_id) {
      query = query.eq('id', recovery_id)
    }
    
    if (status) {
      query = query.eq('status', status)
    }

    const { data: recoveryFlows, error } = await query

    if (error) {
      throw new Error(`Failed to fetch recovery flows: ${error.message}`)
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('client_recovery_flows')
      .select('status, recovery_type, recovery_trigger')
      .eq('barbershop_id', barbershopId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const statistics = calculateRecoveryStatistics(stats || [])

    return NextResponse.json({
      success: true,
      recovery_flows: recoveryFlows,
      statistics,
      total_flows: recoveryFlows?.length || 0
    })
    
  } catch (error) {
    console.error('Error fetching recovery flows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recovery flows', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get client information needed for recovery
 */
async function getClientRecoveryInfo(supabase, clientId, barbershopId) {
  try {
    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', clientId)
      .single()
    
    if (clientError || !client) {
      return { success: false, error: 'Client not found' }
    }

    // Get strike history
    const { data: strikeHistory } = await supabase
      .from('client_strike_history')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('client_id', clientId)
      .single()

    // Get automation settings
    const { data: automationSettings } = await supabase
      .from('automation_settings')
      .select('recovery_flow_automation')
      .eq('barbershop_id', barbershopId)
      .single()

    return {
      success: true,
      data: {
        client,
        strikeHistory: strikeHistory || { strikes: 0, outstanding_balance: 0 },
        automationSettings: automationSettings || {}
      }
    }

  } catch (error) {
    console.error('Error getting client recovery info:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if client is eligible for automated recovery
 */
async function checkRecoveryEligibility({
  client, strikeHistory, recovery_trigger, recovery_type, recoverySettings, supabase, barbershopId
}) {
  try {
    // Check if client is already in recovery
    const { data: activeRecovery } = await supabase
      .from('client_recovery_flows')
      .select('id, status')
      .eq('client_id', client.id)
      .eq('barbershop_id', barbershopId)
      .in('status', ['active', 'in_progress', 'pending'])
      .single()

    if (activeRecovery) {
      return {
        eligible: false,
        reason: 'recovery_in_progress',
        alternatives: ['update_existing_recovery', 'escalate_recovery']
      }
    }

    // Check minimum strike threshold
    const minStrikes = recoverySettings.min_strikes || 1
    if (strikeHistory.strikes < minStrikes) {
      return {
        eligible: false,
        reason: 'insufficient_strikes',
        current_strikes: strikeHistory.strikes,
        required_strikes: minStrikes,
        alternatives: ['manual_recovery', 'monitor_client']
      }
    }

    // Check outstanding balance threshold
    const maxBalance = recoverySettings.max_outstanding_balance || 500
    if (strikeHistory.outstanding_balance > maxBalance) {
      return {
        eligible: false,
        reason: 'balance_too_high',
        current_balance: strikeHistory.outstanding_balance,
        max_balance: maxBalance,
        alternatives: ['payment_plan', 'manual_collection']
      }
    }

    // Check recent recovery attempts
    const { data: recentRecoveries } = await supabase
      .from('client_recovery_flows')
      .select('id, status, completed_at')
      .eq('client_id', client.id)
      .eq('barbershop_id', barbershopId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const recentFailures = recentRecoveries?.filter(r => r.status === 'failed').length || 0
    const maxFailures = recoverySettings.max_recent_failures || 3

    if (recentFailures >= maxFailures) {
      return {
        eligible: false,
        reason: 'too_many_recent_failures',
        recent_failures: recentFailures,
        max_failures: maxFailures,
        alternatives: ['escalate_to_manager', 'manual_intervention']
      }
    }

    // All checks passed
    return {
      eligible: true,
      strike_count: strikeHistory.strikes,
      balance: strikeHistory.outstanding_balance,
      recent_attempts: recentRecoveries?.length || 0
    }

  } catch (error) {
    console.error('Error checking recovery eligibility:', error)
    return {
      eligible: false,
      reason: 'eligibility_check_failed',
      error: error.message
    }
  }
}

/**
 * Create recovery flow record
 */
async function createRecoveryFlow({
  client_id, barbershopId, recovery_trigger, recovery_type, incident_id, 
  initiated_by, custom_parameters, recoverySettings, supabase
}) {
  try {
    const flowData = {
      barbershop_id: barbershopId,
      client_id,
      recovery_trigger,
      recovery_type,
      incident_id,
      status: 'pending',
      initiated_by,
      configuration: {
        ...recoverySettings,
        ...custom_parameters
      },
      steps_completed: 0,
      total_steps: calculateTotalSteps(recovery_type, recoverySettings),
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('client_recovery_flows')
      .insert(flowData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create recovery flow: ${error.message}`)
    }

    return { success: true, data }

  } catch (error) {
    console.error('Error creating recovery flow:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Execute recovery flow steps
 */
async function executeRecoveryFlow({
  recovery_id, client, strikeHistory, recoverySettings, skip_initial_delay, supabase, barbershopId
}) {
  try {
    const executionSteps = []
    
    // Step 1: Initial delay (unless skipped)
    if (!skip_initial_delay) {
      const delay = recoverySettings.initial_delay_hours || 2
      await scheduleDelayedStep('initial_delay', recovery_id, delay, supabase)
      executionSteps.push({
        step: 'initial_delay',
        status: 'scheduled',
        delay_hours: delay
      })
    }

    // Step 2: Send recovery communication
    const communicationResult = await sendRecoveryCommunication({
      client,
      recovery_id,
      recoverySettings,
      barbershopId,
      supabase
    })
    executionSteps.push(communicationResult)

    // Step 3: Update client status
    await updateClientStatus(client.id, 'in_recovery', supabase)
    executionSteps.push({
      step: 'status_update',
      status: 'completed',
      new_status: 'in_recovery'
    })

    // Step 4: Schedule follow-up steps
    const followUpSteps = await scheduleFollowUpSteps({
      recovery_id,
      client,
      recoverySettings,
      supabase
    })
    executionSteps.push(...followUpSteps)

    // Update recovery flow with execution results
    await supabase
      .from('client_recovery_flows')
      .update({
        status: skip_initial_delay ? 'active' : 'scheduled',
        execution_steps: executionSteps,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recovery_id)

    return {
      success: true,
      steps_executed: executionSteps.length,
      execution_steps: executionSteps,
      status: skip_initial_delay ? 'active' : 'scheduled'
    }

  } catch (error) {
    console.error('Error executing recovery flow:', error)
    
    // Mark recovery as failed
    await supabase
      .from('client_recovery_flows')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', recovery_id)

    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send recovery communication to client
 */
async function sendRecoveryCommunication({ client, recovery_id, recoverySettings, barbershopId, supabase }) {
  try {
    const channels = recoverySettings.communication_channels || ['email', 'sms']
    const results = []

    for (const channel of channels) {
      let result = null

      switch (channel) {
        case 'email':
          result = await sendRecoveryEmail(client, recovery_id, barbershopId)
          break
        case 'sms':
          result = await sendRecoverySMS(client, recovery_id, barbershopId)
          break
        default:
          result = { status: 'unsupported', channel }
      }

      results.push({
        channel,
        status: result.status,
        result
      })
    }

    return {
      step: 'recovery_communication',
      status: results.some(r => r.status === 'sent') ? 'completed' : 'failed',
      channels_attempted: channels.length,
      successful_sends: results.filter(r => r.status === 'sent').length,
      results
    }

  } catch (error) {
    return {
      step: 'recovery_communication',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Helper functions
 */
function calculateTotalSteps(recovery_type, settings) {
  const baseSteps = 3 // initial delay, communication, status update
  const followUpSteps = settings.follow_up_steps?.length || 2
  return baseSteps + followUpSteps
}

function calculateEstimatedCompletion(settings, recovery_type) {
  const baseHours = settings.initial_delay_hours || 2
  const followUpHours = (settings.follow_up_steps?.length || 2) * 24
  const totalHours = baseHours + followUpHours
  
  return new Date(Date.now() + totalHours * 60 * 60 * 1000).toISOString()
}

function generateNextSteps(recoveryFlow, executionResult) {
  if (!executionResult?.success) {
    return ['review_failure_reason', 'manual_intervention']
  }

  const steps = ['monitor_client_response', 'track_recovery_progress']
  
  if (executionResult.status === 'scheduled') {
    steps.unshift('await_initial_delay')
  }
  
  return steps
}

function calculateRecoveryStatistics(stats) {
  const statistics = {
    total: stats.length,
    by_status: {},
    by_type: {},
    by_trigger: {},
    success_rate: 0
  }

  stats.forEach(stat => {
    statistics.by_status[stat.status] = (statistics.by_status[stat.status] || 0) + 1
    statistics.by_type[stat.recovery_type] = (statistics.by_type[stat.recovery_type] || 0) + 1
    statistics.by_trigger[stat.recovery_trigger] = (statistics.by_trigger[stat.recovery_trigger] || 0) + 1
  })

  const successful = statistics.by_status.completed || 0
  statistics.success_rate = statistics.total > 0 ? Math.round((successful / statistics.total) * 100) : 0

  return statistics
}

async function scheduleDelayedStep(stepType, recoveryId, delayHours, supabase) {
  const executeAt = new Date(Date.now() + delayHours * 60 * 60 * 1000)
  
  await supabase
    .from('recovery_scheduled_steps')
    .insert({
      recovery_id: recoveryId,
      step_type: stepType,
      execute_at: executeAt.toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString()
    })
}

async function updateClientStatus(clientId, status, supabase) {
  await supabase
    .from('customers')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
}

async function scheduleFollowUpSteps({ recovery_id, client, recoverySettings, supabase }) {
  const steps = []
  const followUpHours = [24, 72, 168] // 1 day, 3 days, 1 week

  for (let i = 0; i < followUpHours.length; i++) {
    await scheduleDelayedStep('follow_up', recovery_id, followUpHours[i], supabase)
    steps.push({
      step: `follow_up_${i + 1}`,
      status: 'scheduled',
      execute_in_hours: followUpHours[i]
    })
  }

  return steps
}

async function sendRecoveryEmail(client, recoveryId, barbershopId) {
  // Implementation would use email service
  console.log(`Recovery email would be sent to ${client.email}`)
  return { status: 'sent', email_id: `recovery_${recoveryId}_${Date.now()}` }
}

async function sendRecoverySMS(client, recoveryId, barbershopId) {
  // Implementation would use SMS service
  if (!client.phone) {
    return { status: 'skipped', reason: 'no_phone' }
  }
  console.log(`Recovery SMS would be sent to ${client.phone}`)
  return { status: 'sent', sms_id: `recovery_${recoveryId}_${Date.now()}` }
}

async function logRecoveryInitiation({ recovery_id, client_id, barbershopId, trigger, initiated_by, auto_executed, execution_result, supabase }) {
  await supabase
    .from('recovery_logs')
    .insert({
      recovery_id,
      client_id,
      barbershop_id: barbershopId,
      action: 'initiated',
      trigger,
      initiated_by,
      auto_executed,
      execution_success: execution_result?.success || false,
      created_at: new Date().toISOString()
    })
}