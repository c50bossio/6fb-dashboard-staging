/**
 * AI Agent Selection and Routing Optimization
 * Intelligently routes queries to the most appropriate AI agent
 */

export class AIAgentRouter {
  constructor() {
    this.agents = new Map()
    this.routingHistory = []
    this.performanceMetrics = new Map()
    this.loadBalancing = new Map()
    this.maxHistorySize = 1000
    
    this.initializeAgents()
    
    this.initializeRoutingPatterns()
  }

  /**
   * Initialize available AI agents with their capabilities
   */
  initializeAgents() {
    const agents = [
      {
        id: 'marcus',
        name: 'Marcus (Strategy)',
        specialties: ['strategy', 'business planning', 'growth', 'analysis', 'decisions', 'goals', 'vision'],
        keywords: ['strategy', 'plan', 'grow', 'future', 'vision', 'goals', 'decision', 'analyze', 'expand', 'compete'],
        responseTime: 850,
        accuracy: 0.92,
        availability: 0.98,
        cost: 0.08, // Cost per query
        maxConcurrent: 5,
        currentLoad: 0
      },
      {
        id: 'sophia',
        name: 'Sophia (Marketing)',
        specialties: ['marketing', 'customer acquisition', 'social media', 'campaigns', 'branding', 'promotions'],
        keywords: ['marketing', 'customer', 'promotion', 'campaign', 'social', 'brand', 'advertise', 'reach', 'engagement'],
        responseTime: 720,
        accuracy: 0.89,
        availability: 0.97,
        cost: 0.06,
        maxConcurrent: 8,
        currentLoad: 0
      },
      {
        id: 'david',
        name: 'David (Operations)',
        specialties: ['operations', 'efficiency', 'staff management', 'workflows', 'scheduling', 'processes'],
        keywords: ['operation', 'staff', 'schedule', 'workflow', 'process', 'efficiency', 'manage', 'team', 'organize'],
        responseTime: 680,
        accuracy: 0.91,
        availability: 0.99,
        cost: 0.05,
        maxConcurrent: 6,
        currentLoad: 0
      },
      {
        id: 'elena',
        name: 'Elena (Finance)',
        specialties: ['finance', 'revenue', 'costs', 'budgeting', 'pricing', 'profitability', 'accounting'],
        keywords: ['money', 'revenue', 'cost', 'price', 'profit', 'budget', 'financial', 'expense', 'income', 'accounting'],
        responseTime: 790,
        accuracy: 0.94,
        availability: 0.96,
        cost: 0.07,
        maxConcurrent: 4,
        currentLoad: 0
      },
      {
        id: 'alex',
        name: 'Alex (Client Relations)',
        specialties: ['customer service', 'client relations', 'communication', 'satisfaction', 'retention'],
        keywords: ['client', 'customer', 'service', 'satisfaction', 'communication', 'relationship', 'retention', 'feedback'],
        responseTime: 650,
        accuracy: 0.87,
        availability: 0.98,
        cost: 0.04,
        maxConcurrent: 10,
        currentLoad: 0
      },
      {
        id: 'jordan',
        name: 'Jordan (Brand)',
        specialties: ['branding', 'design', 'identity', 'reputation', 'image', 'positioning'],
        keywords: ['brand', 'design', 'image', 'reputation', 'identity', 'style', 'appearance', 'perception'],
        responseTime: 820,
        accuracy: 0.88,
        availability: 0.95,
        cost: 0.06,
        maxConcurrent: 4,
        currentLoad: 0
      },
      {
        id: 'taylor',
        name: 'Taylor (Growth)',
        specialties: ['growth hacking', 'scaling', 'innovation', 'expansion', 'optimization'],
        keywords: ['growth', 'scale', 'expand', 'optimize', 'innovation', 'increase', 'improve', 'enhance'],
        responseTime: 900,
        accuracy: 0.90,
        availability: 0.94,
        cost: 0.09,
        maxConcurrent: 3,
        currentLoad: 0
      }
    ]
    
    agents.forEach(agent => {
      this.agents.set(agent.id, {
        ...agent,
        totalQueries: 0,
        successfulQueries: 0,
        averageResponseTime: agent.responseTime,
        lastUsed: null,
        performanceScore: this.calculateInitialPerformanceScore(agent)
      })
      
      this.performanceMetrics.set(agent.id, {
        responsetimes: [agent.responseTime],
        accuracyScores: [agent.accuracy],
        successRate: agent.accuracy,
        loadHistory: [0]
      })
    })
  }

  /**
   * Initialize routing patterns for common business scenarios
   */
  initializeRoutingPatterns() {
    this.routingPatterns = [
      {
        pattern: /book|appointment|schedule|calendar|availability/i,
        primaryAgent: 'david',
        fallbackAgents: ['alex'],
        confidence: 0.85
      },
      {
        pattern: /revenue|money|profit|financial|income|cost|price|budget/i,
        primaryAgent: 'elena',
        fallbackAgents: ['marcus'],
        confidence: 0.92
      },
      {
        pattern: /marketing|customer|promotion|campaign|social|brand|advertis/i,
        primaryAgent: 'sophia',
        fallbackAgents: ['jordan', 'alex'],
        confidence: 0.88
      },
      {
        pattern: /staff|employee|team|schedule|operation|workflow|manage/i,
        primaryAgent: 'david',
        fallbackAgents: ['marcus'],
        confidence: 0.90
      },
      {
        pattern: /strategy|plan|grow|future|vision|goal|decision|expand/i,
        primaryAgent: 'marcus',
        fallbackAgents: ['taylor'],
        confidence: 0.87
      },
      {
        pattern: /client|customer service|satisfaction|relationship|retention/i,
        primaryAgent: 'alex',
        fallbackAgents: ['sophia'],
        confidence: 0.89
      },
      {
        pattern: /brand|design|image|reputation|identity|style|appearance/i,
        primaryAgent: 'jordan',
        fallbackAgents: ['sophia'],
        confidence: 0.86
      },
      {
        pattern: /growth|scale|optimize|innovation|improve|enhance|increase/i,
        primaryAgent: 'taylor',
        fallbackAgents: ['marcus'],
        confidence: 0.85
      }
    ]
  }

  /**
   * Route query to optimal agent with customer intelligence
   */
  async routeQuery(message, context = {}) {
    const routingStart = Date.now()
    
    try {
      // Enhance context with customer intelligence if available
      const enhancedContext = await this.enhanceContextWithCustomerIntelligence(context)
      
      const analysis = this.analyzeQuery(message, enhancedContext)
      
      const candidates = this.getCandidateAgents(analysis, enhancedContext)
      
      const selectedAgent = this.selectOptimalAgent(candidates, analysis, enhancedContext)
      
      const routing = {
        id: this.generateRoutingId(),
        timestamp: Date.now(),
        message: message.substring(0, 100), // Truncated for storage
        selectedAgent: selectedAgent.id,
        candidates: candidates.map(c => c.id),
        confidence: analysis.confidence,
        reason: analysis.reason,
        context: this.sanitizeContext(enhancedContext),
        customerIntelligence: enhancedContext.customerIntelligence ? {
          hasData: true,
          clv: enhancedContext.customerIntelligence.clv,
          healthScore: enhancedContext.customerIntelligence.health_score,
          churnRisk: enhancedContext.customerIntelligence.churn_risk_score,
          segment: enhancedContext.customerIntelligence.segment
        } : null,
        routingTime: Date.now() - routingStart
      }
      
      this.recordRouting(routing)
      
      this.updateAgentLoad(selectedAgent.id, 1)
      
      return {
        agent: selectedAgent,
        routing,
        alternatives: candidates.slice(1, 3), // Top 2 alternatives
        confidence: analysis.confidence,
        customerContext: enhancedContext.customerIntelligence
      }
      
    } catch (error) {
      console.error('Agent routing error:', error)
      
      const fallbackAgent = this.getFallbackAgent()
      return {
        agent: fallbackAgent,
        routing: {
          id: this.generateRoutingId(),
          selectedAgent: fallbackAgent.id,
          confidence: 0.5,
          reason: 'Fallback due to routing error',
          error: error.message
        },
        alternatives: [],
        confidence: 0.5
      }
    }
  }

  /**
   * Analyze query to determine intent and requirements
   */
  analyzeQuery(message, context) {
    const lowerMessage = message.toLowerCase()
    let bestMatch = null
    let maxScore = 0
    let matchedKeywords = []
    
    for (const pattern of this.routingPatterns) {
      if (pattern.pattern.test(message)) {
        const score = pattern.confidence + (Math.random() * 0.1 - 0.05) // Small variance
        if (score > maxScore) {
          maxScore = score
          bestMatch = {
            agentId: pattern.primaryAgent,
            fallbacks: pattern.fallbackAgents,
            confidence: score,
            reason: 'Pattern match'
          }
        }
      }
    }
    
    const keywordScores = new Map()
    
    for (const [agentId, agent] of this.agents) {
      let score = 0
      const matches = []
      
      agent.keywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) {
          score += 1
          matches.push(keyword)
        }
      })
      
      agent.specialties.forEach(specialty => {
        if (lowerMessage.includes(specialty)) {
          score += 2
          matches.push(specialty + ' (specialty)')
        }
      })
      
      if (score > 0) {
        keywordScores.set(agentId, {
          score,
          matches,
          confidence: Math.min(score / 5, 1) // Normalize to 0-1
        })
      }
    }
    
    if (!bestMatch && keywordScores.size > 0) {
      const topKeywordMatch = Array.from(keywordScores.entries())
        .sort((a, b) => b[1].score - a[1].score)[0]
      
      bestMatch = {
        agentId: topKeywordMatch[0],
        fallbacks: [],
        confidence: topKeywordMatch[1].confidence,
        reason: 'Keyword analysis',
        matches: topKeywordMatch[1].matches
      }
      matchedKeywords = topKeywordMatch[1].matches
    }
    
    if (context.previousAgent && context.conversationContinuation) {
      bestMatch = {
        agentId: context.previousAgent,
        fallbacks: [],
        confidence: 0.7,
        reason: 'Conversation continuity'
      }
    }
    
    if (!bestMatch) {
      bestMatch = {
        agentId: 'marcus', // Default to strategy agent
        fallbacks: ['alex'],
        confidence: 0.6,
        reason: 'Default routing'
      }
    }
    
    return {
      ...bestMatch,
      matchedKeywords,
      queryLength: message.length,
      urgency: this.detectUrgency(message),
      complexity: this.detectComplexity(message)
    }
  }

  /**
   * Enhance context with customer intelligence data
   */
  async enhanceContextWithCustomerIntelligence(context) {
    const enhancedContext = { ...context }
    
    // If we have customer and barbershop IDs, fetch customer intelligence
    if (context.customerId && context.barbershopId) {
      try {
        // AI data service integration would be handled via API calls
        // For now, use contextual analysis without external data service
        
        // Placeholder for customer intelligence data
        const intelligenceData = {
          has_data: false,
          intelligence: [],
          customers: [],
          loyalty: []
        }
          
        if (intelligenceData.has_data && intelligenceData.intelligence.length > 0) {
            const customerIntel = intelligenceData.intelligence[0]
            const customerData = intelligenceData.customers[0]
            const loyaltyData = intelligenceData.loyalty[0]
            
            enhancedContext.customerIntelligence = {
              clv: customerIntel.clv || 0,
              health_score: customerIntel.health_score || 0,
              churn_risk_score: customerIntel.churn_risk_score || 0,
              last_purchase_days_ago: customerIntel.last_purchase_days_ago || 0,
              visit_frequency_score: customerIntel.visit_frequency_score || 0,
              satisfaction_score: customerIntel.satisfaction_score || 0,
              segment: customerIntel.segment || 'unknown',
              loyalty_tier: loyaltyData?.tier || 'bronze',
              loyalty_points: loyaltyData?.points || 0,
              is_vip: (customerIntel.clv || 0) > 500 || (loyaltyData?.tier === 'platinum'),
              needs_attention: customerIntel.churn_risk_score > 0.7 || customerIntel.health_score < 0.3
            }
        }
      } catch (error) {
        console.warn('Could not fetch customer intelligence:', error.message)
      }
    }
    
    return enhancedContext
  }

  /**
   * Get candidate agents based on analysis and customer intelligence
   */
  getCandidateAgents(analysis, context = {}) {
    const candidates = []
    
    const primaryAgent = this.agents.get(analysis.agentId)
    if (primaryAgent && this.isAgentAvailable(primaryAgent)) {
      let score = analysis.confidence * primaryAgent.performanceScore
      
      // Apply customer intelligence modifiers
      if (context.customerIntelligence) {
        score = this.applyCustomerIntelligenceModifiers(score, primaryAgent, context.customerIntelligence)
      }
      
      candidates.push({
        ...primaryAgent,
        score,
        reason: 'Primary match'
      })
    }
    
    if (analysis.fallbacks) {
      analysis.fallbacks.forEach(fallbackId => {
        const agent = this.agents.get(fallbackId)
        if (agent && this.isAgentAvailable(agent)) {
          let score = (analysis.confidence * 0.8) * agent.performanceScore
          
          // Apply customer intelligence modifiers
          if (context.customerIntelligence) {
            score = this.applyCustomerIntelligenceModifiers(score, agent, context.customerIntelligence)
          }
          
          candidates.push({
            ...agent,
            score,
            reason: 'Fallback option'
          })
        }
      })
    }
    
    const topPerformers = Array.from(this.agents.values())
      .filter(agent => this.isAgentAvailable(agent))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3)
    
    topPerformers.forEach(agent => {
      if (!candidates.find(c => c.id === agent.id)) {
        let score = 0.5 * agent.performanceScore
        
        // Apply customer intelligence modifiers
        if (context.customerIntelligence) {
          score = this.applyCustomerIntelligenceModifiers(score, agent, context.customerIntelligence)
        }
        
        candidates.push({
          ...agent,
          score,
          reason: 'High performer'
        })
      }
    })
    
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Top 5 candidates
  }

  /**
   * Apply customer intelligence modifiers to agent scoring
   */
  applyCustomerIntelligenceModifiers(baseScore, agent, customerIntelligence) {
    let modifiedScore = baseScore
    
    // VIP customer modifier - boost all scores for high-value customers
    if (customerIntelligence.is_vip) {
      modifiedScore *= 1.15 // 15% boost for VIP customers
    }
    
    // High churn risk - prioritize retention-focused agents
    if (customerIntelligence.churn_risk_score > 0.7) {
      if (agent.id === 'alex' || agent.id === 'sophia') { // Client relations & Marketing
        modifiedScore *= 1.25 // 25% boost for retention specialists
      }
    }
    
    // Low CLV - prioritize growth and upselling agents
    if (customerIntelligence.clv < 100) {
      if (agent.id === 'taylor' || agent.id === 'sophia') { // Growth & Marketing
        modifiedScore *= 1.2 // 20% boost for growth agents
      }
    }
    
    // High CLV - prioritize premium service agents
    if (customerIntelligence.clv > 500) {
      if (agent.id === 'elena' || agent.id === 'david') { // Finance & Operations
        modifiedScore *= 1.15 // 15% boost for premium service
      }
    }
    
    // Poor health score - prioritize relationship repair
    if (customerIntelligence.health_score < 0.3) {
      if (agent.id === 'alex') { // Client relations specialist
        modifiedScore *= 1.3 // 30% boost for relationship repair
      }
    }
    
    // High satisfaction - maintain relationship with consistent agents
    if (customerIntelligence.satisfaction_score > 0.8) {
      if (agent.id === 'alex' || agent.id === 'david') { // Consistent service
        modifiedScore *= 1.1 // 10% boost for consistency
      }
    }
    
    return modifiedScore
  }

  /**
   * Select optimal agent considering load balancing and performance
   */
  selectOptimalAgent(candidates, analysis, context) {
    if (candidates.length === 0) {
      return this.getFallbackAgent()
    }
    
    const loadAdjustedCandidates = candidates.map(candidate => {
      const loadFactor = this.calculateLoadFactor(candidate)
      const costFactor = this.calculateCostEfficiency(candidate)
      const urgencyBonus = analysis.urgency === 'high' ? 0.1 : 0
      
      return {
        ...candidate,
        adjustedScore: candidate.score * loadFactor * costFactor + urgencyBonus
      }
    })
    
    const selected = loadAdjustedCandidates
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0]
    
    return selected
  }

  /**
   * Calculate load factor for load balancing
   */
  calculateLoadFactor(agent) {
    const loadPercentage = agent.currentLoad / agent.maxConcurrent
    
    if (loadPercentage < 0.5) return 1.0 // No penalty
    if (loadPercentage < 0.7) return 0.9 // Small penalty
    if (loadPercentage < 0.9) return 0.7 // Moderate penalty
    return 0.3 // High penalty for overloaded agents
  }

  /**
   * Calculate cost efficiency factor
   */
  calculateCostEfficiency(agent) {
    const costScore = 1 - (agent.cost / 0.1) // Normalize cost
    const performanceScore = agent.performanceScore
    
    return (costScore + performanceScore) / 2
  }

  /**
   * Check if agent is available
   */
  isAgentAvailable(agent) {
    return (
      agent.availability > 0.9 && 
      agent.currentLoad < agent.maxConcurrent &&
      (!agent.lastUsed || Date.now() - agent.lastUsed > 1000) // Cooldown
    )
  }

  /**
   * Get fallback agent when routing fails
   */
  getFallbackAgent() {
    return Array.from(this.agents.values())
      .filter(agent => this.isAgentAvailable(agent))
      .sort((a, b) => b.performanceScore - a.performanceScore)[0] ||
      this.agents.get('marcus') // Ultimate fallback
  }

  /**
   * Detect urgency in message
   */
  detectUrgency(message) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now', 'quick']
    const lowerMessage = message.toLowerCase()
    
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword)) ? 'high' : 'normal'
  }

  /**
   * Detect complexity in message
   */
  detectComplexity(message) {
    const complexityIndicators = [
      message.length > 200, // Long message
      (message.match(/\?/g) || []).length > 2, // Multiple questions
      /\b(analyze|compare|evaluate|strategy|complex|detailed)\b/i.test(message)
    ]
    
    const complexityScore = complexityIndicators.filter(Boolean).length
    
    if (complexityScore >= 2) return 'high'
    if (complexityScore === 1) return 'medium'
    return 'low'
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(agentId, metrics) {
    const agent = this.agents.get(agentId)
    const performanceData = this.performanceMetrics.get(agentId)
    
    if (!agent || !performanceData) return
    
    if (metrics.responseTime) {
      performanceData.responseTimers.push(metrics.responseTime)
      if (performanceData.responseTimers.length > 100) {
        performanceData.responseTimers.shift()
      }
      agent.averageResponseTime = this.calculateAverage(performanceData.responseTimers)
    }
    
    if (metrics.accuracy !== undefined) {
      performanceData.accuracyScores.push(metrics.accuracy)
      if (performanceData.accuracyScores.length > 100) {
        performanceData.accuracyScores.shift()
      }
      performanceData.successRate = this.calculateAverage(performanceData.accuracyScores)
    }
    
    if (metrics.successful !== undefined) {
      agent.totalQueries++
      if (metrics.successful) {
        agent.successfulQueries++
      }
    }
    
    agent.performanceScore = this.calculatePerformanceScore(agent, performanceData)
    agent.lastUsed = Date.now()
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(agent, performanceData) {
    const responseTimeScore = Math.max(0, (2000 - agent.averageResponseTime) / 2000)
    const accuracyScore = performanceData.successRate
    const availabilityScore = agent.availability
    const loadScore = 1 - (agent.currentLoad / agent.maxConcurrent)
    
    return (
      responseTimeScore * 0.3 +
      accuracyScore * 0.4 +
      availabilityScore * 0.2 +
      loadScore * 0.1
    )
  }

  /**
   * Calculate initial performance score
   */
  calculateInitialPerformanceScore(agent) {
    const responseTimeScore = Math.max(0, (2000 - agent.responseTime) / 2000)
    const accuracyScore = agent.accuracy
    const availabilityScore = agent.availability
    
    return (responseTimeScore * 0.3 + accuracyScore * 0.4 + availabilityScore * 0.3)
  }

  /**
   * Update agent load
   */
  updateAgentLoad(agentId, delta) {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.currentLoad = Math.max(0, agent.currentLoad + delta)
      
      const performanceData = this.performanceMetrics.get(agentId)
      if (performanceData) {
        performanceData.loadHistory.push(agent.currentLoad)
        if (performanceData.loadHistory.length > 100) {
          performanceData.loadHistory.shift()
        }
      }
    }
  }

  /**
   * Record routing decision
   */
  recordRouting(routing) {
    this.routingHistory.push(routing)
    
    if (this.routingHistory.length > this.maxHistorySize) {
      this.routingHistory.shift()
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStats() {
    const stats = {
      totalRoutings: this.routingHistory.length,
      agentUsage: {},
      averageRoutingTime: 0,
      averageConfidence: 0,
      routingReasons: {}
    }
    
    if (this.routingHistory.length === 0) return stats
    
    this.routingHistory.forEach(routing => {
      stats.agentUsage[routing.selectedAgent] = 
        (stats.agentUsage[routing.selectedAgent] || 0) + 1
      
      stats.routingReasons[routing.reason] = 
        (stats.routingReasons[routing.reason] || 0) + 1
    })
    
    const recentRoutings = this.routingHistory.slice(-100) // Last 100
    stats.averageRoutingTime = this.calculateAverage(
      recentRoutings.map(r => r.routingTime)
    )
    stats.averageConfidence = this.calculateAverage(
      recentRoutings.map(r => r.confidence)
    )
    
    return stats
  }

  /**
   * Get agent performance metrics
   */
  getAgentMetrics() {
    const metrics = {}
    
    for (const [agentId, agent] of this.agents) {
      metrics[agentId] = {
        performanceScore: agent.performanceScore,
        averageResponseTime: agent.averageResponseTime,
        successRate: agent.successfulQueries / Math.max(agent.totalQueries, 1),
        currentLoad: agent.currentLoad,
        availability: agent.availability,
        totalQueries: agent.totalQueries,
        cost: agent.cost
      }
    }
    
    return metrics
  }

  calculateAverage(numbers) {
    return numbers.length > 0 
      ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length
      : 0
  }

  generateRoutingId() {
    return `routing_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  sanitizeContext(context) {
    return {
      userId: context.userId || 'anonymous',
      shopName: context.shopName,
      previousAgent: context.previousAgent,
      conversationContinuation: !!context.conversationContinuation
    }
  }
}

let agentRouter = null

/**
 * Get or create agent router instance
 */
export function getAgentRouter() {
  if (!agentRouter) {
    agentRouter = new AIAgentRouter()
  }
  return agentRouter
}

export default getAgentRouter()