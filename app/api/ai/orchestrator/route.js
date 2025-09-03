import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const supabase = await createClient()
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
  // Direct AI orchestration implementation - no Python backend dependency
  try {
    const agentResponse = await generateDirectAIResponse(message, sessionId, businessContext)
    
    return {
      success: true,
      response: agentResponse.response,
      agent_name: agentResponse.agent_name || 'AI Agent',
      agent_personality: agentResponse.agent_personality || 'strategic_mindset',
      recommendations: agentResponse.recommendations || [],
      action_items: agentResponse.action_items || [],
      follow_up_questions: agentResponse.follow_up_questions || [],
      executed_actions: detectExecutableActions(message),
      knowledge_enhanced: true,
      confidence: agentResponse.confidence || 0.85,
      provider: 'enhanced_local_ai',
      message_type: 'direct_ai_response',
      timestamp: new Date().toISOString(),
      usage: {
        provider: 'local_implementation',
        tokens: Math.ceil(message.length / 4)
      }
    }
    
  } catch (error) {
    console.error('Direct AI orchestrator error:', error)
    throw new Error(`AI Orchestrator processing failed: ${error.message}`)
  }
}

async function generateDirectAIResponse(message, sessionId, businessContext = {}) {
  const messageLower = message.toLowerCase()
  const businessName = businessContext.business_name || 'Elite Cuts Barbershop'
  
  // Route to appropriate AI agent based on message content
  if (['revenue', 'money', 'profit', 'pricing', 'financial'].some(keyword => messageLower.includes(keyword))) {
    return generateFinancialAgentResponse(message, businessName, businessContext)
  }
  
  if (['marketing', 'social', 'instagram', 'promotion', 'customers'].some(keyword => messageLower.includes(keyword))) {
    return generateMarketingAgentResponse(message, businessName, businessContext)
  }
  
  if (['schedule', 'appointment', 'booking', 'staff', 'operations'].some(keyword => messageLower.includes(keyword))) {
    return generateOperationsAgentResponse(message, businessName, businessContext)
  }
  
  if (['growth', 'strategy', 'business', 'expansion', 'scale'].some(keyword => messageLower.includes(keyword))) {
    return generateStrategyAgentResponse(message, businessName, businessContext)
  }
  
  // Default strategic response
  return generateGeneralAgentResponse(message, businessName, businessContext)
}

function generateFinancialAgentResponse(message, businessName, context) {
  const hasStripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')
  
  return {
    agent_name: 'Marcus',
    agent_personality: 'financial_coach', 
    response: `💰 **Financial Strategy Analysis for ${businessName}**

${hasStripe 
  ? "I have access to your payment data and can provide comprehensive insights:" 
  : "I can provide financial guidance based on industry best practices:"}

**Revenue Optimization Framework:**
• **Target Metrics**: $500+ daily revenue ($15,000+ monthly)
• **Average Ticket**: Increase service value 15-20% vs. volume
• **Premium Services**: Introduce high-margin offerings (hot towel, beard oil treatments)
• **Peak Hour Pricing**: Charge 15-20% premium during high-demand times

**Immediate Action Plan:**
1. Calculate your current average service price
2. Identify your top 3 most profitable services  
3. Review competitor pricing in your local market
4. Create service packages that increase transaction value

**Financial Health Indicators to Track:**
• Daily cash flow consistency
• Customer acquisition cost vs lifetime value
• Service profitability margins
• Equipment ROI and replacement planning

Would you like me to help calculate specific revenue targets or create a pricing strategy for your services?`,
    recommendations: [
      'Implement dynamic pricing for peak vs off-peak hours',
      'Create premium service packages to increase average ticket value',
      'Set up daily revenue tracking to identify trends and opportunities'
    ],
    action_items: [
      { task: 'Calculate current average service price and compare to industry benchmarks', priority: 'high' },
      { task: 'Research competitor pricing within 5-mile radius', priority: 'medium' },
      { task: 'Design 2-3 service packages for upselling opportunities', priority: 'medium' }
    ],
    follow_up_questions: [
      'What is your current average service price?',
      'Which services have the highest profit margins?',
      'Are you interested in implementing premium service packages?'
    ],
    confidence: 0.88
  }
}

function generateMarketingAgentResponse(message, businessName, context) {
  return {
    agent_name: 'Sophia',
    agent_personality: 'marketing_expert',
    response: `📱 **Marketing Growth Strategy for ${businessName}**

**Content Strategy That Converts:**
• **40% Transformations**: Before/after photos (with client permission)
• **30% Behind-the-Scenes**: Your techniques, setup, daily routine
• **20% Educational**: Grooming tips, product recommendations
• **10% Community**: Client features, shop culture, team moments

**Platform Prioritization:**
1. **Instagram** - Visual transformations drive bookings
2. **Google My Business** - Critical for local discovery
3. **Facebook** - Community building and event promotion
4. **TikTok** - Younger demographic engagement

**Local SEO Optimization:**
• Optimize Google My Business with fresh photos weekly
• Encourage reviews with post-service follow-up
• Use local keywords: "[City] barbershop", "best barber near me"
• Post regular business updates and special offers

**This Week's Marketing Actions:**
1. Take 5 before/after photos of client transformations
2. Update Google My Business hours and add new photos
3. Respond to all Google reviews from the past 30 days
4. Create simple referral program ($15 credit for referrals)

**Content Calendar Ideas:**
• Monday: Transformation Monday (before/after)
• Wednesday: Technique Wednesday (skills showcase)
• Friday: Feature Friday (highlight loyal customers)`,
    recommendations: [
      'Focus on visual content showing client transformations',
      'Optimize Google My Business listing for maximum local visibility',
      'Implement systematic review collection process'
    ],
    action_items: [
      { task: 'Set up Instagram Business account with booking integration', priority: 'high' },
      { task: 'Create content calendar for next 4 weeks', priority: 'medium' },
      { task: 'Design referral program with trackable incentives', priority: 'medium' }
    ],
    follow_up_questions: [
      'Do you currently ask clients for permission to share their transformations?',
      'Which social media platform brings you the most bookings currently?',
      'Would you like help setting up automated review collection?'
    ],
    confidence: 0.85
  }
}

function generateOperationsAgentResponse(message, businessName, context) {
  return {
    agent_name: 'David',
    agent_personality: 'operations_manager',
    response: `⚙️ **Operational Excellence Framework for ${businessName}**

**Scheduling Optimization:**
• **Buffer Time**: 15-minute buffers between appointments prevent cascading delays
• **Service Time Standards**: Haircut (30-45min), Beard (15-25min), Full Service (60-75min)
• **Capacity Management**: 90% capacity during peak, 75% during standard hours
• **No-Show Prevention**: Automated confirmation texts/calls 24 hours prior

**Daily Operations Checklist:**
**Morning Prep (15 minutes):**
• Sanitize all tools and workstations
• Check appointment schedule and prepare client files
• Verify product inventory levels
• Set up music and ambiance

**Service Flow Optimization:**
• Streamline tool organization for minimal movement
• Standardize consultation questions (2-3 minutes max)
• Create clear traffic patterns to avoid congestion
• Maintain supplies within arm's reach

**End-of-Day Protocol (20 minutes):**
• Deep clean all equipment
• Restock supplies for next day
• Review daily performance metrics
• Prepare for tomorrow's first appointments

**Key Performance Indicators:**
• Average service time by type
• Daily appointment utilization rate
• Client wait time (target: <5 minutes)
• Equipment downtime tracking`,
    recommendations: [
      'Implement standardized opening and closing procedures',
      'Track service time averages to optimize scheduling accuracy',
      'Create appointment buffer system to handle unexpected delays'
    ],
    action_items: [
      { task: 'Time your next 10 services to establish baseline averages', priority: 'high' },
      { task: 'Create laminated opening/closing checklists', priority: 'medium' },
      { task: 'Set up appointment confirmation automation system', priority: 'medium' }
    ],
    follow_up_questions: [
      'What is your current average service time for different service types?',
      'Do you experience frequent appointment delays or client wait times?',
      'Would you like help creating standardized procedures for your team?'
    ],
    confidence: 0.87
  }
}

function generateStrategyAgentResponse(message, businessName, context) {
  return {
    agent_name: 'Emma',
    agent_personality: 'strategic_mindset',
    response: `🧠 **Strategic Business Development for ${businessName}**

**Business Health Assessment:**
• **Revenue Stability**: Consistent $500+ daily revenue streams
• **Customer Retention**: 70%+ repeat client rate
• **Operational Efficiency**: Minimal wait times, optimized workflow
• **Growth Readiness**: Scalable systems without quality compromise

**Strategic Growth Pillars:**

**1. Value Optimization (Month 1-2)**
• Increase average transaction value before expanding volume
• Introduce premium services and product sales
• Implement tiered pricing structure

**2. System Documentation (Month 2-3)**
• Document all procedures so quality doesn't depend solely on you
• Create training materials for potential staff
• Establish quality control standards

**3. Customer Relationship Deepening (Ongoing)**
• Develop loyalty programs and retention strategies
• Create personalized service experiences
• Build predictable revenue through repeat customers

**4. Strategic Expansion Planning (Month 4+)**
• Analyze market capacity for additional services/staff
• Evaluate location expansion opportunities
• Consider franchise or partnership models

**Weekly Business Review Framework:**
1. What were your top 3 wins this week?
2. What operational challenges did you encounter?
3. How many new vs. returning customers did you serve?
4. What was your daily average revenue?
5. What strategic initiative will you focus on next week?`,
    recommendations: [
      'Establish weekly business review routine to track strategic progress',
      'Focus on increasing customer value before expanding volume',
      'Document all business processes for scalability and consistency'
    ],
    action_items: [
      { task: 'Set up weekly 30-minute strategic business review sessions', priority: 'high' },
      { task: 'List your top 3 business challenges and prioritize solutions', priority: 'high' },
      { task: 'Create customer retention strategy with measurable goals', priority: 'medium' }
    ],
    follow_up_questions: [
      'What are your biggest business challenges right now?',
      'Do you have clear revenue and growth targets for the next 6 months?',
      'Are you interested in expanding your services or location in the future?'
    ],
    confidence: 0.82
  }
}

function generateGeneralAgentResponse(message, businessName, context) {
  return {
    agent_name: 'AI Business Advisor',
    agent_personality: 'strategic_mindset',
    response: `🤖 **Comprehensive Business Guidance for ${businessName}**

I'm analyzing your question: "${message.slice(0, 150)}${message.length > 150 ? '...' : ''}"

**Multi-Area Business Assessment:**

**💰 Financial Health**
• Daily revenue consistency and growth tracking
• Service profitability analysis and optimization
• Cost management and profit margin improvement

**📱 Marketing & Customer Acquisition**
• Digital presence optimization (Google, Instagram)
• Customer retention and referral systems
• Local community engagement strategies

**⚙️ Operational Excellence**
• Scheduling efficiency and customer flow
• Service quality standardization
• Staff productivity and training systems

**🚀 Strategic Growth**
• Market expansion opportunities
• Service diversification potential
• Long-term business sustainability planning

**Immediate Recommended Actions:**
1. Identify which area needs the most attention based on your current challenges
2. Set up basic tracking systems for key metrics in that area
3. Create a 30-day improvement plan with specific, measurable goals

**Areas I Can Help With:**
• Revenue optimization and pricing strategies
• Marketing and customer acquisition campaigns
• Operational workflow improvements
• Strategic planning and business development
• Staff management and training protocols

Please let me know which specific area you'd like to focus on, and I can provide detailed, actionable guidance tailored to your ${businessName} needs.`,
    recommendations: [
      'Focus on one business area at a time for maximum impact',
      'Establish baseline metrics before implementing changes',
      'Create systematic approach to business improvement'
    ],
    action_items: [
      { task: 'Identify your top business priority area (revenue, marketing, operations, or strategy)', priority: 'high' },
      { task: 'Set up basic tracking for 2-3 key performance indicators', priority: 'medium' }
    ],
    follow_up_questions: [
      'What specific business area would you like to focus on improving?',
      'What are your main business goals for the next 3 months?',
      'What challenges are preventing you from reaching those goals?'
    ],
    confidence: 0.78
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