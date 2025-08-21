'use client'

import { toast } from 'sonner'

/**
 * Universal Button Handler System
 * Provides consistent error handling, loading states, and user feedback
 * for all interactive elements across the application
 */

class UniversalButtonHandler {
  constructor() {
    this.activeRequests = new Map()
    this.retryAttempts = new Map()
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  /**
   * Enhanced button click handler with error handling and loading states
   */
  async handleClick(element, action, options = {}) {
    const {
      loadingText = 'Processing...',
      successText = 'Success!',
      errorText = 'Something went wrong',
      retryable = true,
      timeout = 30000,
      showToast = true,
      fallbackAction = null
    } = options

    const elementId = this.getElementId(element)
    
    // Prevent multiple simultaneous requests
    if (this.activeRequests.has(elementId)) {
      console.log('🚫 Button click ignored - request already in progress')
      return
    }

    try {
      // Set loading state
      this.setLoadingState(element, loadingText)
      this.activeRequests.set(elementId, true)
      
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), timeout)
      )
      
      // Execute action with timeout
      const result = await Promise.race([
        this.executeAction(action),
        timeoutPromise
      ])
      
      // Success handling
      this.setSuccessState(element, successText)
      if (showToast) {
        toast.success(successText)
      }
      
      // Clear retry attempts on success
      this.retryAttempts.delete(elementId)
      
      return result
      
    } catch (error) {
      console.error('❌ Button action failed:', error)
      
      // Error handling with retry logic
      await this.handleError(element, error, action, options, elementId)
      
    } finally {
      // Clean up
      this.activeRequests.delete(elementId)
      setTimeout(() => this.clearLoadingState(element), 2000)
    }
  }

  /**
   * Execute the button action with proper error handling
   */
  async executeAction(action) {
    if (typeof action === 'function') {
      return await action()
    } else if (typeof action === 'string') {
      // Handle string actions (routes, URLs, etc.)
      return await this.handleStringAction(action)
    } else if (action?.type === 'navigation') {
      return await this.handleNavigation(action.target, action.options)
    } else if (action?.type === 'api') {
      return await this.handleApiCall(action.url, action.method, action.data)
    } else if (action?.type === 'event') {
      return await this.handleCustomEvent(action.name, action.detail)
    }
    
    throw new Error('Invalid action type')
  }

  /**
   * Handle string-based actions (routes, API endpoints, etc.)
   */
  async handleStringAction(action) {
    if (action.startsWith('/api/')) {
      // API call
      const response = await fetch(action)
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }
      return await response.json()
    } else if (action.startsWith('/')) {
      // Route navigation
      return await this.handleNavigation(action)
    } else if (action.startsWith('http')) {
      // External URL
      window.open(action, '_blank')
      return true
    }
    
    throw new Error('Unrecognized string action')
  }

  /**
   * Handle navigation with fallbacks
   */
  async handleNavigation(route, options = {}) {
    try {
      // Try Next.js router first
      if (typeof window !== 'undefined' && window.next?.router) {
        await window.next.router.push(route)
        return true
      }
      
      // Try React Router if available
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({}, '', route)
        return true
      }
      
      // Fallback to location change
      window.location.href = route
      return true
      
    } catch (error) {
      console.warn('Navigation method failed, using fallback:', error)
      window.location.href = route
      return true
    }
  }

  /**
   * Handle API calls with proper error handling
   */
  async handleApiCall(url, method = 'GET', data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    }
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }
    
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`API Error ${response.status}: ${errorData}`)
    }
    
    return await response.json()
  }

  /**
   * Handle custom events with enhanced dispatching
   */
  async handleCustomEvent(eventName, detail = {}) {
    try {
      const event = new CustomEvent(eventName, {
        detail: {
          ...detail,
          timestamp: Date.now(),
          source: 'universal-button-handler'
        },
        bubbles: true,
        cancelable: true
      })
      
      // Dispatch on both window and document for maximum compatibility
      window.dispatchEvent(event)
      document.dispatchEvent(event)
      
      // Wait briefly to allow event handlers to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return true
    } catch (error) {
      throw new Error(`Event dispatch failed: ${error.message}`)
    }
  }

  /**
   * Handle errors with retry logic and fallbacks
   */
  async handleError(element, error, action, options, elementId) {
    const currentRetries = this.retryAttempts.get(elementId) || 0
    const { retryable, fallbackAction, errorText, showToast } = options
    
    if (retryable && currentRetries < this.maxRetries) {
      // Retry logic
      this.retryAttempts.set(elementId, currentRetries + 1)
      
      this.setRetryState(element, `Retrying... (${currentRetries + 1}/${this.maxRetries})`)
      
      if (showToast) {
        toast.info(`Retrying... (${currentRetries + 1}/${this.maxRetries})`)
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.retryDelay * (currentRetries + 1)))
      
      // Retry the action
      return this.handleClick(element, action, options)
      
    } else {
      // Max retries reached or not retryable
      this.setErrorState(element, errorText)
      
      if (showToast) {
        toast.error(`${errorText}: ${error.message}`)
      }
      
      // Try fallback action if available
      if (fallbackAction) {
        console.log('🔄 Attempting fallback action...')
        try {
          await this.executeAction(fallbackAction)
          this.setSuccessState(element, 'Completed with fallback')
          if (showToast) {
            toast.success('Completed successfully')
          }
        } catch (fallbackError) {
          console.error('❌ Fallback action also failed:', fallbackError)
          if (showToast) {
            toast.error('All attempts failed')
          }
        }
      }
      
      throw error
    }
  }

  /**
   * Set loading state on element
   */
  setLoadingState(element, loadingText) {
    element.disabled = true
    element.setAttribute('data-original-text', element.textContent)
    element.setAttribute('data-loading', 'true')
    element.textContent = loadingText
    element.style.cursor = 'wait'
    
    // Add loading spinner if possible
    if (!element.querySelector('.loading-spinner')) {
      const spinner = document.createElement('span')
      spinner.className = 'loading-spinner inline-block animate-spin w-4 h-4 mr-2'
      spinner.innerHTML = '⟳'
      element.prepend(spinner)
    }
  }

  /**
   * Set success state on element
   */
  setSuccessState(element, successText) {
    element.textContent = successText
    element.style.cursor = 'pointer'
    element.classList.add('success-state')
    
    // Remove any loading elements
    const spinner = element.querySelector('.loading-spinner')
    if (spinner) spinner.remove()
  }

  /**
   * Set retry state on element
   */
  setRetryState(element, retryText) {
    element.textContent = retryText
    element.classList.add('retry-state')
  }

  /**
   * Set error state on element
   */
  setErrorState(element, errorText) {
    element.disabled = false
    element.textContent = errorText
    element.style.cursor = 'pointer'
    element.classList.add('error-state')
    
    // Remove any loading elements
    const spinner = element.querySelector('.loading-spinner')
    if (spinner) spinner.remove()
  }

  /**
   * Clear loading state and restore original element
   */
  clearLoadingState(element) {
    element.disabled = false
    element.removeAttribute('data-loading')
    element.style.cursor = 'pointer'
    element.classList.remove('success-state', 'retry-state', 'error-state')
    
    // Restore original text if available
    const originalText = element.getAttribute('data-original-text')
    if (originalText) {
      element.textContent = originalText
      element.removeAttribute('data-original-text')
    }
    
    // Remove loading spinner
    const spinner = element.querySelector('.loading-spinner')
    if (spinner) spinner.remove()
  }

  /**
   * Generate unique ID for element tracking
   */
  getElementId(element) {
    if (element.id) return element.id
    if (element.dataset.testid) return element.dataset.testid
    
    // Generate ID based on element properties
    const text = element.textContent?.trim().substring(0, 20)
    const classes = element.className?.split(' ').slice(0, 2).join('-')
    return `btn-${text}-${classes}-${Math.random().toString(36).substring(7)}`
  }

  /**
   * Enhance existing button with universal handling
   */
  enhanceButton(element, action, options = {}) {
    // Store original click handler if exists
    const originalHandler = element.onclick
    
    element.onclick = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      
      try {
        // Call original handler first if it exists
        if (originalHandler) {
          await originalHandler.call(element, event)
        }
        
        // Then execute the enhanced action
        await this.handleClick(element, action, options)
        
      } catch (error) {
        console.error('Enhanced button handler failed:', error)
      }
    }
    
    // Add accessibility attributes
    element.setAttribute('role', 'button')
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0')
    }
    
    return element
  }

  /**
   * Auto-enhance all buttons on page with basic error handling
   */
  autoEnhanceButtons() {
    const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')
    
    buttons.forEach(button => {
      if (!button.dataset.enhanced) {
        button.dataset.enhanced = 'true'
        
        // Add basic error handling wrapper
        const originalHandler = button.onclick
        if (originalHandler) {
          button.onclick = async (event) => {
            try {
              await originalHandler.call(button, event)
            } catch (error) {
              console.error('Button action failed:', error)
              toast.error('Action failed. Please try again.')
            }
          }
        }
      }
    })
    
    console.log(`✨ Enhanced ${buttons.length} buttons with universal error handling`)
  }
}

// Export singleton instance
const universalButtonHandler = new UniversalButtonHandler()

// Auto-enhance buttons in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.universalButtonHandler = universalButtonHandler
  
  // Auto-enhance on page load
  setTimeout(() => {
    universalButtonHandler.autoEnhanceButtons()
  }, 2000)
}

export default universalButtonHandler

/**
 * React Hook for easy integration
 */
export const useUniversalButton = (action, options = {}) => {
  return async (event) => {
    if (event?.target) {
      return universalButtonHandler.handleClick(event.target, action, options)
    }
  }
}

/**
 * Utility function to quickly enhance a button
 */
export const enhanceButton = (element, action, options = {}) => {
  return universalButtonHandler.enhanceButton(element, action, options)
}