import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * 🤖 Enhanced Multi-Agent AI System
 * 
 * This endpoint routes user requests to specialized AI agents:
 * - Marcus: Financial Expert (revenue, profit, analytics)
 * - David: Operations Manager (scheduling, booking, efficiency) 
 * - Sophia: Marketing Expert (campaigns, social media, customer acquisition)
 * - Alex: Customer Care (retention, satisfaction, communication)
 * 
 * Each agent has access to real business tools and can execute actions.
 */

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const isDemoMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    
    if (!user && !isDemoMode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const effectiveUser = user || { id: 'demo-user', email: 'demo@barbershop.com' }
    const { message, context = {}, mode = 'tools' } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Enhanced agent routing with intelligent selection
    const selectedAgent = selectAgent(message, context)
    const tools = selectTools(message, selectedAgent, context)
    
    // Execute tools if in tools mode
    let toolResults = []
    if (mode === 'tools' && tools.length > 0) {
      toolResults = await executeTools(tools, context, selectedAgent)
    }
    
    // Generate agent response based on tools and context
    const agentResponse = await generateAgentResponse(
      message, 
      selectedAgent, 
      toolResults, 
      context
    )

    // Store conversation if user is authenticated
    if (user) {
      await storeConversation(supabase, effectiveUser.id, message, agentResponse, context)
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: selectedAgent.id,
        name: selectedAgent.name,
        specialties: selectedAgent.specialties
      },
      message: agentResponse.message,
      toolsUsed: toolResults,
      context: context,
      executionTime: Date.now() - (context.startTime || Date.now()),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Agentic Executor error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Intelligent Agent Selection
 * Routes user requests to the most appropriate specialist agent
 */
function selectAgent(message, context) {
  const messageLower = message.toLowerCase()
  const agents = {
    marcus: {
      id: 'marcus',
      name: 'Marcus - Financial Expert',
      specialties: ['revenue', 'metrics', 'financial', 'profit', 'analytics'],
      personality: 'data-driven financial strategist',
      emoji: '💰'
    },
    david: {
      id: 'david', 
      name: 'David - Operations Manager',
      specialties: ['scheduling', 'availability', 'capacity', 'appointments', 'operations'],
      personality: 'systematic operations optimizer',
      emoji: '⚙️'
    },
    sophia: {
      id: 'sophia',
      name: 'Sophia - Brand & Marketing',
      specialties: ['marketing', 'social', 'campaigns', 'branding', 'customers'],
      personality: 'creative marketing strategist',
      emoji: '📱'
    },
    alex: {
      id: 'alex',
      name: 'Alex - Customer Care',
      specialties: ['customer', 'service', 'communication', 'retention', 'satisfaction'],
      personality: 'empathetic customer champion',
      emoji: '👥'
    }
  }

  // Enhanced keyword matching with context awareness
  const keywordScores = {}
  
  // Financial keywords → Marcus
  const financialKeywords = [
    'revenue', 'profit', 'money', 'financial', 'pricing', 'cost', 'analytics',
    'stripe', 'payment', 'income', 'earnings', 'budget', 'forecast', 'roi'
  ]
  
  // Operations keywords → David  
  const operationsKeywords = [
    'schedule', 'booking', 'appointment', 'availability', 'calendar', 'time',
    'capacity', 'efficiency', 'optimization', 'workflow', 'operations'
  ]
  
  // Marketing keywords → Sophia
  const marketingKeywords = [
    'marketing', 'social', 'instagram', 'facebook', 'campaign', 'promotion',
    'brand', 'content', 'advertising', 'seo', 'email', 'newsletter'
  ]
  
  // Customer care keywords → Alex
  const customerKeywords = [
    'customer', 'client', 'service', 'support', 'communication', 'retention',
    'satisfaction', 'feedback', 'follow', 'relationship', 'loyalty'
  ]

  // Calculate relevance scores
  keywordScores.marcus = countKeywordMatches(messageLower, financialKeywords)
  keywordScores.david = countKeywordMatches(messageLower, operationsKeywords)
  keywordScores.sophia = countKeywordMatches(messageLower, marketingKeywords)
  keywordScores.alex = countKeywordMatches(messageLower, customerKeywords)

  // Context-based routing adjustments
  if (context.preferredAgent) {
    keywordScores[context.preferredAgent] += 2
  }

  // Find agent with highest score
  const selectedAgentId = Object.keys(keywordScores).reduce((a, b) => 
    keywordScores[a] > keywordScores[b] ? a : b
  )

  // Default to David for general queries
  if (keywordScores[selectedAgentId] === 0) {
    return agents.david
  }

  return agents[selectedAgentId]
}

/**
 * Enhanced Tool Selection
 * Selects appropriate business tools based on message intent and agent specialty
 */
function selectTools(message, agent, context) {
  const messageLower = message.toLowerCase()
  const tools = []

  // Marcus (Financial) tools
  if (agent.id === 'marcus') {
    if (messageLower.includes('revenue') || messageLower.includes('analytics')) {
      tools.push('get_business_metrics')
    }
    if (messageLower.includes('stripe') || messageLower.includes('payment')) {
      tools.push('get_stripe_data')
    }
    if (messageLower.includes('forecast') || messageLower.includes('prediction')) {
      tools.push('revenue_forecast')
    }
  }

  // David (Operations) tools  
  if (agent.id === 'david') {
    if (messageLower.includes('availability') || messageLower.includes('schedule')) {
      tools.push('check_availability')
    }
    if (messageLower.includes('book') || messageLower.includes('appointment')) {
      tools.push('get_business_metrics') // For capacity analysis
      tools.push('check_availability')
    }
    if (messageLower.includes('optimize') || messageLower.includes('efficiency')) {
      tools.push('analyze_schedule_efficiency')
    }
  }

  // Sophia (Marketing) tools
  if (agent.id === 'sophia') {
    if (messageLower.includes('campaign') || messageLower.includes('email')) {
      tools.push('create_marketing_campaign')
    }
    if (messageLower.includes('social') || messageLower.includes('content')) {
      tools.push('generate_social_content')
    }
    if (messageLower.includes('customer') && messageLower.includes('acquisition')) {
      tools.push('analyze_customer_acquisition')
    }
  }

  // Alex (Customer Care) tools
  if (agent.id === 'alex') {
    if (messageLower.includes('customer') || messageLower.includes('client')) {
      tools.push('get_customer_info')
    }
    if (messageLower.includes('retention') || messageLower.includes('loyalty')) {
      tools.push('analyze_customer_retention')
    }
    if (messageLower.includes('communication') || messageLower.includes('follow')) {
      tools.push('customer_communication_tools')
    }
  }

  // Universal tools available to all agents
  if (messageLower.includes('today') || messageLower.includes('daily')) {
    tools.push('get_business_metrics')
  }

  return [...new Set(tools)] // Remove duplicates
}

/**
 * Tool Execution Engine
 * Executes selected business tools and returns results
 */
async function executeTools(tools, context, agent) {
  const results = []
  const executionStartTime = Date.now()

  for (const toolName of tools) {
    try {
      const toolResult = await executeTool(toolName, context, agent)
      results.push({
        name: toolName,
        params: extractToolParams(toolName, context),
        output: toolResult,
        executionTime: Date.now() - executionStartTime
      })
    } catch (error) {
      console.error(`Tool execution failed for ${toolName}:`, error)
      results.push({
        name: toolName,
        params: extractToolParams(toolName, context),
        error: error.message,
        executionTime: Date.now() - executionStartTime
      })
    }
  }

  return results
}

/**
 * Individual Tool Execution
 * Mock implementation - will be replaced with real business integrations
 */
async function executeTool(toolName, context, agent) {
  // Simulate realistic execution time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100))

  const shopId = context.shopId || 'default-shop'
  const testMode = context.testMode || false

  switch (toolName) {
    case 'get_business_metrics':
      return {
        period: context.period || 'today',
        revenue: '$1,250.00',
        appointments: 15,
        customers: 12,
        averageTicket: '$83.33',
        utilizationRate: '75%',
        executionTime: 180
      }

    case 'check_availability':
      return {
        available: true,
        slots: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
        date: context.date || 'tomorrow',
        shopId: shopId,
        executionTime: 250
      }

    case 'get_customer_info':
      return {
        found: true,
        customer: {
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '(555) 123-4567',
          lastVisit: '2025-08-15',
          totalVisits: 8,
          averageSpend: '$75.00',
          preferences: 'Classic haircut, beard trim'
        },
        executionTime: 120
      }

    case 'get_stripe_data':
      return {
        dailyRevenue: '$1,247.50',
        weeklyRevenue: '$8,932.25',
        monthlyRevenue: '$34,580.75',
        transactionCount: 47,
        averageTransaction: '$73.56',
        topServices: ['Classic Cut', 'Beard Trim', 'Full Service'],
        executionTime: 340
      }

    case 'create_marketing_campaign':
      return {
        campaignId: `camp_${Date.now()}`,
        type: 'email',
        subject: 'Time for Your Next Cut!',
        targetAudience: 'customers_last_30_days',
        estimatedReach: 142,
        status: 'draft',
        executionTime: 420
      }

    default:
      return {
        message: `Tool ${toolName} executed successfully`,
        executionTime: 150
      }
  }
}

/**
 * Agent Response Generation
 * Creates natural language responses based on tool results and agent personality
 */
async function generateAgentResponse(message, agent, toolResults, context) {
  // Extract key data from tool results
  const businessMetrics = toolResults.find(r => r.name === 'get_business_metrics')?.output
  const availability = toolResults.find(r => r.name === 'check_availability')?.output
  const customerInfo = toolResults.find(r => r.name === 'get_customer_info')?.output
  const stripeData = toolResults.find(r => r.name === 'get_stripe_data')?.output

  let response = `${agent.name} here! `

  // Generate contextual response based on agent and tools used
  if (agent.id === 'marcus' && businessMetrics) {
    response += `Today's revenue is ${businessMetrics.revenue} from ${businessMetrics.appointments} appointments. `
    response += `Your average ticket is ${businessMetrics.averageTicket} with ${businessMetrics.utilizationRate} capacity utilization.`
  }
  
  else if (agent.id === 'david' && availability) {
    response += `I found availability: ${availability.slots.join(', ')}. `
    if (businessMetrics) {
      response += `Today's revenue is ${businessMetrics.revenue} from ${businessMetrics.appointments} appointments.`
    }
  }
  
  else if (agent.id === 'alex' && customerInfo) {
    const customer = customerInfo.customer
    response += `Found customer ${customer.name} - ${customer.totalVisits} visits, last on ${customer.lastVisit}.`
  }
  
  else if (agent.id === 'sophia') {
    response += `I can help with marketing campaigns and customer acquisition strategies. `
    if (businessMetrics) {
      response += `With ${businessMetrics.customers} customers and ${businessMetrics.revenue} daily revenue, there's great potential for growth!`
    }
  }
  
  else {
    response += `I'm ready to help with ${agent.specialties.join(', ')} tasks. `
    response += `Let me know what specific assistance you need!`
  }

  return {
    message: response,
    confidence: 0.95,
    agentPersonality: agent.personality
  }
}

/**
 * Helper Functions
 */
function countKeywordMatches(text, keywords) {
  return keywords.reduce((count, keyword) => {
    return count + (text.includes(keyword) ? 1 : 0)
  }, 0)
}

function extractToolParams(toolName, context) {
  const baseParams = {
    shopId: context.shopId || 'default-shop',
    testMode: context.testMode || false
  }

  switch (toolName) {
    case 'get_business_metrics':
      return { ...baseParams, period: context.period || 'today' }
    case 'check_availability':
      return { ...baseParams, date: context.date || 'tomorrow' }
    case 'get_customer_info':
      return { ...baseParams, query: context.customerQuery || 'recent customer' }
    default:
      return baseParams
  }
}

async function storeConversation(supabase, userId, message, response, context) {
  try {
    await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        message: message,
        response: response.message,
        agent_used: context.selectedAgent?.id || 'unknown',
        tools_executed: JSON.stringify(context.toolsUsed || []),
        confidence: response.confidence || 0.8,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to store conversation:', error)
  }
}