/**
 * Analytics-Enhanced AI Chat API Endpoint
 * Provides AI responses with real business data integration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, session_id, business_context, barbershop_id } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message is required',
      }, { status: 400 });
    }

    const sessionId = session_id || generateSessionId()
    
    // Get conversation context from memory
    let conversationContext = null
    try {
      const memoryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/ai/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_context',
          sessionId,
          data: { contextType: 'recent', limit: 5 }
        })
      })
      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json()
        if (memoryData.success) {
          conversationContext = memoryData.context
        }
      }
    } catch (memoryError) {
      console.warn('Memory retrieval failed:', memoryError.message)
    }

    // Try to call the Python AI orchestrator service
    let aiResponse;
    
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://backend:8000';
      const response = await fetch(`${pythonServiceUrl}/ai/enhanced-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          session_id: sessionId,
          business_context: {
            ...business_context,
            barbershop_id: barbershop_id
          },
          conversation_context: conversationContext
        }),
        timeout: 30000, // 30 second timeout for AI responses
      });
      
      if (response.ok) {
        aiResponse = await response.json();
      } else {
        throw new Error(`Python AI service responded with ${response.status}`);
      }
      
    } catch (pythonError) {
      console.warn('Python AI service unavailable, using enhanced fallback:', pythonError.message);
      
      // Enhanced fallback with analytics awareness and conversation context
      aiResponse = await getEnhancedFallbackResponse(message, business_context, barbershop_id, conversationContext);
    }

    // Ensure response includes analytics enhancement status
    const responseData = {
      success: true,
      message: aiResponse.response || aiResponse.message || "I'd be happy to help with your business questions.",
      provider: aiResponse.provider || 'fallback',
      confidence: aiResponse.confidence || 0.7,
      session_id: aiResponse.session_id || session_id,
      message_type: aiResponse.message_type || 'general',
      
      // Enhancement metadata
      analytics_enhanced: aiResponse.analytics_enhanced || false,
      knowledge_enhanced: aiResponse.knowledge_enhanced || false,
      agent_enhanced: aiResponse.agent_enhanced || false,
      
      // Additional context
      contextual_insights: aiResponse.contextual_insights || null,
      agent_details: aiResponse.agent_details || null,
      
      timestamp: new Date().toISOString(),
    };

    // Store conversation in memory
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/ai/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store_message',
          sessionId,
          data: {
            message: message.trim(),
            response: responseData.message,
            messageType: responseData.message_type,
            agent: responseData.agent_details?.primary_agent || 'AI Assistant',
            businessContext: business_context
          }
        })
      })
    } catch (memoryError) {
      console.warn('Failed to store conversation in memory:', memoryError.message)
    }

    // Log analytics enhancement for monitoring
    if (responseData.analytics_enhanced) {
      console.log('✅ AI response enhanced with real analytics data');
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Analytics-enhanced chat error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process AI chat request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Enhanced fallback response that attempts to include analytics data and conversation context
 */
async function getEnhancedFallbackResponse(message, businessContext, barbershopId, conversationContext) {
  const messageType = classifyMessage(message);
  let analyticsData = null;
  let analyticsEnhanced = false;

  // Enhanced context analysis for follow-up questions and conversation continuity
  const contextAnalysis = analyzeConversationContext(message, conversationContext);
  
  // Try to get analytics data for business-related questions
  if (needsAnalyticsData(message) || contextAnalysis.needsAnalytics) {
    try {
      let analyticsUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/analytics/live-data?format=formatted`;
      if (barbershopId) {
        analyticsUrl += `&barbershop_id=${barbershopId}`;
      }
      
      const response = await fetch(analyticsUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.formatted_metrics) {
          analyticsData = data.data.formatted_metrics;
          analyticsEnhanced = true;
        }
      }
    } catch (error) {
      console.warn('Could not fetch analytics data for fallback:', error.message);
    }
  }

  // Generate intelligent response with enhanced context awareness
  const response = generateContextAwareResponse(messageType, message, analyticsData, conversationContext, contextAnalysis);
  
  return {
    response,
    provider: 'enhanced_fallback',
    confidence: contextAnalysis.isFollowUp ? 0.9 : (analyticsEnhanced ? 0.8 : 0.6),
    message_type: contextAnalysis.actualType || messageType,
    analytics_enhanced: analyticsEnhanced,
    knowledge_enhanced: false,
    agent_enhanced: conversationContext?.messages?.length > 0,
    contextual_insights: {
      has_live_data: analyticsData ? true : false,
      has_conversation_history: conversationContext?.messages?.length > 0,
      is_follow_up: contextAnalysis.isFollowUp,
      context_topic: contextAnalysis.referencedTopic,
      conversation_depth: conversationContext?.messages?.length || 0
    },
    fallback: true,
  };
}

/**
 * Classify message type for better responses
 */
function classifyMessage(message) {
  const messageLower = message.toLowerCase();
  
  if (/revenue|profit|money|sales|income|financial|earnings|pricing|price|cost|charge/.test(messageLower)) {
    return 'financial';
  }
  if (/booking|appointment|schedule|calendar|time|staff|efficiency/.test(messageLower)) {
    return 'scheduling';
  }
  if (/customer|client|retention|satisfaction|service/.test(messageLower)) {
    return 'customer_service';
  }
  if (/marketing|promotion|social|advertising|brand|premium/.test(messageLower)) {
    return 'marketing';
  }
  if (/analytics|metrics|performance|stats|data|analysis/.test(messageLower)) {
    return 'business_analysis';
  }
  
  return 'general';
}

/**
 * Check if message needs analytics data
 */
function needsAnalyticsData(message) {
  const analyticsKeywords = [
    'revenue', 'sales', 'income', 'profit', 'money', 'earnings', 'financial',
    'bookings', 'appointments', 'customers', 'clients', 'retention',
    'growth', 'performance', 'metrics', 'stats', 'analytics', 'data',
    'how much', 'how many', 'what is our', 'show me the', 'current',
    'last month', 'this month', 'today', 'this week', 'numbers'
  ];
  
  const messageLower = message.toLowerCase();
  return analyticsKeywords.some(keyword => messageLower.includes(keyword));
}

/**
 * Analyze conversation context for follow-up questions and continuity
 */
function analyzeConversationContext(message, conversationContext) {
  const messageLower = message.toLowerCase();
  
  // Check for follow-up indicators
  const followUpIndicators = [
    'that', 'this', 'it', 'those', 'these', 'them', 'they',
    'aggressive', 'too much', 'too high', 'expensive', 'cheap',
    'what about', 'how about', 'also', 'and', 'but',
    'seems', 'sounds', 'looks', 'feels', 'appears',
    'doesnt', "doesn't", 'cant', "can't", 'wont', "won't"
  ];
  
  const isFollowUp = followUpIndicators.some(indicator => 
    messageLower.includes(indicator)
  ) || message.length < 50; // Short messages are often follow-ups
  
  let referencedTopic = null;
  let actualType = null;
  let needsAnalytics = false;
  
  if (isFollowUp && conversationContext?.messages?.length > 0) {
    // Get the last few messages to understand context
    const recentMessages = conversationContext.messages.slice(-3);
    
    // Look for the topic being referenced
    for (let msg of recentMessages.reverse()) {
      if (msg.messageType && msg.messageType !== 'general') {
        referencedTopic = msg.messageType;
        actualType = msg.messageType;
        break;
      }
    }
    
    // Check if the follow-up expresses concern about aggressiveness/pricing
    if (/aggressive|too much|too high|expensive|steep|crazy|extreme|harsh/.test(messageLower)) {
      actualType = 'pricing_concern';
      referencedTopic = 'financial';
      needsAnalytics = true;
    }
    
    // Check for other concern patterns
    if (/difficult|hard|complex|complicated|overwhelm/.test(messageLower)) {
      actualType = 'implementation_concern';
      needsAnalytics = true;
    }
  }
  
  return {
    isFollowUp,
    referencedTopic,
    actualType,
    needsAnalytics,
    conversationDepth: conversationContext?.messages?.length || 0
  };
}

/**
 * Generate contextual fallback response with enhanced conversation awareness
 */
function generateContextAwareResponse(messageType, message, analyticsData, conversationContext, contextAnalysis) {
  const messageLower = message.toLowerCase();
  
  // Handle follow-up questions with specific context
  if (contextAnalysis.isFollowUp && contextAnalysis.actualType) {
    return generateFollowUpResponse(contextAnalysis.actualType, message, analyticsData, conversationContext);
  }
  
  // Add conversation context if available
  let contextPrefix = ""
  if (conversationContext && conversationContext.messages && conversationContext.messages.length > 0) {
    const lastMessage = conversationContext.messages[conversationContext.messages.length - 1]
    if (lastMessage && lastMessage.messageType !== 'general') {
      contextPrefix = `Building on our ${lastMessage.messageType} discussion... `
    }
  }
  
  const responses = {
    financial: analyticsData 
      ? `Based on your current business metrics:\n\n${analyticsData}\n\n**PRICING STRATEGY RECOMMENDATIONS:**\n\n💰 **Premium Service Pricing:**\n• Position premium services 40-60% above standard cuts\n• Current average: $68.5 - Consider premium tiers at $95-120\n• Bundle premium cuts with additional services (hot towel, beard trim, styling)\n\n🎯 **Value-Based Pricing:**\n• Highlight expertise and experience in premium pricing\n• Create service tiers: Classic ($50-65), Premium ($75-95), VIP ($100-140)\n• Add exclusive amenities for higher tiers\n\n📈 **Revenue Optimization:**\n• Implement dynamic pricing for peak hours (Friday/Saturday +15%)\n• Package deals encourage higher spending\n• Member pricing creates loyalty and predictable revenue\n\nWhat specific pricing challenge would you like to address?`
      : "For premium service pricing, I recommend:\n\n**PRICING STRATEGY FRAMEWORK:**\n\n💰 **Tiered Service Menu:**\n• Classic Cut: Base price\n• Premium Cut: +40-50% (includes consultation, premium products)\n• VIP Experience: +80-100% (includes all premium services + exclusive amenities)\n\n🎯 **Value Justification:**\n• Highlight your expertise and years of experience\n• Use premium products and tools\n• Provide exceptional service experience\n• Create exclusive atmosphere for premium clients\n\n📈 **Implementation Tips:**\n• Start with 20% price increase, monitor customer response\n• Bundle services to increase perceived value\n• Offer member/loyalty discounts to retain customers\n• Use peak-hour pricing for busy times\n\nWhat specific pricing challenge are you facing?",
    
    scheduling: analyticsData
      ? `Looking at your booking patterns:\n\n${analyticsData}\n\nI can help you optimize your scheduling system. What scheduling challenge would you like to address?`
      : "For scheduling optimization, consider implementing online booking, analyzing peak hours, and setting up automated reminders to reduce no-shows.",
    
    customer_service: analyticsData
      ? `Here's what your customer data shows:\n\n${analyticsData}\n\nThere are several opportunities to improve customer satisfaction and retention. What area interests you most?`
      : "Focus on customer retention by implementing a loyalty program, collecting feedback after each service, and personalizing the experience based on customer preferences.",
    
    business_analysis: analyticsData
      ? `Here are your current business metrics:\n\n${analyticsData}\n\nWhat specific area would you like to analyze further or improve?`
      : "I can help analyze your business performance across multiple dimensions. What specific metrics or areas would you like to examine?",
    
    marketing: analyticsData
      ? `Based on your business performance:\n\n${analyticsData}\n\nI can suggest targeted marketing strategies to drive growth. What marketing goals do you have?`
      : "For marketing success, focus on social media engagement, local SEO, customer reviews, and referral programs. What marketing challenge can I help with?",
    
    general: analyticsData
      ? `Here's an overview of your business:\n\n${analyticsData}\n\nI'm here to help you optimize any aspect of your operations. What would you like to work on?`
      : "I'm your AI business coach, ready to help optimize your barbershop operations. What specific challenge or opportunity would you like to discuss?"
  };
  
  const baseResponse = responses[messageType] || responses.general;
  return contextPrefix + baseResponse;
}

/**
 * Generate specific responses for follow-up questions
 */
function generateFollowUpResponse(actualType, message, analyticsData, conversationContext) {
  const messageLower = message.toLowerCase();
  
  switch (actualType) {
    case 'pricing_concern':
      return `I understand your concern about the pricing being aggressive. You're absolutely right to be cautious! Let me suggest a gentler approach:\n\n🎯 **GRADUAL PRICING STRATEGY:**\n\n📈 **Phase 1 (Month 1-2): Test the Waters**\n• Increase premium services by just 10-15% initially\n• Introduce one new premium service tier\n• Monitor customer response carefully\n\n💡 **Phase 2 (Month 3-4): Value First**\n• Focus on enhancing service quality before further increases\n• Add small premium touches (hot towel, better products)\n• Gather customer feedback on perceived value\n\n🚀 **Phase 3 (Month 5+): Strategic Growth**\n• Gradually increase to target pricing based on customer acceptance\n• Only raise prices for new customers initially\n• Grandfather existing customers at current rates\n\n**KEY PRINCIPLE:** Always increase value before increasing price. What aspect of this gradual approach interests you most?`;
      
    case 'implementation_concern':
      return `I hear you - implementing new strategies can feel overwhelming! Let's break it down into simple, manageable steps:\n\n✅ **WEEK 1: Start Small**\n• Pick just ONE recommendation to try\n• Test with 2-3 customers only\n• Track what works and what doesn't\n\n⚡ **WEEK 2-3: Build Momentum**\n• Expand successful elements\n• Make small adjustments based on feedback\n• Don't try to change everything at once\n\n🎯 **MONTH 2+: Scale Gradually**\n• Only add new strategies once current ones are working smoothly\n• Always prioritize what feels natural to you and your business\n\nWhich single change feels most manageable to start with?`;
      
    default:
      // For other follow-ups, try to understand what they're referencing
      if (conversationContext?.messages?.length > 0) {
        const lastMessage = conversationContext.messages[conversationContext.messages.length - 1];
        return `I see you're asking about "${message}" in relation to our previous discussion. Could you help me understand what specific aspect you'd like me to clarify or expand on? I want to make sure I give you the most relevant advice.`;
      }
      return `I want to make sure I understand your question correctly. Could you provide a bit more context about what specifically you'd like to know or discuss?`;
  }
}

/**
 * Generate session ID if not provided
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}