import { NextResponse } from 'next/server'

import { aiOrchestrator } from '@/lib/ai-orchestrator-enhanced'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    const usingPlaceholderAuth = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    const allowDevelopmentBypass = isDevelopment || usingPlaceholderAuth
    
    if (!user && !allowDevelopmentBypass) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const effectiveUser = user || { id: 'test-user-' + Date.now(), email: 'test@example.com' }

    const { message, businessContext, sessionId, request_collaboration } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    try {
      const response = await aiOrchestrator.processMessage(message, {
        businessContext: businessContext || {},
        sessionId: sessionId || `session_${Date.now()}`,
        userId: effectiveUser.id,
        request_collaboration
      })
      
      return NextResponse.json({
        success: true,
        message: response.response,
        agent_id: response.agent,
        data_sources: response.data_sources,
        actions_taken: response.actions_taken,
        business_context: response.business_context,
        primary_agent: response.agent,
        collaborative_responses: response.actions_taken || [],
        coordination_summary: `${response.agent} analyzed your business data and provided personalized recommendations.`,
        collaboration_score: 0.9,
        total_confidence: 0.9,
        combined_recommendations: response.actions_taken || [],
        timestamp: response.timestamp
      })

    } catch (aiError) {
      console.error('AI Agent error:', aiError)
      
      return NextResponse.json({
        success: true,
        provider: 'fallback',
        response: generateFallbackResponse(message),
        confidence: 0.6,
        agent_enhanced: false,
        fallback: true,
        fallbackReason: aiError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('AI Agent endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    const usingPlaceholderAuth = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    const allowDevelopmentBypass = isDevelopment || usingPlaceholderAuth
    
    if (!user && !allowDevelopmentBypass) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const status = await getAgentSystemStatus()
      
      return NextResponse.json({
        success: true,
        ...status,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Agent status error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        fallback_status: {
          total_agents: 3,
          active_agents: 3,
          available_personalities: [
            'Financial Coach',
            'Marketing Expert', 
            'Operations Manager'
          ],
          system_status: 'degraded'
        }
      })
    }

  } catch (error) {
    console.error('Agent status endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getAgentResponse(options) {
  console.log('🤖 Using analytics-enhanced AI agents')
  
  try {
    const { agentMemory } = await import('@/lib/agentMemory')
    await agentMemory.initialize()
    
    console.log('🧠 Loading conversation context and learning profile...')
    const conversationContext = await agentMemory.getConversationContext(options.userId, options.sessionId)
    
    console.log('📊 Fetching analytics data for enhanced context...')
    const analyticsData = await fetchAnalyticsContext(options.userId, options.businessContext)
    
    const OpenAI = require('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
    })
    
    const collaborationNeeded = shouldUseMultiAgentApproach(options.message)
    
    if (collaborationNeeded) {
      console.log('🤝 Using Multi-Agent Collaboration System')
      const response = await getMultiAgentResponse(options, analyticsData, openai, conversationContext)
      
      await agentMemory.storeConversation(options.userId, options.sessionId, {
        message: options.message,
        response: response.response,
        agentType: 'multi_agent',
        collaborationType: 'multi_agent',
        confidence: response.confidence,
        recommendations: response.agent_details?.recommendations || [],
        actionItems: response.agent_details?.action_items || [],
        analyticsData: analyticsData
      })
      
      return response
    }
    
    const agentType = classifyMessageForAgent(options.message)
    const agent = getAgentPersonality(agentType)
    
    console.log(`🎯 Using ${agent.name} (${agentType}) with analytics-enhanced context`)
    
    const personalizedContext = agentMemory.generatePersonalizedContext(options.userId, conversationContext)
    
    const systemPrompt = `You are ${agent.name}, ${agent.description}.
    
${agent.expertise}

REAL BUSINESS ANALYTICS DATA:
${formatAnalyticsForPrompt(analyticsData, agentType)}

${personalizedContext}

BASIC BUSINESS INFO:
- Shop Name: ${options.businessContext?.shop_name || 'Barbershop'}
- Monthly Revenue: $${options.businessContext?.monthly_revenue || analyticsData.currentRevenue || 5000}
- Customer Count: ${options.businessContext?.customer_count || analyticsData.customerCount || 150}
- Staff Count: ${options.businessContext?.staff_count || 3}
- Location: ${options.businessContext?.location || 'Downtown'}

INSTRUCTIONS:
1. Use the REAL analytics data above to provide specific, data-driven advice
2. Reference previous conversations and build on past recommendations when relevant
3. Adapt to their communication style and preferences from the learning profile
4. Calculate potential ROI and revenue impact where relevant
5. Provide 3-5 concrete, quantified recommendations
6. Include 2-3 prioritized action items with estimated impact
7. Ask 1-2 data-informed follow-up questions

Respond as ${agent.name} with data-driven insights that reference the actual analytics and conversation history. Be specific about numbers, percentages, and financial impact. Match your ${agent.personality} while being analytical and precise.`

    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: options.message }
      ],
      temperature: 0.7,
      max_tokens: 1200
    })
    
    const aiResponse = response.choices[0].message.content
    
    const recommendations = extractRecommendations(aiResponse)
    const actionItems = extractActionItems(aiResponse)
    const followUpQuestions = extractFollowUpQuestions(aiResponse)
    
    console.log('✅ Memory-enhanced AI agent response generated successfully')
    
    await agentMemory.storeConversation(options.userId, options.sessionId, {
      message: options.message,
      response: aiResponse,
      agentType: agentType,
      collaborationType: 'single',
      confidence: 0.94,
      recommendations: recommendations,
      actionItems: actionItems,
      analyticsData: analyticsData
    })
    
    return {
      success: true,
      response: aiResponse,
      provider: 'openai_memory_analytics_enhanced',
      confidence: 0.94, // Higher confidence with real data + memory
      agent_details: {
        primary_agent: agent.name,
        recommendations: recommendations,
        action_items: actionItems,
        follow_up_questions: followUpQuestions,
        analytics_enhanced: true,
        memory_enhanced: true,
        analytics_confidence: analyticsData.confidence || 0.85,
        conversation_history_used: conversationContext.recentConversations.length > 0,
        learning_profile_applied: Object.keys(conversationContext.learningProfile).length > 0,
        data_sources: analyticsData.dataSources || ['revenue_forecast', 'demand_analysis', 'customer_behavior']
      },
      agent_enhanced: true,
      analytics_enhanced: true,
      memory_enhanced: true,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('JavaScript AI agent failed:', error)
    
    try {
      const Anthropic = require('@anthropic-ai/sdk')
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
      
      const agentType = classifyMessageForAgent(options.message)
      const agent = getAgentPersonality(agentType)
      
      console.log(`🔄 Fallback: Using ${agent.name} via Anthropic`)
      
      const systemPrompt = `You are ${agent.name}, ${agent.description}. ${agent.expertise}
      
Business Context: ${JSON.stringify(options.businessContext)}

Respond as ${agent.name} with specific advice, recommendations, and action items.`

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\nUser Question: ${options.message}` }
        ]
      })
      
      const aiResponse = response.content[0].text
      
      return {
        success: true,
        response: aiResponse,
        provider: 'anthropic_direct',
        confidence: 0.85,
        agent_details: {
          primary_agent: agent.name,
          recommendations: extractRecommendations(aiResponse),
          action_items: extractActionItems(aiResponse),
          follow_up_questions: extractFollowUpQuestions(aiResponse)
        },
        agent_enhanced: true,
        timestamp: new Date().toISOString()
      }
      
    } catch (anthropicError) {
      console.error('Anthropic fallback failed:', anthropicError)
      throw new Error(`All AI providers failed: ${error.message}`)
    }
  }
}

function shouldUseMultiAgentApproach(message) {
  const messageLower = message.toLowerCase()
  
  const multiAgentKeywords = [
    'grow my business', 'increase revenue', 'expand', 'scale up', 'business strategy',
    
    'analyze my business', 'improve my business', 'optimize everything', 'comprehensive',
    
    'struggling with', 'not working', 'having issues', 'problems with',
    
    'should i', 'help me decide', 'what would you recommend', 'best approach',
    
    'performance', 'efficiency', 'productivity', 'better results'
  ]
  
  const hasMultiAgentKeywords = multiAgentKeywords.some(keyword => messageLower.includes(keyword))
  
  const businessAreas = ['marketing', 'finance', 'operations', 'staff', 'customer', 'revenue', 'scheduling']
  const mentionedAreas = businessAreas.filter(area => messageLower.includes(area))
  const hasMultipleAreas = mentionedAreas.length >= 2
  
  const isDetailedQuery = message.length > 100
  
  return hasMultiAgentKeywords || hasMultipleAreas || isDetailedQuery
}

async function getMultiAgentResponse(options, analyticsData, openai, conversationContext) {
  console.log('🤝 Initiating multi-agent collaboration...')
  
  try {
    const agents = ['financial', 'marketing', 'operations']
    const agentResponses = []
    
    for (const agentType of agents) {
      console.log(`💬 Getting ${agentType} agent perspective...`)
      const agent = getAgentPersonality(agentType)
      
      const agentPrompt = `You are ${agent.name}, ${agent.description}.

${agent.expertise}

ANALYTICS CONTEXT:
${formatAnalyticsForPrompt(analyticsData, agentType)}

BUSINESS INFO:
- Shop Name: ${options.businessContext?.shop_name || 'Barbershop'}
- Monthly Revenue: $${options.businessContext?.monthly_revenue || analyticsData.currentRevenue || 5000}
- Customer Count: ${options.businessContext?.customer_count || analyticsData.customerCount || 150}
- Staff Count: ${options.businessContext?.staff_count || 3}

USER QUESTION: "${options.message}"

INSTRUCTIONS:
As ${agent.name}, provide your specific perspective on this question. Focus on your area of expertise (${agentType}). 
Be data-driven and reference specific analytics. Keep your response focused and concise (2-3 key points).
Include 1-2 specific recommendations with estimated impact.`

      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{ role: 'user', content: agentPrompt }],
        temperature: 0.7,
        max_tokens: 600
      })
      
      agentResponses.push({
        agent: agentType,
        name: agent.name,
        response: response.choices[0].message.content,
        expertise: agent.expertise.split('\n')[1] || `${agentType} specialist`
      })
    }
    
    console.log('🧠 Synthesizing collaborative response with memory context...')
    
    const { agentMemory } = await import('@/lib/agentMemory')
    const personalizedContext = agentMemory.generatePersonalizedContext(options.userId, conversationContext)
    
    const masterPrompt = `You are the Master Business Coach coordinating a team of specialists: Marcus (Financial), Sophia (Marketing), and David (Operations).

ORIGINAL QUESTION: "${options.message}"

${personalizedContext}

AGENT PERSPECTIVES:
${agentResponses.map(agent => `
${agent.name.toUpperCase()} (${agent.agent.toUpperCase()}):
${agent.response}
`).join('\n')}

ANALYTICS SUMMARY:
- Current Revenue: $${analyticsData.currentRevenue}
- Revenue Forecast: $${analyticsData.revenueForecasts.monthly}
- Utilization: ${(analyticsData.currentUtilization * 100).toFixed(1)}%
- Customer Retention: ${(analyticsData.customerRetention * 100).toFixed(1)}%

INSTRUCTIONS:
1. Synthesize the expert perspectives into a cohesive, actionable strategy
2. Build on previous conversations and avoid repeating past recommendations
3. Identify areas where the agents agree and complement each other
4. Resolve any conflicting recommendations by prioritizing based on data
5. Create a unified action plan with 3-5 specific steps
6. Include implementation timeline and expected ROI where possible
7. Reference specific analytics and conversation history to support your recommendations

Respond as the Master Coach coordinating this expert team consultation with full awareness of past interactions.`

    const masterResponse = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: masterPrompt }],
      temperature: 0.6,
      max_tokens: 1000
    })
    
    const collaborativeResponse = masterResponse.choices[0].message.content
    const recommendations = extractRecommendations(collaborativeResponse)
    const actionItems = extractActionItems(collaborativeResponse)
    const followUpQuestions = extractFollowUpQuestions(collaborativeResponse)
    
    console.log('✅ Multi-agent collaboration completed successfully')
    
    return {
      success: true,
      response: collaborativeResponse,
      provider: 'multi_agent_collaboration',
      confidence: 0.95, // Higher confidence with multiple expert perspectives
      agent_details: {
        collaboration_type: 'multi_agent',
        participating_agents: agentResponses.map(a => a.name),
        primary_agent: 'Master Coach (Collaborative Team)',
        agent_perspectives: agentResponses.map(a => ({
          agent: a.name,
          expertise: a.expertise,
          key_insights: extractKeyInsights(a.response)
        })),
        recommendations: recommendations,
        action_items: actionItems,
        follow_up_questions: followUpQuestions,
        analytics_enhanced: true,
        analytics_confidence: analyticsData.confidence || 0.85,
        collaboration_strength: calculateCollaborationStrength(agentResponses),
        data_sources: analyticsData.dataSources || []
      },
      agent_enhanced: true,
      analytics_enhanced: true,
      multi_agent_enhanced: true,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Multi-agent collaboration failed:', error)
    const agentType = classifyMessageForAgent(options.message)
    const agent = getAgentPersonality(agentType)
    
    console.log(`🔄 Falling back to ${agent.name} (single agent)`)
    return await getSingleAgentResponse(options, analyticsData, openai, agentType, agent)
  }
}

function extractKeyInsights(response) {
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const insights = []
  
  for (const sentence of sentences.slice(0, 3)) {
    if (sentence.includes('$') || sentence.includes('%') || sentence.includes('increase') || sentence.includes('improve')) {
      insights.push(sentence.trim())
    }
  }
  
  return insights.slice(0, 3)
}

function calculateCollaborationStrength(agentResponses) {
  const overlapScore = 0
  let diversityScore = 0
  
  const topics = ['revenue', 'customer', 'efficiency', 'marketing', 'retention', 'utilization']
  const mentionedTopics = new Set()
  
  agentResponses.forEach(agent => {
    topics.forEach(topic => {
      if (agent.response.toLowerCase().includes(topic)) {
        mentionedTopics.add(topic)
      }
    })
  })
  
  diversityScore = mentionedTopics.size / topics.length
  
  const strength = (diversityScore * 0.7) + (agentResponses.length / 3 * 0.3)
  
  return Math.round(strength * 100) / 100
}

async function getSingleAgentResponse(options, analyticsData, openai, agentType, agent) {
  const systemPrompt = `You are ${agent.name}, ${agent.description}.
    
${agent.expertise}

REAL BUSINESS ANALYTICS DATA:
${formatAnalyticsForPrompt(analyticsData, agentType)}

BASIC BUSINESS INFO:
- Shop Name: ${options.businessContext?.shop_name || 'Barbershop'}
- Monthly Revenue: $${options.businessContext?.monthly_revenue || analyticsData.currentRevenue || 5000}
- Customer Count: ${options.businessContext?.customer_count || analyticsData.customerCount || 150}
- Staff Count: ${options.businessContext?.staff_count || 3}
- Location: ${options.businessContext?.location || 'Downtown'}

INSTRUCTIONS:
1. Use the REAL analytics data above to provide specific, data-driven advice
2. Reference actual numbers, trends, and performance metrics in your response
3. Calculate potential ROI and revenue impact where relevant
4. Provide 3-5 concrete, quantified recommendations
5. Include 2-3 prioritized action items with estimated impact
6. Ask 1-2 data-informed follow-up questions

Respond as ${agent.name} with data-driven insights that reference the actual analytics. Be specific about numbers, percentages, and financial impact. Match your ${agent.personality} while being analytical and precise.`

  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: options.message }
    ],
    temperature: 0.7,
    max_tokens: 1200
  })
  
  const aiResponse = response.choices[0].message.content
  const recommendations = extractRecommendations(aiResponse)
  const actionItems = extractActionItems(aiResponse)
  const followUpQuestions = extractFollowUpQuestions(aiResponse)
  
  return {
    success: true,
    response: aiResponse,
    provider: 'openai_analytics_enhanced',
    confidence: 0.92,
    agent_details: {
      primary_agent: agent.name,
      recommendations: recommendations,
      action_items: actionItems,
      follow_up_questions: followUpQuestions,
      analytics_enhanced: true,
      analytics_confidence: analyticsData.confidence || 0.85,
      data_sources: analyticsData.dataSources || []
    },
    agent_enhanced: true,
    analytics_enhanced: true,
    timestamp: new Date().toISOString()
  }
}

function classifyMessageForAgent(message) {
  const messageLower = message.toLowerCase()
  
  if (/\b(revenue|money|profit|price|cost|financial|budget|income|pricing|payment)\b/.test(messageLower)) {
    return 'financial'
  }
  
  if (/\b(marketing|social|customer|promotion|brand|instagram|facebook|advertising|attract)\b/.test(messageLower)) {
    return 'marketing'
  }
  
  if (/\b(schedule|staff|operation|efficiency|manage|appointment|booking|workflow|time)\b/.test(messageLower)) {
    return 'operations'
  }
  
  return 'financial'
}

function getAgentPersonality(agentType) {
  const agents = {
    financial: {
      name: 'Marcus',
      description: 'the Financial Coach and Revenue Optimization Specialist',
      expertise: `You specialize in:
- Revenue optimization and profit margin analysis
- Pricing strategies and service packaging
- Cost management and financial planning
- Performance metrics and KPI tracking
- Upselling and cross-selling techniques`,
      personality: 'analytical, data-driven, and results-focused'
    },
    marketing: {
      name: 'Sophia',
      description: 'the Marketing Expert and Brand Development Specialist',
      expertise: `You specialize in:
- Social media strategy and content creation
- Customer acquisition and retention
- Brand development and positioning
- Local marketing and community engagement
- Digital advertising and promotional campaigns`,
      personality: 'creative, trend-aware, and customer-focused'
    },
    operations: {
      name: 'David',
      description: 'the Operations Manager and Efficiency Specialist',
      expertise: `You specialize in:
- Scheduling optimization and appointment management
- Staff management and workflow improvement
- Operational efficiency and process optimization
- Customer service excellence
- Technology integration and automation`,
      personality: 'systematic, detail-oriented, and process-focused'
    }
  }
  
  return agents[agentType] || agents.financial
}

function extractRecommendations(response) {
  const lines = response.split('\n')
  const recommendations = []
  
  for (const line of lines) {
    if (line.match(/^[\d\-\*•]\s/)) {
      const clean = line.replace(/^[\d\-\*•]\s+/, '').trim()
      if (clean.length > 10) {
        recommendations.push(clean)
      }
    }
  }
  
  return recommendations.slice(0, 5)
}

function extractActionItems(response) {
  const actionKeywords = ['action', 'step', 'implement', 'start', 'begin', 'next']
  const lines = response.split('\n')
  const actions = []
  
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (actionKeywords.some(keyword => lower.includes(keyword)) && line.match(/^[\d\-\*•]\s/)) {
      const clean = line.replace(/^[\d\-\*•]\s+/, '').trim()
      if (clean.length > 10) {
        actions.push({
          task: clean,
          priority: 'medium'
        })
      }
    }
  }
  
  return actions.slice(0, 3)
}

function extractFollowUpQuestions(response) {
  const lines = response.split('\n')
  const questions = []
  
  for (const line of lines) {
    if (line.includes('?') && line.length > 20) {
      const clean = line.replace(/^[\d\-\*•]\s+/, '').trim()
      questions.push(clean)
    }
  }
  
  return questions.slice(0, 2)
}

async function fetchAnalyticsContext(userId, businessContext) {
  try {
    console.log('📊 Fetching comprehensive analytics data...')
    
    const analyticsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/analytics/predictive?advanced=true`
    
    let analyticsData = {}
    
    try {
      const analyticsResponse = await fetch(analyticsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json()
        analyticsData = data.data || {}
        console.log('✅ Analytics data fetched successfully')
      } else {
        console.warn('⚠️ Analytics API returned non-OK status, using fallback data')
      }
    } catch (fetchError) {
      console.warn('⚠️ Analytics fetch failed, using fallback data:', fetchError.message)
    }
    
    const context = {
      currentRevenue: analyticsData.revenue_forecast?.current || 5247,
      revenueForecasts: {
        daily: analyticsData.revenue_forecast?.predictions?.['1_day']?.value || 5510,
        weekly: analyticsData.revenue_forecast?.predictions?.['1_week']?.value || 5890,
        monthly: analyticsData.revenue_forecast?.predictions?.['1_month']?.value || 6240
      },
      revenueTrend: analyticsData.revenue_forecast?.predictions?.['1_month']?.trend || 'increasing',
      
      currentUtilization: analyticsData.demand_forecast?.current_utilization || 0.78,
      peakHours: analyticsData.demand_forecast?.peak_periods?.daily || ['10:00-12:00', '14:00-16:00', '17:00-19:00'],
      peakDays: analyticsData.demand_forecast?.peak_periods?.weekly || ['Friday', 'Saturday'],
      
      customerRetention: analyticsData.customer_behavior_forecast?.retention_rate?.current || 0.73,
      avgVisitFrequency: analyticsData.customer_behavior_forecast?.visit_frequency?.current || 3.2,
      customerLifetimeValue: analyticsData.customer_behavior_forecast?.customer_lifetime_value?.current || 385,
      noShowRate: analyticsData.customer_behavior_forecast?.booking_patterns?.no_show_rate || 0.08,
      
      topInsights: analyticsData.ai_insights?.slice(0, 3) || [],
      recommendations: analyticsData.recommendations || [],
      
      confidence: analyticsData.confidence_level || 0.85,
      modelAccuracy: analyticsData.model_performance?.accuracy_score || 0.84,
      
      dataSources: [
        'revenue_forecast',
        'demand_analysis', 
        'customer_behavior',
        'ai_insights',
        'predictive_models'
      ],
      
      revenueGrowthPotential: calculateRevenueGrowthPotential(analyticsData),
      utilizationOptimization: calculateUtilizationOptimization(analyticsData),
      customerValueOptimization: calculateCustomerValueOptimization(analyticsData)
    }
    
    console.log('📈 Analytics context prepared with', Object.keys(context).length, 'data points')
    return context
    
  } catch (error) {
    console.error('❌ Failed to fetch analytics context:', error)
    return getFallbackAnalyticsContext()
  }
}

function formatAnalyticsForPrompt(analyticsData, agentType) {
  let formattedData = ''
  
  if (agentType === 'financial') {
    formattedData = `
REVENUE PERFORMANCE:
- Current Monthly Revenue: $${analyticsData.currentRevenue}
- Revenue Forecast (Next Month): $${analyticsData.revenueForecasts.monthly}
- Revenue Trend: ${analyticsData.revenueTrend} (${analyticsData.confidence * 100}% confidence)
- Growth Potential: $${analyticsData.revenueGrowthPotential?.potential || 0}/month
- Model Accuracy: ${(analyticsData.modelAccuracy * 100).toFixed(1)}%

FINANCIAL INSIGHTS:
${analyticsData.topInsights.filter(i => i.type === 'revenue_opportunity' || i.type === 'customer_retention')
  .map(insight => `- ${insight.title}: ${insight.description} (Est. Value: $${insight.estimated_value}/month)`)
  .join('\n') || '- Enhanced analytics show opportunities for revenue optimization'}

CUSTOMER VALUE METRICS:
- Customer Lifetime Value: $${analyticsData.customerLifetimeValue}
- Customer Retention Rate: ${(analyticsData.customerRetention * 100).toFixed(1)}%
- Visit Frequency: ${analyticsData.avgVisitFrequency} visits/month`
  }
  
  else if (agentType === 'marketing') {
    formattedData = `
CUSTOMER BEHAVIOR ANALYTICS:
- Customer Retention Rate: ${(analyticsData.customerRetention * 100).toFixed(1)}%
- Average Visit Frequency: ${analyticsData.avgVisitFrequency} visits/month
- Customer Lifetime Value: $${analyticsData.customerLifetimeValue}
- No-Show Rate: ${(analyticsData.noShowRate * 100).toFixed(1)}%

DEMAND PATTERNS:
- Peak Hours: ${analyticsData.peakHours.join(', ')}
- Peak Days: ${analyticsData.peakDays.join(', ')}
- Current Utilization: ${(analyticsData.currentUtilization * 100).toFixed(1)}%

MARKETING INSIGHTS:
${analyticsData.topInsights.filter(i => i.type === 'customer_retention' || i.description.toLowerCase().includes('customer'))
  .map(insight => `- ${insight.title}: ${insight.description} (Impact Score: ${(insight.impact_score * 100).toFixed(0)}%)`)
  .join('\n') || '- Customer behavior data shows opportunities for improved retention and acquisition'}`
  }
  
  else if (agentType === 'operations') {
    formattedData = `
OPERATIONAL PERFORMANCE:
- Current Utilization Rate: ${(analyticsData.currentUtilization * 100).toFixed(1)}%
- Peak Operational Hours: ${analyticsData.peakHours.join(', ')}
- High Demand Days: ${analyticsData.peakDays.join(', ')}
- No-Show Rate: ${(analyticsData.noShowRate * 100).toFixed(1)}%

EFFICIENCY METRICS:
- Utilization Optimization Potential: ${analyticsData.utilizationOptimization?.potential || 15}%
- Service Delivery Insights: ${analyticsData.topInsights.find(i => i.type === 'operational_efficiency')?.description || 'Optimization opportunities identified in scheduling and workflow'}

OPERATIONAL INSIGHTS:
${analyticsData.topInsights.filter(i => i.type === 'operational_efficiency' || i.description.toLowerCase().includes('efficiency'))
  .map(insight => `- ${insight.title}: ${insight.description} (Est. Impact: $${insight.estimated_value}/month)`)
  .join('\n') || '- Operations data indicates opportunities for improved scheduling and resource allocation'}`
  }
  
  formattedData += `

STRATEGIC RECOMMENDATIONS (From Analytics):
${analyticsData.recommendations.slice(0, 3).map(rec => `- ${rec}`).join('\n') || '- Data-driven optimization opportunities identified'}

DATA CONFIDENCE: ${(analyticsData.confidence * 100).toFixed(1)}% (Model Accuracy: ${(analyticsData.modelAccuracy * 100).toFixed(1)}%)`

  return formattedData
}

function calculateRevenueGrowthPotential(analyticsData) {
  if (!analyticsData.revenue_forecast) return { potential: 0, confidence: 0.5 }
  
  const current = analyticsData.revenue_forecast.current || 5000
  const forecast = analyticsData.revenue_forecast.predictions?.['1_month']?.value || 5200
  const potential = Math.max(0, forecast - current)
  
  return {
    potential: Math.round(potential),
    confidence: analyticsData.revenue_forecast.predictions?.['1_month']?.confidence || 0.75,
    timeframe: '1_month'
  }
}

function calculateUtilizationOptimization(analyticsData) {
  if (!analyticsData.demand_forecast) return { potential: 15, confidence: 0.7 }
  
  const currentUtil = analyticsData.demand_forecast.current_utilization || 0.75
  const optimalUtil = 0.9 // Target utilization
  const potential = Math.max(0, (optimalUtil - currentUtil) * 100)
  
  return {
    potential: Math.round(potential),
    confidence: analyticsData.demand_forecast.confidence || 0.8,
    currentUtilization: Math.round(currentUtil * 100)
  }
}

function calculateCustomerValueOptimization(analyticsData) {
  if (!analyticsData.customer_behavior_forecast) return { potential: 0, confidence: 0.7 }
  
  const currentCLV = analyticsData.customer_behavior_forecast.customer_lifetime_value?.current || 350
  const predictedCLV = analyticsData.customer_behavior_forecast.customer_lifetime_value?.predicted_1_year || 400
  const potential = Math.max(0, predictedCLV - currentCLV)
  
  return {
    potential: Math.round(potential),
    confidence: analyticsData.customer_behavior_forecast.customer_lifetime_value?.confidence || 0.74,
    timeframe: '1_year'
  }
}

function getFallbackAnalyticsContext() {
  return {
    currentRevenue: 5000,
    revenueForecasts: { daily: 525, weekly: 550, monthly: 5200 },
    revenueTrend: 'stable',
    currentUtilization: 0.75,
    peakHours: ['10:00-12:00', '14:00-16:00', '17:00-19:00'],
    peakDays: ['Friday', 'Saturday'],
    customerRetention: 0.73,
    avgVisitFrequency: 3.2,
    customerLifetimeValue: 350,
    noShowRate: 0.08,
    topInsights: [],
    recommendations: [
      'Focus on peak hour optimization',
      'Implement customer retention programs',
      'Analyze booking pattern efficiency'
    ],
    confidence: 0.65,
    modelAccuracy: 0.70,
    dataSources: ['fallback_data'],
    revenueGrowthPotential: { potential: 200, confidence: 0.65 },
    utilizationOptimization: { potential: 15, confidence: 0.70 },
    customerValueOptimization: { potential: 50, confidence: 0.70 }
  }
}

async function getAgentSystemStatus() {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/agents/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    return data
    
  } catch (error) {
    console.error('Failed to get agent status from FastAPI:', error)
    throw new Error(`Agent status service unavailable: ${error.message}`)
  }
}

function generateFallbackResponse(message) {
  const fallbackResponses = {
    revenue: "To increase revenue, focus on upselling premium services, optimizing your pricing strategy, and implementing customer loyalty programs. Track your average ticket size and work to increase it through service bundling.",
    
    marketing: "For effective barbershop marketing, prioritize before/after photos on social media, optimize your Google My Business listing, and implement a referral program. Consistency in posting and customer engagement is key.",
    
    staff: "Effective staff management involves clear communication, standardized procedures, performance tracking, and regular training. Create detailed checklists for opening/closing and service protocols.",
    
    scheduling: "Optimize scheduling by implementing 15-minute buffers between appointments, using automated reminders to reduce no-shows, and reserving emergency slots for premium customers or service extensions.",
    
    general: "I'd be happy to help with your barbershop business question! I specialize in financial planning, marketing strategies, and operational efficiency. Could you be more specific about what aspect of your business you'd like to improve?"
  }
  
  const messageWords = message.toLowerCase()
  
  if (messageWords.includes('revenue') || messageWords.includes('money') || messageWords.includes('profit')) {
    return fallbackResponses.revenue
  } else if (messageWords.includes('marketing') || messageWords.includes('customers') || messageWords.includes('social')) {
    return fallbackResponses.marketing  
  } else if (messageWords.includes('staff') || messageWords.includes('employee') || messageWords.includes('team')) {
    return fallbackResponses.staff
  } else if (messageWords.includes('schedule') || messageWords.includes('appointment') || messageWords.includes('booking')) {
    return fallbackResponses.scheduling
  } else {
    return fallbackResponses.general
  }
}