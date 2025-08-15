import { NextResponse } from 'next/server'
export const runtime = 'edge'

/**
 * AI Agent Conversation Memory System
 * Stores conversation context and history for each user session
 */

const conversationMemory = new Map()
const businessProfiles = new Map() // Long-term business relationship memory
const MAX_MEMORY_PER_SESSION = 100 // Increased for better context
const MEMORY_CLEANUP_INTERVAL = 72 * 60 * 60 * 1000 // 72 hours for longer retention
const BUSINESS_PROFILE_RETENTION = 30 * 24 * 60 * 60 * 1000 // 30 days

setInterval(() => {
  const now = Date.now()
  for (const [sessionId, memory] of conversationMemory.entries()) {
    if (now - memory.lastAccessed > MEMORY_CLEANUP_INTERVAL) {
      conversationMemory.delete(sessionId)
    }
  }
}, 60 * 60 * 1000) // Run cleanup every hour

export async function POST(request) {
  try {
    const { action, sessionId, data } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    switch (action) {
      case 'store_message':
        return storeMessage(sessionId, data)
      case 'get_context':
        return getContext(sessionId, data)
      case 'store_user_preferences':
        return storeUserPreferences(sessionId, data)
      case 'clear_memory':
        return clearMemory(sessionId)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Memory error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process memory request'
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        stats: {
          totalSessions: conversationMemory.size,
          totalMessages: Array.from(conversationMemory.values())
            .reduce((sum, memory) => sum + (memory.messages?.length || 0), 0),
          memoryUsage: `${Math.round(JSON.stringify([...conversationMemory]).length / 1024)}KB`,
          oldestSession: Math.min(...Array.from(conversationMemory.values())
            .map(m => m.createdAt || Date.now()))
        }
      })
    }

    const memory = conversationMemory.get(sessionId)
    if (!memory) {
      return NextResponse.json({
        success: true,
        memory: null,
        message: 'No memory found for this session'
      })
    }

    memory.lastAccessed = Date.now()
    
    return NextResponse.json({
      success: true,
      memory: {
        sessionId,
        messagesCount: memory.messages?.length || 0,
        recentMessages: memory.messages?.slice(-10) || [], // Last 10 messages
        userPreferences: memory.userPreferences || {},
        businessContext: memory.businessContext || {},
        conversationSummary: memory.conversationSummary || null,
        createdAt: memory.createdAt,
        lastAccessed: memory.lastAccessed
      }
    })
  } catch (error) {
    console.error('AI Memory retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve memory'
    }, { status: 500 })
  }
}

async function storeMessage(sessionId, data) {
  const { message, response, messageType, agent, businessContext } = data

  if (!conversationMemory.has(sessionId)) {
    conversationMemory.set(sessionId, {
      messages: [],
      userPreferences: {},
      businessContext: businessContext || {},
      conversationSummary: null,
      conversationThemes: new Map(), // Track recurring themes
      userConcerns: [], // Track user concerns and feedback
      createdAt: Date.now(),
      lastAccessed: Date.now()
    })
  }

  let memory = conversationMemory.get(sessionId)
  
  const messageAnalysis = analyzeMessageContent(message, response, messageType)
  
  const messageEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    userMessage: message,
    aiResponse: response,
    messageType: messageType || 'general',
    agent: agent || 'AI Assistant',
    businessContext: businessContext,
    sentiment: messageAnalysis.sentiment,
    concerns: messageAnalysis.concerns,
    followUp: messageAnalysis.isFollowUp,
    topics: messageAnalysis.topics
  }

  memory.messages.push(messageEntry)
  memory.lastAccessed = Date.now()

  messageAnalysis.topics.forEach(topic => {
    const count = memory.conversationThemes.get(topic) || 0
    memory.conversationThemes.set(topic, count + 1)
  })

  if (messageAnalysis.concerns.length > 0) {
    memory.userConcerns.push({
      timestamp: new Date().toISOString(),
      concerns: messageAnalysis.concerns,
      context: messageType
    })
  }

  if (businessContext) {
    memory.businessContext = { ...memory.businessContext, ...businessContext }
    updateBusinessProfile(businessContext, memory)
  }

  if (memory.messages.length > MAX_MEMORY_PER_SESSION) {
    memory = intelligentMessageTrimming(memory)
  }

  return NextResponse.json({
    success: true,
    message: 'Message stored successfully',
    memorySize: memory.messages.length,
    themes: Object.fromEntries(memory.conversationThemes),
    recentConcerns: memory.userConcerns.slice(-3)
  })
}

async function getContext(sessionId, data) {
  const { contextType = 'recent', limit = 10 } = data

  const memory = conversationMemory.get(sessionId)
  if (!memory) {
    return NextResponse.json({
      success: true,
      context: {
        messages: [],
        summary: null,
        preferences: {},
        businessContext: {}
      }
    })
  }

  memory.lastAccessed = Date.now()

  let contextMessages = []
  
  switch (contextType) {
    case 'recent':
      contextMessages = memory.messages.slice(-limit)
      break
    case 'topical':
      const { topic } = data
      if (topic) {
        contextMessages = memory.messages
          .filter(msg => msg.messageType === topic || 
                        msg.userMessage.toLowerCase().includes(topic.toLowerCase()) ||
                        msg.aiResponse.toLowerCase().includes(topic.toLowerCase()))
          .slice(-limit)
      } else {
        contextMessages = memory.messages.slice(-limit)
      }
      break
    case 'all':
      contextMessages = memory.messages
      break
  }

  return NextResponse.json({
    success: true,
    context: {
      messages: contextMessages,
      summary: memory.conversationSummary,
      preferences: memory.userPreferences,
      businessContext: memory.businessContext,
      sessionStats: {
        totalMessages: memory.messages.length,
        sessionDuration: Date.now() - memory.createdAt,
        lastActive: memory.lastAccessed
      }
    }
  })
}

async function storeUserPreferences(sessionId, data) {
  const { preferences } = data

  if (!conversationMemory.has(sessionId)) {
    conversationMemory.set(sessionId, {
      messages: [],
      userPreferences: {},
      businessContext: {},
      conversationSummary: null,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    })
  }

  const memory = conversationMemory.get(sessionId)
  memory.userPreferences = { ...memory.userPreferences, ...preferences }
  memory.lastAccessed = Date.now()

  return NextResponse.json({
    success: true,
    message: 'User preferences stored successfully',
    preferences: memory.userPreferences
  })
}

async function clearMemory(sessionId) {
  const deleted = conversationMemory.delete(sessionId)
  
  return NextResponse.json({
    success: true,
    message: deleted ? 'Memory cleared successfully' : 'No memory found to clear'
  })
}

/**
 * Analyze message content for enhanced context understanding
 */
function analyzeMessageContent(message, response, messageType) {
  const messageLower = message.toLowerCase()
  
  const positiveWords = ['good', 'great', 'excellent', 'perfect', 'love', 'like', 'awesome', 'fantastic']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'problem', 'issue', 'wrong']
  const concernWords = ['aggressive', 'too much', 'expensive', 'difficult', 'hard', 'overwhelming', 'worried', 'concerned']
  
  const sentiment = positiveWords.some(word => messageLower.includes(word)) ? 'positive' :
                   negativeWords.some(word => messageLower.includes(word)) ? 'negative' : 'neutral'
  
  const concerns = concernWords.filter(word => messageLower.includes(word))
  
  const followUpIndicators = ['this', 'that', 'it', 'seems', 'sounds', 'but', 'however']
  const isFollowUp = followUpIndicators.some(indicator => messageLower.includes(indicator)) || message.length < 50
  
  const topicKeywords = {
    pricing: ['price', 'cost', 'charge', 'rate', 'fee', 'expensive', 'cheap'],
    marketing: ['marketing', 'promotion', 'advertising', 'social', 'customer'],
    scheduling: ['schedule', 'booking', 'appointment', 'time', 'calendar'],
    staff: ['staff', 'employee', 'barber', 'team', 'management'],
    revenue: ['revenue', 'money', 'profit', 'income', 'sales']
  }
  
  const topics = Object.entries(topicKeywords)
    .filter(([topic, keywords]) => keywords.some(keyword => messageLower.includes(keyword)))
    .map(([topic]) => topic)
  
  return {
    sentiment,
    concerns,
    isFollowUp,
    topics: topics.length > 0 ? topics : [messageType || 'general']
  }
}

/**
 * Update long-term business profile based on conversation patterns
 */
function updateBusinessProfile(businessContext, memory) {
  const businessId = businessContext.barbershop_id || 'demo'
  
  if (!businessProfiles.has(businessId)) {
    businessProfiles.set(businessId, {
      id: businessId,
      name: businessContext.shop_name || 'Demo Barbershop',
      conversationCount: 0,
      primaryConcerns: new Map(),
      preferredTopics: new Map(),
      communicationStyle: 'neutral',
      lastInteraction: Date.now(),
      businessMetrics: {},
      createdAt: Date.now()
    })
  }
  
  const profile = businessProfiles.get(businessId)
  profile.conversationCount++
  profile.lastInteraction = Date.now()
  
  if (businessContext.monthly_revenue) {
    profile.businessMetrics.revenue = businessContext.monthly_revenue
  }
  if (businessContext.customer_count) {
    profile.businessMetrics.customers = businessContext.customer_count
  }
  
  if (memory.userConcerns.length > 2) {
    profile.communicationStyle = 'cautious' // User expresses many concerns
  } else if (memory.conversationThemes.get('revenue') > 3) {
    profile.communicationStyle = 'business-focused'
  }
  
  memory.userConcerns.forEach(concern => {
    concern.concerns.forEach(c => {
      const count = profile.primaryConcerns.get(c) || 0
      profile.primaryConcerns.set(c, count + 1)
    })
  })
}

/**
 * Intelligent message trimming that preserves important context
 */
function intelligentMessageTrimming(memory) {
  const messages = memory.messages
  const keepRecentCount = 20 // Always keep recent messages
  const keepImportantCount = 10 // Keep important historical messages
  
  const recentMessages = messages.slice(-keepRecentCount)
  
  const olderMessages = messages.slice(0, -keepRecentCount)
  const scoredMessages = olderMessages.map(msg => ({
    ...msg,
    importance: calculateMessageImportance(msg, memory)
  }))
  
  const importantMessages = scoredMessages
    .sort((a, b) => b.importance - a.importance)
    .slice(0, keepImportantCount)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  
  memory.messages = [...importantMessages, ...recentMessages]
  
  const trimmedMessages = messages.slice(0, -(keepRecentCount + keepImportantCount))
  if (trimmedMessages.length > 0) {
    memory.conversationSummary = createConversationSummary(trimmedMessages, memory.conversationSummary)
  }
  
  return memory
}

/**
 * Calculate importance score for a message
 */
function calculateMessageImportance(message, memory) {
  let score = 0
  
  if (message.concerns && message.concerns.length > 0) {
    score += 10
  }
  
  const topicFrequency = memory.conversationThemes.get(message.messageType) || 0
  score += topicFrequency * 2
  
  if (message.followUp) {
    score += 5
  }
  
  if (message.businessContext && Object.keys(message.businessContext).length > 0) {
    score += 8
  }
  
  if (message.userMessage.length > 100) {
    score += 3
  }
  
  return score
}

function createConversationSummary(messages, existingSummary) {
  const topics = {}
  const agents = {}
  const concerns = {}
  const sentiments = { positive: 0, negative: 0, neutral: 0 }
  
  messages.forEach(msg => {
    if (msg.messageType && msg.messageType !== 'general') {
      topics[msg.messageType] = (topics[msg.messageType] || 0) + 1
    }
    
    if (msg.agent) {
      agents[msg.agent] = (agents[msg.agent] || 0) + 1
    }
    
    if (msg.concerns) {
      msg.concerns.forEach(concern => {
        concerns[concern] = (concerns[concern] || 0) + 1
      })
    }
    
    if (msg.sentiment) {
      sentiments[msg.sentiment]++
    }
  })

  const summary = {
    messageCount: messages.length,
    timespan: {
      start: messages[0]?.timestamp,
      end: messages[messages.length - 1]?.timestamp
    },
    topTopics: Object.entries(topics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count })),
    primaryAgents: Object.entries(agents)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([agent, count]) => ({ agent, count })),
    mainConcerns: Object.entries(concerns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([concern, count]) => ({ concern, count })),
    overallSentiment: Object.entries(sentiments)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral',
    previousSummary: existingSummary
  }

  return summary
}