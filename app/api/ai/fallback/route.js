import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

/**
 * AI Fallback Endpoint
 * Provides alternative AI responses when primary services are unavailable
 */
export async function POST(request) {
  try {
    const { message, sessionId, agentId, context } = await request.json()
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const response = await generateFallbackResponse(message, agentId, context)
    
    return NextResponse.json({
      content: response.content,
      agent: response.agent,
      fromFallback: true,
      responseTime: response.responseTime,
      suggestions: response.suggestions,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('Fallback endpoint error:', error)
    
    return NextResponse.json({
      content: "I'm experiencing technical difficulties and cannot provide a detailed response right now. Please try again in a few minutes or check your dashboard directly for the information you need.",
      agent: 'fallback',
      fromFallback: true,
      error: true,
      timestamp: Date.now()
    }, { status: 200 }) // Return 200 to avoid cascading failures
  }
}

/**
 * Generate intelligent fallback response based on message analysis
 */
async function generateFallbackResponse(message, agentId, context) {
  const startTime = Date.now()
  const lowerMessage = message.toLowerCase()
  
  const intent = analyzeMessageIntent(lowerMessage)
  
  let response = {
    content: '',
    agent: agentId || 'fallback',
    suggestions: [],
    responseTime: 0
  }
  
  switch (intent.category) {
    case 'booking':
      response = await generateBookingFallback(message, intent, context)
      break
      
    case 'revenue':
      response = await generateRevenueFallback(message, intent, context)
      break
      
    case 'marketing':
      response = await generateMarketingFallback(message, intent, context)
      break
      
    case 'operations':
      response = await generateOperationsFallback(message, intent, context)
      break
      
    case 'analytics':
      response = await generateAnalyticsFallback(message, intent, context)
      break
      
    case 'help':
      response = await generateHelpFallback(message, intent, context)
      break
      
    default:
      response = await generateGeneralFallback(message, intent, context)
  }
  
  response.responseTime = Date.now() - startTime
  
  if (response.suggestions.length === 0) {
    response.suggestions = [
      "Check your main dashboard for current metrics",
      "Try your question again in a few minutes",
      "Contact support if you need immediate assistance"
    ]
  }
  
  return response
}

/**
 * Analyze message intent and extract key information
 */
function analyzeMessageIntent(message) {
  const intent = {
    category: 'general',
    entities: [],
    urgency: 'normal',
    specificity: 'general'
  }
  
  if (message.match(/\b(book|appointment|schedule|calendar|availability|reserve)\b/i)) {
    intent.category = 'booking'
    if (message.match(/\b(today|tomorrow|urgent|asap|now)\b/i)) {
      intent.urgency = 'high'
    }
  }
  
  else if (message.match(/\b(revenue|money|profit|income|sales|financial|earnings|cost)\b/i)) {
    intent.category = 'revenue'
    if (message.match(/\b(report|analysis|breakdown|detailed)\b/i)) {
      intent.specificity = 'detailed'
    }
  }
  
  else if (message.match(/\b(marketing|campaign|promotion|customer|client|advertising|social media)\b/i)) {
    intent.category = 'marketing'
  }
  
  else if (message.match(/\b(operation|staff|employee|workflow|efficiency|management|team)\b/i)) {
    intent.category = 'operations'
  }
  
  else if (message.match(/\b(analytics|metrics|data|statistics|performance|insights|trends)\b/i)) {
    intent.category = 'analytics'
  }
  
  else if (message.match(/\b(help|how|what|explain|tutorial|guide)\b/i)) {
    intent.category = 'help'
  }
  
  return intent
}

/**
 * Generate booking-related fallback responses
 */
async function generateBookingFallback(message, intent, context) {
  const responses = [
    "I understand you're asking about bookings. While my advanced booking AI is temporarily offline, you can:",
    "Booking assistance is currently limited, but here's what you can do:"
  ]
  
  const suggestions = [
    "Check your calendar directly for current appointments",
    "Use the manual booking form in the dashboard",
    "View availability in the calendar section",
    "Contact clients directly for urgent scheduling needs"
  ]
  
  if (intent.urgency === 'high') {
    suggestions.unshift("For urgent bookings, call or text your clients directly")
  }
  
  const baseResponse = responses[0]
  
  return {
    content: `${baseResponse}\n\n• ${suggestions.slice(0, 3).join('\n• ')}\n\nMy full booking intelligence should return shortly. In the meantime, these manual options will help you manage appointments.`,
    agent: 'booking_fallback',
    suggestions: suggestions
  }
}

/**
 * Generate revenue-related fallback responses
 */
async function generateRevenueFallback(message, intent, context) {
  const suggestions = [
    "Check the Analytics dashboard for current revenue data",
    "Export financial reports from the Reports section", 
    "Review payment history in the Transactions tab",
    "Compare monthly performance in the Revenue Overview"
  ]
  
  let response = "I'd love to provide detailed revenue analysis, but my financial AI is currently reconnecting. "
  
  if (intent.specificity === 'detailed') {
    response += "For the detailed breakdown you're looking for, the Analytics section has comprehensive reports that don't require AI processing."
  } else {
    response += "You can still access your basic revenue data through the dashboard."
  }
  
  return {
    content: `${response}\n\nHere's what you can access right now:\n\n• ${suggestions.slice(0, 3).join('\n• ')}\n\nOnce my full AI capabilities return, I'll be able to provide deeper insights and trend analysis.`,
    agent: 'finance_fallback',
    suggestions: suggestions
  }
}

/**
 * Generate marketing-related fallback responses
 */
async function generateMarketingFallback(message, intent, context) {
  const suggestions = [
    "Review campaign performance in the Marketing dashboard",
    "Check customer acquisition metrics in Analytics",
    "Update social media posts manually",
    "Review client feedback and reviews",
    "Export customer data for external analysis"
  ]
  
  return {
    content: `Marketing strategy support is temporarily limited while my AI reconnects. However, you can still access your marketing data and manage campaigns manually.\n\nAvailable right now:\n\n• ${suggestions.slice(0, 4).join('\n• ')}\n\nMy marketing AI will be back soon with personalized campaign suggestions and performance insights!`,
    agent: 'marketing_fallback', 
    suggestions: suggestions
  }
}

/**
 * Generate operations-related fallback responses
 */
async function generateOperationsFallback(message, intent, context) {
  const suggestions = [
    "Check staff schedules in the Operations dashboard",
    "Review workflow efficiency metrics",
    "Update team assignments manually",
    "Check inventory and supply levels",
    "Review operational costs and expenses"
  ]
  
  return {
    content: `Operations intelligence is currently running in basic mode. While I wait for full AI connectivity, you can manage operations through the dashboard.\n\nWhat you can do now:\n\n• ${suggestions.slice(0, 4).join('\n• ')}\n\nFull operations AI will return shortly with automated insights and optimization recommendations.`,
    agent: 'operations_fallback',
    suggestions: suggestions
  }
}

/**
 * Generate analytics-related fallback responses  
 */
async function generateAnalyticsFallback(message, intent, context) {
  const suggestions = [
    "View basic metrics in the Analytics dashboard",
    "Export raw data for external analysis",
    "Check historical trends in the Charts section",
    "Review performance summaries",
    "Compare periods using date filters"
  ]
  
  return {
    content: `Analytics and data insights are temporarily simplified while my AI reconnects. Your data is still accessible, just without the advanced AI analysis.\n\nCurrent options:\n\n• ${suggestions.slice(0, 4).join('\n• ')}\n\nOnce my full analytics AI returns, I'll provide automated insights, trend predictions, and actionable recommendations.`,
    agent: 'analytics_fallback',
    suggestions: suggestions
  }
}

/**
 * Generate help-related fallback responses
 */
async function generateHelpFallback(message, intent, context) {
  const suggestions = [
    "Browse the Help section in the main menu",
    "Check the Getting Started guide",
    "Review feature documentation",
    "Try the search function to find specific topics",
    "Contact support for immediate assistance"
  ]
  
  return {
    content: `I'd love to provide detailed help, but my knowledge base AI is temporarily offline. Don't worry - there are still several ways to get the information you need!\n\nTry these options:\n\n• ${suggestions.join('\n• ')}\n\nMy full help capabilities will return soon with personalized tutorials and step-by-step guidance!`,
    agent: 'help_fallback',
    suggestions: suggestions
  }
}

/**
 * Generate general fallback responses
 */
async function generateGeneralFallback(message, intent, context) {
  const generalResponses = [
    "I'm currently running in simplified mode while my advanced AI services reconnect. I can still help with basic questions!",
    "My AI capabilities are temporarily limited, but I'm still here to assist you with what I can.",
    "I'm experiencing some connectivity issues with my full AI services, but I can still provide basic help and guidance.",
    "While my advanced AI is reconnecting, I can help direct you to the right sections of your dashboard or provide basic assistance."
  ]
  
  const suggestions = [
    "Explore the main dashboard for current metrics",
    "Check specific sections like Calendar, Analytics, or Reports",
    "Try asking a more specific question",
    "Wait a few minutes and try again for full AI capabilities"
  ]
  
  const response = generalResponses[0]
  
  return {
    content: `${response}\n\nHere's what you can do:\n\n• ${suggestions.join('\n• ')}\n\nI should be back to full capability shortly!`,
    agent: 'general_fallback',
    suggestions: suggestions
  }
}

/**
 * Health check for fallback service
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'ai-fallback',
    timestamp: Date.now(),
    capabilities: [
      'booking_fallback',
      'revenue_fallback', 
      'marketing_fallback',
      'operations_fallback',
      'analytics_fallback',
      'help_fallback',
      'general_fallback'
    ]
  })
}