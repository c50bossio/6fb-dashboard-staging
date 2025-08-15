import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const isDemoMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    
    if (!user && !isDemoMode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const effectiveUser = user || { id: 'demo-user', email: 'demo@barbershop.com' }

    const { message, sessionId, businessContext } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const currentSession = sessionId || `session_${Date.now()}_${effectiveUser.id}`

    try {
      const orchestratorResponse = await callPythonAIOrchestrator(message, currentSession, businessContext)
      
      if (user) {
        await storeConversation(supabase, effectiveUser.id, currentSession, message, orchestratorResponse)
      }
      
      return NextResponse.json({
        success: true,
        response: orchestratorResponse.response,
        message: orchestratorResponse.response, // Compatibility with frontend
        sessionId: currentSession,
        
        agent_name: orchestratorResponse.agent_name,
        agent_personality: orchestratorResponse.agent_personality,
        
        recommendations: orchestratorResponse.recommendations || [],
        action_items: orchestratorResponse.action_items || [],
        follow_up_questions: orchestratorResponse.follow_up_questions || [],
        executed_actions: orchestratorResponse.executed_actions || [],
        
        provider: orchestratorResponse.provider || 'rag_enhanced_agents',
        confidence: orchestratorResponse.confidence,
        messageType: orchestratorResponse.message_type,
        selectedProvider: orchestratorResponse.selected_provider,
        contextualInsights: orchestratorResponse.contextual_insights,
        knowledgeEnhanced: orchestratorResponse.knowledge_enhanced,
        timestamp: orchestratorResponse.timestamp,
        usage: orchestratorResponse.usage
      })

    } catch (aiError) {
      console.error('AI Orchestrator error:', aiError)
      
      const fallbackResponse = await generateFallbackResponse(message, currentSession, businessContext)
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse.response,
        sessionId: currentSession,
        provider: 'fallback',
        confidence: fallbackResponse.confidence,
        fallback: true,
        fallbackReason: aiError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('AI Orchestrator endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function callPythonAIOrchestrator(message, sessionId, businessContext = {}) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/enhanced-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        business_context: {
          ...businessContext,
          business_name: businessContext.business_name || 'Elite Cuts Barbershop',
          user_preferences: businessContext.user_preferences || {},
          conversation_history: businessContext.conversation_history || [],
          requested_actions: detectExecutableActions(message),
          agent_routing_preferences: businessContext.agent_routing || 'auto'
        },
        features: {
          rag_enhanced: true,
          executable_actions: true,
          multi_agent_collaboration: true,
          knowledge_powered_recommendations: true
        }
      }),
      timeout: 30000 // Increased timeout for complex agent coordination
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'AI Orchestrator failed')
    }

    return {
      ...data,
      agent_name: data.agent_name || 'AI Agent',
      agent_personality: data.agent_personality || 'strategic_mindset',
      recommendations: data.recommendations || [],
      action_items: data.action_items || [],
      follow_up_questions: data.follow_up_questions || [],
      executed_actions: data.executed_actions || [],
      knowledge_enhanced: data.knowledge_enhanced || false,
      confidence: data.confidence || 0.8
    }
    
  } catch (error) {
    console.error('Failed to call Python AI Orchestrator:', error)
    throw new Error(`AI Orchestrator unavailable: ${error.message}`)
  }
}

function detectExecutableActions(message) {
  const messageLower = message.toLowerCase()
  const actions = []
  
  if (messageLower.includes('send text') || messageLower.includes('sms') || messageLower.includes('text blast')) {
    actions.push({ type: 'sms_campaign', priority: 'high' })
  }
  if (messageLower.includes('send email') || messageLower.includes('email blast')) {
    actions.push({ type: 'email_campaign', priority: 'high' })
  }
  
  if (messageLower.includes('follow up') || messageLower.includes('contact customer')) {
    actions.push({ type: 'customer_followup', priority: 'medium' })
  }
  
  if (messageLower.includes('post on social') || messageLower.includes('social media')) {
    actions.push({ type: 'social_media_post', priority: 'medium' })
  }
  
  return actions
}

async function generateFallbackResponse(message, sessionId, businessContext) {
  console.log('🔄 Generating enhanced fallback response for:', message)
  
  try {
    const agentResponse = routeAndGenerateFallback(message, businessContext)
    
    return {
      response: agentResponse.response,
      agent_name: agentResponse.agent_name,
      agent_personality: agentResponse.agent_personality,
      recommendations: agentResponse.recommendations,
      action_items: agentResponse.action_items,
      confidence: agentResponse.confidence,
      messageType: 'fallback_enhanced',
      fallback: true,
      provider: 'enhanced_fallback'
    }
  } catch (fallbackError) {
    console.error('Enhanced fallback generation failed:', fallbackError)
    
    return {
      response: `🤖 **AI Command Center - Temporary Service Mode**

I understand you're asking about "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}". 

While I'm experiencing technical difficulties with my advanced agents, I can still provide general business guidance:

**💰 Revenue Focus**: Track daily targets, optimize pricing, increase average ticket value
**📱 Marketing**: Social media presence, customer reviews, referral programs
**⚙️ Operations**: Scheduling efficiency, staff productivity, customer flow
**👥 Customer Care**: Follow-up systems, satisfaction tracking, retention strategies

**Quick Actions You Can Take:**
• Review this week's revenue performance
• Check Google My Business for new reviews
• Follow up with customers from the past 3 days
• Optimize tomorrow's appointment schedule

Please try rephrasing your question, and I'll do my best to help!`,
      agent_name: 'System Assistant',
      agent_personality: 'strategic_mindset',
      recommendations: [
        'Try rephrasing your question for better results',
        'Focus on specific business areas: revenue, marketing, operations, or customers',
        'Check system status and try again in a few minutes'
      ],
      action_items: [],
      confidence: 0.65,
      messageType: 'emergency_fallback',
      fallback: true
    }
  }
}

function routeAndGenerateFallback(message, businessContext) {
  const messageLower = message.toLowerCase()
  
  if (['revenue', 'money', 'profit', 'pricing', 'cost'].some(keyword => messageLower.includes(keyword))) {
    const stripeConfigured = process.env.STRIPE_SECRET_KEY && 
                            process.env.STRIPE_SECRET_KEY.startsWith('sk_')
    
    const modeLabel = stripeConfigured ? 'Full Mode' : 'Limited Mode'
    const agentName = stripeConfigured ? 'Marcus' : 'Marcus (Fallback Mode)'
    
    return {
      agent_name: agentName,
      agent_personality: 'financial_coach',
      response: `💰 **Financial Analysis - ${modeLabel}**

${stripeConfigured 
  ? "I have access to your Stripe financial data and can provide comprehensive insights:" 
  : "I'm currently operating in fallback mode, but I can share some key financial insights:"}

**Revenue Optimization Strategy:**
• **Daily Target**: Aim for consistent $500+ days ($15,000 monthly)
• **Average Ticket**: Focus on increasing service value over volume
• **Peak Hour Pricing**: Charge 15-20% premium during busy times
• **Service Bundling**: Create packages that increase transaction value

**Immediate Actions:**
1. Calculate your current average service price
2. Identify your 3 most profitable services
3. Review pricing against local competition
4. Test premium service packages with select customers

Would you like me to help you calculate specific revenue targets or pricing strategies?`,
      recommendations: [
        'Calculate current average ticket value and compare to $75-85 target',
        'Implement premium service packages for higher-value transactions',
        'Track daily revenue targets and adjust pricing accordingly'
      ],
      action_items: [
        { task: 'Calculate current average service price', priority: 'high' },
        { task: 'Research competitor pricing in your area', priority: 'medium' }
      ],
      confidence: 0.75
    }
  }
  
  if (['marketing', 'customers', 'social', 'instagram', 'promotion'].some(keyword => messageLower.includes(keyword))) {
    return {
      agent_name: 'Sophia (Fallback Mode)',
      agent_personality: 'marketing_expert',
      response: `📱 **Marketing Strategy - Limited Mode**

I'm in fallback mode but can provide core marketing guidance:

**Customer Acquisition Formula:**
• **Content Strategy**: 40% transformations, 30% behind-scenes, 20% tips, 10% community
• **Platform Priority**: Instagram → Google My Business → Facebook
• **Posting Frequency**: 3-4 times weekly consistently beats daily sporadic posts
• **Local SEO**: Google My Business optimization is critical for discovery

**Immediate Marketing Actions:**
1. Take before/after photos of your next 5 clients (with permission)
2. Update Google My Business with this week's hours and photos
3. Respond to all Google reviews from the past month
4. Create a simple referral program ($15 credit for referrals)

**Content Ideas for This Week:**
• Show your morning setup routine
• Post a grooming tip (beard care, styling advice)
• Share customer transformation (with permission)
• Behind-the-scenes of your favorite techniques`,
      recommendations: [
        'Focus on Instagram for visual before/after content',
        'Optimize Google My Business listing for local search visibility',
        'Create systematic customer review collection process'
      ],
      action_items: [
        { task: 'Set up Instagram business account if not done', priority: 'high' },
        { task: 'Create content calendar for next 2 weeks', priority: 'medium' }
      ],
      confidence: 0.78
    }
  }
  
  if (['schedule', 'staff', 'operations', 'efficiency', 'appointment'].some(keyword => messageLower.includes(keyword))) {
    return {
      agent_name: 'David (Fallback Mode)', 
      agent_personality: 'operations_manager',
      response: `⚙️ **Operations Optimization - Limited Mode**

I'm operating in fallback mode but can share operational best practices:

**Scheduling Efficiency Framework:**
• **Buffer Time**: 15-minute buffers between appointments prevent cascading delays
• **Peak Hour Management**: Book 90% capacity during busy times, 75% during standard
• **Service Time Targets**: Haircut 30-45 min, Beard 15-25 min, Full Service 60-75 min
• **No-Show Prevention**: Confirmation calls/texts 24 hours before appointment

**Staff Productivity Optimization:**
• **Morning Prep**: Standardized opening checklist (15 minutes)
• **Station Setup**: Organize tools for minimal movement during service
• **Customer Flow**: Clear traffic patterns to avoid congestion
• **End-of-Day**: Closing checklist ensures consistent quality

**This Week's Operational Focus:**
1. Time your next 10 services to establish baseline averages
2. Implement appointment confirmation system
3. Create opening/closing checklists for consistency
4. Review peak vs off-peak booking patterns`,
      recommendations: [
        'Implement 15-minute buffers between all appointments',
        'Create standardized opening and closing procedures',
        'Track service time averages to optimize scheduling'
      ],
      action_items: [
        { task: 'Create daily opening/closing checklists', priority: 'high' },
        { task: 'Set up appointment confirmation system', priority: 'medium' }
      ],
      confidence: 0.82
    }
  }
  
  return {
    agent_name: 'Emma (Fallback Mode)',
    agent_personality: 'strategic_mindset',
    response: `🧠 **Strategic Business Guidance - Limited Mode**

I'm in fallback mode but can provide strategic direction:

**Business Health Assessment Framework:**
• **Revenue**: Are you hitting $500+ daily consistently?
• **Customers**: 70%+ retention rate with growing customer base?
• **Operations**: Smooth daily flow with minimal wait times?
• **Growth**: Clear plan for scaling without sacrificing quality?

**Weekly Business Review Questions:**
1. What were your top 3 wins this week?
2. What operational challenges did you encounter?
3. How many new customers did you serve?
4. What was your average daily revenue?

**Strategic Priorities (Universal):**
• **Focus on Value**: Increase average transaction before adding volume
• **Systematize Operations**: Document processes so quality doesn't depend on you
• **Build Relationships**: Strong customer relationships = predictable revenue
• **Measure Everything**: You can't improve what you don't track

Would you like to focus on a specific area: revenue growth, operational efficiency, customer retention, or strategic planning?`,
    recommendations: [
      'Establish weekly business review routine to track key metrics',
      'Focus on customer value optimization before volume expansion', 
      'Document and systematize core business processes'
    ],
    action_items: [
      { task: 'Set up weekly business review meeting with yourself', priority: 'medium' },
      { task: 'List your top 3 business challenges to address', priority: 'high' }
    ],
    confidence: 0.72
  }
}

async function storeConversation(supabase, userId, sessionId, message, response) {
  try {
    await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        session_id: sessionId,
        message: message,
        response: response.response,
        provider: response.provider,
        confidence: response.confidence,
        message_type: response.message_type || response.messageType,
        metadata: JSON.stringify({
          selected_provider: response.selected_provider,
          knowledge_enhanced: response.knowledge_enhanced,
          usage: response.usage,
          contextual_insights: response.contextual_insights
        }),
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to store conversation:', error)
  }
}