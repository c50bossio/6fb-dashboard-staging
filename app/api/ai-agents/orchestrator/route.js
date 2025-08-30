/**
 * AI Agent Orchestration Framework
 * Coordinates multiple AI agents for complex multi-step tasks
 * Features: Agent selection, task decomposition, inter-agent communication, result aggregation
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class AgentOrchestrator {
  constructor() {
    this.agents = {
      customer_service: {
        name: 'Customer Service Agent',
        endpoint: '/api/ai-agents/customer-service',
        capabilities: [
          'appointment_booking',
          'inquiry_handling',
          'complaint_resolution',
          'feedback_collection'
        ]
      },
      marketing: {
        name: 'Marketing Agent',
        endpoint: '/api/ai-agents/marketing',
        capabilities: [
          'campaign_creation',
          'content_generation',
          'audience_segmentation',
          'performance_analysis'
        ]
      },
      operations: {
        name: 'Operations Agent',
        endpoint: '/api/ai-agents/operations',
        capabilities: [
          'process_optimization',
          'resource_allocation',
          'workflow_automation',
          'predictive_maintenance'
        ]
      },
      financial: {
        name: 'Financial Agent',
        endpoint: '/api/ai-agents/financial',
        capabilities: [
          'revenue_forecasting',
          'cost_analysis',
          'pricing_optimization',
          'financial_planning'
        ]
      }
    }
    
    this.orchestrationStrategies = {
      SEQUENTIAL: 'sequential',
      PARALLEL: 'parallel',
      HIERARCHICAL: 'hierarchical',
      CONSENSUS: 'consensus',
      ADAPTIVE: 'adaptive'
    }
    
    this.taskQueue = []
    this.executionHistory = []
  }

  /**
   * Main orchestration function
   */
  async orchestrate(request) {
    const { task, context, strategy = 'adaptive', organizationId } = request
    
    try {
      // Analyze task complexity
      const taskAnalysis = await this.analyzeTask(task, context)
      
      // Decompose into subtasks
      const subtasks = await this.decomposeTask(task, taskAnalysis)
      
      // Select appropriate agents
      const agentSelection = await this.selectAgents(subtasks, strategy)
      
      // Create execution plan
      const executionPlan = await this.createExecutionPlan(
        subtasks,
        agentSelection,
        strategy
      )
      
      // Execute plan
      const results = await this.executePlan(executionPlan, context, organizationId)
      
      // Aggregate results
      const aggregatedResult = await this.aggregateResults(results, task)
      
      // Learn from execution
      await this.learnFromExecution(task, executionPlan, results)
      
      // Store orchestration record
      await this.storeOrchestrationRecord(
        organizationId,
        task,
        executionPlan,
        aggregatedResult
      )
      
      return {
        success: true,
        result: aggregatedResult,
        executionPlan,
        metrics: {
          totalTime: this.calculateExecutionTime(results),
          agentsUsed: agentSelection.length,
          subtasksCompleted: results.filter(r => r.success).length,
          efficiency: this.calculateEfficiency(results)
        }
      }
    } catch (error) {
      console.error('Orchestration error:', error)
      throw error
    }
  }

  /**
   * Analyze task to understand requirements
   */
  async analyzeTask(task, context) {
    const prompt = `
      Analyze this barbershop business task:
      Task: ${task}
      Context: ${JSON.stringify(context)}
      
      Determine:
      1. Task complexity (simple/moderate/complex)
      2. Required capabilities
      3. Expected outcomes
      4. Potential challenges
      5. Success criteria
    `
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert task analyzer for business automation." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
    
    return JSON.parse(completion.choices[0].message.content)
  }

  /**
   * Decompose complex task into subtasks
   */
  async decomposeTask(task, analysis) {
    if (analysis.complexity === 'simple') {
      return [{ id: 1, description: task, dependencies: [] }]
    }
    
    const prompt = `
      Decompose this barbershop business task into subtasks:
      Task: ${task}
      Analysis: ${JSON.stringify(analysis)}
      
      Create a list of subtasks with:
      1. Clear description
      2. Required capabilities
      3. Dependencies on other subtasks
      4. Priority level
      5. Estimated complexity
    `
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert at breaking down complex business tasks." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
    
    return JSON.parse(completion.choices[0].message.content)
  }

  /**
   * Select appropriate agents for subtasks
   */
  async selectAgents(subtasks, strategy) {
    const selections = []
    
    for (const subtask of subtasks) {
      const bestAgent = await this.findBestAgent(subtask)
      
      // Check for multi-agent requirement
      if (subtask.complexity === 'complex' && strategy !== 'sequential') {
        const additionalAgents = await this.findCollaboratingAgents(subtask, bestAgent)
        selections.push({
          subtaskId: subtask.id,
          primaryAgent: bestAgent,
          collaboratingAgents: additionalAgents,
          strategy: 'collaborative'
        })
      } else {
        selections.push({
          subtaskId: subtask.id,
          agent: bestAgent,
          strategy: 'individual'
        })
      }
    }
    
    return selections
  }

  /**
   * Find best agent for a subtask
   */
  async findBestAgent(subtask) {
    let bestMatch = null
    let bestScore = 0
    
    for (const [agentId, agent] of Object.entries(this.agents)) {
      const score = this.calculateAgentFitScore(subtask, agent)
      if (score > bestScore) {
        bestScore = score
        bestMatch = agentId
      }
    }
    
    return bestMatch
  }

  /**
   * Calculate how well an agent fits a subtask
   */
  calculateAgentFitScore(subtask, agent) {
    const requiredCapabilities = subtask.requiredCapabilities || []
    let matchCount = 0
    
    for (const required of requiredCapabilities) {
      if (agent.capabilities.some(cap => cap.includes(required))) {
        matchCount++
      }
    }
    
    return requiredCapabilities.length > 0 
      ? matchCount / requiredCapabilities.length 
      : 0
  }

  /**
   * Find agents that can collaborate
   */
  async findCollaboratingAgents(subtask, primaryAgent) {
    const collaborators = []
    
    for (const [agentId, agent] of Object.entries(this.agents)) {
      if (agentId !== primaryAgent) {
        const synergy = this.calculateSynergy(subtask, primaryAgent, agentId)
        if (synergy > 0.5) {
          collaborators.push({
            agentId,
            role: this.determineCollaborationRole(subtask, agentId)
          })
        }
      }
    }
    
    return collaborators
  }

  /**
   * Calculate synergy between agents
   */
  calculateSynergy(subtask, agent1, agent2) {
    // Simplified synergy calculation
    const complementaryPairs = {
      'customer_service': ['marketing', 'operations'],
      'marketing': ['customer_service', 'financial'],
      'operations': ['financial', 'customer_service'],
      'financial': ['operations', 'marketing']
    }
    
    return complementaryPairs[agent1]?.includes(agent2) ? 0.8 : 0.3
  }

  /**
   * Determine collaboration role
   */
  determineCollaborationRole(subtask, agentId) {
    const roles = {
      'customer_service': 'user_interface',
      'marketing': 'content_provider',
      'operations': 'process_optimizer',
      'financial': 'analytics_provider'
    }
    
    return roles[agentId] || 'supporter'
  }

  /**
   * Create execution plan based on strategy
   */
  async createExecutionPlan(subtasks, agentSelection, strategy) {
    const plan = {
      strategy,
      phases: [],
      dependencies: []
    }
    
    switch (strategy) {
      case 'sequential':
        plan.phases = this.createSequentialPlan(subtasks, agentSelection)
        break
      
      case 'parallel':
        plan.phases = this.createParallelPlan(subtasks, agentSelection)
        break
      
      case 'hierarchical':
        plan.phases = this.createHierarchicalPlan(subtasks, agentSelection)
        break
      
      case 'consensus':
        plan.phases = this.createConsensusPlan(subtasks, agentSelection)
        break
      
      case 'adaptive':
      default:
        plan.phases = await this.createAdaptivePlan(subtasks, agentSelection)
        break
    }
    
    // Add dependencies
    plan.dependencies = this.extractDependencies(subtasks)
    
    return plan
  }

  /**
   * Create sequential execution plan
   */
  createSequentialPlan(subtasks, agentSelection) {
    return subtasks.map((subtask, index) => ({
      phase: index + 1,
      subtask: subtask.id,
      agent: agentSelection.find(s => s.subtaskId === subtask.id)?.agent,
      executionType: 'sequential',
      waitForPrevious: index > 0
    }))
  }

  /**
   * Create parallel execution plan
   */
  createParallelPlan(subtasks, agentSelection) {
    const independentTasks = subtasks.filter(s => !s.dependencies || s.dependencies.length === 0)
    const dependentTasks = subtasks.filter(s => s.dependencies && s.dependencies.length > 0)
    
    return [
      {
        phase: 1,
        tasks: independentTasks.map(t => ({
          subtask: t.id,
          agent: agentSelection.find(s => s.subtaskId === t.id)?.agent
        })),
        executionType: 'parallel'
      },
      {
        phase: 2,
        tasks: dependentTasks.map(t => ({
          subtask: t.id,
          agent: agentSelection.find(s => s.subtaskId === t.id)?.agent
        })),
        executionType: 'sequential'
      }
    ]
  }

  /**
   * Create hierarchical execution plan
   */
  createHierarchicalPlan(subtasks, agentSelection) {
    // Group by priority
    const highPriority = subtasks.filter(s => s.priority === 'high')
    const mediumPriority = subtasks.filter(s => s.priority === 'medium')
    const lowPriority = subtasks.filter(s => s.priority === 'low')
    
    return [
      { phase: 1, priority: 'high', tasks: highPriority, executionType: 'parallel' },
      { phase: 2, priority: 'medium', tasks: mediumPriority, executionType: 'parallel' },
      { phase: 3, priority: 'low', tasks: lowPriority, executionType: 'parallel' }
    ].filter(p => p.tasks.length > 0)
  }

  /**
   * Create consensus-based plan
   */
  createConsensusPlan(subtasks, agentSelection) {
    return subtasks.map(subtask => ({
      subtask: subtask.id,
      agents: this.selectMultipleAgents(subtask, agentSelection),
      executionType: 'consensus',
      votingStrategy: 'majority'
    }))
  }

  /**
   * Create adaptive execution plan
   */
  async createAdaptivePlan(subtasks, agentSelection) {
    const plan = []
    const completed = new Set()
    
    while (completed.size < subtasks.length) {
      const available = subtasks.filter(s => 
        !completed.has(s.id) &&
        (!s.dependencies || s.dependencies.every(d => completed.has(d)))
      )
      
      if (available.length === 0) break
      
      const phase = {
        phase: plan.length + 1,
        tasks: available.map(task => ({
          subtask: task.id,
          agent: agentSelection.find(s => s.subtaskId === task.id)?.agent,
          adaptiveStrategy: this.selectAdaptiveStrategy(task)
        })),
        executionType: available.length > 1 ? 'parallel' : 'sequential'
      }
      
      plan.push(phase)
      available.forEach(task => completed.add(task.id))
    }
    
    return plan
  }

  /**
   * Select adaptive strategy for task
   */
  selectAdaptiveStrategy(task) {
    if (task.complexity === 'complex') return 'multi-agent-collaboration'
    if (task.priority === 'high') return 'priority-execution'
    return 'standard'
  }

  /**
   * Select multiple agents for consensus
   */
  selectMultipleAgents(subtask, agentSelection) {
    const primary = agentSelection.find(s => s.subtaskId === subtask.id)
    const agents = [primary.agent || primary.primaryAgent]
    
    if (primary.collaboratingAgents) {
      agents.push(...primary.collaboratingAgents.map(c => c.agentId))
    }
    
    return agents
  }

  /**
   * Extract dependencies from subtasks
   */
  extractDependencies(subtasks) {
    return subtasks
      .filter(s => s.dependencies && s.dependencies.length > 0)
      .map(s => ({
        task: s.id,
        dependsOn: s.dependencies
      }))
  }

  /**
   * Execute the orchestration plan
   */
  async executePlan(plan, context, organizationId) {
    const results = []
    const phaseResults = new Map()
    
    for (const phase of plan.phases) {
      if (phase.executionType === 'parallel') {
        const parallelResults = await this.executeParallelPhase(
          phase,
          context,
          organizationId,
          phaseResults
        )
        results.push(...parallelResults)
        parallelResults.forEach(r => phaseResults.set(r.subtaskId, r))
      } else {
        const sequentialResults = await this.executeSequentialPhase(
          phase,
          context,
          organizationId,
          phaseResults
        )
        results.push(...sequentialResults)
        sequentialResults.forEach(r => phaseResults.set(r.subtaskId, r))
      }
    }
    
    return results
  }

  /**
   * Execute parallel phase
   */
  async executeParallelPhase(phase, context, organizationId, previousResults) {
    const promises = phase.tasks.map(task => 
      this.executeTask(task, context, organizationId, previousResults)
    )
    
    return await Promise.all(promises)
  }

  /**
   * Execute sequential phase
   */
  async executeSequentialPhase(phase, context, organizationId, previousResults) {
    const results = []
    
    for (const task of phase.tasks || [phase]) {
      const result = await this.executeTask(task, context, organizationId, previousResults)
      results.push(result)
      previousResults.set(task.subtask || task.subtaskId, result)
    }
    
    return results
  }

  /**
   * Execute individual task
   */
  async executeTask(task, context, organizationId, previousResults) {
    try {
      const agent = this.agents[task.agent]
      if (!agent) {
        throw new Error(`Agent ${task.agent} not found`)
      }
      
      // Prepare task context with previous results
      const taskContext = {
        ...context,
        previousResults: Array.from(previousResults.values()),
        subtaskId: task.subtask || task.subtaskId
      }
      
      // Call agent API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${agent.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: this.mapTaskToAgentAction(task),
          context: taskContext,
          parameters: task.parameters || {},
          organizationId
        })
      })
      
      const result = await response.json()
      
      return {
        subtaskId: task.subtask || task.subtaskId,
        agent: task.agent,
        success: result.success,
        result: result,
        executionTime: Date.now()
      }
    } catch (error) {
      console.error(`Task execution error for ${task.agent}:`, error)
      return {
        subtaskId: task.subtask || task.subtaskId,
        agent: task.agent,
        success: false,
        error: error.message,
        executionTime: Date.now()
      }
    }
  }

  /**
   * Map task to agent-specific action
   */
  mapTaskToAgentAction(task) {
    // Map generic task types to agent-specific actions
    const mappings = {
      'customer_service': 'handle_inquiry',
      'marketing': 'create_campaign',
      'operations': 'optimize_workflow',
      'financial': 'analyze_costs'
    }
    
    return mappings[task.agent] || 'process_request'
  }

  /**
   * Aggregate results from multiple agents
   */
  async aggregateResults(results, originalTask) {
    const successfulResults = results.filter(r => r.success)
    
    if (successfulResults.length === 0) {
      return {
        success: false,
        message: 'No subtasks completed successfully',
        errors: results.filter(r => !r.success).map(r => r.error)
      }
    }
    
    // Use AI to synthesize results
    const prompt = `
      Synthesize these results from multiple AI agents for the task:
      Original Task: ${originalTask}
      
      Results:
      ${JSON.stringify(successfulResults.map(r => r.result), null, 2)}
      
      Create a comprehensive summary that:
      1. Combines insights from all agents
      2. Highlights key findings
      3. Provides actionable recommendations
      4. Identifies any conflicts or discrepancies
    `
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert at synthesizing multi-agent analysis results." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
    
    return {
      success: true,
      synthesis: completion.choices[0].message.content,
      individualResults: successfulResults,
      completionRate: (successfulResults.length / results.length) * 100
    }
  }

  /**
   * Learn from execution for future optimization
   */
  async learnFromExecution(task, plan, results) {
    const learning = {
      task,
      planStrategy: plan.strategy,
      performance: {
        totalTime: this.calculateExecutionTime(results),
        successRate: results.filter(r => r.success).length / results.length,
        agentsUsed: new Set(results.map(r => r.agent)).size
      },
      insights: []
    }
    
    // Identify patterns
    if (learning.performance.successRate < 0.8) {
      learning.insights.push('Consider different agent selection for this task type')
    }
    
    if (learning.performance.totalTime > 10000) {
      learning.insights.push('Task took longer than expected - consider parallel execution')
    }
    
    // Store learning
    await supabase
      .from('orchestration_learnings')
      .insert({
        task_type: this.categorizeTask(task),
        learning,
        created_at: new Date().toISOString()
      })
    
    return learning
  }

  /**
   * Store orchestration record
   */
  async storeOrchestrationRecord(organizationId, task, plan, result) {
    await supabase
      .from('orchestration_history')
      .insert({
        organization_id: organizationId,
        task,
        execution_plan: plan,
        result,
        created_at: new Date().toISOString()
      })
  }

  /**
   * Calculate total execution time
   */
  calculateExecutionTime(results) {
    if (results.length === 0) return 0
    
    const times = results.map(r => r.executionTime || 0)
    return Math.max(...times) - Math.min(...times)
  }

  /**
   * Calculate efficiency score
   */
  calculateEfficiency(results) {
    const successRate = results.filter(r => r.success).length / results.length
    const timeEfficiency = 1 / (1 + this.calculateExecutionTime(results) / 10000)
    
    return (successRate + timeEfficiency) / 2
  }

  /**
   * Categorize task for learning
   */
  categorizeTask(task) {
    const categories = {
      booking: /book|appointment|schedule/i,
      marketing: /campaign|promotion|advertis/i,
      operations: /optimize|workflow|process/i,
      financial: /revenue|cost|profit|budget/i
    }
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(task)) return category
    }
    
    return 'general'
  }

  /**
   * Handle complex multi-agent queries
   */
  async handleComplexQuery(query, organizationId) {
    // Determine required agents
    const requiredAgents = await this.determineRequiredAgents(query)
    
    // Create parallel execution plan
    const tasks = requiredAgents.map(agent => ({
      agent,
      query: this.tailorQueryForAgent(query, agent)
    }))
    
    // Execute in parallel
    const results = await Promise.all(
      tasks.map(task => this.queryAgent(task.agent, task.query, organizationId))
    )
    
    // Synthesize results
    return await this.synthesizeMultiAgentResults(query, results)
  }

  /**
   * Determine which agents are needed
   */
  async determineRequiredAgents(query) {
    const agents = []
    
    if (/customer|appointment|booking/i.test(query)) {
      agents.push('customer_service')
    }
    if (/marketing|campaign|promotion/i.test(query)) {
      agents.push('marketing')
    }
    if (/operation|process|workflow/i.test(query)) {
      agents.push('operations')
    }
    if (/financial|revenue|cost|profit/i.test(query)) {
      agents.push('financial')
    }
    
    return agents.length > 0 ? agents : ['customer_service'] // Default
  }

  /**
   * Tailor query for specific agent
   */
  tailorQueryForAgent(query, agent) {
    const perspectives = {
      customer_service: 'from a customer experience perspective',
      marketing: 'from a marketing and growth perspective',
      operations: 'from an operational efficiency perspective',
      financial: 'from a financial impact perspective'
    }
    
    return `${query} ${perspectives[agent] || ''}`
  }

  /**
   * Query individual agent
   */
  async queryAgent(agentId, query, organizationId) {
    const agent = this.agents[agentId]
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${agent.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'general_query',
          context: query,
          organizationId
        })
      })
      
      return {
        agent: agentId,
        response: await response.json()
      }
    } catch (error) {
      return {
        agent: agentId,
        error: error.message
      }
    }
  }

  /**
   * Synthesize results from multiple agents
   */
  async synthesizeMultiAgentResults(query, results) {
    const validResults = results.filter(r => !r.error)
    
    const prompt = `
      Synthesize these perspectives on the query:
      Query: ${query}
      
      Perspectives:
      ${JSON.stringify(validResults, null, 2)}
      
      Create a unified response that combines all insights.
    `
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert at combining multiple expert perspectives." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
    
    return {
      synthesis: completion.choices[0].message.content,
      sources: validResults.map(r => r.agent)
    }
  }
}

// API Route Handlers
export async function POST(request) {
  try {
    const body = await request.json()
    const orchestrator = new AgentOrchestrator()
    
    // Check if it's a complex query or orchestration request
    if (body.type === 'complex_query') {
      const result = await orchestrator.handleComplexQuery(
        body.query,
        body.organizationId
      )
      return NextResponse.json(result)
    } else {
      const result = await orchestrator.orchestrate(body)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Orchestrator error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const orchestrator = new AgentOrchestrator()
    
    switch (action) {
      case 'agents':
        return NextResponse.json({
          agents: orchestrator.agents,
          count: Object.keys(orchestrator.agents).length
        })
      
      case 'strategies':
        return NextResponse.json({
          strategies: orchestrator.orchestrationStrategies,
          default: 'adaptive'
        })
      
      case 'capabilities':
        const capabilities = {}
        for (const [agentId, agent] of Object.entries(orchestrator.agents)) {
          capabilities[agentId] = agent.capabilities
        }
        return NextResponse.json(capabilities)
      
      case 'health':
        return NextResponse.json({
          status: 'operational',
          orchestrator: 'active',
          agents: Object.keys(orchestrator.agents).length,
          version: '1.0.0'
        })
      
      default:
        return NextResponse.json({
          message: 'AI Agent Orchestrator - Ready',
          agents: Object.keys(orchestrator.agents),
          endpoints: [
            'POST / - Orchestrate multi-agent task',
            'POST / {type: "complex_query"} - Handle complex query',
            'GET /?action=agents - List available agents',
            'GET /?action=strategies - List orchestration strategies',
            'GET /?action=capabilities - Get agent capabilities',
            'GET /?action=health - Health check'
          ]
        })
    }
  } catch (error) {
    console.error('Orchestrator GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}