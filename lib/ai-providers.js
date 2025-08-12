// AI Provider Integration Service
// Centralized service for managing multiple AI providers with failover support

import OpenAI from 'openai'

// Initialize AI clients
let openaiClient = null
let anthropicClient = null
let geminiClient = null

// Initialize OpenAI
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Initialize Anthropic (for server-side use)
if (process.env.ANTHROPIC_API_KEY && typeof window === 'undefined') {
  try {
    // Dynamic import for server-side only
    const Anthropic = require('@anthropic-ai/sdk')
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  } catch (error) {
    console.warn('Anthropic SDK not available:', error.message)
  }
}

// Initialize Google Gemini
if (process.env.GOOGLE_GEMINI_API_KEY && typeof window === 'undefined') {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  } catch (error) {
    console.warn('Google Gemini SDK not available:', error.message)
  }
}

// Provider configurations with business context prompts
const BARBERSHOP_SYSTEM_PROMPTS = {
  business_coach: `You are an expert business coach specializing in barbershop operations. You provide actionable advice on:
- Revenue optimization and pricing strategies
- Customer retention and service quality
- Staff management and scheduling efficiency  
- Marketing and local business growth
- Financial planning and cost management

Always provide specific, actionable recommendations with real numbers where possible. Focus on practical implementation steps.`,

  customer_service: `You are a customer service expert for barbershops. Help with:
- Customer satisfaction strategies
- Handling complaints and feedback
- Building customer loyalty programs
- Improving service quality and consistency
- Training staff on customer interactions

Provide clear, empathetic solutions that improve customer relationships.`,

  marketing_expert: `You are a digital marketing specialist for barbershops. Focus on:
- Social media strategy (Instagram, Facebook, TikTok)
- Local SEO and Google My Business optimization
- Before/after content creation strategies
- Community engagement and partnerships
- Paid advertising for local barbershops

Give practical, budget-conscious marketing advice with specific implementation steps.`,

  financial_advisor: `You are a financial advisor specializing in small barbershop businesses. Help with:
- Pricing optimization and service packaging
- Cost analysis and profit margin improvement
- Cash flow management and budgeting
- Investment in equipment and expansion
- Tax planning and business expenses

Provide specific financial recommendations with calculations and projections.`
}

// Enhanced message classification for better AI routing
export function classifyBusinessMessage(message) {
  const messageLower = message.toLowerCase()
  
  // Business strategy and growth
  if (/\b(revenue|profit|growth|expand|strategy|business plan|competition|market share|scale|roi)\b/.test(messageLower)) {
    return 'business_coach'
  }
  
  // Customer service and satisfaction
  if (/\b(customer|client|satisfaction|complaint|feedback|review|retention|service quality|experience)\b/.test(messageLower)) {
    return 'customer_service'
  }
  
  // Marketing and promotion
  if (/\b(marketing|social media|instagram|facebook|promotion|advertising|brand|attract customers|visibility)\b/.test(messageLower)) {
    return 'marketing_expert'
  }
  
  // Financial and pricing
  if (/\b(price|pricing|cost|money|budget|profit|financial|expenses|investment|revenue|income)\b/.test(messageLower)) {
    return 'financial_advisor'
  }
  
  // Scheduling and operations
  if (/\b(schedule|booking|appointment|time|staff|busy|efficiency|operation|workflow)\b/.test(messageLower)) {
    return 'business_coach'
  }
  
  // Default to business coach for general queries
  return 'business_coach'
}

// OpenAI Integration
export async function callOpenAI(message, messageType, businessContext = {}) {
  if (!openaiClient) {
    throw new Error('OpenAI not configured')
  }

  const systemPrompt = BARBERSHOP_SYSTEM_PROMPTS[messageType] || BARBERSHOP_SYSTEM_PROMPTS.business_coach
  
  // Add business context to the prompt
  const contextualPrompt = `${systemPrompt}

Business Context:
- Shop Name: ${businessContext.shop_name || 'the barbershop'}
- Location: ${businessContext.location || 'local area'}
- Staff Count: ${businessContext.staff_count || 'small team'}

Provide specific advice tailored to this barbershop's situation.`

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: contextualPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    return {
      response: completion.choices[0].message.content,
      provider: 'openai',
      model: 'gpt-5',
      confidence: 0.85,
      tokens_used: completion.usage?.total_tokens || 0
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI failed: ${error.message}`)
  }
}

// Anthropic Claude Integration
export async function callAnthropic(message, messageType, businessContext = {}) {
  if (!anthropicClient) {
    throw new Error('Anthropic not configured')
  }

  const systemPrompt = BARBERSHOP_SYSTEM_PROMPTS[messageType] || BARBERSHOP_SYSTEM_PROMPTS.business_coach
  
  const contextualPrompt = `${systemPrompt}

Business Context:
- Shop: ${businessContext.shop_name || 'the barbershop'}
- Location: ${businessContext.location || 'local area'}  
- Team Size: ${businessContext.staff_count || 'small team'}

Give practical, actionable advice for this specific barbershop.`

  try {
    const message_response = await anthropicClient.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 500,
      system: contextualPrompt,
      messages: [
        { role: 'user', content: message }
      ],
    })

    return {
      response: message_response.content[0].text,
      provider: 'anthropic',
      model: 'claude-opus-4.1',
      confidence: 0.88,
      tokens_used: message_response.usage?.input_tokens + message_response.usage?.output_tokens || 0
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error(`Anthropic failed: ${error.message}`)
  }
}

// Google Gemini Integration
export async function callGemini(message, messageType, businessContext = {}) {
  if (!geminiClient) {
    throw new Error('Gemini not configured')
  }

  const systemPrompt = BARBERSHOP_SYSTEM_PROMPTS[messageType] || BARBERSHOP_SYSTEM_PROMPTS.business_coach
  
  const contextualPrompt = `${systemPrompt}

Business Context:
- Barbershop: ${businessContext.shop_name || 'the barbershop'}
- Location: ${businessContext.location || 'local area'}
- Staff: ${businessContext.staff_count || 'small team'}

Provide specific, actionable advice for this barbershop business.

User Question: ${message}`

  try {
    const model = geminiClient.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    })

    const result = await model.generateContent(contextualPrompt)
    const response = await result.response
    
    return {
      response: response.text(),
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
      confidence: 0.82,
      tokens_used: 0 // Gemini doesn't provide token usage in response
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error(`Gemini failed: ${error.message}`)
  }
}

// Intelligent provider selection with failover
export async function callBestAIProvider(message, messageType, businessContext = {}) {
  // Provider priority based on message type and availability
  const providerPriority = {
    'business_coach': ['anthropic', 'openai', 'gemini'],
    'customer_service': ['openai', 'anthropic', 'gemini'],
    'marketing_expert': ['openai', 'gemini', 'anthropic'],
    'financial_advisor': ['anthropic', 'openai', 'gemini']
  }

  const providers = providerPriority[messageType] || ['openai', 'anthropic', 'gemini']
  
  for (const provider of providers) {
    try {
      let result = null
      
      switch (provider) {
        case 'openai':
          if (openaiClient) {
            result = await callOpenAI(message, messageType, businessContext)
            break
          }
          continue
          
        case 'anthropic':
          if (anthropicClient) {
            result = await callAnthropic(message, messageType, businessContext)
            break
          }
          continue
          
        case 'gemini':
          if (geminiClient) {
            result = await callGemini(message, messageType, businessContext)
            break
          }
          continue
          
        default:
          continue
      }
      
      if (result) {
        console.log(`✅ AI Response successful via ${provider}`)
        return result
      }
      
    } catch (error) {
      console.warn(`⚠️ ${provider} failed: ${error.message}`)
      continue
    }
  }
  
  // If all providers fail, throw error
  throw new Error('All AI providers failed to respond')
}

// Generate business recommendations based on message type
export function generateBusinessRecommendations(messageType, response) {
  const recommendations = {
    business_coach: [
      'Track daily revenue and identify peak hours',
      'Implement a customer booking reminder system',
      'Create service packages to increase average ticket size',
      'Set up customer feedback collection system'
    ],
    customer_service: [
      'Send follow-up texts 24 hours after appointments', 
      'Create a customer preference database',
      'Implement a simple 5-star rating system',
      'Train staff on upselling complementary services'
    ],
    marketing_expert: [
      'Post before/after photos daily on Instagram',
      'Engage with local community groups and events',
      'Set up Google My Business with updated photos',
      'Create referral incentives for existing customers'
    ],
    financial_advisor: [
      'Review and optimize service pricing monthly',
      'Track cost per service including time and products',
      'Set up separate accounts for taxes and expenses',
      'Calculate customer lifetime value for top clients'
    ]
  }
  
  return recommendations[messageType] || recommendations.business_coach
}

// Health check for AI providers
export async function checkAIProvidersHealth() {
  const results = {
    openai: { available: !!openaiClient, healthy: false },
    anthropic: { available: !!anthropicClient, healthy: false },
    gemini: { available: !!geminiClient, healthy: false }
  }
  
  // Quick health check with simple prompts
  const testPrompt = "Hello, are you working?"
  
  if (openaiClient) {
    try {
      await callOpenAI(testPrompt, 'business_coach', {})
      results.openai.healthy = true
    } catch (error) {
      console.warn('OpenAI health check failed:', error.message)
    }
  }
  
  if (anthropicClient) {
    try {
      await callAnthropic(testPrompt, 'business_coach', {})
      results.anthropic.healthy = true
    } catch (error) {
      console.warn('Anthropic health check failed:', error.message)
    }
  }
  
  if (geminiClient) {
    try {
      await callGemini(testPrompt, 'business_coach', {})
      results.gemini.healthy = true
    } catch (error) {
      console.warn('Gemini health check failed:', error.message)
    }
  }
  
  return results
}