/**
 * AI Streaming Client with Server-Sent Events (SSE)
 * Provides real-time streaming of AI responses with optimal performance
 */

import { getAgentRouter } from './ai-agent-router.js'
import { getCacheManager } from './ai-cache-manager.js'
import { getPrefetchManager } from './ai-prefetch-manager.js'
import { getFallbackManager } from './ai-provider-fallback.js'

export class AIStreamingClient {
  constructor() {
    this.activeStreams = new Map()
    this.messageBuffer = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 3
    this.reconnectDelay = 1000
    this.cacheManager = getCacheManager()
    this.fallbackManager = getFallbackManager()
    this.prefetchManager = getPrefetchManager()
    this.agentRouter = getAgentRouter()
    this.cacheHits = 0
    this.cacheMisses = 0
    this.fallbackCount = 0
    this.prefetchHits = 0
    this.routedQueries = 0
  }

  /**
   * Stream AI chat response with SSE
   * @param {string} message - User message
   * @param {Object} options - Streaming options
   * @param {Function} onChunk - Callback for each chunk
   * @param {Function} onComplete - Callback when streaming completes
   * @param {Function} onError - Error callback
   * @returns {Object} Stream controller
   */
  async streamChat(message, options = {}, onChunk, onComplete, onError) {
    const streamId = this.generateStreamId()
    const controller = new AbortController()
    
    let selectedAgent = options.agentId
    let routingInfo = null
    
    if (!selectedAgent || selectedAgent === 'auto') {
      try {
        const routing = await this.agentRouter.routeQuery(message, {
          previousAgent: options.previousAgent,
          ...options.context
        })
        
        selectedAgent = routing.agent.id
        routingInfo = routing
        this.routedQueries++
        
        
      } catch (error) {
        console.error('Agent routing failed:', error)
        selectedAgent = 'marcus' // Fallback to default
      }
    }
    
    this.prefetchManager.recordQuery(message, {
      agent: selectedAgent,
      ...options.context
    })
    
    const cachedResponse = await this.checkCache(message, options.agentId, options.context)
    if (cachedResponse) {
      if (cachedResponse.fromCache) {
        this.prefetchManager.recordPrefetchHit(message)
        this.prefetchHits++
      }
      return this.simulateStreamingFromCache(cachedResponse, onChunk, onComplete)
    }
    
    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          sessionId: options.sessionId,
          agentId: options.agentId,
          context: options.context,
          stream: true
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      this.activeStreams.set(streamId, { 
        controller, 
        reader, 
        message, 
        agentId: options.agentId, 
        context: options.context 
      })
      this.messageBuffer.set(streamId, [])

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          if (buffer) {
            this.processChunk(streamId, buffer, onChunk)
          }
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              await this.handleStreamComplete(streamId, onComplete)
            } else {
              try {
                const parsed = JSON.parse(data)
                this.processChunk(streamId, parsed, onChunk)
              } catch (e) {
                this.processChunk(streamId, data, onChunk)
              }
            }
          }
        }
      }

      await this.handleStreamComplete(streamId, onComplete)

    } catch (error) {
      if (error.name === 'AbortError') {
      } else {
        console.error('Streaming error:', error)
        
        try {
          const fallbackResponse = await this.fallbackManager.getResponse(message, {
            context: options.context,
            agent: options.agentId,
            sessionId: options.sessionId
          })
          
          if (fallbackResponse) {
            this.fallbackCount++
            
            return this.simulateStreamingFromFallback(fallbackResponse, onChunk, onComplete)
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
        }
        
        if (this.shouldReconnect(error)) {
          await this.reconnectStream(message, options, onChunk, onComplete, onError)
        } else {
          onError?.(error)
        }
      }
    } finally {
      this.cleanupStream(streamId)
    }

    return {
      streamId,
      abort: () => this.abortStream(streamId),
      getBuffer: () => this.messageBuffer.get(streamId) || []
    }
  }

  /**
   * Process a streaming chunk
   */
  processChunk(streamId, chunk, onChunk) {
    const buffer = this.messageBuffer.get(streamId) || []
    
    if (typeof chunk === 'object') {
      buffer.push(chunk)
      onChunk?.(chunk.content || chunk.text || chunk.message || chunk)
    } else {
      buffer.push(chunk)
      onChunk?.(chunk)
    }
    
    this.messageBuffer.set(streamId, buffer)
  }

  /**
   * Handle stream completion
   */
  async handleStreamComplete(streamId, onComplete) {
    const buffer = this.messageBuffer.get(streamId) || []
    const fullResponse = buffer.join('')
    const streamData = this.activeStreams.get(streamId)
    
    if (streamData && fullResponse) {
      await this.cacheResponse(
        streamData.message, 
        streamData.agentId, 
        fullResponse, 
        streamData.context
      )
    }
    
    onComplete?.({
      response: fullResponse,
      chunks: buffer,
      streamId,
      fromCache: false
    })
    
    this.cleanupStream(streamId)
    this.reconnectAttempts = 0
  }

  /**
   * Reconnect stream after network error
   */
  async reconnectStream(message, options, onChunk, onComplete, onError) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      onError?.(new Error('Max reconnection attempts reached'))
      return
    }

    this.reconnectAttempts++
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    await new Promise(resolve => setTimeout(resolve, delay))
    
    return this.streamChat(message, options, onChunk, onComplete, onError)
  }

  /**
   * Check if we should attempt reconnection
   */
  shouldReconnect(error) {
    const networkErrors = [
      'NetworkError',
      'TypeError', // Often indicates network issues
      'Failed to fetch'
    ]
    
    return networkErrors.some(err => 
      error.name === err || error.message.includes(err)
    )
  }

  /**
   * Abort an active stream
   */
  abortStream(streamId) {
    const stream = this.activeStreams.get(streamId)
    if (stream) {
      stream.controller.abort()
      this.cleanupStream(streamId)
    }
  }

  /**
   * Clean up stream resources
   */
  cleanupStream(streamId) {
    this.activeStreams.delete(streamId)
    setTimeout(() => {
      this.messageBuffer.delete(streamId)
    }, 60000) // Clean up after 1 minute
  }

  /**
   * Abort all active streams
   */
  abortAll() {
    for (const [streamId] of this.activeStreams) {
      this.abortStream(streamId)
    }
  }

  /**
   * Generate unique stream ID
   */
  generateStreamId() {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount() {
    return this.activeStreams.size
  }

  /**
   * Check cache for existing response
   */
  async checkCache(message, agentId, context) {
    try {
      const cachedResponse = await this.cacheManager.getCachedResponse(message, agentId, context)
      if (cachedResponse) {
        this.cacheHits++
        return cachedResponse
      } else {
        this.cacheMisses++
        return null
      }
    } catch (error) {
      console.warn('Cache check error:', error)
      this.cacheMisses++
      return null
    }
  }

  /**
   * Cache AI response after streaming
   */
  async cacheResponse(message, agentId, response, context) {
    try {
      await this.cacheManager.cacheResponse(message, agentId, response, context)
    } catch (error) {
      console.warn('Cache save error:', error)
    }
  }

  /**
   * Simulate streaming from cached response
   */
  async simulateStreamingFromCache(cachedResponse, onChunk, onComplete) {
    const streamId = this.generateStreamId()
    const response = cachedResponse.response
    
    const words = response.split(' ')
    let streamedContent = ''
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + ' '
      streamedContent += word
      onChunk?.(word)
      
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20))
    }
    
    onComplete?.({
      response: streamedContent.trim(),
      chunks: words,
      streamId,
      fromCache: true
    })
    
    return {
      streamId,
      abort: () => {}, // No-op for cached responses
      getBuffer: () => words
    }
  }

  /**
   * Simulate streaming from fallback response
   */
  async simulateStreamingFromFallback(fallbackResponse, onChunk, onComplete) {
    const streamId = this.generateStreamId()
    const response = fallbackResponse.response
    
    const words = response.split(' ')
    let streamedContent = ''
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + ' '
      streamedContent += word
      onChunk?.(word)
      
      await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 60))
    }
    
    onComplete?.({
      response: streamedContent.trim(),
      chunks: words,
      streamId,
      fromFallback: true,
      provider: fallbackResponse.provider,
      suggestions: fallbackResponse.suggestions,
      category: fallbackResponse.category
    })
    
    return {
      streamId,
      abort: () => {}, // No-op for fallback responses
      getBuffer: () => words
    }
  }

  /**
   * Get comprehensive statistics
   */
  getCacheStats() {
    const prefetchStats = this.prefetchManager.getPrefetchStats()
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      fallbacks: this.fallbackCount,
      prefetchHits: this.prefetchHits,
      hitRate: this.cacheHits + this.cacheMisses > 0 
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(1) + '%'
        : '0%',
      fallbackRate: this.fallbackCount + this.cacheMisses + this.cacheHits > 0
        ? (this.fallbackCount / (this.fallbackCount + this.cacheMisses + this.cacheHits) * 100).toFixed(1) + '%'
        : '0%',
      prefetchEfficiency: prefetchStats.hitRate,
      prefetchStats: prefetchStats
    }
  }
}

let streamingClient = null

/**
 * Get or create streaming client instance
 */
export function getStreamingClient() {
  if (!streamingClient) {
    streamingClient = new AIStreamingClient()
  }
  return streamingClient
}

export default getStreamingClient()