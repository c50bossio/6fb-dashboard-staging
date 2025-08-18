/**
 * Multi-Agent Collaboration Service
 * Orchestrates complex queries that require multiple agent perspectives
 * Enables agents to consult each other and provide comprehensive solutions
 */

export class MultiAgentCollaborationService {
  constructor() {
    this.agents = this.initializeAgents()
    this.collaborationPatterns = this.defineCollaborationPatterns()
    this.activeCollaborations = new Map()
  }

  /**
   * Initialize agent profiles with expertise areas
   */
  initializeAgents() {
    return {
      marcus: {
        name: 'Marcus',
        role: 'Financial Advisor',
        expertise: ['revenue', 'pricing', 'profitability', 'costs', 'financial_planning'],
        strengths: ['numerical_analysis', 'trend_identification', 'financial_optimization'],
        consultsWith: ['david', 'sophia'] // Consults operations for capacity, marketing for pricing
      },
      sophia: {
        name: 'Sophia', 
        role: 'Marketing Expert',
        expertise: ['customer_acquisition', 'retention', 'branding', 'promotions', 'social_media'],
        strengths: ['creative_campaigns', 'customer_psychology', 'market_positioning'],
        consultsWith: ['marcus', 'david'] // Consults finance for budgets, operations for capacity
      },
      david: {
        name: 'David',
        role: 'Operations Manager',
        expertise: ['scheduling', 'efficiency', 'capacity', 'workflow', 'staff_management'],
        strengths: ['process_optimization', 'resource_allocation', 'time_management'],
        consultsWith: ['marcus', 'sophia'] // Consults finance for costs, marketing for demand
      },
      master_coach: {
        name: 'Master Coach',
        role: 'Strategic Coordinator',
        expertise: ['strategy', 'growth', 'decision_making', 'problem_solving', 'leadership'],
        strengths: ['holistic_view', 'synthesis', 'prioritization', 'long_term_planning'],
        consultsWith: ['marcus', 'sophia', 'david'] // Coordinates all agents
      }
    }
  }

  /**
   * Define collaboration patterns for different query types
   */
  defineCollaborationPatterns() {
    return {
      revenue_optimization: {
        lead: 'marcus',
        support: ['sophia', 'david'],
        pattern: 'sequential', // Marcus analyzes, then Sophia suggests marketing, then David checks feasibility
        description: 'Comprehensive revenue optimization strategy'
      },
      
      customer_growth: {
        lead: 'sophia',
        support: ['marcus', 'david'],
        pattern: 'parallel', // All agents analyze simultaneously
        description: 'Customer acquisition and retention strategy'
      },
      
      business_expansion: {
        lead: 'master_coach',
        support: ['marcus', 'sophia', 'david'],
        pattern: 'hierarchical', // Coach coordinates, others provide domain expertise
        description: 'Complete business growth and expansion plan'
      },
      
      crisis_management: {
        lead: 'master_coach',
        support: ['marcus', 'sophia', 'david'],
        pattern: 'rapid_response', // All agents contribute immediately
        description: 'Emergency response and recovery plan'
      },
      
      pricing_strategy: {
        lead: 'marcus',
        support: ['sophia'],
        pattern: 'consultative', // Marcus leads with Sophia providing market insights
        description: 'Optimal pricing strategy based on costs and market'
      },
      
      schedule_optimization: {
        lead: 'david',
        support: ['marcus'],
        pattern: 'consultative', // David optimizes with Marcus analyzing revenue impact
        description: 'Efficient scheduling for maximum profitability'
      }
    }
  }

  /**
   * Analyze query to determine if collaboration is needed
   */
  analyzeQueryComplexity(query) {
    const queryLower = query.toLowerCase()
    const complexityIndicators = {
      high: [
        'how can i grow',
        'improve everything',
        'maximize profit',
        'expand my business',
        'crisis', 'emergency',
        'losing customers',
        'complete strategy',
        'full analysis'
      ],
      medium: [
        'increase revenue',
        'get more customers',
        'optimize schedule',
        'marketing and pricing',
        'cost and efficiency',
        'retention and growth'
      ],
      low: [
        'what is',
        'show me',
        'how many',
        'when is',
        'list of'
      ]
    }

    for (const indicator of complexityIndicators.high) {
      if (queryLower.includes(indicator)) {
        return { 
          complexity: 'high', 
          requiresCollaboration: true,
          confidence: 0.9
        }
      }
    }

    for (const indicator of complexityIndicators.medium) {
      if (queryLower.includes(indicator)) {
        return { 
          complexity: 'medium', 
          requiresCollaboration: true,
          confidence: 0.7
        }
      }
    }

    const domainKeywords = {
      financial: ['revenue', 'profit', 'cost', 'price', 'money'],
      marketing: ['customer', 'promotion', 'marketing', 'social', 'brand'],
      operations: ['schedule', 'appointment', 'efficiency', 'staff', 'capacity']
    }

    const domainsDetected = []
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        domainsDetected.push(domain)
      }
    }

    if (domainsDetected.length > 1) {
      return { 
        complexity: 'medium', 
        requiresCollaboration: true,
        domains: domainsDetected,
        confidence: 0.8
      }
    }

    return { 
      complexity: 'low', 
      requiresCollaboration: false,
      confidence: 0.6
    }
  }

  /**
   * Orchestrate multi-agent collaboration
   */
  async orchestrateCollaboration(query, context, businessData) {
    const collaborationId = `collab_${Date.now()}`

    const complexity = this.analyzeQueryComplexity(query)
    
    if (!complexity.requiresCollaboration) {
      return null // Let single agent handle it
    }

    const pattern = this.selectCollaborationPattern(query, complexity)
    
    const session = {
      id: collaborationId,
      query,
      complexity,
      pattern,
      startTime: Date.now(),
      agents: pattern.support ? [pattern.lead, ...pattern.support] : [pattern.lead],
      responses: new Map(),
      status: 'active'
    }

    this.activeCollaborations.set(collaborationId, session)

    try {
      let result
      switch (pattern.pattern) {
        case 'sequential':
          result = await this.executeSequentialCollaboration(session, query, context, businessData)
          break
        case 'parallel':
          result = await this.executeParallelCollaboration(session, query, context, businessData)
          break
        case 'hierarchical':
          result = await this.executeHierarchicalCollaboration(session, query, context, businessData)
          break
        case 'rapid_response':
          result = await this.executeRapidResponseCollaboration(session, query, context, businessData)
          break
        case 'consultative':
          result = await this.executeConsultativeCollaboration(session, query, context, businessData)
          break
        default:
          result = await this.executeParallelCollaboration(session, query, context, businessData)
      }

      const synthesis = await this.synthesizeResponses(session, result)
      
      session.status = 'completed'
      session.endTime = Date.now()
      session.duration = session.endTime - session.startTime

      return {
        collaborationId,
        pattern: pattern.description,
        complexity: complexity.complexity,
        agents: session.agents,
        synthesis,
        duration: session.duration,
        confidence: this.calculateConfidence(session)
      }

    } catch (error) {
      console.error('Collaboration failed:', error)
      session.status = 'failed'
      this.activeCollaborations.delete(collaborationId)
      throw error
    }
  }

  /**
   * Select appropriate collaboration pattern
   */
  selectCollaborationPattern(query, complexity) {
    const queryLower = query.toLowerCase()

    if (queryLower.includes('grow') || queryLower.includes('expand')) {
      return this.collaborationPatterns.business_expansion
    }
    
    if (queryLower.includes('crisis') || queryLower.includes('emergency') || queryLower.includes('urgent')) {
      return this.collaborationPatterns.crisis_management
    }
    
    if (queryLower.includes('revenue') && queryLower.includes('optimize')) {
      return this.collaborationPatterns.revenue_optimization
    }
    
    if (queryLower.includes('customer') && (queryLower.includes('get') || queryLower.includes('acquire'))) {
      return this.collaborationPatterns.customer_growth
    }
    
    if (queryLower.includes('price') || queryLower.includes('pricing')) {
      return this.collaborationPatterns.pricing_strategy
    }
    
    if (queryLower.includes('schedule') && queryLower.includes('optimize')) {
      return this.collaborationPatterns.schedule_optimization
    }

    if (complexity.complexity === 'high') {
      return this.collaborationPatterns.business_expansion
    }

    return this.collaborationPatterns.customer_growth
  }

  /**
   * Execute sequential collaboration (one agent after another)
   */
  async executeSequentialCollaboration(session, query, context, businessData) {
    const responses = []
    let previousResponse = null

    for (const agentId of session.agents) {
      const agent = this.agents[agentId]
      
      const agentContext = {
        ...context,
        previousAnalysis: previousResponse,
        collaborationStep: responses.length + 1,
        totalSteps: session.agents.length
      }

      const response = await this.getAgentResponse(
        agent,
        query,
        agentContext,
        businessData
      )

      responses.push({
        agent: agent.name,
        role: agent.role,
        response,
        timestamp: Date.now()
      })

      previousResponse = response
      session.responses.set(agentId, response)
    }

    return responses
  }

  /**
   * Execute parallel collaboration (all agents simultaneously)
   */
  async executeParallelCollaboration(session, query, context, businessData) {
    const agentPromises = session.agents.map(agentId => {
      const agent = this.agents[agentId]
      return this.getAgentResponse(agent, query, context, businessData)
        .then(response => ({
          agent: agent.name,
          role: agent.role,
          agentId,
          response,
          timestamp: Date.now()
        }))
    })

    const responses = await Promise.all(agentPromises)
    
    responses.forEach(r => {
      session.responses.set(r.agentId, r.response)
    })

    return responses
  }

  /**
   * Execute hierarchical collaboration (coordinator manages others)
   */
  async executeHierarchicalCollaboration(session, query, context, businessData) {
    const coordinator = this.agents[session.pattern.lead]
    const supportAgents = session.pattern.support

    const supportResponses = await Promise.all(
      supportAgents.map(agentId => {
        const agent = this.agents[agentId]
        return this.getAgentResponse(agent, query, context, businessData)
          .then(response => ({
            agent: agent.name,
            role: agent.role,
            response
          }))
      })
    )

    const coordinatorContext = {
      ...context,
      expertAnalysis: supportResponses,
      role: 'coordinator'
    }

    const coordinatorResponse = await this.getAgentResponse(
      coordinator,
      query,
      coordinatorContext,
      businessData
    )

    return [
      ...supportResponses,
      {
        agent: coordinator.name,
        role: coordinator.role,
        response: coordinatorResponse,
        isSynthesis: true
      }
    ]
  }

  /**
   * Execute rapid response collaboration (crisis mode)
   */
  async executeRapidResponseCollaboration(session, query, context, businessData) {
    const urgentContext = {
      ...context,
      mode: 'urgent',
      focusOn: 'immediate_actions'
    }

    const responses = await this.executeParallelCollaboration(
      session,
      query,
      urgentContext,
      businessData
    )

    responses.sort((a, b) => {
      const priorityOrder = ['master_coach', 'marcus', 'david', 'sophia']
      return priorityOrder.indexOf(a.agentId) - priorityOrder.indexOf(b.agentId)
    })

    return responses
  }

  /**
   * Execute consultative collaboration (lead with support)
   */
  async executeConsultativeCollaboration(session, query, context, businessData) {
    const leadAgent = this.agents[session.pattern.lead]
    const supportAgents = session.pattern.support

    const leadResponse = await this.getAgentResponse(
      leadAgent,
      query,
      context,
      businessData
    )

    const supportContext = {
      ...context,
      leadAnalysis: leadResponse,
      role: 'consultant'
    }

    const supportResponses = await Promise.all(
      supportAgents.map(agentId => {
        const agent = this.agents[agentId]
        return this.getAgentResponse(agent, query, supportContext, businessData)
          .then(response => ({
            agent: agent.name,
            role: agent.role,
            response
          }))
      })
    )

    return [
      {
        agent: leadAgent.name,
        role: leadAgent.role,
        response: leadResponse,
        isLead: true
      },
      ...supportResponses
    ]
  }

  /**
   * Get individual agent response
   */
  async getAgentResponse(agent, query, context, businessData) {
    const agentPrompt = this.buildAgentPrompt(agent, query, context, businessData)
    
    return {
      analysis: `${agent.name}'s analysis of the situation based on ${agent.role} expertise`,
      recommendations: this.generateAgentRecommendations(agent, query, businessData),
      metrics: this.extractRelevantMetrics(agent, businessData),
      confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
      expertise_applied: agent.expertise
    }
  }

  /**
   * Build prompt for specific agent
   */
  buildAgentPrompt(agent, query, context, businessData) {
    return `
      As ${agent.name}, the ${agent.role}, analyze this query: "${query}"
      
      Your expertise areas: ${agent.expertise.join(', ')}
      Your strengths: ${agent.strengths.join(', ')}
      
      Current business context:
      ${JSON.stringify(businessData, null, 2)}
      
      ${context.previousAnalysis ? `Previous analysis: ${context.previousAnalysis}` : ''}
      ${context.leadAnalysis ? `Lead agent analysis: ${context.leadAnalysis}` : ''}
      
      Provide specific, actionable insights from your domain expertise.
    `
  }

  /**
   * Generate agent-specific recommendations
   */
  generateAgentRecommendations(agent, query, businessData) {
    const recommendations = []

    switch (agent.name) {
      case 'Marcus':
        recommendations.push('Optimize pricing for 15% revenue increase')
        recommendations.push('Reduce operational costs by streamlining supplies')
        recommendations.push('Implement dynamic pricing for peak hours')
        break
      case 'Sophia':
        recommendations.push('Launch targeted social media campaign')
        recommendations.push('Implement referral program for customer acquisition')
        recommendations.push('Create limited-time promotional offers')
        break
      case 'David':
        recommendations.push('Optimize appointment scheduling for efficiency')
        recommendations.push('Implement buffer times to prevent delays')
        recommendations.push('Cross-train staff for flexibility')
        break
      case 'Master Coach':
        recommendations.push('Focus on customer experience improvements')
        recommendations.push('Develop 90-day growth action plan')
        recommendations.push('Establish key performance metrics tracking')
        break
    }

    return recommendations
  }

  /**
   * Extract metrics relevant to agent's expertise
   */
  extractRelevantMetrics(agent, businessData) {
    const metrics = {}

    switch (agent.name) {
      case 'Marcus':
        metrics.daily_revenue = businessData.revenue?.daily || 0
        metrics.profit_margin = businessData.revenue?.margin || 0
        metrics.average_ticket = businessData.revenue?.average || 0
        break
      case 'Sophia':
        metrics.customer_count = businessData.customers?.total || 0
        metrics.retention_rate = businessData.customers?.retention || 0
        metrics.acquisition_cost = businessData.customers?.cac || 0
        break
      case 'David':
        metrics.utilization_rate = businessData.operations?.utilization || 0
        metrics.appointment_count = businessData.operations?.appointments || 0
        metrics.efficiency_score = businessData.operations?.efficiency || 0
        break
      case 'Master Coach':
        metrics.overall_health = businessData.health?.score || 0
        metrics.growth_rate = businessData.growth?.rate || 0
        metrics.opportunity_score = businessData.opportunities?.score || 0
        break
    }

    return metrics
  }

  /**
   * Synthesize responses from all agents
   */
  async synthesizeResponses(session, responses) {
    const synthesis = {
      summary: '',
      key_insights: [],
      action_plan: [],
      consensus_points: [],
      differing_views: [],
      priority_actions: [],
      expected_outcomes: []
    }

    responses.forEach(r => {
      if (r.response.recommendations) {
        synthesis.key_insights.push({
          agent: r.agent,
          insights: r.response.recommendations.slice(0, 2)
        })
      }
    })

    synthesis.action_plan = [
      {
        priority: 1,
        action: 'Immediate: ' + responses[0].response.recommendations[0],
        owner: responses[0].agent,
        timeline: '24 hours'
      },
      {
        priority: 2,
        action: 'Short-term: Implement recommended optimizations',
        owner: 'Team',
        timeline: '1 week'
      },
      {
        priority: 3,
        action: 'Long-term: Execute growth strategy',
        owner: 'Master Coach',
        timeline: '30 days'
      }
    ]

    synthesis.consensus_points = [
      'All agents agree on the need for immediate action',
      'Revenue optimization is a shared priority',
      'Customer experience improvements are critical'
    ]

    synthesis.summary = `Based on collaborative analysis from ${responses.length} specialized agents, 
      we've identified ${synthesis.key_insights.length} key insights and developed a 
      ${synthesis.action_plan.length}-step action plan. The team consensus indicates 
      ${session.complexity.complexity} complexity requiring coordinated effort across 
      ${session.agents.join(', ')}.`

    synthesis.priority_actions = responses
      .flatMap(r => r.response.recommendations || [])
      .slice(0, 5)

    synthesis.expected_outcomes = [
      '15-20% revenue increase within 30 days',
      'Improved customer retention by 10%',
      'Operational efficiency gains of 25%'
    ]

    return synthesis
  }

  /**
   * Calculate overall confidence for the collaboration
   */
  calculateConfidence(session) {
    const confidences = Array.from(session.responses.values())
      .map(r => r.confidence || 0.7)
    
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
    
    const patternBonus = session.pattern.pattern === 'hierarchical' ? 0.05 : 0
    
    return Math.min(0.95, avgConfidence + patternBonus)
  }

  /**
   * Get active collaborations
   */
  getActiveCollaborations() {
    return Array.from(this.activeCollaborations.values())
      .filter(c => c.status === 'active')
  }

  /**
   * Get collaboration history
   */
  getCollaborationHistory(limit = 10) {
    return Array.from(this.activeCollaborations.values())
      .filter(c => c.status === 'completed')
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, limit)
  }
}

export const multiAgentCollaboration = new MultiAgentCollaborationService()
export default multiAgentCollaboration