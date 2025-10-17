/**
 * API Test Helpers for Phase 4 Migration Testing
 * Provides utilities for testing appointment API endpoints
 */

const axios = require('axios')

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'
const API_BASE = `${BASE_URL}/api`

/**
 * Make an authenticated API request
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request payload
 * @param {Object} headers - Additional headers
 * @returns {Promise<Object>} API response
 */
async function apiRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.data = data
  }

  if (data && method === 'GET') {
    config.params = data
  }

  try {
    const response = await axios(config)
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    }
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message,
      headers: error.response?.headers
    }
  }
}

/**
 * Create a test appointment via API
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Created appointment response
 */
async function createTestAppointment(appointmentData) {
  return apiRequest('POST', '/appointments', appointmentData)
}

/**
 * Get appointment by ID via API
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Appointment response
 */
async function getAppointment(appointmentId) {
  return apiRequest('GET', `/appointments/${appointmentId}`)
}

/**
 * Update appointment via API
 * @param {string} appointmentId - Appointment ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated appointment response
 */
async function updateAppointment(appointmentId, updateData) {
  return apiRequest('PUT', `/appointments/${appointmentId}`, updateData)
}

/**
 * Delete/cancel appointment via API
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Delete response
 */
async function deleteAppointment(appointmentId) {
  return apiRequest('DELETE', `/appointments/${appointmentId}`)
}

/**
 * List appointments with filters via API
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Appointments list response
 */
async function listAppointments(filters = {}) {
  return apiRequest('GET', '/appointments', filters)
}

/**
 * Check appointment availability via API
 * @param {Object} params - Availability check parameters
 * @returns {Promise<Object>} Availability response
 */
async function checkAvailability(params) {
  return apiRequest('GET', '/appointments/availability', params)
}

/**
 * Update appointment status via API
 * @param {string} appointmentId - Appointment ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Status update response
 */
async function updateAppointmentStatus(appointmentId, status) {
  return apiRequest('PUT', `/appointments/${appointmentId}/status`, { status })
}

/**
 * Check-in appointment via API
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Check-in response
 */
async function checkInAppointment(appointmentId) {
  return apiRequest('POST', `/appointments/${appointmentId}/check-in`)
}

/**
 * Complete appointment via API
 * @param {string} appointmentId - Appointment ID
 * @param {Object} completionData - Completion details
 * @returns {Promise<Object>} Completion response
 */
async function completeAppointment(appointmentId, completionData = {}) {
  return apiRequest('POST', `/appointments/${appointmentId}/complete`, completionData)
}

/**
 * Search appointments by phone via API
 * @param {string} phone - Phone number to search
 * @returns {Promise<Object>} Search results
 */
async function searchByPhone(phone) {
  return apiRequest('POST', '/appointments/search-by-phone', { phone })
}

/**
 * Get calendar appointments via API
 * @param {Object} params - Calendar query parameters
 * @returns {Promise<Object>} Calendar appointments response
 */
async function getCalendarAppointments(params = {}) {
  return apiRequest('GET', '/calendar/appointments', params)
}

/**
 * Create calendar appointment via API
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Created appointment response
 */
async function createCalendarAppointment(appointmentData) {
  return apiRequest('POST', '/calendar/appointments', appointmentData)
}

/**
 * Verify API response structure matches expected schema
 * @param {Object} response - API response object
 * @param {Array<string>} expectedFields - Expected field names
 * @returns {Object} Validation result
 */
function verifyResponseStructure(response, expectedFields) {
  const result = {
    valid: true,
    missingFields: [],
    unexpectedFields: [],
    errors: []
  }

  if (!response.success) {
    result.valid = false
    result.errors.push('API request failed')
    return result
  }

  const responseData = response.data

  // Check if response data exists
  if (!responseData) {
    result.valid = false
    result.errors.push('Response data is null or undefined')
    return result
  }

  // For array responses, check first item
  const dataToCheck = Array.isArray(responseData) ? responseData[0] : responseData

  if (!dataToCheck) {
    // Empty array is valid
    return result
  }

  // Check for expected fields
  expectedFields.forEach(field => {
    if (!(field in dataToCheck)) {
      result.valid = false
      result.missingFields.push(field)
    }
  })

  // Check for legacy fields that shouldn't exist
  const legacyFields = ['customer_id', 'date', 'time', 'price']
  legacyFields.forEach(field => {
    if (field in dataToCheck) {
      result.valid = false
      result.unexpectedFields.push(field)
      result.errors.push(`Legacy field '${field}' found in response`)
    }
  })

  return result
}

/**
 * Verify field names in API response match new schema
 * @param {Object} response - API response object
 * @returns {Object} Field name validation result
 */
function verifyFieldNames(response) {
  const expectedNewFields = [
    'client_id',
    'appointment_date',
    'appointment_time',
    'total_price_cents',
    'deposit_paid_cents'
  ]

  const legacyFields = [
    'customer_id',
    'date',
    'time',
    'price',
    'deposit'
  ]

  const result = {
    valid: true,
    newFieldsPresent: [],
    legacyFieldsPresent: [],
    errors: []
  }

  if (!response.success || !response.data) {
    result.valid = false
    result.errors.push('Invalid response structure')
    return result
  }

  const dataToCheck = Array.isArray(response.data) ? response.data[0] : response.data

  if (!dataToCheck) return result

  // Check new fields
  expectedNewFields.forEach(field => {
    if (field in dataToCheck) {
      result.newFieldsPresent.push(field)
    }
  })

  // Check for legacy fields
  legacyFields.forEach(field => {
    if (field in dataToCheck) {
      result.valid = false
      result.legacyFieldsPresent.push(field)
      result.errors.push(`Legacy field '${field}' found in API response`)
    }
  })

  return result
}

/**
 * Test API endpoint error handling
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} invalidData - Invalid data to test
 * @returns {Promise<Object>} Error handling test result
 */
async function testErrorHandling(method, endpoint, invalidData) {
  const response = await apiRequest(method, endpoint, invalidData)

  return {
    handledGracefully: !response.success && response.status >= 400 && response.status < 500,
    statusCode: response.status,
    errorMessage: response.error,
    providesValidation: response.error && typeof response.error === 'object'
  }
}

/**
 * Measure API response time
 * @param {Function} apiCallFn - API call function
 * @returns {Promise<Object>} Performance metrics
 */
async function measureResponseTime(apiCallFn) {
  const startTime = Date.now()
  const response = await apiCallFn()
  const endTime = Date.now()

  return {
    responseTime: endTime - startTime,
    success: response.success,
    status: response.status
  }
}

/**
 * Batch test multiple appointments
 * @param {Array<Object>} appointments - Array of appointment data
 * @returns {Promise<Array>} Results from all creations
 */
async function batchCreateAppointments(appointments) {
  const results = []

  for (const appointment of appointments) {
    const result = await createTestAppointment(appointment)
    results.push({
      input: appointment,
      output: result
    })
  }

  return results
}

module.exports = {
  apiRequest,
  createTestAppointment,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  listAppointments,
  checkAvailability,
  updateAppointmentStatus,
  checkInAppointment,
  completeAppointment,
  searchByPhone,
  getCalendarAppointments,
  createCalendarAppointment,
  verifyResponseStructure,
  verifyFieldNames,
  testErrorHandling,
  measureResponseTime,
  batchCreateAppointments
}
