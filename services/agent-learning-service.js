/**
 * Agent Learning and Adaptation Service
 * Enables AI agents to learn from interactions, feedback, and outcomes
 * Implements memory, pattern recognition, and continuous improvement
 */

export class AgentLearningService {
  constructor() {
    this.memoryStore = new Map() // Agent memories indexed by agent ID
    this.patternDatabase = new Map() // Recognized patterns
    this.feedbackHistory = []
    this.learningMetrics = this.initializeLearningMetrics()
    this.adaptationRules = this.defineAdaptationRules()
    
    // Memory management settings
    this.MAX_SHORT_TERM_MEMORIES = 50
    this.MAX_LONG_TERM_MEMORIES = 100
    this.MAX_PATTERN_DATABASE_SIZE = 500
    this.MAX_FEEDBACK_HISTORY = 200
    this.MEMORY_CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutes
    this.MEMORY_RETENTION_DAYS = 30
    
    // Start periodic cleanup
    this.startMemoryCleanup()
  }

  /**
   * Initialize learning metrics for tracking improvement
   */
  initializeLearningMetrics() {
    return {
      accuracy: {
        predictions: { correct: 0, total: 0 },
        recommendations: { successful: 0, total: 0 },
        satisfaction: { positive: 0, total: 0 }
      },
      patterns: {
        identified: 0,
        applied: 0,
        successful: 0
      },
      adaptations: {
        total: 0,
        successful: 0,
        reverted: 0
      },
      knowledge: {
        facts: 0,
        relationships: 0,
        insights: 0
      }
    }
  }

  /**
   * Define adaptation rules based on learning
   */
  defineAdaptationRules() {
    return {
      // Accuracy-based adaptations
      lowAccuracy: {
        threshold: 0.6,
        action: 'increase_analysis_depth',
        description: 'Enhance analysis when accuracy drops below 60%'
      },
      highAccuracy: {
        threshold: 0.9,
        action: 'optimize_for_speed',
        description: 'Streamline responses when accuracy exceeds 90%'
      },
      
      // Pattern-based adaptations
      recurringIssue: {
        threshold: 3, // Same issue 3+ times
        action: 'create_specialized_response',
        description: 'Develop specialized handling for recurring issues'
      },
      successfulPattern: {
        threshold: 5, // Pattern succeeds 5+ times
        action: 'prioritize_pattern',
        description: 'Prioritize successful patterns in similar contexts'
      },
      
      // Feedback-based adaptations
      negativeFeedback: {
        threshold: 2, // 2+ negative feedback on same approach
        action: 'adjust_approach',
        description: 'Modify approach based on negative feedback'
      },
      positiveFeedback: {
        threshold: 3, // 3+ positive feedback
        action: 'reinforce_approach',
        description: 'Strengthen successful approaches'
      }
    }
  }

  /**
   * Record an interaction for learning
   */
  async recordInteraction(interaction) {
    const {
      agentId,
      query,
      context,
      response,
      outcome,
      feedback,
      timestamp = Date.now()
    } = interaction

    // Get or create agent memory
    if (!this.memoryStore.has(agentId)) {
      this.memoryStore.set(agentId, {
        shortTerm: [],
        longTerm: [],
        workingMemory: new Map(),
        episodicMemory: [],
        semanticMemory: new Map()
      })
    }

    const agentMemory = this.memoryStore.get(agentId)

    // Store in short-term memory
    const memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      context,
      response,
      outcome,
      feedback,
      timestamp,
      patterns: this.extractPatterns(query, response),
      entities: this.extractEntities(query, context),
      success: this.evaluateSuccess(outcome, feedback)
    }

    agentMemory.shortTerm.push(memory)

    // Enforce short-term memory limits
    if (agentMemory.shortTerm.length > this.MAX_SHORT_TERM_MEMORIES) {
      agentMemory.shortTerm = agentMemory.shortTerm.slice(-this.MAX_SHORT_TERM_MEMORIES)
    }

    // Consolidate to long-term memory if significant
    if (this.isSignificantMemory(memory)) {
      await this.consolidateToLongTerm(agentId, memory)
    }

    // Extract and store patterns
    await this.learnPatterns(agentId, memory)

    // Update learning metrics
    this.updateMetrics(memory)

    // Check for adaptation triggers
    await this.checkAdaptationTriggers(agentId)

    return {
      memoryId: memory.id,
      learned: true,
      patternsExtracted: memory.patterns.length,
      adaptationsTriggered: []
    }
  }

  /**
   * Extract patterns from interaction
   */
  extractPatterns(query, response) {
    const patterns = []

    // Query patterns
    const queryPatterns = {
      intent: this.classifyIntent(query),
      complexity: this.assessComplexity(query),
      domain: this.identifyDomain(query),
      urgency: this.detectUrgency(query),
      sentiment: this.analyzeSentiment(query)
    }

    patterns.push({
      type: 'query_pattern',
      data: queryPatterns
    })

    // Response patterns
    if (response) {
      const responsePatterns = {
        structure: this.analyzeResponseStructure(response),
        actionability: this.assessActionability(response),
        specificity: this.measureSpecificity(response)
      }

      patterns.push({
        type: 'response_pattern',
        data: responsePatterns
      })
    }

    // Correlation patterns
    patterns.push({
      type: 'correlation',
      data: {
        query_response_match: this.assessQueryResponseAlignment(query, response),
        complexity_detail_ratio: queryPatterns.complexity / (responsePatterns?.specificity || 1)
      }
    })

    return patterns
  }

  /**
   * Extract entities from interaction
   */
  extractEntities(query, context) {
    const entities = {
      business_metrics: [],
      time_references: [],
      service_mentions: [],
      customer_references: [],
      action_items: []
    }

    // Extract business metrics
    const metricPatterns = /\$?\d+%?|\d+\s*(customers?|bookings?|appointments?)/gi
    const metrics = query.match(metricPatterns) || []
    entities.business_metrics = metrics

    // Extract time references
    const timePatterns = /today|yesterday|tomorrow|this\s+week|this\s+month|last\s+\w+/gi
    const times = query.match(timePatterns) || []
    entities.time_references = times

    // Extract service mentions
    const servicePatterns = /haircut|shave|trim|styling|coloring/gi
    const services = query.match(servicePatterns) || []
    entities.service_mentions = services

    return entities
  }

  /**
   * Evaluate success of interaction
   */
  evaluateSuccess(outcome, feedback) {
    let score = 0.5 // Neutral baseline

    if (outcome) {
      if (outcome.completed) score += 0.2
      if (outcome.userSatisfied) score += 0.2
      if (outcome.goalAchieved) score += 0.2
      if (outcome.revenueImpact > 0) score += 0.1
    }

    if (feedback) {
      if (feedback.rating) {
        score = (score + feedback.rating / 5) / 2
      }
      if (feedback.wouldRecommend) score += 0.1
    }

    return Math.min(1, Math.max(0, score))
  }

  /**
   * Determine if memory is significant enough for long-term storage
   */
  isSignificantMemory(memory) {
    // High success or failure
    if (memory.success > 0.8 || memory.success < 0.3) return true
    
    // Contains important patterns
    if (memory.patterns.some(p => p.type === 'breakthrough')) return true
    
    // Has explicit feedback
    if (memory.feedback && memory.feedback.rating) return true
    
    // Complex query with good outcome
    if (memory.patterns.some(p => p.data.complexity === 'high') && memory.success > 0.6) return true
    
    return false
  }

  /**
   * Consolidate memory to long-term storage
   */
  async consolidateToLongTerm(agentId, memory) {
    const agentMemory = this.memoryStore.get(agentId)
    
    // Create consolidated memory with enhanced context
    const consolidatedMemory = {
      ...memory,
      consolidatedAt: Date.now(),
      relatedMemories: this.findRelatedMemories(agentId, memory),
      derivedInsights: this.deriveInsights(memory),
      applicableSituations: this.identifyApplicableSituations(memory)
    }

    agentMemory.longTerm.push(consolidatedMemory)

    // Enforce long-term memory limits
    if (agentMemory.longTerm.length > this.MAX_LONG_TERM_MEMORIES) {
      agentMemory.longTerm = agentMemory.longTerm.slice(-this.MAX_LONG_TERM_MEMORIES)
    }

    // Update semantic memory (knowledge graph)
    this.updateSemanticMemory(agentId, consolidatedMemory)

    // Store as episodic memory if it's a complete interaction episode
    if (memory.outcome && memory.feedback) {
      agentMemory.episodicMemory.push({
        episode: consolidatedMemory,
        context: memory.context,
        outcome: memory.outcome
      })
      
      // Enforce episodic memory limits
      if (agentMemory.episodicMemory.length > this.MAX_LONG_TERM_MEMORIES) {
        agentMemory.episodicMemory = agentMemory.episodicMemory.slice(-this.MAX_LONG_TERM_MEMORIES)
      }
    }
  }

  /**
   * Find related memories for context
   */
  findRelatedMemories(agentId, memory) {
    const agentMemory = this.memoryStore.get(agentId)
    if (!agentMemory) return []

    const related = []
    
    // Search long-term memory for similar patterns
    for (const ltMemory of agentMemory.longTerm) {
      const similarity = this.calculateMemorySimilarity(memory, ltMemory)
      if (similarity > 0.7) {
        related.push({
          memoryId: ltMemory.id,
          similarity,
          insight: ltMemory.derivedInsights?.[0]
        })
      }
    }

    return related.slice(0, 5) // Top 5 related memories
  }

  /**
   * Calculate similarity between memories
   */
  calculateMemorySimilarity(memory1, memory2) {
    let similarity = 0
    let factors = 0

    // Pattern similarity
    if (memory1.patterns && memory2.patterns) {
      const pattern1Types = memory1.patterns.map(p => p.type)
      const pattern2Types = memory2.patterns.map(p => p.type)
      const commonPatterns = pattern1Types.filter(t => pattern2Types.includes(t))
      similarity += commonPatterns.length / Math.max(pattern1Types.length, pattern2Types.length)
      factors++
    }

    // Entity similarity
    if (memory1.entities && memory2.entities) {
      const entities1 = Object.values(memory1.entities).flat()
      const entities2 = Object.values(memory2.entities).flat()
      const commonEntities = entities1.filter(e => entities2.includes(e))
      similarity += commonEntities.length / Math.max(entities1.length, entities2.length, 1)
      factors++
    }

    // Success similarity
    if (memory1.success !== undefined && memory2.success !== undefined) {
      similarity += 1 - Math.abs(memory1.success - memory2.success)
      factors++
    }

    return factors > 0 ? similarity / factors : 0
  }

  /**
   * Derive insights from memory
   */
  deriveInsights(memory) {
    const insights = []

    // Success-based insights
    if (memory.success > 0.8) {
      insights.push(`Highly successful approach for ${memory.patterns[0]?.data.intent || 'query'}`)
    } else if (memory.success < 0.3) {
      insights.push(`Ineffective approach for ${memory.patterns[0]?.data.intent || 'query'} - needs adjustment`)
    }

    // Pattern-based insights
    if (memory.patterns.some(p => p.data.complexity === 'high' && memory.success > 0.7)) {
      insights.push('Successfully handled complex query - approach can be reused')
    }

    // Entity-based insights
    if (memory.entities?.business_metrics?.length > 3) {
      insights.push('Data-rich query - numerical analysis was important')
    }

    return insights
  }

  /**
   * Identify situations where this memory could apply
   */
  identifyApplicableSituations(memory) {
    const situations = []

    if (memory.patterns.some(p => p.data.intent === 'revenue_optimization')) {
      situations.push('revenue_queries', 'financial_planning', 'pricing_decisions')
    }

    if (memory.patterns.some(p => p.data.urgency === 'high')) {
      situations.push('crisis_management', 'urgent_decisions', 'rapid_response')
    }

    if (memory.entities?.customer_references?.length > 0) {
      situations.push('customer_service', 'retention_strategies', 'satisfaction_improvement')
    }

    return situations
  }

  /**
   * Update semantic memory (knowledge graph)
   */
  updateSemanticMemory(agentId, memory) {
    const agentMemory = this.memoryStore.get(agentId)
    
    // Extract concepts and relationships
    const concepts = this.extractConcepts(memory)
    
    for (const concept of concepts) {
      if (!agentMemory.semanticMemory.has(concept.name)) {
        agentMemory.semanticMemory.set(concept.name, {
          frequency: 0,
          relationships: new Map(),
          outcomes: [],
          contexts: []
        })
      }
      
      const conceptData = agentMemory.semanticMemory.get(concept.name)
      conceptData.frequency++
      conceptData.outcomes.push(memory.success)
      conceptData.contexts.push(memory.context)
      
      // Add relationships
      for (const relatedConcept of concept.related) {
        if (!conceptData.relationships.has(relatedConcept)) {
          conceptData.relationships.set(relatedConcept, 0)
        }
        conceptData.relationships.set(
          relatedConcept,
          conceptData.relationships.get(relatedConcept) + 1
        )
      }
    }
  }

  /**
   * Extract concepts from memory
   */
  extractConcepts(memory) {
    const concepts = []
    
    // Extract from patterns
    if (memory.patterns) {
      for (const pattern of memory.patterns) {
        if (pattern.data.intent) {
          concepts.push({
            name: pattern.data.intent,
            related: [pattern.data.domain || 'general']
          })
        }
      }
    }
    
    // Extract from entities
    if (memory.entities) {
      if (memory.entities.service_mentions?.length > 0) {
        concepts.push({
          name: 'service_discussion',
          related: memory.entities.service_mentions
        })
      }
    }
    
    return concepts
  }

  /**
   * Learn patterns from interaction
   */
  async learnPatterns(agentId, memory) {
    for (const pattern of memory.patterns) {
      const patternKey = `${agentId}_${pattern.type}_${JSON.stringify(pattern.data)}`
      
      if (!this.patternDatabase.has(patternKey)) {
        this.patternDatabase.set(patternKey, {
          pattern,
          occurrences: 0,
          successRate: 0,
          totalSuccess: 0,
          lastSeen: null,
          contexts: []
        })
      }
      
      const patternData = this.patternDatabase.get(patternKey)
      patternData.occurrences++
      patternData.totalSuccess += memory.success
      patternData.successRate = patternData.totalSuccess / patternData.occurrences
      patternData.lastSeen = Date.now()
      patternData.contexts.push(memory.context)
      
      // Limit context storage per pattern
      if (patternData.contexts.length > 10) {
        patternData.contexts = patternData.contexts.slice(-10)
      }
      
      // Mark as learned pattern if successful enough
      if (patternData.occurrences >= 3 && patternData.successRate > 0.7) {
        this.learningMetrics.patterns.identified++
      }
    }
    
    // Enforce pattern database limits
    this.enforcePatternDatabaseLimits()
  }

  /**
   * Update learning metrics
   */
  updateMetrics(memory) {
    // Update accuracy metrics
    if (memory.outcome?.prediction) {
      this.learningMetrics.accuracy.predictions.total++
      if (memory.outcome.predictionCorrect) {
        this.learningMetrics.accuracy.predictions.correct++
      }
    }
    
    if (memory.outcome?.recommendation) {
      this.learningMetrics.accuracy.recommendations.total++
      if (memory.success > 0.7) {
        this.learningMetrics.accuracy.recommendations.successful++
      }
    }
    
    if (memory.feedback?.rating) {
      this.learningMetrics.accuracy.satisfaction.total++
      if (memory.feedback.rating >= 4) {
        this.learningMetrics.accuracy.satisfaction.positive++
      }
    }
  }

  /**
   * Check if adaptations should be triggered
   */
  async checkAdaptationTriggers(agentId) {
    const adaptations = []
    
    // Check accuracy-based triggers
    const predictionAccuracy = this.learningMetrics.accuracy.predictions.total > 0
      ? this.learningMetrics.accuracy.predictions.correct / this.learningMetrics.accuracy.predictions.total
      : 1
    
    if (predictionAccuracy < this.adaptationRules.lowAccuracy.threshold) {
      adaptations.push(await this.triggerAdaptation(agentId, 'lowAccuracy'))
    } else if (predictionAccuracy > this.adaptationRules.highAccuracy.threshold) {
      adaptations.push(await this.triggerAdaptation(agentId, 'highAccuracy'))
    }
    
    // Check pattern-based triggers
    const recurringPatterns = Array.from(this.patternDatabase.values())
      .filter(p => p.occurrences >= this.adaptationRules.recurringIssue.threshold && p.successRate < 0.5)
    
    if (recurringPatterns.length > 0) {
      adaptations.push(await this.triggerAdaptation(agentId, 'recurringIssue', recurringPatterns))
    }
    
    return adaptations
  }

  /**
   * Trigger an adaptation
   */
  async triggerAdaptation(agentId, ruleKey, data = null) {
    const rule = this.adaptationRules[ruleKey]
    
    const adaptation = {
      agentId,
      rule: ruleKey,
      action: rule.action,
      description: rule.description,
      triggeredAt: Date.now(),
      data
    }
    
    this.learningMetrics.adaptations.total++
    
    console.log(`🔄 Adaptation triggered for ${agentId}: ${rule.description}`)
    
    return adaptation
  }

  /**
   * Recall relevant memories for a query
   */
  async recall(agentId, query, context) {
    const agentMemory = this.memoryStore.get(agentId)
    if (!agentMemory) return { memories: [], patterns: [], insights: [] }
    
    const queryPatterns = this.extractPatterns(query, null)
    const queryEntities = this.extractEntities(query, context)
    
    // Search through memories
    const relevantMemories = []
    const relevantPatterns = []
    const insights = []
    
    // Search long-term memory
    for (const memory of agentMemory.longTerm) {
      const relevance = this.calculateRelevance(query, queryPatterns, queryEntities, memory)
      if (relevance > 0.5) {
        relevantMemories.push({
          memory,
          relevance,
          insights: memory.derivedInsights
        })
      }
    }
    
    // Search pattern database
    for (const [key, patternData] of this.patternDatabase) {
      if (key.startsWith(agentId) && patternData.successRate > 0.7) {
        relevantPatterns.push({
          pattern: patternData.pattern,
          successRate: patternData.successRate,
          occurrences: patternData.occurrences
        })
      }
    }
    
    // Get insights from semantic memory
    for (const [concept, data] of agentMemory.semanticMemory) {
      if (query.toLowerCase().includes(concept.toLowerCase())) {
        const avgOutcome = data.outcomes.reduce((a, b) => a + b, 0) / data.outcomes.length
        insights.push({
          concept,
          frequency: data.frequency,
          averageSuccess: avgOutcome,
          relatedConcepts: Array.from(data.relationships.keys()).slice(0, 3)
        })
      }
    }
    
    return {
      memories: relevantMemories.slice(0, 5),
      patterns: relevantPatterns.slice(0, 3),
      insights: insights.slice(0, 3)
    }
  }

  /**
   * Calculate relevance of memory to current query
   */
  calculateRelevance(query, queryPatterns, queryEntities, memory) {
    let relevance = 0
    let factors = 0
    
    // Text similarity
    if (memory.query) {
      const similarity = this.calculateTextSimilarity(query, memory.query)
      relevance += similarity
      factors++
    }
    
    // Pattern similarity
    if (memory.patterns && queryPatterns) {
      const patternSimilarity = this.comparePatterns(queryPatterns, memory.patterns)
      relevance += patternSimilarity
      factors++
    }
    
    // Entity overlap
    if (memory.entities && queryEntities) {
      const entityOverlap = this.calculateEntityOverlap(queryEntities, memory.entities)
      relevance += entityOverlap
      factors++
    }
    
    // Success weight (prefer successful memories)
    if (memory.success > 0.7) {
      relevance += 0.2
    }
    
    return factors > 0 ? relevance / factors : 0
  }

  /**
   * Simple text similarity calculation
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    const commonWords = words1.filter(w => words2.includes(w))
    return commonWords.length / Math.max(words1.length, words2.length)
  }

  /**
   * Compare pattern sets
   */
  comparePatterns(patterns1, patterns2) {
    let similarity = 0
    let comparisons = 0
    
    for (const p1 of patterns1) {
      for (const p2 of patterns2) {
        if (p1.type === p2.type) {
          similarity += this.comparePatternData(p1.data, p2.data)
          comparisons++
        }
      }
    }
    
    return comparisons > 0 ? similarity / comparisons : 0
  }

  /**
   * Compare pattern data objects
   */
  comparePatternData(data1, data2) {
    const keys1 = Object.keys(data1)
    const keys2 = Object.keys(data2)
    const commonKeys = keys1.filter(k => keys2.includes(k))
    
    let matches = 0
    for (const key of commonKeys) {
      if (data1[key] === data2[key]) matches++
    }
    
    return matches / Math.max(keys1.length, keys2.length)
  }

  /**
   * Calculate entity overlap
   */
  calculateEntityOverlap(entities1, entities2) {
    let overlap = 0
    let totalEntities = 0
    
    for (const category in entities1) {
      if (entities2[category]) {
        const set1 = new Set(entities1[category])
        const set2 = new Set(entities2[category])
        const intersection = new Set([...set1].filter(x => set2.has(x)))
        const union = new Set([...set1, ...set2])
        
        overlap += intersection.size / union.size
        totalEntities++
      }
    }
    
    return totalEntities > 0 ? overlap / totalEntities : 0
  }

  /**
   * Classify intent from query
   */
  classifyIntent(query) {
    const intents = {
      revenue_optimization: /increase.*revenue|maximize.*profit|make.*money/i,
      cost_reduction: /reduce.*cost|save.*money|cut.*expense/i,
      customer_acquisition: /get.*customer|attract.*client|grow.*base/i,
      operational_efficiency: /improve.*efficiency|optimize.*schedule|streamline/i,
      problem_solving: /problem|issue|wrong|broken|fix/i,
      information_seeking: /what|how|when|where|why|show.*me/i
    }
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(query)) return intent
    }
    
    return 'general'
  }

  /**
   * Assess query complexity
   */
  assessComplexity(query) {
    const wordCount = query.split(/\s+/).length
    const hasMultipleClauses = /and|or|but|while|although/i.test(query)
    const hasNumbers = /\d+/.test(query)
    const hasComparisons = /better|worse|more|less|versus|compared/i.test(query)
    
    let complexity = 0
    if (wordCount > 20) complexity++
    if (hasMultipleClauses) complexity++
    if (hasNumbers) complexity++
    if (hasComparisons) complexity++
    
    if (complexity >= 3) return 'high'
    if (complexity >= 1) return 'medium'
    return 'low'
  }

  /**
   * Identify domain from query
   */
  identifyDomain(query) {
    const domains = {
      financial: /revenue|profit|cost|price|money|payment/i,
      marketing: /customer|market|promotion|advertis|social/i,
      operations: /schedule|appointment|staff|efficiency|workflow/i,
      strategic: /strategy|plan|growth|expand|future/i
    }
    
    for (const [domain, pattern] of Object.entries(domains)) {
      if (pattern.test(query)) return domain
    }
    
    return 'general'
  }

  /**
   * Detect urgency in query
   */
  detectUrgency(query) {
    if (/urgent|emergency|asap|immediately|now|crisis/i.test(query)) return 'high'
    if (/soon|quickly|today|this week/i.test(query)) return 'medium'
    return 'low'
  }

  /**
   * Analyze sentiment of query
   */
  analyzeSentiment(query) {
    const positive = /good|great|excellent|happy|pleased|success/i
    const negative = /bad|poor|terrible|unhappy|fail|problem/i
    const neutral = /okay|fine|normal|average/i
    
    if (positive.test(query)) return 'positive'
    if (negative.test(query)) return 'negative'
    if (neutral.test(query)) return 'neutral'
    return 'neutral'
  }

  /**
   * Analyze response structure
   */
  analyzeResponseStructure(response) {
    if (typeof response !== 'string') return 'complex'
    
    const hasLists = /\d+\.|•|-\s/m.test(response)
    const hasSections = /\n\n/.test(response)
    const wordCount = response.split(/\s+/).length
    
    if (hasLists && hasSections) return 'structured'
    if (hasLists || hasSections) return 'semi-structured'
    if (wordCount < 50) return 'brief'
    return 'narrative'
  }

  /**
   * Assess actionability of response
   */
  assessActionability(response) {
    if (typeof response !== 'string') return 0
    
    const actionWords = /should|must|need to|recommend|suggest|try|implement|create|start|stop/gi
    const matches = response.match(actionWords) || []
    const wordCount = response.split(/\s+/).length
    
    return Math.min(1, matches.length / (wordCount / 10))
  }

  /**
   * Measure specificity of response
   */
  measureSpecificity(response) {
    if (typeof response !== 'string') return 0
    
    const specifics = /\d+%?|\$\d+|specific|exactly|precisely/gi
    const matches = response.match(specifics) || []
    const wordCount = response.split(/\s+/).length
    
    return Math.min(1, matches.length / (wordCount / 20))
  }

  /**
   * Assess alignment between query and response
   */
  assessQueryResponseAlignment(query, response) {
    if (!query || !response) return 0
    
    const queryWords = query.toLowerCase().split(/\s+/)
    const responseWords = response.toString().toLowerCase().split(/\s+/)
    
    const queryKeywords = queryWords.filter(w => w.length > 4)
    const addressedKeywords = queryKeywords.filter(k => responseWords.includes(k))
    
    return queryKeywords.length > 0 ? addressedKeywords.length / queryKeywords.length : 0
  }

  /**
   * Get learning report for an agent
   */
  getLearningReport(agentId) {
    const agentMemory = this.memoryStore.get(agentId)
    if (!agentMemory) return null
    
    const report = {
      agentId,
      memoryStats: {
        shortTerm: agentMemory.shortTerm.length,
        longTerm: agentMemory.longTerm.length,
        episodic: agentMemory.episodicMemory.length,
        semantic: agentMemory.semanticMemory.size
      },
      learningMetrics: this.learningMetrics,
      topPatterns: [],
      topInsights: [],
      adaptations: []
    }
    
    // Get top patterns
    const agentPatterns = Array.from(this.patternDatabase.entries())
      .filter(([key]) => key.startsWith(agentId))
      .map(([_, data]) => data)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
    
    report.topPatterns = agentPatterns
    
    // Get top insights
    const insights = agentMemory.longTerm
      .flatMap(m => m.derivedInsights || [])
      .slice(0, 5)
    
    report.topInsights = insights
    
    return report
  }
}

// Export singleton instance
export const agentLearning = new AgentLearningService()
export default agentLearning