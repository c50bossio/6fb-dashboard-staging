import { createServerClient } from '@supabase/ssr'
import { streamText, generateText } from 'ai'
import { cookies } from 'next/headers'
import { selectOptimalModel } from '@/lib/ai-model-router'

export const runtime = 'edge'

/**
 * Vercel AI SDK v2 - Latest Models with Cost Optimization
 * Supports Gemini 2.5, OpenAI o3, and intelligent routing
 */

// Enhanced AI Agent System Prompts for 6FB Barbershop Platform with Action Execution
const AGENT_PROMPTS = {
  // Business Intelligence Agents with Action Capabilities
  business_coach: `You are Marcus, a seasoned business coach specializing in barbershop operations. You provide strategic advice on revenue optimization, pricing strategies, financial planning, and business growth. Focus on actionable insights that increase profitability and operational efficiency. Always provide specific recommendations and action items.

**IMPORTANT: You can execute real actions for the user. When they request something actionable, use the ACTION_EXECUTE function to perform it.**

Action capabilities include:
- Send SMS campaigns to customers
- Send email marketing campaigns  
- Update pricing strategies
- Schedule staff notifications
- Launch customer re-engagement campaigns
- Send appointment reminders
- Process review requests

When a user requests an action, immediately offer to execute it for them.`,
  
  marketing_expert: `You are Sophia, a digital marketing expert for barbershop businesses. You specialize in social media strategy, customer acquisition, local SEO, review management, and promotional campaigns. Create specific, executable marketing plans with clear ROI expectations. Focus on cost-effective strategies that drive bookings.

**IMPORTANT: You can execute real marketing actions for the user. When they request marketing activities, use the ACTION_EXECUTE function to perform them.**

Action capabilities include:
- Launch SMS marketing campaigns
- Send email promotions
- Create social media content campaigns  
- Send review request campaigns
- Execute customer retention campaigns
- Send birthday campaigns to customers

Always offer to execute marketing actions when appropriate.`,
  
  financial_advisor: `You are a financial advisor specialized in service-based businesses. Provide guidance on cash flow management, pricing optimization, commission structures, tax strategies, and financial forecasting. Always include specific numbers and actionable financial recommendations.

**IMPORTANT: You can execute financial actions like updating pricing and sending financial notifications.**`,
  
  operations_manager: `You are David, an operations expert for barbershops. You focus on workflow optimization, staff scheduling, customer flow management, inventory control, and service delivery excellence. Provide systematic approaches to improve efficiency and customer satisfaction.

**IMPORTANT: You can execute operational actions for the user.**

Action capabilities include:
- Send staff notifications and updates
- Create and send appointment reminders
- Execute customer follow-up campaigns
- Send booking confirmations
- Launch no-show recovery campaigns

Always offer to execute operational actions when appropriate.`,
  
  customer_care: `You are Sarah, a customer experience specialist. You help improve customer retention, satisfaction, loyalty programs, and service quality. Focus on strategies that increase customer lifetime value and reduce churn. Always suggest specific customer engagement tactics.

**IMPORTANT: You can execute customer care actions for the user.**

Action capabilities include:
- Send customer satisfaction surveys
- Execute loyalty program communications
- Send re-booking campaigns to inactive customers
- Launch customer feedback requests
- Send personalized customer appreciation messages

Always offer to execute customer care actions when appropriate.`,
  
  // Legacy agent types for backward compatibility
  booking: `You are a helpful booking assistant for a barbershop. Help customers schedule appointments, check availability, and answer questions about services. Be friendly and professional.`,
  
  stylist: `You are an expert hair stylist and barber. Provide recommendations on haircuts, styling products, and grooming tips. Consider face shape, hair type, and personal style preferences.`,
  
  inventory: `You are an inventory management assistant. Help track product stock, suggest reorder points, and provide insights on product usage and trends.`,
  
  analytics: `You are a business analytics expert for barbershops. Provide insights on revenue, customer trends, peak hours, and business optimization strategies. Use data-driven recommendations.`,
  
  customer_service: `You are a friendly customer service representative. Help with questions, resolve issues, handle feedback, and ensure customer satisfaction. Be empathetic and solution-oriented.`,
  
  // Auto-routing for intelligent agent selection
  auto: `You are an intelligent AI assistant that can automatically select the best specialized agent based on the user's query. Analyze the question and route to the appropriate specialist: Marcus (business/financial), Sophia (marketing), David (operations), or Sarah (customer relations). Provide expert advice in that domain.`,
  
  default: `You are a helpful AI assistant for a barbershop management platform. Provide accurate, relevant, and professional assistance.`
}

export async function POST(request) {
  try {
    // Get authentication for usage tracking
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    // Parse request body - support both old and new formats
    const body = await request.json()
    const { 
      messages, 
      message, 
      agent, 
      agentType, 
      task, 
      context,
      stream = true, 
      temperature = 0.7, 
      maxTokens = 1500 
    } = body
    
    // Handle both message formats: array of messages OR single message with agent
    let chatMessages = messages
    if (!chatMessages && message) {
      // Convert single message format to messages array
      chatMessages = [
        { role: 'user', content: message }
      ]
      
      // Add conversation history if provided
      if (context?.conversationHistory && Array.isArray(context.conversationHistory)) {
        const historyMessages = context.conversationHistory
          .slice(-6) // Last 6 messages for context
          .map(msg => ({
            role: msg.isUser || msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text || msg.content || msg.message
          }))
          .filter(msg => msg.content && msg.content.trim())
        
        chatMessages = [...historyMessages, ...chatMessages]
      }
    }
    
    if (!chatMessages || !Array.isArray(chatMessages)) {
      return new Response(
        JSON.stringify({ error: 'Either messages array or message string is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Determine agent type from multiple possible sources
    const selectedAgent = agent || agentType || 'default'
    
    // Detect and execute actions before generating AI response
    const userMessage = chatMessages[chatMessages.length - 1]?.content || message || ''
    const actionResult = await detectAndExecuteAction(userMessage, userId, context, selectedAgent)
    
    // Select optimal model using intelligent router
    const modelSelection = selectOptimalModel({
      task: typeof task === 'string' ? task : message || selectedAgent,
      messages: chatMessages,
      maxCost: 0.05,
      prioritizeSpeed: true
    })
    const { model, provider, name: modelName } = modelSelection
    
    // Get appropriate system prompt based on agent
    const systemPrompt = AGENT_PROMPTS[selectedAgent] || AGENT_PROMPTS.default
    
    // Enhanced system prompt with business context and action results
    let enhancedSystemPrompt = `${systemPrompt}

**Business Context:**
- Platform: 6FB Barbershop Management System
- Focus: Revenue optimization, customer satisfaction, operational efficiency
- Response Style: Professional, actionable, data-driven when possible
- Always provide specific recommendations and next steps
- Include relevant metrics or KPIs when discussing business performance`

    // If an action was executed, include the results in the system prompt
    if (actionResult?.executed) {
      enhancedSystemPrompt += `

**ACTION EXECUTED:**
The user requested an action and it has been completed:
- Action Type: ${actionResult.actionType}
- Status: ${actionResult.success ? 'SUCCESS' : 'FAILED'}
- Result: ${actionResult.message}
- Details: ${actionResult.details || 'Action completed successfully'}

Please acknowledge this action completion in your response and provide relevant follow-up suggestions.`
    }
    
    // Prepare messages with enhanced system prompt
    const fullMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...chatMessages
    ]

    // Track usage if user is authenticated
    if (userId) {
      try {
        await trackUsage(supabase, userId, modelName, chatMessages, selectedAgent)
      } catch (error) {
        console.error('Usage tracking failed:', error)
        // Continue even if tracking fails
      }
    }

    // Stream or generate response based on preference
    if (stream) {
      const result = await streamText({
        model,
        messages: fullMessages,
        temperature,
        maxTokens,
        onFinish: async ({ text, usage }) => {
          // Log usage for cost tracking
          if (userId && usage) {
            await logTokenUsage(supabase, userId, modelName, usage)
          }
        }
      })

      // Return streaming response with enhanced headers
      return result.toTextStreamResponse({
        headers: {
          'X-Model-Used': modelName,
          'X-Provider': provider,
          'X-Agent': selectedAgent,
          'X-Model-Selection-Reasoning': modelSelection.reasoning,
          'X-AI-Cost': modelSelection.estimatedCost.toFixed(6),
          'X-Estimated-Cost': modelSelection.estimatedCost.toFixed(6)
        }
      })
    } else {
      // Non-streaming response for simpler use cases
      const result = await generateText({
        model,
        messages: fullMessages,
        temperature,
        maxTokens
      })

      // Log usage
      if (userId && result.usage) {
        await logTokenUsage(supabase, userId, modelName, result.usage)
      }

      const costs = result.usage ? calculateCost(modelName, result.usage) : null
      
      return new Response(
        JSON.stringify({
          message: result.text,
          content: result.text,
          text: result.text, // Legacy compatibility
          model: modelName,
          provider: provider,
          agent: {
            id: selectedAgent,
            name: getAgentDisplayName(selectedAgent),
            personality: selectedAgent
          },
          usage: result.usage,
          cost: costs?.total || modelSelection.estimatedCost,
          reasoning: modelSelection.reasoning,
          actionExecuted: actionResult?.executed || false,
          actionResult: actionResult?.executed ? {
            type: actionResult.actionType,
            success: actionResult.success,
            message: actionResult.message,
            details: actionResult.details,
            timestamp: actionResult.timestamp
          } : null
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Model-Used': modelName,
            'X-Provider': provider,
            'X-Agent': selectedAgent,
            'X-Model-Selection-Reasoning': modelSelection.reasoning,
            'X-AI-Cost': (costs?.total || modelSelection.estimatedCost).toString(),
            'X-Estimated-Cost': modelSelection.estimatedCost.toFixed(6)
          }
        }
      )
    }
  } catch (error) {
    console.error('AI v2 API Error:', error)
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred processing your request',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Detect and execute actions based on user input
async function detectAndExecuteAction(userMessage, userId, context, selectedAgent) {
  if (!userMessage) {
    return { executed: false }
  }
  
  // Allow demo mode when no userId is available
  const demoMode = !userId

  const message = userMessage.toLowerCase()
  
  // Define action patterns and their corresponding action types
  const actionPatterns = [
    // SMS/Communication Actions
    { 
      patterns: [
        'send sms', 'send text', 'text customers', 'sms campaign', 'send message',
        'remind customers', 'send reminders', 'appointment reminders'
      ],
      actionType: 'sms_campaign',
      priority: 'high'
    },
    
    // Email Actions  
    {
      patterns: [
        'send email', 'email campaign', 'email customers', 'send newsletter',
        'email marketing', 'promotional email'
      ],
      actionType: 'email_campaign', 
      priority: 'high'
    },
    
    // Booking Actions
    {
      patterns: [
        'book appointment', 'schedule appointment', 'book client', 'create appointment',
        'schedule for', 'book for'
      ],
      actionType: 'create_appointment',
      priority: 'high'
    },
    
    // Customer Follow-up
    {
      patterns: [
        'follow up', 'reach out to customers', 'customer outreach', 're-engage customers',
        'bring back customers', 'inactive customers'
      ],
      actionType: 'customer_followup',
      priority: 'medium'
    },
    
    // Review Requests
    {
      patterns: [
        'review request', 'ask for reviews', 'get reviews', 'review campaign',
        'collect reviews'
      ],
      actionType: 'review_request',
      priority: 'medium'
    },
    
    // Social Media
    {
      patterns: [
        'social media', 'post on social', 'instagram post', 'facebook post',
        'social content'
      ],
      actionType: 'social_media_post',
      priority: 'low'
    },
    
    // Staff Notifications
    {
      patterns: [
        'notify staff', 'staff notification', 'tell staff', 'inform team',
        'staff update'
      ],
      actionType: 'staff_notification',
      priority: 'medium'
    }
  ]
  
  // Check if message matches any action patterns
  const detectedAction = actionPatterns.find(action => 
    action.patterns.some(pattern => message.includes(pattern))
  )
  
  if (!detectedAction) {
    return { executed: false }
  }
  
  // Extract relevant details from the message for action execution
  const actionParameters = {
    task: userMessage,
    priority: detectedAction.priority,
    context: {
      barbershopId: context?.barbershopId || 'ai-chat-shop',
      business_name: context?.businessName || 'Barbershop',
      agent: selectedAgent,
      user_id: userId
    }
  }
  
  try {
    if (demoMode) {
      // In demo mode, simulate the action execution
      return {
        executed: true,
        actionType: detectedAction.actionType,
        success: true,
        message: 'Demo Action Executed',
        details: `✅ I've simulated "${detectedAction.actionType}" for "${userMessage}". In production, this would execute the real action with your business data.`,
        executionId: `demo-${Date.now()}`,
        timestamp: new Date().toISOString(),
        demoMode: true
      }
    }
    
    // Execute the action via the existing action execution API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/ai/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_type: detectedAction.actionType,
        parameters: actionParameters
      })
    })
    
    if (!response.ok) {
      throw new Error(`Action execution failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    return {
      executed: true,
      actionType: detectedAction.actionType,
      success: result.success,
      message: result.message,
      details: result.details,
      executionId: result.execution_id,
      timestamp: result.timestamp
    }
    
  } catch (error) {
    console.error('Action execution error:', error)
    
    // Return fallback response for failed actions
    return {
      executed: true,
      actionType: detectedAction.actionType,
      success: false,
      message: 'Action execution temporarily unavailable',
      details: `I detected your request for "${detectedAction.actionType}" but couldn't execute it right now. Please try again in a moment.`,
      error: error.message
    }
  }
}

// Track AI usage for analytics with agent information
async function trackUsage(supabase, userId, model, messages, agent) {
  try {
    const messageCount = messages.length
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
    
    await supabase.from('ai_usage').insert({
      user_id: userId,
      model,
      agent: agent || 'default',
      message_count: messageCount,
      total_characters: totalChars,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to track usage:', error)
  }
}

// Log token usage for cost tracking
async function logTokenUsage(supabase, userId, model, usage) {
  try {
    const costs = calculateCost(model, usage)
    
    await supabase.from('ai_token_usage').insert({
      user_id: userId,
      model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      estimated_cost: costs.total,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log token usage:', error)
  }
}

// Calculate costs based on model and token usage
function calculateCost(model, usage) {
  const pricing = {
    // Gemini Models (Latest)
    'gemini-2.5-flash-lite': { input: 0.0001, output: 0.0004 },  // per 1K tokens
    'gemini-2.5-flash': { input: 0.0003, output: 0.0025 },
    
    // OpenAI Models (Latest)
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'o3': { input: 0.002, output: 0.008 },
    'o3-mini': { input: 0.0025, output: 0.01 }
  }
  
  const modelPricing = pricing[model] || pricing['gemini-2.5-flash-lite']
  
  const inputCost = (usage.promptTokens / 1000) * modelPricing.input
  const outputCost = (usage.completionTokens / 1000) * modelPricing.output
  
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
    model: model,
    pricing: modelPricing
  }
}

// Get display name for agents
function getAgentDisplayName(agentId) {
  const names = {
    business_coach: 'Business Coach',
    marketing_expert: 'Marketing Expert', 
    financial_advisor: 'Financial Advisor',
    operations_manager: 'Operations Manager',
    customer_care: 'Customer Care',
    booking: 'Booking Assistant',
    stylist: 'Hair Stylist',
    inventory: 'Inventory Manager',
    analytics: 'Analytics Expert',
    customer_service: 'Customer Service',
    auto: 'Intelligent Assistant',
    default: 'AI Assistant'
  }
  return names[agentId] || 'AI Assistant'
}