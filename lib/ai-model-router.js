/**
 * AI Model Router - Latest Models (December 2024)
 * Intelligently selects the optimal AI model based on task requirements
 * Optimizes for cost while maintaining quality
 */

import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'

// Model capabilities and pricing (Latest Available Models - December 2024)
const MODELS = {
  // Google Gemini Models (Latest & Most Cost-Effective)
  'gemini-2.5-flash-lite': {
    provider: 'google',
    model: google('gemini-2.5-flash-lite'),
    capabilities: ['chat', 'simple', 'high-volume', 'multimodal'],
    contextWindow: 1000000, // 1M tokens
    pricing: { input: 0.0001, output: 0.0004 }, // $0.10/$0.40 per 1M tokens
    speed: 'very-fast',
    quality: 'good',
    freeTier: { requests: 500, tokensPerMinute: 250000 }
  },
  'gemini-2.5-flash': {
    provider: 'google',
    model: google('gemini-2.5-flash'),
    capabilities: ['chat', 'reasoning', 'analysis', 'thinking', 'multimodal'],
    contextWindow: 1000000, // 1M tokens
    pricing: { input: 0.0003, output: 0.0025 }, // $0.30/$2.50 per 1M tokens
    speed: 'fast',
    quality: 'excellent',
    freeTier: { requests: 500, tokensPerMinute: 250000 }
  },
  
  // OpenAI Models (Latest Available)
  'gpt-4o-mini': {
    provider: 'openai',
    model: openai('gpt-4o-mini'),
    capabilities: ['chat', 'simple', 'high-volume'],
    contextWindow: 128000,
    pricing: { input: 0.00015, output: 0.0006 }, // per 1K tokens
    speed: 'fast',
    quality: 'good'
  },
  'gpt-4o': {
    provider: 'openai',
    model: openai('gpt-4o'),
    capabilities: ['chat', 'reasoning', 'analysis', 'complex', 'multimodal'],
    contextWindow: 128000,
    pricing: { input: 0.005, output: 0.015 },
    speed: 'fast',
    quality: 'excellent'
  },
  'o3': {
    provider: 'openai',
    model: openai('o3'),
    capabilities: ['reasoning', 'complex', 'analysis', 'advanced'],
    contextWindow: 200000,
    pricing: { input: 0.002, output: 0.008 }, // $2/$8 per 1M tokens
    speed: 'medium',
    quality: 'superior'
  },
  'o3-mini': {
    provider: 'openai',
    model: openai('o3-mini'),
    capabilities: ['reasoning', 'code', 'math', 'fast-reasoning'],
    contextWindow: 200000,
    pricing: { input: 0.0025, output: 0.01 }, // $2.50/$10 per 1M tokens  
    speed: 'fast',
    quality: 'excellent'
  }
}

// Task type definitions (Optimized for Barbershop App)
const TASK_TYPES = {
  // Simple queries - most common (use cheapest model with free tier)
  simple: {
    keywords: ['hello', 'hi', 'thanks', 'bye', 'yes', 'no', 'ok', 'hours', 'location', 'phone'],
    preferredModels: ['gemini-2.5-flash-lite', 'gpt-4o-mini'],
    maxCost: 0.001
  },
  
  // Booking-related tasks
  booking: {
    keywords: ['book', 'appointment', 'schedule', 'available', 'time', 'slot', 'cancel', 'reschedule'],
    preferredModels: ['gemini-2.5-flash-lite', 'gpt-4o-mini'],
    maxCost: 0.01
  },
  
  // Service inquiries
  services: {
    keywords: ['haircut', 'trim', 'style', 'color', 'wash', 'beard', 'shave', 'price', 'cost'],
    preferredModels: ['gemini-2.5-flash-lite', 'gpt-4o-mini'],
    maxCost: 0.01
  },
  
  // Business analytics and insights
  analytics: {
    keywords: ['analyze', 'report', 'metrics', 'revenue', 'customers', 'trends', 'busy', 'popular'],
    preferredModels: ['gemini-2.5-flash', 'o3-mini', 'gpt-4o'],
    maxCost: 0.05
  },
  
  // Customer service and support
  customer_service: {
    keywords: ['help', 'issue', 'problem', 'question', 'support', 'complaint', 'feedback'],
    preferredModels: ['gemini-2.5-flash-lite', 'gpt-4o-mini'],
    maxCost: 0.01
  },
  
  // Complex business analysis and strategy
  complex: {
    keywords: ['strategy', 'optimization', 'growth', 'marketing', 'competition', 'expansion', 'forecast'],
    preferredModels: ['o3', 'gemini-2.5-flash', 'gpt-4o'],
    maxCost: 0.1
  }
}

/**
 * Analyzes the task and selects the optimal model
 * @param {Object} options - Selection options
 * @param {string} options.task - Task description or type
 * @param {Array} options.messages - Conversation messages
 * @param {number} options.maxCost - Maximum cost per request (optional)
 * @param {string} options.preferredProvider - Preferred provider (optional)
 * @param {boolean} options.prioritizeSpeed - Prioritize speed over quality
 * @returns {Object} Selected model configuration
 */
export function selectOptimalModel({
  task,
  messages = [],
  maxCost = 0.05,
  preferredProvider = null,
  prioritizeSpeed = false
}) {
  // Get the last message for analysis
  const lastMessage = messages[messages.length - 1]?.content || ''
  const combinedText = `${task || ''} ${lastMessage}`.toLowerCase()
  
  // Detect task type
  let detectedType = 'simple'
  let matchScore = 0
  
  for (const [type, config] of Object.entries(TASK_TYPES)) {
    let score = 0
    
    // Check keywords
    if (config.keywords) {
      for (const keyword of config.keywords) {
        if (combinedText.includes(keyword)) {
          score += 1
        }
      }
    }
    
    // Check patterns
    if (config.patterns) {
      for (const pattern of config.patterns) {
        if (pattern.test(combinedText)) {
          score += 2 // Patterns are weighted higher
        }
      }
    }
    
    if (score > matchScore) {
      matchScore = score
      detectedType = type
    }
  }
  
  // Get preferred models for the task type
  const taskConfig = TASK_TYPES[detectedType]
  const preferredModels = taskConfig.preferredModels
  
  // Filter models based on criteria
  let eligibleModels = Object.entries(MODELS).filter(([name, config]) => {
    // Check if model is in preferred list
    if (!preferredModels.includes(name)) return false
    
    // Check cost constraint
    const estimatedCost = estimateRequestCost(config, messages)
    if (estimatedCost > maxCost) return false
    
    // Check provider preference
    if (preferredProvider && config.provider !== preferredProvider) return false
    
    return true
  })
  
  // If no eligible models, fallback to cheapest
  if (eligibleModels.length === 0) {
    eligibleModels = [['gpt-4o-mini', MODELS['gpt-4o-mini']]]
  }
  
  // Sort by optimization criteria
  eligibleModels.sort(([nameA, configA], [nameB, configB]) => {
    if (prioritizeSpeed) {
      // Sort by speed, then cost
      const speedOrder = { fast: 1, medium: 2, slow: 3 }
      const speedDiff = speedOrder[configA.speed] - speedOrder[configB.speed]
      if (speedDiff !== 0) return speedDiff
    }
    
    // Sort by cost-effectiveness (quality per dollar)
    const qualityOrder = { good: 1, excellent: 2, superior: 3 }
    const costA = (configA.pricing.input + configA.pricing.output) / 2
    const costB = (configB.pricing.input + configB.pricing.output) / 2
    const valueA = qualityOrder[configA.quality] / costA
    const valueB = qualityOrder[configB.quality] / costB
    
    return valueB - valueA // Higher value is better
  })
  
  // Select the best model
  const [selectedName, selectedConfig] = eligibleModels[0]
  
  return {
    name: selectedName,
    model: selectedConfig.model,
    provider: selectedConfig.provider,
    estimatedCost: estimateRequestCost(selectedConfig, messages),
    reasoning: `Selected ${selectedName} for ${detectedType} task (score: ${matchScore})`,
    capabilities: selectedConfig.capabilities,
    contextWindow: selectedConfig.contextWindow
  }
}

/**
 * Estimates the cost of a request based on message history
 * @param {Object} modelConfig - Model configuration
 * @param {Array} messages - Conversation messages
 * @returns {number} Estimated cost in dollars
 */
function estimateRequestCost(modelConfig, messages) {
  // Rough estimation: ~4 chars per token
  const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
  const estimatedTokens = totalChars / 4
  
  // Assume 50/50 split between input and output
  const inputTokens = estimatedTokens * 0.6
  const outputTokens = estimatedTokens * 0.4
  
  const inputCost = (inputTokens / 1000) * modelConfig.pricing.input
  const outputCost = (outputTokens / 1000) * modelConfig.pricing.output
  
  return inputCost + outputCost
}

/**
 * Gets model recommendations for barbershop app use cases
 * @returns {Object} Model recommendations by use case
 */
export function getModelRecommendations() {
  return {
    general: {
      primary: 'gemini-2.5-flash-lite',
      fallback: 'gpt-4o-mini',
      reasoning: 'Most cost-effective with generous free tier'
    },
    booking: {
      primary: 'gemini-2.5-flash-lite',
      fallback: 'gpt-4o-mini',
      reasoning: 'Fast responses for appointment scheduling'
    },
    analytics: {
      primary: 'gemini-2.5-flash',
      fallback: 'o3-mini',
      reasoning: 'Strong analytical capabilities with thinking mode'
    },
    complex: {
      primary: 'o3',
      fallback: 'gemini-2.5-flash',
      reasoning: 'Advanced reasoning for business strategy'
    },
    highVolume: {
      primary: 'gemini-2.5-flash-lite',
      fallback: null,
      reasoning: 'Free tier covers most barbershop usage'
    }
  }
}

/**
 * Calculates monthly cost estimate based on barbershop usage patterns
 * @param {Object} usage - Usage statistics
 * @returns {Object} Cost breakdown and recommendations
 */
export function calculateMonthlyCost(usage) {
  const { 
    dailyMessages = 100,
    averageMessageLength = 200,
    taskDistribution = {
      simple: 0.4,           // Most common - hours, info
      booking: 0.3,          // Appointment scheduling  
      services: 0.15,        // Service inquiries
      customer_service: 0.1, // Support questions
      analytics: 0.04,       // Business insights
      complex: 0.01          // Strategy discussions
    }
  } = usage
  
  let totalCost = 0
  const breakdown = {}
  let freeTokensUsed = 0
  
  // Gemini free tier limits (per month estimate)
  const GEMINI_FREE_TIER = {
    maxRequests: 15000,  // 500/day * 30 days
    maxTokens: 7500000   // 250K/minute * rough monthly estimate
  }
  
  for (const [taskType, percentage] of Object.entries(taskDistribution)) {
    const messagesPerDay = dailyMessages * percentage
    const taskConfig = TASK_TYPES[taskType]
    const modelName = taskConfig.preferredModels[0]
    const model = MODELS[modelName]
    
    // Calculate tokens (rough estimate)
    const tokensPerMessage = averageMessageLength / 4
    const dailyTokens = messagesPerDay * tokensPerMessage * 2 // input + output
    const monthlyTokens = dailyTokens * 30
    const monthlyMessages = messagesPerDay * 30
    
    let taskCost = 0
    
    // Check if using Gemini and within free tier
    if (model.provider === 'google' && model.freeTier) {
      const remainingFreeTokens = Math.max(0, GEMINI_FREE_TIER.maxTokens - freeTokensUsed)
      const tokensInFreeTier = Math.min(monthlyTokens, remainingFreeTokens)
      const paidTokens = monthlyTokens - tokensInFreeTier
      
      freeTokensUsed += tokensInFreeTier
      
      if (paidTokens > 0) {
        const monthlyInputTokens = paidTokens * 0.6
        const monthlyOutputTokens = paidTokens * 0.4
        const inputCost = (monthlyInputTokens / 1000) * model.pricing.input
        const outputCost = (monthlyOutputTokens / 1000) * model.pricing.output
        taskCost = inputCost + outputCost
      }
    } else {
      // Calculate normal cost
      const monthlyInputTokens = monthlyTokens * 0.6
      const monthlyOutputTokens = monthlyTokens * 0.4
      const inputCost = (monthlyInputTokens / 1000) * model.pricing.input
      const outputCost = (monthlyOutputTokens / 1000) * model.pricing.output
      taskCost = inputCost + outputCost
    }
    
    breakdown[taskType] = {
      model: modelName,
      monthlyTokens,
      monthlyMessages,
      cost: taskCost,
      usingFreeTier: model.provider === 'google' && taskCost === 0
    }
    
    totalCost += taskCost
  }
  
  return {
    totalMonthlyCost: totalCost,
    dailyCost: totalCost / 30,
    breakdown,
    freeTokensUsed,
    geminiFreeTierRemaining: Math.max(0, GEMINI_FREE_TIER.maxTokens - freeTokensUsed),
    recommendations: totalCost > 10 ? [
      'Consider implementing response caching for -60% costs',
      'Monitor usage to stay within free tiers',
      'Use batch processing for analytics queries'
    ] : [
      'Excellent cost efficiency with free tier usage!',
      'Monitor for usage spikes during busy periods',
      'Consider upgrading only when scaling to multiple locations'
    ]
  }
}

export default {
  selectOptimalModel,
  getModelRecommendations,
  calculateMonthlyCost,
  MODELS,
  TASK_TYPES
}