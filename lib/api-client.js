/**
 * Enhanced API Client with Error Handling
 * Centralized API communication with retry logic and error handling
 */

// Simple console logging to prevent circular dependencies
const apiLogger = {
  error: (...args) => console.error('[API-CLIENT]', ...args),
  warn: (...args) => console.warn('[API-CLIENT]', ...args),
  info: (...args) => console.info('[API-CLIENT]', ...args)
}

// Error classes to avoid circular dependency 
class NetworkError extends Error {
  constructor(message, url = null, method = null) {
    super(message)
    this.name = 'NetworkError'
    this.url = url
    this.method = method
  }
}

class APIError extends Error {
  constructor(message, statusCode = 500, endpoint = null, response = null) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.endpoint = endpoint
    this.response = response
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

// Utility functions to avoid circular dependency
const isRetryableError = (error) => {
  if (error instanceof NetworkError) return true
  if (error instanceof APIError) {
    return error.statusCode >= 500 || error.statusCode === 429
  }
  return false
}

const getRetryDelay = (attempt, maxDelay = 30000) => {
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), maxDelay)
  return baseDelay + Math.random() * 1000
}

class APIClient {
  constructor(options = {}) {
    // Use Next.js API routes instead of external Python backend
    this.baseURL = options.baseURL || ''
    this.timeout = options.timeout || 10000
    this.retryAttempts = options.retryAttempts || 3
    this.retryDelay = options.retryDelay || 1000
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders
    }
  }
  
  /**
   * Make HTTP request with error handling and retries
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body,
      retryAttempts = this.retryAttempts,
      timeout = this.timeout,
      ...fetchOptions
    } = options
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`
    const requestHeaders = { ...this.defaultHeaders, ...headers }
    
    // Add auth token if available
    const token = this.getAuthToken()
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`
    }
    
    const requestOptions = {
      method,
      headers: requestHeaders,
      ...fetchOptions
    }
    
    // Add body for POST/PUT/PATCH requests
    if (body && method !== 'GET' && method !== 'HEAD') {
      if (typeof body === 'object' && !(body instanceof FormData)) {
        requestOptions.body = JSON.stringify(body)
      } else {
        requestOptions.body = body
      }
    }
    
    let lastError
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        requestOptions.signal = controller.signal
        
        const response = await fetch(url, requestOptions)
        clearTimeout(timeoutId)
        
        // Handle non-200 responses
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response)
          const apiError = new APIError(
            errorData.message || `HTTP ${response.status}`,
            response.status,
            endpoint,
            errorData
          )
          
          // Handle specific status codes
          if (response.status === 401) {
            this.handleAuthError()
            throw new AuthenticationError('Authentication required')
          }
          
          if (response.status === 429 && attempt < retryAttempts) {
            const retryAfter = response.headers.get('Retry-After')
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : getRetryDelay(attempt)
            await this.sleep(delay)
            continue
          }
          
          throw apiError
        }
        
        // Parse successful response
        const data = await this.parseResponse(response)
        
        // Log successful request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API ${method} ${endpoint}`, { status: response.status, data })
        }
        
        return data
        
      } catch (error) {
        lastError = error
        
        // Handle network errors
        if (error.name === 'AbortError') {
          lastError = new NetworkError(`Request timeout after ${timeout}ms`, url, method)
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          lastError = new NetworkError('Network request failed', url, method)
        }
        
        // Check if error is retryable
        if (attempt < retryAttempts && isRetryableError(lastError)) {
          const delay = getRetryDelay(attempt)
          console.warn(`🔄 Retrying API request (attempt ${attempt + 1}/${retryAttempts}) after ${delay}ms`)
          await this.sleep(delay)
          continue
        }
        
        // Log error and break retry loop
        apiLogger.error('API request failed after retries:', lastError.message, {
          endpoint,
          method,
          attempt,
          url,
          error: lastError.name
        })
        
        break
      }
    }
    
    throw lastError
  }
  
  /**
   * Parse response based on content type
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    
    if (contentType && contentType.includes('text/')) {
      return response.text()
    }
    
    return response.blob()
  }
  
  /**
   * Parse error response
   */
  async parseErrorResponse(response) {
    try {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      return { message: await response.text() }
    } catch {
      return { message: `HTTP ${response.status} ${response.statusText}` }
    }
  }
  
  /**
   * Get authentication token
   */
  getAuthToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    }
    return null
  }
  
  /**
   * Handle authentication errors
   */
  handleAuthError() {
    if (typeof window !== 'undefined') {
      // Clear stored tokens
      localStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_token')
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      }
    }
  }
  
  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // HTTP method shortcuts
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }
  
  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: data })
  }
  
  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: data })
  }
  
  patch(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body: data })
  }
  
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create default API client instance
export const apiClient = new APIClient()

/**
 * Specific API endpoints with error handling
 */
export const aiAPI = {
  async chat(message, agentId = 'business_coach', options = {}) {
    return apiClient.post('/api/ai/chat', {
      message,
      agent_id: agentId,
      ...options
    })
  },
  
  async getAgents() {
    return apiClient.get('/api/ai/agents')
  },
  
  async getConversation(conversationId) {
    return apiClient.get(`/api/ai/conversation/${conversationId}`)
  },
  
  async clearConversation(conversationId) {
    return apiClient.delete(`/api/ai/conversation/${conversationId}`)
  },
  
  async getAnalytics(barbershopId, metrics = []) {
    return apiClient.post('/api/analytics/ai-insights', { barbershop_id: barbershopId, metrics })
  },
  
  async getRecommendations(barbershopId, category) {
    return apiClient.post('/api/ai/recommendations', { barbershop_id: barbershopId, category })
  }
}

export const bookingAPI = {
  async getBarbershops() {
    return apiClient.get('/api/public/barbershops')
  },
  
  async getBarbershop(barbershopId) {
    return apiClient.get(`/api/public/barbershops/${barbershopId}`)
  },
  
  async getBarbers(barbershopId) {
    return apiClient.get(`/api/public/barbershops/${barbershopId}/barbers`)
  },
  
  async getAvailability(barberId, barbershopId, startDate, endDate, serviceDuration = 30) {
    return apiClient.get(`/api/public/barbers/${barberId}/availability`, {
      query: { barbershop_id: barbershopId, start_date: startDate, end_date: endDate, service_duration_minutes: serviceDuration }
    })
  }
}

/**
 * React hook for API calls with error handling
 */
export function useAPI() {
  const makeRequest = async (apiCall, errorContext = 'api_call') => {
    try {
      return await apiCall()
    } catch (error) {
      // Simple user-friendly message without circular dependency
      let userMessage = 'An unexpected error occurred'
      
      if (error instanceof AuthenticationError) {
        userMessage = 'Please log in to continue'
      } else if (error instanceof NetworkError) {
        userMessage = 'Network connection failed. Please check your internet connection and try again.'
      } else if (error instanceof APIError) {
        if (error.statusCode === 404) {
          userMessage = 'The requested resource was not found'
        } else if (error.statusCode === 429) {
          userMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (error.statusCode >= 500) {
          userMessage = 'Server error. Please try again later.'
        } else {
          userMessage = error.message
        }
      } else if (error.message) {
        userMessage = error.message
      }
      
      // You can throw the user-friendly message or handle it differently
      throw new Error(userMessage)
    }
  }
  
  return { makeRequest, apiClient, aiAPI, bookingAPI }
}

export default apiClient