/**
 * Enhanced AI Orchestrator with Full App Integration
 * Provides AI agents with direct access to:
 * - Real-time analytics and business data
 * - Booking and appointment management
 * - Customer data and insights
 * - Calendar operations
 * - Payment and financial data
 */

export class EnhancedAIOrchestrator {
  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9999'
    this.agents = this.initializeAgents()
  }

  initializeAgents() {
    return {
      master_coach: {
        name: 'Master Coach',
        capabilities: ['strategic_planning', 'business_growth', 'decision_making'],
        dataAccess: ['analytics', 'financial', 'customer_insights', 'competitive_analysis']
      },
      financial_advisor: {
        name: 'Financial Advisor',
        capabilities: ['revenue_optimization', 'pricing_strategy', 'cost_analysis'],
        dataAccess: ['revenue', 'expenses', 'payments', 'financial_forecasts']
      },
      operations_manager: {
        name: 'Operations Manager',
        capabilities: ['scheduling', 'staff_management', 'workflow_optimization'],
        dataAccess: ['appointments', 'staff_schedules', 'availability', 'capacity_planning']
      },
      client_acquisition: {
        name: 'Client Acquisition Specialist',
        capabilities: ['marketing', 'customer_acquisition', 'retention'],
        dataAccess: ['customer_data', 'booking_patterns', 'marketing_campaigns', 'reviews']
      }
    }
  }

  /**
   * Process message with full app context
   */
  async processMessage(message, context = {}) {
    try {
      // 1. Gather comprehensive business context
      const businessContext = await this.gatherBusinessContext(context.userId)
      
      // 2. Determine best agent for the request
      const selectedAgent = this.selectAgent(message, businessContext)
      
      // 3. Get agent-specific data access
      const agentData = await this.getAgentData(selectedAgent, businessContext)
      
      // 4. Generate AI response with full context
      const response = await this.generateResponse(message, selectedAgent, agentData, businessContext)
      
      // 5. Execute any suggested actions
      const actions = await this.executeActions(response.suggested_actions, context.userId)
      
      return {
        agent: selectedAgent.name,
        response: response.message,
        data_sources: agentData.sources,
        actions_taken: actions,
        business_context: businessContext,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('AI Orchestrator error:', error)
      return {
        agent: 'System',
        response: 'I encountered an issue accessing your business data. Let me provide general guidance instead.',
        error: error.message,
        fallback: true
      }
    }
  }

  /**
   * Gather comprehensive business context from all app systems
   */
  async gatherBusinessContext(userId) {
    const context = {
      user_id: userId,
      timestamp: new Date().toISOString()
    }

    try {
      // Get live analytics
      const analyticsRes = await fetch(`${this.baseUrl}/api/analytics/live-data?format=json`)
      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json()
        context.analytics = analytics.success ? analytics.data : null
      }

      // Get current appointments
      const appointmentsRes = await fetch(`${this.baseUrl}/api/appointments`)
      if (appointmentsRes.ok) {
        const appointments = await appointmentsRes.json()
        context.appointments = appointments.success ? appointments.data : []
      }

      // Get appointment availability
      const availabilityRes = await fetch(`${this.baseUrl}/api/appointments/availability`)
      if (availabilityRes.ok) {
        const availability = await availabilityRes.json()
        context.availability = availability.success ? availability.data : null
      }

      // Get customer insights (if customer API exists)
      try {
        const customersRes = await fetch(`${this.baseUrl}/api/customers`)
        if (customersRes.ok) {
          const customers = await customersRes.json()
          context.customers = customers.success ? customers.data : []
        }
      } catch (e) {
        // Customer API might not exist yet
      }

      // Get service catalog
      try {
        const servicesRes = await fetch(`${this.baseUrl}/api/services`)
        if (servicesRes.ok) {
          const services = await servicesRes.json()
          context.services = services.success ? services.data : []
        }
      } catch (e) {
        // Services API might not exist yet
      }

      return context

    } catch (error) {
      console.warn('Could not gather full business context:', error.message)
      return context
    }
  }

  /**
   * Select the best agent based on message content and context
   */
  selectAgent(message, businessContext) {
    const msgLower = message.toLowerCase()
    
    // Financial keywords
    if (msgLower.includes('revenue') || msgLower.includes('money') || 
        msgLower.includes('profit') || msgLower.includes('pricing') ||
        msgLower.includes('cost') || msgLower.includes('payment')) {
      return this.agents.financial_advisor
    }
    
    // Operations keywords  
    if (msgLower.includes('schedule') || msgLower.includes('appointment') ||
        msgLower.includes('booking') || msgLower.includes('staff') ||
        msgLower.includes('calendar') || msgLower.includes('availability')) {
      return this.agents.operations_manager
    }
    
    // Marketing/Customer keywords
    if (msgLower.includes('customer') || msgLower.includes('client') ||
        msgLower.includes('marketing') || msgLower.includes('review') ||
        msgLower.includes('social') || msgLower.includes('promotion')) {
      return this.agents.client_acquisition
    }
    
    // Default to master coach for strategic questions
    return this.agents.master_coach
  }

  /**
   * Get data specific to the selected agent
   */
  async getAgentData(agent, businessContext) {
    const agentData = {
      sources: [],
      data: {}
    }

    // Financial Advisor gets revenue and payment data
    if (agent.name === 'Financial Advisor') {
      if (businessContext.analytics) {
        agentData.data.revenue = {
          daily: businessContext.analytics.daily_revenue,
          monthly: businessContext.analytics.monthly_revenue,
          growth: businessContext.analytics.revenue_growth,
          average_service_price: businessContext.analytics.average_service_price
        }
        agentData.sources.push('live_analytics')
      }
    }

    // Operations Manager gets scheduling and appointment data
    if (agent.name === 'Operations Manager') {
      agentData.data.appointments = businessContext.appointments || []
      agentData.data.availability = businessContext.availability
      if (businessContext.analytics) {
        agentData.data.occupancy = businessContext.analytics.occupancy_rate
        agentData.data.peak_hours = businessContext.analytics.peak_booking_hours
      }
      agentData.sources.push('appointments', 'availability', 'analytics')
    }

    // Client Acquisition gets customer and marketing data
    if (agent.name === 'Client Acquisition Specialist') {
      agentData.data.customers = businessContext.customers || []
      if (businessContext.analytics) {
        agentData.data.customer_metrics = {
          total: businessContext.analytics.total_customers,
          new_this_month: businessContext.analytics.new_customers_this_month,
          retention_rate: businessContext.analytics.customer_retention_rate
        }
      }
      agentData.sources.push('customers', 'analytics')
    }

    return agentData
  }

  /**
   * Generate AI response with full business context
   */
  async generateResponse(message, agent, agentData, businessContext) {
    // Create comprehensive context for AI
    const aiContext = {
      message,
      agent: agent.name,
      business_data: agentData.data,
      current_metrics: businessContext.analytics,
      data_sources: agentData.sources,
      timestamp: new Date().toISOString()
    }

    // Enhanced prompt with business context
    const enhancedPrompt = this.createEnhancedPrompt(message, agent, aiContext)

    try {
      // Call the enhanced chat API with full context
      const response = await fetch(`${this.baseUrl}/api/ai/analytics-enhanced-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enhancedPrompt,
          context: 'ai_orchestrator',
          agent_context: aiContext
        })
      })

      if (response.ok) {
        const data = await response.json()
        return {
          message: data.message || data.response || 'I can help you with your business needs.',
          suggested_actions: this.extractActions(data.message || data.response || ''),
          confidence: data.confidence || 0.8
        }
      }
    } catch (error) {
      console.error('AI response generation failed:', error)
    }

    // Fallback response with available data
    return this.generateFallbackResponse(message, agent, agentData)
  }

  /**
   * Create enhanced prompt with business context
   */
  createEnhancedPrompt(message, agent, context) {
    let prompt = `As the ${agent.name} for this barbershop, respond to: "${message}"\n\n`
    
    prompt += `CURRENT BUSINESS CONTEXT:\n`
    
    if (context.current_metrics) {
      prompt += `📊 Today's Metrics:\n`
      prompt += `- Revenue: $${context.current_metrics.daily_revenue || 0}\n`
      prompt += `- Appointments: ${context.current_metrics.pending_appointments || 0} pending\n`
      prompt += `- Occupancy: ${context.current_metrics.occupancy_rate || 0}%\n\n`
    }

    if (context.business_data.appointments?.length) {
      prompt += `📅 Recent Appointments: ${context.business_data.appointments.length} found\n`
    }

    if (context.business_data.revenue) {
      prompt += `💰 Revenue Data Available: Daily $${context.business_data.revenue.daily}, Growth ${context.business_data.revenue.growth}%\n`
    }

    prompt += `\nProvide specific, actionable advice based on this real data. If you recommend any actions (like booking appointments, adjusting prices, etc.), clearly state them.`

    return prompt
  }

  /**
   * Extract actionable suggestions from AI response
   */
  extractActions(response) {
    const actions = []
    
    // Look for booking-related actions
    if (response.includes('book') || response.includes('appointment') || response.includes('schedule')) {
      actions.push({ type: 'booking_suggestion', priority: 'medium' })
    }
    
    // Look for pricing actions
    if (response.includes('price') || response.includes('cost') || response.includes('charge')) {
      actions.push({ type: 'pricing_suggestion', priority: 'low' })
    }
    
    // Look for marketing actions
    if (response.includes('promote') || response.includes('market') || response.includes('advertise')) {
      actions.push({ type: 'marketing_suggestion', priority: 'medium' })
    }
    
    return actions
  }

  /**
   * Generate fallback response when AI services fail
   */
  generateFallbackResponse(message, agent, agentData) {
    const hasData = Object.keys(agentData.data).length > 0
    
    let response = `As your ${agent.name}, I'm here to help. `
    
    if (hasData) {
      response += `I can see your current business data and will provide specific recommendations based on your actual performance.`
    } else {
      response += `I'm having trouble accessing your live business data right now, but I can still provide general guidance.`
    }
    
    return {
      message: response,
      suggested_actions: [],
      confidence: hasData ? 0.7 : 0.5
    }
  }

  /**
   * Execute suggested actions (placeholder for future implementation)
   */
  async executeActions(actions, userId) {
    const executed = []
    
    for (const action of actions) {
      // Future: Implement actual action execution
      // For now, just log the suggestions
      console.log(`Action suggested: ${action.type} (priority: ${action.priority})`)
      executed.push({ ...action, status: 'suggested' })
    }
    
    return executed
  }
}

// Export singleton instance
export const aiOrchestrator = new EnhancedAIOrchestrator()
export default aiOrchestrator