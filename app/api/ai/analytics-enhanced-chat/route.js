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

    // Try to call the Python AI orchestrator service
    let aiResponse;
    
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${pythonServiceUrl}/ai/enhanced-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          session_id: session_id || generateSessionId(),
          business_context: {
            ...business_context,
            barbershop_id: barbershop_id
          }
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
      
      // Enhanced fallback with analytics awareness
      aiResponse = await getEnhancedFallbackResponse(message, business_context, barbershop_id);
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
 * Enhanced fallback response that attempts to include analytics data
 */
async function getEnhancedFallbackResponse(message, businessContext, barbershopId) {
  const messageType = classifyMessage(message);
  let analyticsData = null;
  let analyticsEnhanced = false;

  // Try to get analytics data for business-related questions
  if (needsAnalyticsData(message)) {
    try {
      const analyticsUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/analytics/live-data?format=formatted`;
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

  // Generate intelligent response based on message type and analytics data
  let response = generateFallbackResponse(messageType, message, analyticsData);
  
  return {
    response,
    provider: 'enhanced_fallback',
    confidence: analyticsEnhanced ? 0.8 : 0.6,
    message_type: messageType,
    analytics_enhanced: analyticsEnhanced,
    knowledge_enhanced: false,
    agent_enhanced: false,
    contextual_insights: analyticsData ? { has_live_data: true } : null,
    fallback: true,
  };
}

/**
 * Classify message type for better responses
 */
function classifyMessage(message) {
  const messageLower = message.toLowerCase();
  
  if (/revenue|profit|money|sales|income|financial|earnings/.test(messageLower)) {
    return 'financial';
  }
  if (/booking|appointment|schedule|calendar|time/.test(messageLower)) {
    return 'scheduling';
  }
  if (/customer|client|retention|satisfaction/.test(messageLower)) {
    return 'customer_service';
  }
  if (/marketing|promotion|social|advertising|brand/.test(messageLower)) {
    return 'marketing';
  }
  if (/analytics|metrics|performance|stats|data/.test(messageLower)) {
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
 * Generate contextual fallback response
 */
function generateFallbackResponse(messageType, message, analyticsData) {
  const responses = {
    financial: analyticsData 
      ? `Based on your current business metrics:\n\n${analyticsData}\n\nI can see specific areas where we can optimize your financial performance. What particular aspect would you like to focus on?`
      : "For financial optimization, I recommend focusing on pricing strategies, cost management, and revenue diversification. What specific financial challenge are you facing?",
    
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
  
  return responses[messageType] || responses.general;
}

/**
 * Generate session ID if not provided
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}