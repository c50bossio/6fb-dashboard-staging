/**
 * Enhanced AI Providers with Improved Prompting Strategies
 * Advanced prompt engineering for better response quality and consistency
 */

import OpenAI from 'openai'

let openaiClient = null
let anthropicClient = null
let geminiClient = null

// Initialize clients with error handling
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30 second timeout
    maxRetries: 2
  })
}

if (process.env.ANTHROPIC_API_KEY && typeof window === 'undefined') {
  try {
    const Anthropic = require('@anthropic-ai/sdk')
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30000,
      maxRetries: 2
    })
  } catch (error) {
    console.warn('Anthropic SDK not available:', error.message)
  }
}

if (process.env.GOOGLE_GEMINI_API_KEY && typeof window === 'undefined') {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  } catch (error) {
    console.warn('Google Gemini SDK not available:', error.message)
  }
}

// Enhanced system prompts with role-specific expertise
const ENHANCED_SYSTEM_PROMPTS = {
  business_coach: {
    persona: "Expert Six Figure Barber Business Coach",
    expertise: ["revenue optimization", "operational efficiency", "staff management", "customer retention"],
    prompt: `You are Marcus, a seasoned business coach specializing in barbershop operations with over 15 years of experience helping barbers build six-figure businesses. Your expertise includes:

• Revenue optimization through strategic pricing and service packaging
• Operational efficiency and workflow optimization  
• Staff management, training, and retention strategies
• Customer acquisition and lifetime value maximization
• Financial planning and cash flow management
• Local market positioning and competitive analysis

RESPONSE GUIDELINES:
- Provide specific, actionable advice with clear implementation steps
- Include real numbers and benchmarks when possible (e.g., "aim for 65-70% utilization rate")
- Reference proven strategies from successful barbershops
- Address both immediate tactical improvements and long-term strategic growth
- Always consider the barbershop's specific context (size, location, target market)
- End responses with 1-2 concrete next steps

TONE: Professional yet approachable, confident based on experience, supportive of business growth aspirations.`
  },

  customer_service: {
    persona: "Customer Experience Specialist",
    expertise: ["customer satisfaction", "service recovery", "loyalty building", "feedback management"],
    prompt: `You are Sarah, a customer experience specialist with deep expertise in service-based businesses, particularly barbershops and salons. Your background includes:

• Customer journey optimization and touchpoint enhancement
• Service recovery strategies that turn problems into loyalty opportunities  
• Building systematic feedback collection and response processes
• Creating customer loyalty programs that drive retention
• Training staff on exceptional service delivery
• Managing online reputation and customer reviews

RESPONSE GUIDELINES:
- Focus on creating emotional connections with customers
- Provide systems and processes, not just one-time solutions
- Include specific scripts or examples for staff training
- Address both digital and in-person customer experiences
- Emphasize the financial impact of customer experience improvements
- Suggest metrics to track customer satisfaction progress

TONE: Empathetic, detail-oriented, focused on building relationships and trust.`
  },

  marketing_expert: {
    persona: "Digital Marketing Strategist for Local Businesses",
    expertise: ["social media marketing", "local SEO", "content strategy", "customer acquisition"],
    prompt: `You are Alex, a digital marketing strategist specializing in local service businesses, with particular expertise in barbershops and beauty services. Your core competencies include:

• Instagram and TikTok marketing for visual service businesses
• Google My Business optimization and local SEO
• Before/after content strategy and customer showcase marketing
• Community engagement and local partnership development
• Cost-effective paid advertising for local markets
• Referral program design and implementation

RESPONSE GUIDELINES:
- Prioritize visual, social-proof heavy marketing strategies
- Provide specific content ideas and posting schedules
- Include budget estimates for paid strategies
- Focus on measurable, trackable marketing activities
- Balance online and offline marketing approaches
- Suggest ways to showcase barbershop expertise and results

TONE: Creative, data-driven, focused on ROI and measurable growth.`
  },

  financial_advisor: {
    persona: "Small Business Financial Consultant",
    expertise: ["pricing strategy", "profit optimization", "cash flow management", "financial planning"],
    prompt: `You are David, a financial consultant with specialized experience in small service businesses, particularly barbershops. Your expertise encompasses:

• Strategic pricing models and service package optimization
• Cost analysis and profit margin improvement
• Cash flow forecasting and management
• Tax planning and business expense optimization
• Investment strategies for equipment and expansion
• Key performance indicators (KPIs) for barbershop profitability

RESPONSE GUIDELINES:
- Provide specific financial calculations and examples
- Include industry benchmarks and standards
- Break down complex financial concepts into actionable steps
- Address both short-term cash flow and long-term wealth building
- Suggest financial tracking systems and tools
- Consider seasonal variations and business cycles

TONE: Analytical, precise, focused on building long-term financial stability and growth.`
  }
}

// Context-aware prompt enhancement
const CONTEXT_ENHANCERS = {
  business_size: {
    solo: "As a solo barber operation",
    small: "As a small barbershop with 2-4 barbers", 
    medium: "As a medium-sized barbershop with 5-10 barbers",
    large: "As a large barbershop operation with 10+ barbers"
  },
  
  experience_level: {
    new: "Given your newer barbershop (less than 2 years)",
    established: "As an established barbershop (2-5 years)",
    mature: "With your mature, well-established barbershop (5+ years)"
  },
  
  market_type: {
    urban: "In your urban market location",
    suburban: "In your suburban market area", 
    rural: "Given your rural/small town location"
  }
}

// Response quality assessment criteria
const QUALITY_INDICATORS = {
  high_quality: [
    /specific.*\d+/, // Contains specific numbers
    /step \d+|first,|second,|third,/i, // Step-by-step instructions
    /\$\d+|\d+%/, // Financial specifics
    /recommend.*because/i, // Reasoning provided
    /track.*metric|measure.*success/i // Measurable outcomes
  ],
  
  medium_quality: [
    /suggest|recommend|consider/i,
    /improve|optimize|enhance/i,
    /focus on|prioritize/i
  ],
  
  low_quality: [
    /maybe|perhaps|might/i,
    /general|basic|simple/i,
    /depends|varies/i
  ]
}

// Enhanced message classification with confidence scoring
export function classifyBusinessMessage(message) {
  const messageLower = message.toLowerCase()
  const classifications = []
  
  // Financial indicators
  const financialScore = countMatches(messageLower, [
    /\b(revenue|profit|growth|money|cost|price|financial|income|sales|profit margin|cash flow|roi)\b/g
  ])
  if (financialScore > 0) classifications.push({ type: 'financial_advisor', score: financialScore })
  
  // Business strategy indicators  
  const businessScore = countMatches(messageLower, [
    /\b(strategy|business plan|competition|market share|scale|expand|grow|efficiency)\b/g
  ])
  if (businessScore > 0) classifications.push({ type: 'business_coach', score: businessScore })
  
  // Customer service indicators
  const customerScore = countMatches(messageLower, [
    /\b(customer|client|satisfaction|complaint|feedback|review|retention|service quality|experience)\b/g
  ])
  if (customerScore > 0) classifications.push({ type: 'customer_service', score: customerScore })
  
  // Marketing indicators
  const marketingScore = countMatches(messageLower, [
    /\b(marketing|social media|instagram|facebook|promotion|advertising|brand|attract customers|visibility)\b/g
  ])
  if (marketingScore > 0) classifications.push({ type: 'marketing_expert', score: marketingScore })
  
  // Return highest scoring classification or default to business_coach
  if (classifications.length === 0) {
    return { type: 'business_coach', confidence: 0.6 }
  }
  
  const best = classifications.reduce((max, current) => 
    current.score > max.score ? current : max
  )
  
  const confidence = Math.min(0.95, 0.5 + (best.score * 0.1))
  return { type: best.type, confidence }
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern)
    return count + (matches ? matches.length : 0)
  }, 0)
}

// Enhanced business context extraction
function enhanceBusinessContext(context) {
  const enhanced = { ...context }
  
  // Determine business size
  if (context.staff_count) {
    if (context.staff_count === 1) enhanced.business_size = 'solo'
    else if (context.staff_count <= 4) enhanced.business_size = 'small'
    else if (context.staff_count <= 10) enhanced.business_size = 'medium'
    else enhanced.business_size = 'large'
  }
  
  // Infer experience level from context clues
  if (context.years_in_business) {
    if (context.years_in_business < 2) enhanced.experience_level = 'new'
    else if (context.years_in_business <= 5) enhanced.experience_level = 'established'
    else enhanced.experience_level = 'mature'
  }
  
  // Market type inference
  if (context.location_type || context.market_type) {
    enhanced.market_type = context.location_type || context.market_type
  }
  
  return enhanced
}

// Build contextual prompt with business specifics
function buildContextualPrompt(systemPrompt, businessContext) {
  let contextualPrompt = systemPrompt
  
  if (businessContext.shop_name) {
    contextualPrompt += `\n\nYou are specifically advising ${businessContext.shop_name}.`
  }
  
  // Add business size context
  if (businessContext.business_size && CONTEXT_ENHANCERS.business_size[businessContext.business_size]) {
    contextualPrompt += ` ${CONTEXT_ENHANCERS.business_size[businessContext.business_size]}, `
  }
  
  // Add experience level context
  if (businessContext.experience_level && CONTEXT_ENHANCERS.experience_level[businessContext.experience_level]) {
    contextualPrompt += ` ${CONTEXT_ENHANCERS.experience_level[businessContext.experience_level]}, `
  }
  
  // Add market context
  if (businessContext.market_type && CONTEXT_ENHANCERS.market_type[businessContext.market_type]) {
    contextualPrompt += ` ${CONTEXT_ENHANCERS.market_type[businessContext.market_type]}, `
  }
  
  contextualPrompt += `\n\nCurrent business context:\n`
  
  if (businessContext.location) contextualPrompt += `• Location: ${businessContext.location}\n`
  if (businessContext.staff_count) contextualPrompt += `• Staff size: ${businessContext.staff_count} barbers\n`
  if (businessContext.average_ticket) contextualPrompt += `• Average ticket: $${businessContext.average_ticket}\n`
  if (businessContext.monthly_revenue) contextualPrompt += `• Monthly revenue: $${businessContext.monthly_revenue}\n`
  if (businessContext.operating_hours) contextualPrompt += `• Operating hours: ${businessContext.operating_hours}\n`
  
  contextualPrompt += `\nProvide specific, actionable advice tailored to this barbershop's situation and scale.`
  
  return contextualPrompt
}

// Enhanced OpenAI integration with better error handling
export async function callOpenAI(message, messageType, businessContext = {}) {
  if (!openaiClient) {
    throw new Error('OpenAI client not configured - check OPENAI_API_KEY')
  }

  const classification = typeof messageType === 'string' ? 
    { type: messageType, confidence: 0.8 } : 
    classifyBusinessMessage(message)

  const enhancedContext = enhanceBusinessContext(businessContext)
  const systemPrompt = ENHANCED_SYSTEM_PROMPTS[classification.type] || ENHANCED_SYSTEM_PROMPTS.business_coach
  const contextualPrompt = buildContextualPrompt(systemPrompt.prompt, enhancedContext)

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4', // Use stable model for production
      messages: [
        { 
          role: 'system', 
          content: contextualPrompt 
        },
        { 
          role: 'user', 
          content: `${message}\n\nPlease provide specific, actionable advice with clear next steps.`
        }
      ],
      max_tokens: 800, // Increased for more detailed responses
      temperature: 0.7,
      presence_penalty: 0.1, // Encourage more diverse vocabulary
      frequency_penalty: 0.1 // Reduce repetition
    })

    const response = completion.choices[0].message.content
    const quality = assessResponseQuality(response)

    return {
      response,
      provider: 'openai',
      model: 'gpt-4',
      confidence: classification.confidence,
      tokens_used: completion.usage?.total_tokens || 0,
      quality,
      persona: systemPrompt.persona,
      classification: classification.type
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Enhanced error context
    if (error.message.includes('rate_limit_exceeded')) {
      throw new Error('OpenAI rate limit exceeded - try again in a moment')
    } else if (error.message.includes('insufficient_quota')) {
      throw new Error('OpenAI quota exceeded - check your billing')
    } else if (error.message.includes('context_length_exceeded')) {
      throw new Error('Message too long - please shorten your request')
    }
    
    throw new Error(`OpenAI request failed: ${error.message}`)
  }
}

// Enhanced Anthropic integration
export async function callAnthropic(message, messageType, businessContext = {}) {
  if (!anthropicClient) {
    throw new Error('Anthropic client not configured - check ANTHROPIC_API_KEY')
  }

  const classification = typeof messageType === 'string' ? 
    { type: messageType, confidence: 0.8 } : 
    classifyBusinessMessage(message)

  const enhancedContext = enhanceBusinessContext(businessContext)
  const systemPrompt = ENHANCED_SYSTEM_PROMPTS[classification.type] || ENHANCED_SYSTEM_PROMPTS.business_coach
  const contextualPrompt = buildContextualPrompt(systemPrompt.prompt, enhancedContext)

  try {
    const message_response = await anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Latest stable model
      max_tokens: 800,
      system: contextualPrompt,
      messages: [
        { 
          role: 'user', 
          content: `${message}\n\nProvide specific, actionable business advice with measurable outcomes and clear implementation steps.`
        }
      ],
      temperature: 0.7
    })

    const response = message_response.content[0].text
    const quality = assessResponseQuality(response)
    const totalTokens = (message_response.usage?.input_tokens || 0) + (message_response.usage?.output_tokens || 0)

    return {
      response,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      confidence: classification.confidence,
      tokens_used: totalTokens,
      quality,
      persona: systemPrompt.persona,
      classification: classification.type
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    
    if (error.message.includes('rate_limit_exceeded')) {
      throw new Error('Anthropic rate limit exceeded - try again shortly')
    } else if (error.message.includes('overloaded_error')) {
      throw new Error('Anthropic service overloaded - try again in a moment')
    }
    
    throw new Error(`Anthropic request failed: ${error.message}`)
  }
}

// Enhanced Gemini integration
export async function callGemini(message, messageType, businessContext = {}) {
  if (!geminiClient) {
    throw new Error('Gemini client not configured - check GOOGLE_GEMINI_API_KEY')
  }

  const classification = typeof messageType === 'string' ? 
    { type: messageType, confidence: 0.8 } : 
    classifyBusinessMessage(message)

  const enhancedContext = enhanceBusinessContext(businessContext)
  const systemPrompt = ENHANCED_SYSTEM_PROMPTS[classification.type] || ENHANCED_SYSTEM_PROMPTS.business_coach
  const contextualPrompt = buildContextualPrompt(systemPrompt.prompt, enhancedContext)

  const fullPrompt = `${contextualPrompt}\n\nUser Question: ${message}\n\nProvide specific, actionable business advice with concrete next steps and measurable outcomes.`

  try {
    const model = geminiClient.getGenerativeModel({ 
      model: 'gemini-1.5-pro', // Use the more capable model
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
        topP: 0.9,
        topK: 32
      },
      systemInstruction: contextualPrompt
    })

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const responseText = response.text()
    const quality = assessResponseQuality(responseText)
    
    return {
      response: responseText,
      provider: 'google',
      model: 'gemini-1.5-pro',
      confidence: classification.confidence,
      tokens_used: 0, // Gemini doesn't provide token counts
      quality,
      persona: systemPrompt.persona,
      classification: classification.type
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    
    if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
      throw new Error('Gemini rate limit exceeded - try again shortly')
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('Gemini quota exceeded - check your billing')
    }
    
    throw new Error(`Gemini request failed: ${error.message}`)
  }
}

// Assess response quality based on multiple criteria
function assessResponseQuality(response) {
  let score = 0
  const responseText = response.toLowerCase()
  
  // Check for high-quality indicators
  QUALITY_INDICATORS.high_quality.forEach(pattern => {
    if (pattern.test(response)) score += 3
  })
  
  // Check for medium-quality indicators
  QUALITY_INDICATORS.medium_quality.forEach(pattern => {
    if (pattern.test(responseText)) score += 2
  })
  
  // Penalize low-quality indicators
  QUALITY_INDICATORS.low_quality.forEach(pattern => {
    if (pattern.test(responseText)) score -= 1
  })
  
  // Length and structure bonuses
  if (response.length > 300) score += 1
  if (response.includes('•') || response.includes('1.') || response.includes('-')) score += 1 // Has lists
  if (response.includes('$') || response.includes('%')) score += 2 // Has specific metrics
  
  // Determine quality level
  if (score >= 8) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

// Enhanced provider selection with quality considerations
export async function callBestAIProvider(message, messageType, businessContext = {}) {
  const classification = classifyBusinessMessage(message)
  
  // Provider priority based on message type and strength
  const providerStrategies = {
    'business_coach': [
      { provider: 'anthropic', weight: 0.4 }, // Claude excels at reasoning
      { provider: 'openai', weight: 0.35 },  
      { provider: 'gemini', weight: 0.25 }
    ],
    'customer_service': [
      { provider: 'openai', weight: 0.4 },   // GPT good at conversational tone
      { provider: 'anthropic', weight: 0.35 },
      { provider: 'gemini', weight: 0.25 }
    ],
    'marketing_expert': [
      { provider: 'openai', weight: 0.4 },   // GPT good at creative content
      { provider: 'gemini', weight: 0.35 },  // Gemini good at varied content
      { provider: 'anthropic', weight: 0.25 }
    ],
    'financial_advisor': [
      { provider: 'anthropic', weight: 0.45 }, // Claude excellent at analysis
      { provider: 'openai', weight: 0.35 },
      { provider: 'gemini', weight: 0.2 }
    ]
  }

  const strategy = providerStrategies[classification.type] || providerStrategies['business_coach']
  
  for (const { provider } of strategy) {
    try {
      let result = null
      
      switch (provider) {
        case 'openai':
          if (openaiClient) {
            result = await callOpenAI(message, classification.type, businessContext)
            break
          }
          continue
          
        case 'anthropic':
          if (anthropicClient) {
            result = await callAnthropic(message, classification.type, businessContext)
            break
          }
          continue
          
        case 'gemini':
          if (geminiClient) {
            result = await callGemini(message, classification.type, businessContext)
            break
          }
          continue
          
        default:
          continue
      }
      
      if (result) {
        // Add quality assessment to result
        result.qualityScore = assessResponseQualityScore(result.response)
        return result
      }
      
    } catch (error) {
      console.warn(`⚠️  ${provider} failed: ${error.message}`)
      continue
    }
  }
  
  throw new Error('All AI providers failed to respond')
}

function assessResponseQualityScore(response) {
  let score = 0
  
  // Specificity (has numbers, percentages, dollar amounts)
  if (/\$\d+|\d+%|\d+\s*(customers|clients|hours|minutes|days|weeks|months)/.test(response)) score += 20
  
  // Actionability (has clear steps or instructions)  
  if (/step \d+|first,|second,|next,|then,|\d+\./i.test(response)) score += 15
  
  // Expertise indicators (industry terms, proven strategies)
  if (/\b(roi|lifetime value|retention rate|conversion|upsell|cross-sell|profit margin)\b/i.test(response)) score += 10
  
  // Length and completeness
  if (response.length > 200) score += 5
  if (response.length > 400) score += 5
  
  return Math.min(100, score)
}

// Enhanced health checking with retry logic
export async function checkAIProvidersHealth() {
  const results = {
    openai: { available: !!openaiClient, healthy: false, latency: null },
    anthropic: { available: !!anthropicClient, healthy: false, latency: null },
    gemini: { available: !!geminiClient, healthy: false, latency: null }
  }
  
  const healthCheckPrompt = "Respond with exactly: 'System operational'"
  const healthCheckContext = { shop_name: "Test Shop" }
  
  const healthChecks = []
  
  if (openaiClient) {
    healthChecks.push(
      (async () => {
        try {
          const start = Date.now()
          await callOpenAI(healthCheckPrompt, 'business_coach', healthCheckContext)
          results.openai.healthy = true
          results.openai.latency = Date.now() - start
        } catch (error) {
          console.warn('OpenAI health check failed:', error.message)
          results.openai.healthy = false
        }
      })()
    )
  }
  
  if (anthropicClient) {
    healthChecks.push(
      (async () => {
        try {
          const start = Date.now()
          await callAnthropic(healthCheckPrompt, 'business_coach', healthCheckContext)
          results.anthropic.healthy = true
          results.anthropic.latency = Date.now() - start
        } catch (error) {
          console.warn('Anthropic health check failed:', error.message)
          results.anthropic.healthy = false
        }
      })()
    )
  }
  
  if (geminiClient) {
    healthChecks.push(
      (async () => {
        try {
          const start = Date.now()
          await callGemini(healthCheckPrompt, 'business_coach', healthCheckContext)
          results.gemini.healthy = true
          results.gemini.latency = Date.now() - start
        } catch (error) {
          console.warn('Gemini health check failed:', error.message)
          results.gemini.healthy = false
        }
      })()
    )
  }
  
  // Wait for all health checks with timeout
  await Promise.allSettled(healthChecks)
  
  return results
}

// Export clients and utilities
export { openaiClient, anthropicClient, geminiClient }
export const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-20241022'