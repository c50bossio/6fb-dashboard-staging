import { NextResponse } from 'next/server'

// Agent-specific prompts and personalities
const agentPrompts = {
  master_coach: {
    role: "Strategic Business Coach",
    personality: "Wise, experienced, strategic thinker who sees the big picture",
    expertise: "Overall business strategy, goal setting, leadership, and growth planning",
    prompt: "You are a Master Business Coach for barbershops. You provide strategic guidance, help set goals, and coordinate insights from other specialists. Focus on big-picture thinking and long-term success."
  },
  financial: {
    role: "Financial Advisor", 
    personality: "Data-driven, practical, focused on profitability and ROI",
    expertise: "Revenue optimization, cost management, pricing strategies, financial planning",
    prompt: "You are a Financial Advisor specializing in barbershop businesses. You focus on maximizing revenue, controlling costs, optimizing pricing, and improving profitability. Always provide concrete numbers and actionable financial advice."
  },
  marketing: {
    role: "Marketing Specialist",
    personality: "Creative, customer-focused, growth-oriented",
    expertise: "Customer acquisition, social media, advertising, brand building",
    prompt: "You are a Marketing Specialist for barbershops. You help attract new customers, retain existing ones, and build strong brands. Focus on practical marketing strategies that work for local service businesses."
  },
  operations: {
    role: "Operations Manager",
    personality: "Efficient, systematic, process-oriented",
    expertise: "Workflow optimization, staff management, scheduling, efficiency",
    prompt: "You are an Operations Manager for barbershops. You optimize workflows, improve efficiency, manage staff scheduling, and streamline daily operations. Focus on practical systems and processes."
  },
  brand: {
    role: "Brand Strategist",
    personality: "Creative, reputation-focused, image-conscious",
    expertise: "Brand positioning, reputation management, customer experience",
    prompt: "You are a Brand Strategist for barbershops. You help build strong brand identity, manage reputation, and create exceptional customer experiences. Focus on differentiation and premium positioning."
  },
  growth: {
    role: "Growth Strategist", 
    personality: "Ambitious, expansion-focused, scalability-minded",
    expertise: "Business expansion, scaling operations, new location planning",
    prompt: "You are a Growth Strategist for barbershops. You help expand businesses, open new locations, and scale operations. Focus on sustainable growth strategies and expansion planning."
  }
}

// Simulate AI responses (in production, this would call actual AI APIs)
const generateAgentResponse = async (agents, message, conversationHistory) => {
  // This is a simulation - in production you would call OpenAI, Anthropic, etc.
  const primaryAgent = agents[0]
  const agentInfo = agentPrompts[primaryAgent]
  
  // Create a contextual response based on the agent type and message content
  const responses = {
    master_coach: {
      revenue: "To increase revenue, let's take a strategic approach. I recommend focusing on three key areas: 1) Premium service tiers - offer luxury treatments, 2) Client retention programs - loyalty rewards and referral bonuses, 3) Operational efficiency - reduce wait times and maximize chair utilization. What's your current average revenue per client?",
      marketing: "From a strategic perspective, successful barbershop marketing requires consistency and community connection. I suggest developing a comprehensive brand strategy that includes: authentic social media presence showcasing your work, local community partnerships, and a referral program that rewards both existing and new clients. Which area would you like to focus on first?",
      operations: "Operational excellence is the foundation of a successful barbershop. Let's optimize your workflow: implement appointment scheduling software, create standard operating procedures for each service, and establish clear staff roles and responsibilities. This will improve efficiency and customer satisfaction. What's your biggest operational challenge right now?"
    },
    financial: {
      revenue: "Let's look at the numbers! To boost revenue, consider these financial strategies: 1) Increase average transaction value by 25% through service bundling, 2) Implement dynamic pricing for peak hours, 3) Add retail products with 40-60% margins. Based on industry benchmarks, successful barbershops see $75-150 revenue per client visit. What's your current average?",
      cost: "Smart cost management is crucial for profitability. I recommend tracking these key metrics: Cost of Goods Sold (should be <30%), Labor costs (should be 40-50% of revenue), and overhead expenses. Consider bulk purchasing for supplies, energy-efficient equipment, and performance-based staff incentives. What are your biggest cost concerns?",
      pricing: "Pricing strategy directly impacts profitability. Research shows barbershops can increase prices 10-15% annually without significant customer loss. Consider value-based pricing: basic cuts at market rate, premium services at 20-30% above market. Test price increases with new customers first. What's your current pricing structure?"
    },
    marketing: {
      customers: "Customer acquisition is all about being where your customers are! Here's my proven strategy: 1) Optimize Google My Business with regular posts and client photos, 2) Instagram showcasing before/after transformations, 3) Local partnerships with gyms, offices, and schools, 4) Referral program offering $10 off for both referrer and new client. Which platform gets you the most bookings currently?",
      social: "Social media success for barbershops requires consistent, high-quality content. Post daily: transformation photos, behind-the-scenes videos, client testimonials, and styling tips. Use local hashtags and tag clients (with permission). Instagram Stories and Reels perform best. Engage with local businesses and community pages. What's your current social media challenge?",
      promotion: "Effective promotions create urgency while building loyalty. Try these: 'New Client Special' (20% off first visit), seasonal promotions (back-to-school cuts), loyalty punch cards (10th cut free), and partnership discounts with local businesses. Always track ROI on promotions. What type of promotions have you tried before?"
    },
    operations: {
      schedule: "Efficient scheduling maximizes revenue and minimizes wait times. Implement these systems: 1) Online booking with automated reminders, 2) Buffer time between appointments (10-15 minutes), 3) Peak hour premium pricing, 4) Wait list for cancellations. Use scheduling software that tracks no-shows and preferences. What's your biggest scheduling challenge?",
      staff: "Effective staff management boosts productivity and morale. Create clear job descriptions, performance standards, and incentive programs. Implement daily huddles, monthly training sessions, and quarterly reviews. Track key metrics: services per hour, client retention by barber, and revenue per employee. How many staff members do you currently have?",
      efficiency: "Operational efficiency comes from standardized processes. Create checklists for: opening/closing procedures, equipment maintenance, inventory management, and cleaning protocols. Track service times and identify bottlenecks. Consider pre-service consultations to reduce chair time. What slows down your operations most?"
    },
    brand: {
      reputation: "Your brand reputation is your most valuable asset. Build it through: consistent service quality, professional appearance, exceptional customer service, and active review management. Respond to all reviews professionally and quickly. Showcase your expertise through educational content. Monitor your online presence regularly. How do customers currently perceive your brand?",
      image: "Brand image should reflect your target market and pricing strategy. Elements to align: shop decor, staff uniforms, service presentation, music, and customer communication style. Create a unique selling proposition that differentiates you from competitors. Consistency across all touchpoints is key. What image do you want to project?",
      experience: "Customer experience drives loyalty and referrals. Map every touchpoint: initial contact, arrival, service delivery, payment, and follow-up. Look for opportunities to exceed expectations at each stage. Consider amenities like complimentary beverages, Wi-Fi, or scalp massages. What makes your customer experience unique?"
    },
    growth: {
      expand: "Expansion requires careful planning and proven systems. Before opening a second location, ensure your first location is consistently profitable with systemized operations. Consider: market research for the new area, financing options, staff training programs, and brand consistency. What's driving your expansion goals?",
      scale: "Scaling a barbershop business requires moving from operator to systems-dependent business. Develop: standardized training programs, documented procedures, quality control systems, and performance metrics. Consider franchise opportunities or partnerships. Focus on building a replicable business model. What systems do you have in place currently?",
      location: "Location selection is critical for expansion success. Analyze: foot traffic patterns, demographic alignment, competition density, parking availability, and lease terms. Prime locations cost more but generate higher revenue. Consider popup locations or shared spaces to test markets. What areas are you considering?"
    }
  }

  // Simple keyword matching to provide relevant responses
  const lowerMessage = message.toLowerCase()
  let responseKey = 'revenue' // default
  
  // Match keywords to response categories
  if (lowerMessage.includes('customer') || lowerMessage.includes('client')) responseKey = 'customers'
  else if (lowerMessage.includes('market') || lowerMessage.includes('social')) responseKey = 'social'  
  else if (lowerMessage.includes('promot') || lowerMessage.includes('advertis')) responseKey = 'promotion'
  else if (lowerMessage.includes('schedul') || lowerMessage.includes('time')) responseKey = 'schedule'
  else if (lowerMessage.includes('staff') || lowerMessage.includes('employee')) responseKey = 'staff'
  else if (lowerMessage.includes('efficien') || lowerMessage.includes('process')) responseKey = 'efficiency'
  else if (lowerMessage.includes('reputation') || lowerMessage.includes('review')) responseKey = 'reputation'
  else if (lowerMessage.includes('image') || lowerMessage.includes('brand')) responseKey = 'image'
  else if (lowerMessage.includes('experience') || lowerMessage.includes('service')) responseKey = 'experience'
  else if (lowerMessage.includes('expand') || lowerMessage.includes('grow')) responseKey = 'expand'
  else if (lowerMessage.includes('scale') || lowerMessage.includes('system')) responseKey = 'scale'
  else if (lowerMessage.includes('location') || lowerMessage.includes('shop')) responseKey = 'location'
  else if (lowerMessage.includes('cost') || lowerMessage.includes('expense')) responseKey = 'cost'
  else if (lowerMessage.includes('price') || lowerMessage.includes('pricing')) responseKey = 'pricing'
  else if (lowerMessage.includes('operation') || lowerMessage.includes('workflow')) responseKey = 'operations'

  // Get response from the primary agent
  const agentResponses = responses[primaryAgent] || responses.master_coach
  let response = agentResponses[responseKey] || agentResponses.revenue

  // If multiple agents are involved, add collaborative elements
  if (agents.length > 1) {
    const otherAgents = agents.slice(1).map(agent => agentPrompts[agent].role).join(' and ')
    response += `\n\n💡 I'm also coordinating with your ${otherAgents} to give you comprehensive insights on this topic.`
  }

  return response
}

export async function POST(request) {
  try {
    const { message, agents, conversation_history } = await request.json()

    if (!message || !agents || agents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Message and agents are required'
      }, { status: 400 })
    }

    // Generate response using the agent orchestration system
    const response = await generateAgentResponse(agents, message, conversation_history)

    return NextResponse.json({
      success: true,
      response: response,
      agents_used: agents,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unified chat API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat message'
    }, { status: 500 })
  }
}