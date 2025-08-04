import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, sessionId, businessContext } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Generate session ID if not provided
    const currentSession = sessionId || `session_${Date.now()}_${user.id}`

    try {
      // Use enhanced AI chat with RAG integration (mock for development)
      const response = await generateEnhancedAIResponse(message, currentSession, businessContext)
      
      // Store conversation in Supabase
      await storeConversation(supabase, user.id, currentSession, message, response)
      
      return NextResponse.json({
        success: true,
        response: response.response,
        sessionId: currentSession,
        provider: response.provider,
        confidence: response.confidence,
        messageType: response.messageType,
        recommendations: response.recommendations,
        contextualInsights: response.contextualInsights,
        knowledgeEnhanced: response.knowledgeEnhanced,
        timestamp: response.timestamp
      })

    } catch (aiError) {
      console.error('AI processing error:', aiError)
      
      // Fallback response
      const fallbackResponse = generateFallbackResponse(message)
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse.response,
        sessionId: currentSession,
        provider: 'fallback',
        confidence: 0.7,
        fallback: true,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Enhanced chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateEnhancedAIResponse(message, sessionId, businessContext) {
  // Simulate RAG-enhanced AI response generation
  
  // First, get contextual insights (simulated)
  const contextualInsights = await getContextualKnowledge(message, businessContext)
  
  // Then generate response based on message type and context
  const messageType = classifyMessage(message)
  const baseResponse = await generateIntelligentResponse(message, sessionId, businessContext, contextualInsights)
  
  // Enhance with RAG insights
  const enhancedResponse = {
    ...baseResponse,
    contextualInsights,
    knowledgeEnhanced: contextualInsights.relevantKnowledge.length > 0,
    confidence: contextualInsights.relevantKnowledge.length > 0 ? 
      Math.min(baseResponse.confidence + 0.1, 0.95) : baseResponse.confidence
  }
  
  return enhancedResponse
}

async function getContextualKnowledge(message, businessContext) {
  // Simulate retrieving contextual knowledge from RAG system
  const messageLower = message.toLowerCase()
  const insights = {
    relevantKnowledge: [],
    keyInsights: [],
    confidence: 0.0
  }
  
  // Customer service knowledge
  if (/\b(customer|client|satisfaction|retention|feedback)\b/.test(messageLower)) {
    insights.relevantKnowledge.push({
      content: "Customer satisfaction analysis shows 4.2/5 average rating with high praise for beard trimming services",
      type: "customer_insights",
      source: "customer_feedback",
      similarity: 0.87
    })
    insights.keyInsights.push("Customer retention rate is 73% indicating strong loyalty")
  }
  
  // Revenue knowledge
  if (/\b(revenue|money|profit|income|pricing)\b/.test(messageLower)) {
    insights.relevantKnowledge.push({
      content: "Peak revenue hours are 10am-2pm and 5pm-7pm, generating 65% of daily income",
      type: "revenue_patterns", 
      source: "revenue_analysis",
      similarity: 0.91
    })
    insights.keyInsights.push("Premium services have 40% higher margins than basic cuts")
  }
  
  // Scheduling knowledge
  if (/\b(schedule|booking|appointment|time|availability)\b/.test(messageLower)) {
    insights.relevantKnowledge.push({
      content: "Booking utilization highest on Fridays (89%) and Saturdays (94%)",
      type: "scheduling_analytics",
      source: "scheduling_data", 
      similarity: 0.93
    })
    insights.keyInsights.push("No-show rate reduced to 8% with reminder system")
  }
  
  // Service performance knowledge
  if (/\b(service|performance|popular|booking)\b/.test(messageLower)) {
    insights.relevantKnowledge.push({
      content: "Haircut + beard trim combo is most popular service with 35% of all bookings",
      type: "service_performance",
      source: "booking_analytics",
      similarity: 0.89
    })
    insights.keyInsights.push("Average service time is 28 minutes allowing efficient scheduling")
  }
  
  // Calculate confidence based on relevance
  if (insights.relevantKnowledge.length > 0) {
    insights.confidence = insights.relevantKnowledge.reduce((sum, k) => sum + k.similarity, 0) / insights.relevantKnowledge.length
  }
  
  return insights
}

async function generateIntelligentResponse(message, sessionId, businessContext, contextualInsights = null) {
  // Classify message type
  const messageType = classifyMessage(message)
  
  // Generate contextual response based on message type
  const responses = {
    business_analysis: generateBusinessAnalysisResponse(message, businessContext),
    customer_service: generateCustomerServiceResponse(message, businessContext),
    scheduling: generateSchedulingResponse(message, businessContext),
    financial: generateFinancialResponse(message, businessContext),
    marketing: generateMarketingResponse(message, businessContext),
    general: generateGeneralResponse(message, businessContext)
  }

  const baseResponse = responses[messageType] || responses.general

  return {
    response: baseResponse.response,
    provider: 'intelligent_mock',
    confidence: baseResponse.confidence,
    messageType: messageType,
    recommendations: baseResponse.recommendations,
    timestamp: new Date().toISOString()
  }
}

function classifyMessage(message) {
  const messageLower = message.toLowerCase()
  
  // Business analysis keywords
  if (/\b(revenue|profit|analytics|performance|metrics|kpi|growth|sales|business)\b/.test(messageLower)) {
    return 'business_analysis'
  }
  
  // Customer service keywords
  if (/\b(customer|client|service|complaint|feedback|satisfaction|retention|review)\b/.test(messageLower)) {
    return 'customer_service'
  }
  
  // Scheduling keywords
  if (/\b(schedule|appointment|booking|calendar|time|availability|slot|busy|free)\b/.test(messageLower)) {
    return 'scheduling'
  }
  
  // Financial keywords
  if (/\b(money|cost|price|payment|expense|budget|financial|income|profit|loss)\b/.test(messageLower)) {
    return 'financial'
  }
  
  // Marketing keywords
  if (/\b(marketing|promotion|social media|advertising|brand|instagram|facebook|attract)\b/.test(messageLower)) {
    return 'marketing'
  }
  
  return 'general'
}

function generateBusinessAnalysisResponse(message, context, contextualInsights = null) {
  // Use contextual insights if available
  let dataInsights = []
  let specificMetrics = []
  
  if (contextualInsights && contextualInsights.relevantKnowledge.length > 0) {
    // Extract specific data from knowledge base
    contextualInsights.relevantKnowledge.forEach(knowledge => {
      if (knowledge.type === 'revenue_patterns') {
        dataInsights.push("Your revenue data shows clear patterns we can optimize")
        specificMetrics.push("Peak hours generate 65% of daily income (10am-2pm, 5pm-7pm)")
      }
      if (knowledge.type === 'service_performance') {
        dataInsights.push("Service performance data reveals optimization opportunities")  
        specificMetrics.push("Combo services show 35% higher booking rates")
      }
    })
    
    // Add key insights
    if (contextualInsights.keyInsights.length > 0) {
      specificMetrics.push(...contextualInsights.keyInsights)
    }
  }
  
  const insights = dataInsights.length > 0 ? dataInsights : [
    "Based on your current metrics, I notice opportunities for revenue optimization.",
    "Your peak hours analysis shows potential for better scheduling efficiency.",
    "Customer retention patterns suggest implementing a loyalty program could increase revenue by 15-20%.",
    "The data indicates your most profitable services could be promoted more effectively."
  ]

  const recommendations = [
    "Track customer lifetime value to identify your most valuable clients",
    "Implement dynamic pricing during peak hours (10am-2pm, 5pm-7pm)",
    "Create service packages to encourage longer visits and higher spending",
    "Set up automated follow-up messages 2-3 weeks after appointments"
  ]

  // Build response with contextual data
  let responseText = `${insights[0]} Let me break down key insights from your business data:

**Revenue Analysis:**`

  if (specificMetrics.length > 0) {
    responseText += `
${specificMetrics.slice(0, 3).map(metric => `- ${metric}`).join('\n')}`
  } else {
    responseText += `
- Your average ticket is $35, but top 20% of customers spend $55+
- Premium services have 40% higher margins than basic cuts
- Peak hours show untapped revenue potential`
  }

  responseText += `

**Actionable Next Steps:**
${recommendations.slice(0, 3).map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

Would you like me to dive deeper into any of these areas?`

  return {
    response: responseText,
    confidence: contextualInsights ? Math.min(0.88 + (contextualInsights.confidence * 0.1), 0.95) : 0.88,
    recommendations: recommendations.slice(0, 4)
  }
}

function generateCustomerServiceResponse(message, context) {
  const responses = [
    "Customer satisfaction is the foundation of a successful barbershop. Let me help you improve the customer experience.",
    "Great customer service leads directly to higher retention and referrals. Here's how to excel:",
    "I see you're focused on customer service - this is where the biggest ROI comes from in the barbershop business."
  ]

  const recommendations = [
    "Send personalized follow-up messages 24 hours after each appointment",
    "Create a customer preference database (preferred cut, products, conversation topics)",
    "Implement a simple feedback system via text message",
    "Train staff on upselling techniques for complementary services"
  ]

  return {
    response: `${responses[Math.floor(Math.random() * responses.length)]}

**Customer Experience Enhancement:**
- **Personalization**: Remember customer preferences, past services, and personal details
- **Communication**: Send appointment reminders 24h and 1h before scheduled time
- **Feedback Loop**: Quick 2-question survey after each visit (satisfaction + likelihood to recommend)

**Retention Strategies:**
- Loyalty program: 10th cut free or 15% off after 5 visits
- Birthday month discount: 20% off during customer's birth month
- Referral rewards: $10 credit for both referrer and new customer

**Quick Implementation:**
Start with appointment reminders and a simple "How was your cut today? 1-5 stars" text message. This alone can increase retention by 12-15%.

What aspect of customer service would you like to focus on first?`,
    confidence: 0.85,
    recommendations: recommendations
  }
}

function generateSchedulingResponse(message, context) {
  const tips = [
    "Optimal scheduling can increase your daily capacity by 20-30% without working longer hours.",
    "Smart scheduling reduces no-shows and maximizes chair time utilization.",
    "The right booking system pays for itself through improved efficiency and customer satisfaction."
  ]

  const recommendations = [
    "Implement online booking with real-time availability",
    "Use 15-minute buffer zones between appointments for cleanup",
    "Offer different service durations: Quick trim (20min), Standard cut (30min), Full service (45min)",
    "Create premium time slots with 25% higher pricing for peak hours"
  ]

  return {
    response: `${tips[Math.floor(Math.random() * tips.length)]}

**Scheduling Optimization Strategy:**

**Time Slot Management:**
- Quick services: 20-minute slots for touch-ups and beard trims
- Standard cuts: 30-minute slots for regular haircuts
- Premium services: 45-60 minutes for full service with wash/style

**Peak Hour Strategy:**
- Mornings (8-10am): Premium pricing, longer services
- Lunch rush (11am-2pm): Quick services, express appointments
- Evenings (5-7pm): Standard appointments, walk-ins welcome

**No-Show Prevention:**
- Require phone confirmation 24 hours before
- Implement a small booking fee ($5) that goes toward the service
- Send friendly reminder texts 1 hour before appointment

**Efficiency Tips:**
- Block similar services together (all cuts in the morning, all styling in afternoon)
- Keep 15-minute buffers between appointments for setup/cleanup
- Use downtime for social media updates and client follow-ups

Would you like me to help you calculate the optimal schedule for your specific shop?`,
    confidence: 0.87,
    recommendations: recommendations
  }
}

function generateFinancialResponse(message, context) {
  const insights = [
    "Financial optimization in barbershops typically focuses on three areas: pricing strategy, cost management, and revenue diversification.",
    "Most successful barbershops see 25-30% profit margins when properly managed.",
    "Your biggest opportunities for financial improvement are usually in service pricing and inventory management."
  ]

  const recommendations = [
    "Implement value-based pricing for premium services",
    "Track cost per service including time, products, and overhead",
    "Create service packages to increase average ticket size",
    "Negotiate better rates with product suppliers for bulk orders"
  ]

  return {
    response: `${insights[Math.floor(Math.random() * insights.length)]}

**Financial Health Assessment:**

**Revenue Optimization:**
- Current average ticket: $35 (Industry benchmark: $40-45)
- Premium service uptake: 15% (Target: 25-30%)
- Retail product sales: 8% of revenue (Target: 15-20%)

**Cost Management:**
- Product costs should be <15% of service revenue
- Rent should be <20% of gross revenue
- Staff costs (including benefits): 45-55% of revenue

**Pricing Strategy:**
- Basic cut: $30-35 (your foundation service)
- Premium cut + style: $50-60 (higher margin focus)
- Add-on services: Beard trim (+$15), Hot towel (+$10), Styling (+$15)

**Revenue Diversification:**
- Retail products: Premium pomades, beard oils, styling tools
- Membership programs: $25/month for priority booking + 15% off services
- Corporate contracts: Weekly grooming services for business clients

**Quick Financial Wins:**
1. Increase prices by $5 across all services (most customers won't notice)
2. Introduce a "signature service" at $65+ for premium clients
3. Sell 3 retail products per day (increases monthly revenue by $900+)

What specific financial aspect would you like to dive deeper into?`,
    confidence: 0.86,
    recommendations: recommendations
  }
}

function generateMarketingResponse(message, context) {
  const strategies = [
    "Digital marketing for barbershops is all about showcasing your work and building community.",
    "The best barbershop marketing focuses on before/after photos and customer stories.",
    "Social media marketing can increase your bookings by 40-60% when done consistently."
  ]

  const recommendations = [
    "Post before/after photos daily on Instagram with customer permission",
    "Create short video content showing cutting techniques and transformations",
    "Partner with local businesses for cross-promotion opportunities",
    "Implement a referral program with incentives for existing customers"
  ]

  return {
    response: `${strategies[Math.floor(Math.random() * strategies.length)]}

**Digital Marketing Blueprint:**

**Instagram Strategy (Primary Platform):**
- Daily posts: Before/after photos, process videos, behind-the-scenes
- Stories: Quick cuts, customer reactions, daily life of the shop
- Reels: Transformation videos, cutting techniques, comedy skits
- Hashtags: #YourCityBarber #BeforeAndAfter #MensGrooming #LocalBusiness

**Content Calendar:**
- Monday: Motivation Monday - transformation reveals
- Tuesday: Technique Tuesday - skill demonstrations
- Wednesday: Customer spotlight and testimonials
- Thursday: Product recommendations and tutorials
- Friday: Weekend prep cuts and styling
- Saturday: Shop atmosphere and team highlights
- Sunday: Planning and prep for the week

**Local Marketing:**
- Google My Business: Keep updated with hours, photos, and respond to reviews
- Local partnerships: Gyms, men's clothing stores, corporate offices
- Community events: Sponsor local sports teams, participate in street fairs
- Referral program: Existing customers get $10 credit for each new referral

**Paid Advertising (Budget: $200-300/month):**
- Facebook/Instagram ads targeting men 18-45 within 10 miles
- Google Ads for "barber near me" and "men's haircut [your city]"
- Focus on before/after photos and 5-star reviews in ad creative

**Tracking Success:**
- New customers per month from social media
- Online booking percentage
- Customer retention rate
- Average monthly reach and engagement

Which marketing channel would you like to focus on first?`,
    confidence: 0.84,
    recommendations: recommendations
  }
}

function generateGeneralResponse(message, context) {
  const responses = [
    "I'm here to help you optimize every aspect of your barbershop business. What specific challenge are you facing?",
    "Running a successful barbershop requires balancing excellent service, smart business operations, and effective marketing. How can I assist you today?",
    "Every barbershop is unique, but there are proven strategies that work across the industry. What area would you like to focus on?"
  ]

  const recommendations = [
    "Focus on customer retention - it's 5x cheaper than acquiring new customers",
    "Implement systems for scheduling, payments, and customer communication",
    "Build a strong social media presence with before/after photos",
    "Create multiple revenue streams beyond just haircuts"
  ]

  return {
    response: `${responses[Math.floor(Math.random() * responses.length)]}

**Key Areas I Can Help With:**

🏢 **Business Operations**
- Scheduling optimization and booking systems
- Staff management and training programs
- Financial planning and pricing strategies

👥 **Customer Experience**
- Service quality improvement
- Customer retention strategies
- Feedback systems and reviews management

📱 **Marketing & Growth**
- Social media strategy and content creation
- Local marketing and community engagement
- Online presence and reputation management

💰 **Revenue Optimization**
- Service pricing and package creation
- Retail product sales
- Membership programs and loyalty systems

Just let me know which area interests you most, or describe a specific challenge you're facing. I'll provide detailed, actionable advice tailored to your barbershop.

What would you like to tackle first?`,
    confidence: 0.80,
    recommendations: recommendations
  }
}

function generateFallbackResponse(message) {
  return {
    response: `I understand you're asking about "${message}". As your AI business coach, I'm here to help you optimize your barbershop operations and grow your business.

I can provide guidance on:
- **Scheduling & Operations**: Booking systems, staff management, efficiency
- **Customer Service**: Retention strategies, feedback systems, satisfaction
- **Marketing**: Social media, local promotion, online presence  
- **Financial Management**: Pricing, revenue optimization, cost control

Could you be more specific about what aspect of your business you'd like to improve? This will help me give you more targeted advice.`,
    confidence: 0.70
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
        message_type: response.messageType,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to store conversation:', error)
    // Don't fail the request if storage fails
  }
}