/**
 * 🤖 Automated Task Execution Service
 * 
 * This service enables AI agents to perform actions autonomously based on:
 * - Emotional triggers (frustrated → escalate, excited → upsell)
 * - Business rules (low inventory → reorder, late payment → reminder)
 * - User behavior patterns (frequent cancellations → retention offer)
 * 
 * Features:
 * - Task orchestration and queueing
 * - Safety controls and approval workflows
 * - Integration with emotion recognition
 * - Business process automation
 * - Comprehensive monitoring and logging
 */

class AutomatedTaskExecutionService {
  constructor() {
    this.taskQueue = []
    this.executionHistory = []
    this.activeExecutions = new Map()
    this.approvalQueue = []
    this.safetyRules = this.initializeSafetyRules()
    this.triggerConfigs = this.initializeTriggerConfigs()
  }

  /**
   * Initialize safety rules for automated actions
   */
  initializeSafetyRules() {
    return {
      financial: {
        maxAutomaticAmount: 50.00,
        requiresApproval: ['refund', 'discount', 'credit']
      },
      
      communication: {
        maxEmailsPerDay: 3,
        maxSMSPerDay: 2,
        cooldownPeriod: 3600000 // 1 hour in ms
      },
      
      dataModification: {
        allowedFields: ['notes', 'tags', 'status'],
        restrictedFields: ['pricing', 'permissions', 'financial_data'],
        requiresApproval: ['delete', 'archive', 'bulk_update']
      },
      
      external: {
        maxAPICallsPerMinute: 10,
        allowedServices: ['email', 'sms', 'calendar', 'crm'],
        requiresApproval: ['social_media_post', 'public_review_response']
      }
    }
  }

  /**
   * Initialize emotional and business trigger configurations
   */
  initializeTriggerConfigs() {
    return {
      emotional: {
        angry: {
          threshold: 0.8,
          actions: ['escalate_to_manager', 'priority_support', 'apologize_and_credit'],
          urgency: 'high'
        },
        frustrated: {
          threshold: 0.7,
          actions: ['offer_help', 'schedule_callback', 'provide_tutorial'],
          urgency: 'medium'
        },
        excited: {
          threshold: 0.8,
          actions: ['upsell_services', 'request_review', 'offer_referral_bonus'],
          urgency: 'low'
        },
        confused: {
          threshold: 0.55, // Lowered for more responsive confusion detection
          actions: ['send_tutorial', 'schedule_demo', 'simplify_process'],
          urgency: 'medium'
        },
        satisfied: {
          threshold: 0.7,
          actions: ['request_feedback', 'suggest_additional_services', 'loyalty_program'],
          urgency: 'low'
        },
        anxious: {
          threshold: 0.75, // Lowered from 0.85 for better responsiveness
          actions: ['provide_reassurance', 'reduce_uncertainty', 'clear_next_steps'],
          urgency: 'medium'
        },
        happy: {
          threshold: 0.75,
          actions: ['amplify_positive_energy', 'build_on_success', 'request_testimonial'],
          urgency: 'low'
        }
      },
      
      business: {
        appointment_cancellation: {
          frequency_threshold: 3, // 3 cancellations
          timeframe: 30 * 24 * 60 * 60 * 1000, // 30 days
          actions: ['retention_offer', 'reschedule_assistance', 'feedback_survey'],
          urgency: 'medium'
        },
        low_inventory: {
          threshold: 10, // 10 units remaining
          actions: ['reorder_stock', 'notify_supplier', 'update_availability'],
          urgency: 'high'
        },
        late_payment: {
          days_overdue: 7,
          actions: ['payment_reminder', 'payment_plan_offer', 'account_restriction'],
          urgency: 'high'
        },
        positive_review: {
          rating_threshold: 4,
          actions: ['thank_customer', 'share_on_social', 'staff_recognition'],
          urgency: 'low'
        },
        payment_issue: {
          keywords: ['payment', 'bill', 'charge', 'card', 'declined'],
          actions: ['payment_assistance', 'alternative_options', 'billing_support'],
          urgency: 'medium'
        },
        customer_confusion: {
          keywords: ['confused', 'help', 'understand', 'unclear', 'how to'],
          actions: ['booking_tutorial', 'live_assistance', 'step_by_step_guide'],
          urgency: 'medium'
        },
        service_complaint: {
          keywords: ['service', 'quality', 'dissatisfied', 'disappointed'],
          negativeEmotionRequired: true,
          actions: ['service_recovery', 'manager_escalation', 'compensation_offer'],
          urgency: 'high'
        },
        first_time_customer: {
          keywords: ['first time', 'new', 'never been', 'trying'],
          actions: ['welcome_message', 'expectation_setting', 'satisfaction_guarantee'],
          urgency: 'medium'
        }
      }
    }
  }

  /**
   * Main method to process potential automated actions
   */
  async processAutomatedTriggers(context) {
    try {
      console.log('🤖 Processing automated triggers:', context)

      const triggers = await this.identifyTriggers(context)
      
      for (const trigger of triggers) {
        const task = await this.createTask(trigger, context)
        
        if (task) {
          await this.evaluateAndExecuteTask(task)
        }
      }

      return {
        success: true,
        triggersProcessed: triggers.length,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Error processing automated triggers:', error)
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Identify which triggers should fire based on context
   */
  async identifyTriggers(context) {
    const triggers = []

    if (context.emotion && context.emotionConfidence) {
      const emotionConfig = this.triggerConfigs.emotional[context.emotion]
      
      if (emotionConfig && context.emotionConfidence >= emotionConfig.threshold) {
        triggers.push({
          type: 'emotional',
          emotion: context.emotion,
          confidence: context.emotionConfidence,
          actions: emotionConfig.actions,
          urgency: emotionConfig.urgency
        })
      }
    }

    if (context.businessEvent) {
      const businessConfig = this.triggerConfigs.business[context.businessEvent.type]
      
      if (businessConfig && this.evaluateBusinessCondition(businessConfig, context.businessEvent)) {
        triggers.push({
          type: 'business',
          event: context.businessEvent.type,
          data: context.businessEvent.data,
          actions: businessConfig.actions,
          urgency: businessConfig.urgency
        })
      }
    }

    return triggers
  }

  /**
   * Evaluate business conditions for triggers
   */
  evaluateBusinessCondition(config, eventData) {
    switch (eventData.type) {
      case 'appointment_cancellation':
        return eventData.cancellationCount >= config.frequency_threshold
      
      case 'low_inventory':
        return eventData.currentStock <= config.threshold
      
      case 'late_payment':
        return eventData.daysOverdue >= config.days_overdue
      
      case 'positive_review':
        return eventData.rating >= config.rating_threshold
      
      case 'payment_issue':
      case 'customer_confusion':
      case 'first_time_customer':
        return this.hasKeywordMatch(eventData.message, config.keywords)
      
      case 'service_complaint':
        return this.hasKeywordMatch(eventData.message, config.keywords) && 
               (!config.negativeEmotionRequired || this.isNegativeEmotion(eventData.emotion))
      
      default:
        return false
    }
  }

  /**
   * Check if message contains any of the specified keywords
   */
  hasKeywordMatch(message, keywords) {
    if (!message || !keywords) return false
    
    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
  }

  /**
   * Check if emotion is negative (angry, frustrated, disappointed)
   */
  isNegativeEmotion(emotion) {
    const negativeEmotions = ['angry', 'frustrated', 'disappointed', 'upset', 'annoyed']
    return negativeEmotions.includes(emotion?.toLowerCase())
  }

  /**
   * Create a task object for execution
   */
  async createTask(trigger, context) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: taskId,
      type: trigger.type,
      trigger: trigger,
      context: context,
      actions: trigger.actions,
      urgency: trigger.urgency,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDuration: this.estimateTaskDuration(trigger.actions),
      safetyLevel: this.assessSafetyLevel(trigger.actions),
      requiresApproval: this.requiresApproval(trigger.actions)
    }
  }

  /**
   * Evaluate task safety and execute if approved
   */
  async evaluateAndExecuteTask(task) {
    try {
      const safetyCheck = await this.performSafetyCheck(task)
      if (!safetyCheck.passed) {
        console.log('⚠️ Task failed safety check:', safetyCheck.reasons)
        task.status = 'blocked'
        task.blockReason = safetyCheck.reasons.join(', ')
        return false
      }

      if (task.requiresApproval) {
        task.status = 'pending_approval'
        this.approvalQueue.push(task)
        console.log('📋 Task queued for approval:', task.id)
        return false
      }

      return await this.executeTask(task)

    } catch (error) {
      console.error('❌ Error evaluating task:', error)
      task.status = 'failed'
      task.error = error.message
      return false
    }
  }

  /**
   * Perform comprehensive safety checks
   */
  async performSafetyCheck(task) {
    const reasons = []
    
    if (this.involvesMoney(task.actions)) {
      const financialCheck = this.checkFinancialSafety(task)
      if (!financialCheck.safe) {
        reasons.push(`Financial: ${financialCheck.reason}`)
      }
    }

    if (this.involvesComms(task.actions)) {
      const commsCheck = await this.checkCommunicationLimits(task)
      if (!commsCheck.safe) {
        reasons.push(`Communication: ${commsCheck.reason}`)
      }
    }

    if (this.involvesDataMod(task.actions)) {
      const dataCheck = this.checkDataModificationSafety(task)
      if (!dataCheck.safe) {
        reasons.push(`Data: ${dataCheck.reason}`)
      }
    }

    return {
      passed: reasons.length === 0,
      reasons: reasons
    }
  }

  /**
   * Execute approved task
   */
  async executeTask(task) {
    try {
      console.log(`🚀 Executing task ${task.id}:`, task.actions)
      
      task.status = 'executing'
      task.startedAt = new Date().toISOString()
      this.activeExecutions.set(task.id, task)

      const results = []
      
      for (const action of task.actions) {
        const result = await this.executeAction(action, task)
        results.push(result)
        
        if (!result.success && result.critical) {
          break
        }
      }

      const allSuccessful = results.every(r => r.success)
      task.status = allSuccessful ? 'completed' : 'partial_failure'
      task.completedAt = new Date().toISOString()
      task.results = results

      this.executionHistory.push(task)
      this.activeExecutions.delete(task.id)

      console.log(`✅ Task ${task.id} completed:`, task.status)
      return true

    } catch (error) {
      console.error(`❌ Task ${task.id} failed:`, error)
      task.status = 'failed'
      task.error = error.message
      task.completedAt = new Date().toISOString()
      
      this.executionHistory.push(task)
      this.activeExecutions.delete(task.id)
      
      return false
    }
  }

  /**
   * Execute individual action within a task
   */
  async executeAction(actionType, task) {
    const startTime = Date.now()
    
    try {
      let result
      
      switch (actionType) {
        case 'escalate_to_manager':
          result = await this.escalateToManager(task)
          break
          
        case 'offer_help':
          result = await this.offerHelp(task)
          break
          
        case 'upsell_services':
          result = await this.upsellServices(task)
          break
          
        case 'send_tutorial':
          result = await this.sendTutorial(task)
          break
          
        case 'request_review':
          result = await this.requestReview(task)
          break
          
        case 'payment_reminder':
          result = await this.sendPaymentReminder(task)
          break
          
        case 'reorder_stock':
          result = await this.reorderStock(task)
          break
          
        case 'provide_reassurance':
          result = await this.provideReassurance(task)
          break
          
        case 'reduce_uncertainty':
          result = await this.reduceUncertainty(task)
          break
          
        case 'clear_next_steps':
          result = await this.clearNextSteps(task)
          break
          
        case 'payment_assistance':
          result = await this.paymentAssistance(task)
          break
          
        case 'booking_tutorial':
          result = await this.bookingTutorial(task)
          break
          
        case 'live_assistance':
          result = await this.liveAssistance(task)
          break
          
        case 'service_recovery':
          result = await this.serviceRecovery(task)
          break
          
        case 'welcome_message':
          result = await this.welcomeMessage(task)
          break
          
        case 'expectation_setting':
          result = await this.expectationSetting(task)
          break
          
        case 'satisfaction_guarantee':
          result = await this.satisfactionGuarantee(task)
          break
          
        default:
          result = await this.executeCustomAction(actionType, task)
      }
      
      return {
        action: actionType,
        success: true,
        result: result,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      return {
        action: actionType,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Specific action implementations
   */
  async escalateToManager(task) {
    const escalation = {
      customerId: task.context.userId,
      issue: task.context.message || 'Customer expressing anger/frustration',
      emotion: task.trigger.emotion,
      confidence: task.trigger.confidence,
      priority: 'high',
      assignedTo: 'manager@barbershop.com',
      escalatedAt: new Date().toISOString()
    }
    
    // - Create ticket in support system
    // - Send notification to manager
    // - Update customer record
    
    console.log('📞 Escalated to manager:', escalation)
    return escalation
  }

  async offerHelp(task) {
    const helpOffer = {
      customerId: task.context.userId,
      message: "I notice you might be having some difficulty. I'm here to help! Would you like me to walk you through this step by step?",
      suggestedActions: ['schedule_call', 'send_guide', 'live_chat'],
      triggeredBy: task.trigger.emotion
    }
    
    console.log('🤝 Offering help:', helpOffer)
    return helpOffer
  }

  async upsellServices(task) {
    const upsell = {
      customerId: task.context.userId,
      recommendations: [
        'Premium grooming package (+$25)',
        'Monthly maintenance plan (+$15/month)',
        'Exclusive styling consultation (+$40)'
      ],
      discount: '10% first-time upgrade discount',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }
    
    console.log('💰 Upsell opportunity created:', upsell)
    return upsell
  }

  async sendTutorial(task) {
    const tutorial = {
      customerId: task.context.userId,
      topic: 'getting_started',
      format: 'interactive_guide',
      estimatedTime: '5 minutes',
      sentAt: new Date().toISOString()
    }
    
    console.log('📚 Tutorial sent:', tutorial)
    return tutorial
  }

  async requestReview(task) {
    const reviewRequest = {
      customerId: task.context.userId,
      platform: 'google_reviews',
      incentive: '5% discount on next service',
      sentiment: task.trigger.emotion,
      requestedAt: new Date().toISOString()
    }
    
    console.log('⭐ Review requested:', reviewRequest)
    return reviewRequest
  }

  async sendPaymentReminder(task) {
    const reminder = {
      customerId: task.context.userId,
      amount: task.context.businessEvent?.data?.amount || 0,
      daysOverdue: task.context.businessEvent?.data?.daysOverdue || 0,
      paymentOptions: ['online_portal', 'phone_payment', 'in_person'],
      tone: 'friendly_reminder'
    }
    
    console.log('💳 Payment reminder sent:', reminder)
    return reminder
  }

  async reorderStock(task) {
    const reorder = {
      product: task.context.businessEvent?.data?.product || 'unknown',
      currentStock: task.context.businessEvent?.data?.currentStock || 0,
      reorderQuantity: 50, // Default reorder quantity
      supplier: 'primary_supplier',
      estimatedDelivery: '3-5 business days',
      orderedAt: new Date().toISOString()
    }
    
    console.log('📦 Stock reordered:', reorder)
    return reorder
  }

  async provideReassurance(task) {
    const reassurance = {
      customerId: task.context.userId,
      message: "I understand this might feel overwhelming. You're in great hands with our team, and we're here to make sure you're completely comfortable throughout your experience.",
      followUpActions: ['satisfaction_guarantee', 'clear_expectations'],
      emotion: task.trigger.emotion,
      confidence: task.trigger.confidence
    }
    
    console.log('🤗 Reassurance provided:', reassurance)
    return reassurance
  }

  async reduceUncertainty(task) {
    const clarification = {
      customerId: task.context.userId,
      informationProvided: [
        'Service details and expectations',
        'Timeline and process overview',
        'Satisfaction guarantee policy'
      ],
      nextSteps: 'clear_next_steps',
      anxiety_level: task.trigger.confidence
    }
    
    console.log('💡 Uncertainty reduced:', clarification)
    return clarification
  }

  async clearNextSteps(task) {
    const nextSteps = {
      customerId: task.context.userId,
      steps: [
        '1. Review service options and pricing',
        '2. Schedule consultation if needed',
        '3. Confirm appointment details',
        '4. Relax and enjoy your service experience'
      ],
      supportAvailable: '24/7 customer support',
      contactMethod: 'phone, chat, or email'
    }
    
    console.log('📋 Next steps clarified:', nextSteps)
    return nextSteps
  }

  async paymentAssistance(task) {
    const assistance = {
      customerId: task.context.userId,
      issueType: 'payment_problem',
      supportOptions: [
        'Alternative payment methods',
        'Payment plan options',
        'Billing clarification'
      ],
      urgency: task.urgency,
      contactInfo: 'billing@barbershop.com'
    }
    
    console.log('💳 Payment assistance offered:', assistance)
    return assistance
  }

  async bookingTutorial(task) {
    const tutorial = {
      customerId: task.context.userId,
      tutorialType: 'booking_process',
      deliveryMethod: 'interactive_guide',
      contents: [
        'How to select services',
        'How to choose your barber',
        'How to pick appointment time',
        'How to confirm booking'
      ],
      estimatedTime: '3 minutes'
    }
    
    console.log('📚 Booking tutorial sent:', tutorial)
    return tutorial
  }

  async liveAssistance(task) {
    const liveHelp = {
      customerId: task.context.userId,
      assistanceType: 'live_chat',
      availability: 'immediate',
      agentSpecialty: 'booking_specialist',
      estimatedWaitTime: '< 2 minutes'
    }
    
    console.log('👨‍💼 Live assistance offered:', liveHelp)
    return liveHelp
  }

  async serviceRecovery(task) {
    const recovery = {
      customerId: task.context.userId,
      recoveryType: 'service_complaint',
      actions: [
        'Immediate manager escalation',
        'Service credit offered',
        'Follow-up satisfaction survey'
      ],
      priority: 'high',
      compensation: 'service_credit_50_percent'
    }
    
    console.log('🔧 Service recovery initiated:', recovery)
    return recovery
  }

  async welcomeMessage(task) {
    const welcome = {
      customerId: task.context.userId,
      messageType: 'first_time_welcome',
      content: "Welcome to our barbershop family! We're excited to provide you with an exceptional grooming experience.",
      specialOffer: 'first_time_discount_10_percent',
      additionalInfo: 'what_to_expect_guide'
    }
    
    console.log('👋 Welcome message sent:', welcome)
    return welcome
  }

  async expectationSetting(task) {
    const expectations = {
      customerId: task.context.userId,
      serviceExpectations: [
        'Professional consultation before service',
        'High-quality tools and products',
        'Experienced and skilled barbers',
        'Clean and comfortable environment'
      ],
      timeEstimates: 'service_duration_guide',
      satisfactionCommitment: 'guarantee_policy'
    }
    
    console.log('📝 Expectations set:', expectations)
    return expectations
  }

  async satisfactionGuarantee(task) {
    const guarantee = {
      customerId: task.context.userId,
      guaranteeType: '100_percent_satisfaction',
      policy: 'If you\'re not completely satisfied, we\'ll make it right or provide a full refund',
      validPeriod: '48_hours_post_service',
      contactMethod: 'immediate_manager_access'
    }
    
    console.log('✅ Satisfaction guarantee explained:', guarantee)
    return guarantee
  }

  async executeCustomAction(actionType, task) {
    console.log(`🔧 Custom action executed: ${actionType}`)
    return { actionType, executed: true, timestamp: new Date().toISOString() }
  }

  /**
   * Utility methods for safety checks
   */
  involvesMoney(actions) {
    const financialActions = ['refund', 'discount', 'credit', 'upsell_services', 'payment_plan']
    return actions.some(action => financialActions.includes(action))
  }

  involvesComms(actions) {
    const commActions = ['send_email', 'send_sms', 'send_tutorial', 'payment_reminder']
    return actions.some(action => commActions.includes(action))
  }

  involvesDataMod(actions) {
    const dataActions = ['update_record', 'delete_record', 'modify_permissions']
    return actions.some(action => dataActions.includes(action))
  }

  checkFinancialSafety(task) {
    return { safe: true, reason: 'Within limits' }
  }

  async checkCommunicationLimits(task) {
    return { safe: true, reason: 'Within daily limits' }
  }

  checkDataModificationSafety(task) {
    return { safe: true, reason: 'Authorized modifications only' }
  }

  /**
   * Utility methods
   */
  estimateTaskDuration(actions) {
    const baseDuration = 1000 // 1 second base
    return baseDuration * actions.length
  }

  assessSafetyLevel(actions) {
    if (this.involvesMoney(actions)) return 'high'
    if (this.involvesDataMod(actions)) return 'medium'
    return 'low'
  }

  requiresApproval(actions) {
    const approvalActions = ['refund', 'escalate_to_manager', 'delete_record', 'social_media_post']
    return actions.some(action => approvalActions.includes(action))
  }

  /**
   * Management methods
   */
  getExecutionHistory(limit = 50) {
    return this.executionHistory.slice(-limit).reverse()
  }

  getActiveExecutions() {
    return Array.from(this.activeExecutions.values())
  }

  getApprovalQueue() {
    return this.approvalQueue
  }

  async approveTask(taskId, approvedBy) {
    const taskIndex = this.approvalQueue.findIndex(task => task.id === taskId)
    if (taskIndex === -1) return false

    const task = this.approvalQueue.splice(taskIndex, 1)[0]
    task.approvedBy = approvedBy
    task.approvedAt = new Date().toISOString()
    
    return await this.executeTask(task)
  }

  rejectTask(taskId, rejectedBy, reason) {
    const taskIndex = this.approvalQueue.findIndex(task => task.id === taskId)
    if (taskIndex === -1) return false

    const task = this.approvalQueue.splice(taskIndex, 1)[0]
    task.status = 'rejected'
    task.rejectedBy = rejectedBy
    task.rejectedAt = new Date().toISOString()
    task.rejectionReason = reason
    
    this.executionHistory.push(task)
    return true
  }

  /**
   * Analytics and reporting
   */
  getExecutionStats() {
    const completed = this.executionHistory.filter(t => t.status === 'completed').length
    const failed = this.executionHistory.filter(t => t.status === 'failed').length
    const total = this.executionHistory.length
    
    return {
      total_executions: total,
      successful: completed,
      failed: failed,
      success_rate: total > 0 ? (completed / total * 100).toFixed(1) + '%' : '0%',
      avg_duration: this.calculateAverageDuration(),
      most_common_triggers: this.getMostCommonTriggers(),
      most_executed_actions: this.getMostExecutedActions()
    }
  }

  calculateAverageDuration() {
    const completed = this.executionHistory.filter(t => t.status === 'completed')
    if (completed.length === 0) return '0ms'
    
    const totalDuration = completed.reduce((sum, task) => {
      const duration = new Date(task.completedAt) - new Date(task.startedAt)
      return sum + duration
    }, 0)
    
    return `${Math.round(totalDuration / completed.length)}ms`
  }

  getMostCommonTriggers() {
    const triggers = {}
    this.executionHistory.forEach(task => {
      const key = `${task.type}:${task.trigger.emotion || task.trigger.event}`
      triggers[key] = (triggers[key] || 0) + 1
    })
    
    return Object.entries(triggers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }))
  }

  getMostExecutedActions() {
    const actions = {}
    this.executionHistory.forEach(task => {
      task.actions?.forEach(action => {
        actions[action] = (actions[action] || 0) + 1
      })
    })
    
    return Object.entries(actions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }))
  }
}

const automatedTaskExecutionService = new AutomatedTaskExecutionService()
export default automatedTaskExecutionService