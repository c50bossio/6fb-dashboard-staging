/**
 * Enhanced API Client with Error Handling
 * Centralized API communication with retry logic and error handling
 */

import { errorHandler, NetworkError, APIError, AuthenticationError } from './error-handler'
import { getRetryDelay, isRetryableError } from './error-handler'

class APIClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8001' : '')
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
        errorHandler.handleError(lastError, 'api_request', {
          endpoint,
          method,
          attempt,
          url
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
    return apiClient.post('/api/v1/ai/chat', {
      message,
      agent_id: agentId,
      ...options
    })
  },
  
  async getAgents() {
    return apiClient.get('/api/v1/ai/agents')
  },
  
  async getConversation(conversationId) {
    return apiClient.get(`/api/v1/ai/conversation/${conversationId}`)
  },
  
  async clearConversation(conversationId) {
    return apiClient.delete(`/api/v1/ai/conversation/${conversationId}`)
  },
  
  async getAnalytics(barberbarbershopId, metrics = []) {
    return apiClient.post('/api/v1/ai/analytics', { barberbarbershop_id: barberbarbershopId, metrics })
  },
  
  async getRecommendations(barberbarbershopId, category) {
    return apiClient.post('/api/v1/ai/recommendations', { barberbarbershop_id: barberbarbershopId, category })
  }
}

export const bookingAPI = {
  async getBarbershops() {
    return apiClient.get('/api/v1/public/barbershops')
  },
  
  async getBarbershop(barberbarbershopId) {
    return apiClient.get(`/api/v1/public/barbershops/${barberbarbershopId}`)
  },
  
  async getBarbers(barberbarbershopId) {
    return apiClient.get(`/api/v1/public/barbershops/${barberbarbershopId}/barbers`)
  },
  
  async getAvailability(barberId, barberbarbershopId, startDate, endDate, serviceDuration = 30) {
    return apiClient.get(`/api/v1/public/barbers/${barberId}/availability`, {
      query: { barberbarbershop_id: barberbarbershopId, start_date: startDate, end_date: endDate, service_duration_minutes: serviceDuration }
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
      const userMessage = errorHandler.getUserFriendlyMessage(error)
      
      // You can throw the user-friendly message or handle it differently
      throw new Error(userMessage)
    }
  }
  
  return { makeRequest, apiClient, aiAPI, bookingAPI }
}

export default apiClient