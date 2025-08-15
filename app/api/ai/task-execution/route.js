/**
 * 🤖 Automated Task Execution API
 * 
 * Handles automated task execution requests with comprehensive safety controls:
 * - Emotional trigger processing
 * - Business rule automation  
 * - Safety evaluation and approval workflows
 * - Task monitoring and history tracking
 */

import automatedTaskExecutionService from '../../../../services/automated-task-execution-service.js'

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const { 
      action, 
      context,
      userId,
      businessContext,
      overrideSafety = false,
      approvedBy = null 
    } = await request.json()

    console.log(`🤖 Task execution API called with action: ${action}`)

    let result

    switch (action) {
      case 'process_triggers':
        result = await processTriggers(context, userId, businessContext)
        break

      case 'execute_manual':
        result = await executeManualTask(context, userId, overrideSafety, approvedBy)
        break

      case 'approve_task':
        result = await approveTask(context.taskId, approvedBy || userId)
        break

      case 'reject_task':
        result = await rejectTask(context.taskId, approvedBy || userId, context.reason)
        break

      case 'get_approval_queue':
        result = await getApprovalQueue()
        break

      case 'get_execution_history':
        result = await getExecutionHistory(context?.limit)
        break

      case 'get_active_executions':
        result = await getActiveExecutions()
        break

      case 'get_stats':
        result = await getExecutionStats()
        break

      case 'health':
        result = await getSystemHealth()
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify({
      success: true,
      action: action,
      result: result,
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Task execution API error:', error)

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function GET(request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'health'
  
  try {
    let result

    switch (action) {
      case 'health':
        result = await getSystemHealth()
        break

      case 'stats':
        result = await getExecutionStats()
        break

      case 'approval_queue':
        result = await getApprovalQueue()
        break

      case 'history':
        const limit = parseInt(url.searchParams.get('limit')) || 50
        result = await getExecutionHistory(limit)
        break

      case 'active':
        result = await getActiveExecutions()
        break

      default:
        result = await getSystemHealth()
    }

    return new Response(JSON.stringify({
      success: true,
      action: action,
      result: result,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Process emotional and business triggers
 */
async function processTriggers(context, userId, businessContext) {
  console.log('🎭 Processing triggers for context:', context)

  // Create comprehensive context for trigger evaluation
  const triggerContext = {
    userId: userId,
    message: context.message,
    emotion: context.emotion,
    emotionConfidence: context.emotionConfidence,
    businessContext: businessContext,
    businessEvent: context.businessEvent,
    timestamp: new Date().toISOString()
  }

  const result = await automatedTaskExecutionService.processAutomatedTriggers(triggerContext)

  return {
    triggers_processed: result.triggersProcessed || 0,
    success: result.success,
    context: triggerContext,
    processing_details: result
  }
}

/**
 * Execute a manually requested task
 */
async function executeManualTask(context, userId, overrideSafety, approvedBy) {
  console.log('🔧 Executing manual task:', context)

  // Create manual trigger
  const manualTrigger = {
    type: 'manual',
    requestedBy: userId,
    actions: context.actions || [],
    urgency: context.urgency || 'medium',
    reason: context.reason || 'Manual execution requested'
  }

  const triggerContext = {
    userId: userId,
    manual: true,
    overrideSafety: overrideSafety,
    approvedBy: approvedBy,
    businessContext: context.businessContext
  }

  const task = await automatedTaskExecutionService.createTask(manualTrigger, triggerContext)
  
  if (overrideSafety && approvedBy) {
    // Bypass safety for approved manual tasks
    task.requiresApproval = false
  }

  const executed = await automatedTaskExecutionService.evaluateAndExecuteTask(task)

  return {
    task_id: task.id,
    executed: executed,
    status: task.status,
    requires_approval: task.requiresApproval,
    actions: task.actions
  }
}

/**
 * Approve a pending task
 */
async function approveTask(taskId, approvedBy) {
  const approved = await automatedTaskExecutionService.approveTask(taskId, approvedBy)
  
  return {
    task_id: taskId,
    approved: approved,
    approved_by: approvedBy,
    timestamp: new Date().toISOString()
  }
}

/**
 * Reject a pending task
 */
async function rejectTask(taskId, rejectedBy, reason) {
  const rejected = automatedTaskExecutionService.rejectTask(taskId, rejectedBy, reason)
  
  return {
    task_id: taskId,
    rejected: rejected,
    rejected_by: rejectedBy,
    reason: reason,
    timestamp: new Date().toISOString()
  }
}

/**
 * Get tasks pending approval
 */
async function getApprovalQueue() {
  const queue = automatedTaskExecutionService.getApprovalQueue()
  
  return {
    pending_tasks: queue.length,
    tasks: queue.map(task => ({
      id: task.id,
      type: task.type,
      actions: task.actions,
      urgency: task.urgency,
      safety_level: task.safetyLevel,
      created_at: task.createdAt,
      trigger: task.trigger,
      context_summary: {
        user_id: task.context.userId,
        emotion: task.context.emotion,
        message_preview: task.context.message?.substring(0, 100) + '...'
      }
    }))
  }
}

/**
 * Get execution history
 */
async function getExecutionHistory(limit = 50) {
  const history = automatedTaskExecutionService.getExecutionHistory(limit)
  
  return {
    total_executions: history.length,
    executions: history.map(task => ({
      id: task.id,
      type: task.type,
      status: task.status,
      actions: task.actions,
      started_at: task.startedAt,
      completed_at: task.completedAt,
      duration: task.completedAt && task.startedAt ? 
        new Date(task.completedAt) - new Date(task.startedAt) : null,
      success: task.status === 'completed',
      trigger: task.trigger?.emotion || task.trigger?.event,
      results_summary: task.results?.length || 0
    }))
  }
}

/**
 * Get currently executing tasks
 */
async function getActiveExecutions() {
  const active = automatedTaskExecutionService.getActiveExecutions()
  
  return {
    active_count: active.length,
    executions: active.map(task => ({
      id: task.id,
      type: task.type,
      actions: task.actions,
      started_at: task.startedAt,
      elapsed_time: Date.now() - new Date(task.startedAt).getTime(),
      estimated_completion: new Date(Date.now() + (task.estimatedDuration || 5000)).toISOString()
    }))
  }
}

/**
 * Get execution statistics
 */
async function getExecutionStats() {
  const stats = automatedTaskExecutionService.getExecutionStats()
  
  return {
    ...stats,
    service: 'Automated Task Execution v1.0',
    timestamp: new Date().toISOString(),
    system_status: 'operational'
  }
}

/**
 * Get system health status
 */
async function getSystemHealth() {
  const stats = automatedTaskExecutionService.getExecutionStats()
  const activeCount = automatedTaskExecutionService.getActiveExecutions().length
  const pendingCount = automatedTaskExecutionService.getApprovalQueue().length
  
  return {
    service: 'Automated Task Execution v1.0',
    status: 'operational',
    active_executions: activeCount,
    pending_approval: pendingCount,
    total_executions_today: stats.total_executions,
    success_rate: stats.success_rate,
    avg_response_time: stats.avg_duration,
    supported_triggers: [
      'emotional: angry, frustrated, excited, confused, satisfied',
      'business: appointment_cancellation, low_inventory, late_payment, positive_review'
    ],
    supported_actions: [
      'escalate_to_manager', 'offer_help', 'upsell_services', 'send_tutorial',
      'request_review', 'payment_reminder', 'reorder_stock', 'custom_actions'
    ],
    safety_controls: {
      financial_limits: true,
      communication_limits: true,
      approval_workflows: true,
      execution_monitoring: true
    },
    uptime: '100%',
    last_health_check: new Date().toISOString()
  }
}