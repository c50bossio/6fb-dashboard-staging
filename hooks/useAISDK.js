/**
 * Modern AI SDK React Hooks for 6FB AI Agent System
 * Uses Vercel AI SDK with intelligent model routing and cost optimization
 */

import { useCompletion } from '@ai-sdk/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { safeAIRequest } from '@/lib/fallback-systems'
import { trackAIUsage, trackError } from '@/lib/production-monitor'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

/**
 * Hook for AI chat functionality with modern streaming and cost optimization
 */
export function useAIChat(initialAgent = 'business_coach', options = {}) {
  const [messages, setMessages] = useState([])
  const [currentAgent, setCurrentAgent] = useState(initialAgent)
  const [agentMetadata, setAgentMetadata] = useState({})
  const [totalCost, setTotalCost] = useState(0)
  
  // Vercel AI SDK completion hook with our custom route
  const {
    completion,
    input,
    setInput,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading: isStreamingResponse,
    error: streamingError,
    stop,
    reload
  } = useCompletion({
    api: '/api/ai/v2',
    headers: {
      'Content-Type': 'application/json',
    },
    onResponse: (response) => {
      // Track response metadata
      const cost = response.headers.get('X-AI-Cost')
      const model = response.headers.get('X-AI-Model')
      const agent = response.headers.get('X-AI-Agent')
      const inputTokens = response.headers.get('X-AI-Input-Tokens')
      const outputTokens = response.headers.get('X-AI-Output-Tokens')
      const totalTokens = response.headers.get('X-AI-Total-Tokens')
      const provider = response.headers.get('X-AI-Provider')
      const responseTime = response.headers.get('X-AI-Response-Time')
      
      if (cost) setTotalCost(prev => prev + parseFloat(cost))
      if (model || agent) {
        setAgentMetadata(prev => ({
          ...prev,
          lastModel: model,
          lastAgent: agent,
          lastResponse: new Date().toISOString(),
          lastCost: cost ? parseFloat(cost) : 0
        }))
      }
      
      // Track AI usage for monitoring
      if (model && cost) {
        trackAIUsage({
          model,
          provider: provider || 'unknown',
          inputTokens: inputTokens ? parseInt(inputTokens) : 0,
          outputTokens: outputTokens ? parseInt(outputTokens) : 0,
          totalTokens: totalTokens ? parseInt(totalTokens) : 0,
          cost: parseFloat(cost),
          responseTime: responseTime ? parseInt(responseTime) : 0,
          success: true,
          agentType: agent || currentAgent,
          userId: null, // Will be set when user context is available
          sessionId: null // Could add session tracking
        }).catch(error => console.warn('AI usage tracking failed:', error))
      }
    },
    onFinish: (prompt, completion) => {
      // Add completed message to history
      const assistantMessage = {
        id: `msg_${Date.now()}_assistant`,
        type: 'assistant',
        agent: currentAgent,
        content: completion,
        timestamp: new Date().toISOString(),
        model: agentMetadata.lastModel,
        cost: agentMetadata.lastCost
      }
      
      setMessages(prev => [...prev, assistantMessage])
    },
    onError: (error) => {
      console.error('AI Chat error:', error)
      
      // Track error for monitoring
      trackError(error, {
        type: 'ai_completion_error',
        agent: currentAgent,
        timestamp: new Date().toISOString()
      })
      
      // Track failed AI usage
      trackAIUsage({
        model: 'unknown',
        provider: 'unknown',
        success: false,
        error: error.message,
        agentType: currentAgent,
        cost: 0
      }).catch(err => console.warn('Failed AI usage tracking failed:', err))
      
      // Add error message to chat
      const errorMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        error: error.message
      }
      setMessages(prev => [...prev, errorMessage])
    }
  })

  // Custom submit handler that includes agent context
  const handleSubmit = useCallback(async (e, customInput = null) => {
    e?.preventDefault()
    
    const messageText = customInput || input
    if (!messageText.trim()) return

    // Add user message to history immediately
    const userMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])

    // Enhance the prompt with agent context
    const enhancedInput = JSON.stringify({
      message: messageText.trim(),
      agent: currentAgent,
      context: {
        conversationHistory: messages.slice(-6), // Last 6 messages for context
        timestamp: new Date().toISOString(),
        ...options.context
      }
    })

    // Set the enhanced input and submit
    setInput(enhancedInput)
    
    // Call the original submit with our enhanced input
    await originalHandleSubmit(e, {
      data: {
        message: messageText.trim(),
        agent: currentAgent,
        context: {
          conversationHistory: messages.slice(-6),
          timestamp: new Date().toISOString(),
          ...options.context
        }
      }
    })

    // Clear the input
    setInput('')
  }, [input, currentAgent, messages, originalHandleSubmit, setInput, options.context])

  // Send message programmatically
  const sendMessage = useCallback(async (message, agentOverride = null) => {
    if (!message.trim()) return false

    const targetAgent = agentOverride || currentAgent
    
    try {
      // Add user message
      const userMessage = {
        id: `msg_${Date.now()}_user`,
        type: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])

      // Use fallback system for AI requests
      const result = await safeAIRequest(async () => {
        const response = await fetch('/api/ai/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            agent: targetAgent,
            context: {
              conversationHistory: messages.slice(-6),
              timestamp: new Date().toISOString(),
              ...options.context
            }
          })
        })

        if (!response.ok) throw new Error(`AI API error: ${response.statusText}`)
        return response
      }, { type: 'general' })

      // Handle fallback response
      if (result.isFallback) {
        const fallbackMessage = {
          id: `msg_${Date.now()}_assistant`,
          type: 'assistant',
          agent: targetAgent,
          content: result.content,
          timestamp: new Date().toISOString(),
          isFallback: true
        }
        setMessages(prev => [...prev, fallbackMessage])
        return true
      }

      const response = result

      if (!response.ok) throw new Error(`API error: ${response.statusText}`)

      // Handle streaming response
      const reader = response.body?.getReader()
      if (reader) {
        const assistantMessage = {
          id: `msg_${Date.now()}_assistant`,
          type: 'assistant',
          agent: targetAgent,
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
        const decoder = new TextDecoder()
        let done = false
        
        while (!done) {
          const { value, done: streamDone } = await reader.read()
          done = streamDone
          
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            assistantMessage.content += chunk
            
            // Update the streaming message
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: assistantMessage.content }
                  : msg
              )
            )
          }
        }
        
        // Mark streaming as complete
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, isStreaming: false }
              : msg
          )
        )
      }
      
      return true
    } catch (error) {
      console.error('Send message error:', error)
      
      // Add error message
      const errorMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
      
      return false
    }
  }, [currentAgent, messages, options.context])

  // Switch agent
  const switchAgent = useCallback((newAgent) => {
    setCurrentAgent(newAgent)
    
    // Add system message about agent switch
    const switchMessage = {
      id: `msg_${Date.now()}_system`,
      type: 'system',
      content: `Switched to ${getAgentDisplayName(newAgent)}`,
      timestamp: new Date().toISOString(),
      agent: newAgent
    }
    setMessages(prev => [...prev, switchMessage])
  }, [])

  // Clear conversation
  const clearMessages = useCallback(() => {
    setMessages([])
    setTotalCost(0)
    setAgentMetadata({})
  }, [])

  // Get agent info
  const getAgentInfo = useCallback((agentId = currentAgent) => {
    const agentMap = {
      business_coach: { name: 'Business Coach', icon: '💼', color: 'blue' },
      marketing_expert: { name: 'Marketing Expert', icon: '📱', color: 'purple' },
      financial_advisor: { name: 'Financial Advisor', icon: '💰', color: 'green' },
      operations_manager: { name: 'Operations Manager', icon: '⚙️', color: 'orange' },
      customer_care: { name: 'Customer Care', icon: '👥', color: 'pink' }
    }
    return agentMap[agentId] || agentMap.business_coach
  }, [currentAgent])

  // Track conversation cost
  const getConversationStats = useCallback(() => {
    return {
      messageCount: messages.length,
      userMessages: messages.filter(m => m.type === 'user').length,
      aiMessages: messages.filter(m => m.type === 'assistant').length,
      totalCost: totalCost,
      averageCostPerMessage: messages.length > 0 ? totalCost / messages.length : 0,
      lastModel: agentMetadata.lastModel,
      currentAgent: currentAgent
    }
  }, [messages, totalCost, agentMetadata, currentAgent])

  return {
    // Messages and state
    messages,
    isLoading: isStreamingResponse,
    error: streamingError,
    
    // Current agent
    currentAgent,
    agentInfo: getAgentInfo(),
    
    // Input handling (Vercel AI SDK)
    input,
    handleInputChange,
    handleSubmit,
    
    // Message sending
    sendMessage,
    
    // Agent management
    switchAgent,
    getAgentInfo,
    
    // Conversation management
    clearMessages,
    
    // Statistics
    totalCost,
    agentMetadata,
    getConversationStats,
    
    // Advanced controls
    stop,
    reload
  }
}

/**
 * Hook for CrewAI multi-agent workflow
 */
export function useCrewAI(taskType = 'general', options = {}) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [executionLog, setExecutionLog] = useState([])

  const executeTask = useCallback(async (task, context = {}) => {
    setIsExecuting(true)
    setError(null)
    setExecutionLog([])

    try {
      const response = await fetch('/api/ai/crew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          taskType,
          context: {
            ...context,
            ...options.context
          }
        })
      })

      if (!response.ok) throw new Error(`Crew execution failed: ${response.statusText}`)

      const result = await response.json()
      setResults(result)
      setExecutionLog(result.executionLog || [])
      
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [taskType, options.context])

  return {
    isExecuting,
    results,
    error,
    executionLog,
    executeTask
  }
}

/**
 * Hook for intelligent model routing and cost tracking
 */
export function useModelRouter() {
  const [routingStats, setRoutingStats] = useState({
    totalRequests: 0,
    totalCost: 0,
    modelUsage: {},
    costSavings: 0
  })

  const [lastRouting, setLastRouting] = useState(null)

  const routeRequest = useCallback(async (message, context = {}) => {
    try {
      const response = await fetch('/api/ai/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context,
          returnRouting: true
        })
      })

      if (!response.ok) throw new Error(`Routing failed: ${response.statusText}`)

      const result = await response.json()
      
      // Update routing stats
      setRoutingStats(prev => ({
        totalRequests: prev.totalRequests + 1,
        totalCost: prev.totalCost + (result.cost || 0),
        modelUsage: {
          ...prev.modelUsage,
          [result.model]: (prev.modelUsage[result.model] || 0) + 1
        },
        costSavings: prev.costSavings + (result.costSavings || 0)
      }))

      setLastRouting(result.routing)
      
      return result
    } catch (error) {
      console.error('Model routing error:', error)
      throw error
    }
  }, [])

  const getRoutingRecommendation = useCallback((message, context = {}) => {
    // Simple client-side routing logic for quick decisions
    const messageLower = message.toLowerCase()
    
    if (messageLower.includes('complex') || messageLower.includes('analyze')) {
      return { model: 'gemini-2.5-flash', reason: 'Complex reasoning required' }
    } else if (messageLower.includes('quick') || messageLower.includes('simple')) {
      return { model: 'gemini-2.5-flash-lite', reason: 'Simple query, optimize for speed and cost' }
    }
    
    return { model: 'gemini-2.5-flash-lite', reason: 'Default cost-optimized choice' }
  }, [])

  return {
    routingStats,
    lastRouting,
    routeRequest,
    getRoutingRecommendation
  }
}

// Helper functions
function getAgentDisplayName(agentId) {
  const names = {
    business_coach: 'Business Coach',
    marketing_expert: 'Marketing Expert', 
    financial_advisor: 'Financial Advisor',
    operations_manager: 'Operations Manager',
    customer_care: 'Customer Care'
  }
  return names[agentId] || 'AI Assistant'
}