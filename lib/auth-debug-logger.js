/**
 * Authentication Debug Logger Utility
 * Centralizes authentication-related logging with environment awareness
 * Provides consistent formatting and emoji indicators for auth debugging
 */

class AuthDebugLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.enabledInProduction = process.env.ENABLE_AUTH_DEBUG === 'true'
  }

  /**
   * Check if logging should be enabled
   */
  shouldLog() {
    return this.isDevelopment || this.enabledInProduction
  }

  /**
   * Format log message with consistent prefix and emoji
   */
  formatMessage(category, emoji, message, data = null) {
    const prefix = `${emoji} ${category}:`
    if (data) {
      return { message: `${prefix} ${message}`, data }
    }
    return `${prefix} ${message}`
  }

  /**
   * OAuth Callback Logging
   */
  oauthStart(data) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('OAuth Callback', '🎯', 'Starting callback processing', data))
  }

  oauthSuccess(message, data) {
    if (!this.shouldLog()) return
    const formatted = this.formatMessage('OAuth Callback', '✅', message, data)
    console.log(formatted.message, formatted.data || '')
  }

  oauthError(message, error) {
    console.error(this.formatMessage('OAuth Callback', '❌', message), error)
  }

  oauthWarning(message, data) {
    if (!this.shouldLog()) return
    const formatted = this.formatMessage('OAuth Callback', '⚠️', message, data)
    console.warn(formatted.message, formatted.data || '')
  }

  oauthRedirect(message, redirectTo) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('OAuth Callback', '🔄', message, { redirectTo }))
  }

  oauthCookie(message, cookieData) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('OAuth Callback', '🍪', message, cookieData))
  }

  /**
   * API Authentication Logging
   */
  apiAuth(message, data) {
    if (!this.shouldLog()) return
    const formatted = this.formatMessage('API Auth', '🔐', message, data)
    console.log(formatted.message, formatted.data || '')
  }

  apiAuthError(message, error) {
    console.error(this.formatMessage('API Auth', '❌', message), error)
  }

  apiAuthRetry(attempt, maxAttempts, delay) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('API Auth', '🔄', `Authentication attempt ${attempt}/${maxAttempts}${delay ? ` (delay: ${delay}ms)` : ''}`))
  }

  /**
   * Staff Service Logging
   */
  staffService(message, data) {
    if (!this.shouldLog()) return
    const formatted = this.formatMessage('Staff Service', '👥', message, data)
    console.log(formatted.message, formatted.data || '')
  }

  staffServiceError(message, error) {
    console.error(this.formatMessage('Staff Service', '❌', message), error)
  }

  staffServiceRetry(operation, attempt, maxAttempts) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('Staff Service', '🔄', `${operation} retry attempt ${attempt}/${maxAttempts}`))
  }

  /**
   * Session Management Logging
   */
  sessionCreated(sessionData) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('Session', '🎉', 'Session created successfully', {
      userId: sessionData.userId,
      provider: sessionData.provider,
      expiresAt: sessionData.expiresAt
    }))
  }

  sessionError(message, error) {
    console.error(this.formatMessage('Session', '❌', message), error)
  }

  sessionRetry(message, attempt) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('Session', '🔄', `${message} (attempt ${attempt})`))
  }

  sessionCookie(action, cookieName, success = true) {
    if (!this.shouldLog()) return
    const emoji = success ? '✅' : '❌'
    console.log(this.formatMessage('Session', '🍪', `${action} cookie ${cookieName} ${emoji}`))
  }

  /**
   * Database Operations Logging
   */
  dbQuery(table, operation, data) {
    if (!this.shouldLog()) return
    const formatted = this.formatMessage('Database', '📊', `${operation} on ${table}`, data)
    console.log(formatted.message, formatted.data || '')
  }

  dbError(table, operation, error) {
    console.error(this.formatMessage('Database', '❌', `${operation} failed on ${table}`), error)
  }

  dbSuccess(table, operation, count) {
    if (!this.shouldLog()) return
    const message = count !== undefined ? 
      `${operation} on ${table} successful (${count} rows)` : 
      `${operation} on ${table} successful`
    console.log(this.formatMessage('Database', '✅', message))
  }

  /**
   * Generic Authentication Flow Logging
   */
  authFlowStep(step, message, data) {
    if (!this.shouldLog()) return
    const formatted = this.formatMessage('Auth Flow', '🔑', `${step}: ${message}`, data)
    console.log(formatted.message, formatted.data || '')
  }

  authFlowError(step, error) {
    console.error(this.formatMessage('Auth Flow', '💥', `${step} failed`), error)
  }

  /**
   * Performance and Timing Logging
   */
  authTiming(operation, startTime, endTime) {
    if (!this.shouldLog()) return
    const duration = endTime - startTime
    console.log(this.formatMessage('Performance', '⏱️', `${operation} took ${duration}ms`))
  }

  /**
   * Health Check and System Status
   */
  systemHealth(component, status, details) {
    if (!this.shouldLog()) return
    const emoji = status === 'healthy' ? '💚' : status === 'warning' ? '💛' : '❤️'
    const formatted = this.formatMessage('Health', emoji, `${component} ${status}`, details)
    console.log(formatted.message, formatted.data || '')
  }

  /**
   * Summary/Batch Operations
   */
  authSummary(operation, results) {
    if (!this.shouldLog()) return
    console.log(this.formatMessage('Auth Summary', '📋', operation, results))
  }
}

// Create singleton instance
const authDebugLogger = new AuthDebugLogger()

// Export both the class and singleton
export { AuthDebugLogger, authDebugLogger }
export default authDebugLogger