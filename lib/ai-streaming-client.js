/**
 * AI Streaming Client with Server-Sent Events (SSE)
 * Provides real-time streaming of AI responses with optimal performance
 */

export class AIStreamingClient {
  constructor() {
    this.activeStreams = new Map()
    this.messageBuffer = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 3
    this.reconnectDelay = 1000
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

      // Handle SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      this.activeStreams.set(streamId, { controller, reader })
      this.messageBuffer.set(streamId, [])

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          // Process any remaining buffer
          if (buffer) {
            this.processChunk(streamId, buffer, onChunk)
          }
          break
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              this.handleStreamComplete(streamId, onComplete)
            } else {
              try {
                const parsed = JSON.parse(data)
                this.processChunk(streamId, parsed, onChunk)
              } catch (e) {
                // Handle non-JSON data
                this.processChunk(streamId, data, onChunk)
              }
            }
          }
        }
      }

      this.handleStreamComplete(streamId, onComplete)

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted')
      } else {
        console.error('Streaming error:', error)
        
        // Attempt reconnection for network errors
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
      // Handle structured data
      buffer.push(chunk)
      onChunk?.(chunk.content || chunk.text || chunk.message || chunk)
    } else {
      // Handle plain text
      buffer.push(chunk)
      onChunk?.(chunk)
    }
    
    this.messageBuffer.set(streamId, buffer)
  }

  /**
   * Handle stream completion
   */
  handleStreamComplete(streamId, onComplete) {
    const buffer = this.messageBuffer.get(streamId) || []
    const fullResponse = buffer.join('')
    
    onComplete?.({
      response: fullResponse,
      chunks: buffer,
      streamId
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
    
    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    await new Promise(resolve => setTimeout(resolve, delay))
    
    console.log(`Reconnecting stream (attempt ${this.reconnectAttempts})...`)
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
    // Keep message buffer for a while for reference
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
}

// Singleton instance
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

// Export default instance
export default getStreamingClient()