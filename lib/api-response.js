import { NextResponse } from 'next/server'

/**
 * Shared API response formatter utility for consistent error/success responses
 * Enforces standardized response structure across all API endpoints
 *
 * @module lib/api-response
 * @created 2025-01-10
 * @feature Complete Barbershop Setup (003)
 */

/**
 * Create a successful JSON response
 *
 * @param {Object|Array} data - The response data
 * @param {Object} options - Additional response options
 * @param {number} options.status - HTTP status code (default: 200)
 * @param {Object} options.meta - Optional metadata (pagination, totals, etc.)
 * @returns {NextResponse} - Formatted success response
 *
 * @example
 * return success({ customers: [...] }, { meta: { total: 50, page: 1 } })
 * // Returns: { success: true, data: { customers: [...] }, meta: { total: 50, page: 1 } }
 */
export function success(data, options = {}) {
  const { status = 200, meta = null } = options

  const responseBody = {
    success: true,
    data: data || null
  }

  if (meta) {
    responseBody.meta = meta
  }

  return NextResponse.json(responseBody, { status })
}

/**
 * Create an error JSON response
 *
 * @param {string} message - User-friendly error message
 * @param {Object} options - Additional error options
 * @param {number} options.status - HTTP status code (default: 400)
 * @param {string} options.code - Error code for client handling (e.g., 'VALIDATION_ERROR')
 * @param {Object} options.details - Additional error details (validation errors, etc.)
 * @returns {NextResponse} - Formatted error response
 *
 * @example
 * return error('Customer not found', { status: 404, code: 'NOT_FOUND' })
 * // Returns: { success: false, error: { message: '...', code: 'NOT_FOUND' } }
 */
export function error(message, options = {}) {
  const { status = 400, code = null, details = null } = options

  const responseBody = {
    success: false,
    error: {
      message: message || 'An error occurred'
    }
  }

  if (code) {
    responseBody.error.code = code
  }

  if (details) {
    responseBody.error.details = details
  }

  return NextResponse.json(responseBody, { status })
}

/**
 * Create an unauthorized (401) error response
 *
 * @param {string} message - Optional custom message (default: 'Unauthorized')
 * @returns {NextResponse} - Formatted 401 error response
 *
 * @example
 * return unauthorized()
 * // Returns: { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
 */
export function unauthorized(message = 'Unauthorized') {
  return error(message, {
    status: 401,
    code: 'UNAUTHORIZED'
  })
}

/**
 * Create a forbidden (403) error response
 *
 * @param {string} message - Optional custom message (default: 'Forbidden')
 * @returns {NextResponse} - Formatted 403 error response
 *
 * @example
 * return forbidden('Must be a shop owner')
 * // Returns: { success: false, error: { message: '...', code: 'FORBIDDEN' } }
 */
export function forbidden(message = 'Forbidden') {
  return error(message, {
    status: 403,
    code: 'FORBIDDEN'
  })
}

/**
 * Create a not found (404) error response
 *
 * @param {string} resource - Resource name (e.g., 'Customer', 'Product')
 * @returns {NextResponse} - Formatted 404 error response
 *
 * @example
 * return notFound('Customer')
 * // Returns: { success: false, error: { message: 'Customer not found', code: 'NOT_FOUND' } }
 */
export function notFound(resource = 'Resource') {
  return error(`${resource} not found`, {
    status: 404,
    code: 'NOT_FOUND'
  })
}

/**
 * Create a validation error (422) response
 *
 * @param {string} message - Validation error message
 * @param {Object} validationErrors - Field-specific validation errors
 * @returns {NextResponse} - Formatted 422 validation error response
 *
 * @example
 * return validationError('Invalid input', { email: 'Email is required', phone: 'Invalid phone format' })
 * // Returns: { success: false, error: { message: '...', code: 'VALIDATION_ERROR', details: {...} } }
 */
export function validationError(message = 'Validation failed', validationErrors = {}) {
  return error(message, {
    status: 422,
    code: 'VALIDATION_ERROR',
    details: validationErrors
  })
}

/**
 * Create an internal server error (500) response
 *
 * @param {string} message - Optional custom message (default: 'Internal server error')
 * @param {Error} err - Optional error object for logging
 * @returns {NextResponse} - Formatted 500 error response
 *
 * @example
 * return serverError('Database connection failed', error)
 * // Returns: { success: false, error: { message: '...', code: 'SERVER_ERROR' } }
 */
export function serverError(message = 'Internal server error', err = null) {
  // Log the actual error for debugging (never expose to client)
  if (err) {
    console.error('Server error:', err)
  }

  return error(message, {
    status: 500,
    code: 'SERVER_ERROR'
  })
}

/**
 * Create an empty response (204 No Content)
 * Used for successful operations that don't return data (e.g., DELETE)
 *
 * @returns {NextResponse} - Empty response with 204 status
 *
 * @example
 * return noContent()
 * // Returns: HTTP 204 No Content (empty body)
 */
export function noContent() {
  return new NextResponse(null, { status: 204 })
}

/**
 * Create a paginated success response
 *
 * @param {Array} items - The data items for current page
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total number of items
 * @returns {NextResponse} - Formatted paginated response
 *
 * @example
 * return paginated(customers, { page: 1, limit: 20, total: 150 })
 * // Returns: {
 * //   success: true,
 * //   data: [...],
 * //   meta: { page: 1, limit: 20, total: 150, totalPages: 8, hasNext: true, hasPrev: false }
 * // }
 */
export function paginated(items, pagination) {
  const { page, limit, total } = pagination

  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return success(items, {
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  })
}

/**
 * HTTP Status Code Constants
 * For easy reference and consistency
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
}

/**
 * Error Code Constants
 * Standard error codes for client-side handling
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFLICT: 'CONFLICT'
}

// Default export for convenience
export default {
  success,
  error,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  serverError,
  noContent,
  paginated,
  HTTP_STATUS,
  ERROR_CODES
}
