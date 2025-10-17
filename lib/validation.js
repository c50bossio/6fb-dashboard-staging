/**
 * Validation Utility Module
 * Provides consistent validation functions across the application
 */

/**
 * Check if a value is defined (not null and not undefined)
 * @param {any} value - The value to check
 * @returns {boolean} - True if the value is defined
 */
export const isDefined = (value) => {
  return value !== null && value !== undefined;
};

/**
 * Check if a value is empty (null, undefined, empty string, or empty array)
 * @param {any} value - The value to check
 * @returns {boolean} - True if the value is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

/**
 * Validate required fields in an object
 * @param {string[]} requiredFields - Array of required field names
 * @param {object} data - The data object to validate
 * @returns {object} - { valid: boolean, missing: string[] }
 */
export const validateRequired = (requiredFields, data) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!isDefined(data[field]) || isEmpty(data[field])) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate UUID format
 * @param {string} uuid - The UUID to validate
 * @returns {boolean} - True if valid UUID format
 */
export const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate phone number (basic validation)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Check if it's a valid length (10-15 digits)
  return /^\+?\d{10,15}$/.test(cleaned);
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate date string
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - True if valid date
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate number within range
 * @param {number} value - The value to check
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean} - True if within range
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
};

/**
 * Create a validation error response
 * @param {string} message - Error message
 * @param {object} details - Additional error details
 * @returns {object} - Formatted error response
 */
export const validationError = (message, details = {}) => {
  return {
    error: 'Validation Error',
    message,
    details,
    status: 400
  };
};

/**
 * Extract and validate barbershop ID from various sources
 * @param {object} profile - User profile object
 * @returns {string|null} - Valid barbershop ID or null
 */
export const getbarbershopId = (profile) => {
  // Check various possible fields
  const possibleIds = [
    profile?.barbershop_id,
    profile?.barbershop_id,
    profile?.barbershopId,
    profile?.shopId
  ];
  
  // Return the first valid UUID found
  for (const id of possibleIds) {
    if (isValidUUID(id)) {
      return id;
    }
  }
  
  return null;
};

/**
 * Validate pagination parameters
 * @param {object} params - Pagination parameters
 * @returns {object} - Validated and sanitized pagination params
 */
export const validatePagination = (params = {}) => {
  const limit = Math.min(Math.max(parseInt(params.limit) || 10, 1), 100);
  const offset = Math.max(parseInt(params.offset) || 0, 0);
  const page = Math.max(parseInt(params.page) || 1, 1);
  
  return {
    limit,
    offset: params.page ? (page - 1) * limit : offset,
    page
  };
};

/**
 * Build update object from request, only including defined values
 * @param {object} fields - Object with field names as keys
 * @param {object} data - Request data
 * @returns {object} - Update object with only defined fields
 */
export const buildUpdateObject = (fields, data) => {
  const updateData = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (fields.includes(key) && isDefined(value)) {
      updateData[key] = value;
    }
  }
  
  return updateData;
};

/**
 * Validate and format currency amount
 * @param {any} amount - The amount to validate
 * @returns {number|null} - Validated amount in cents or null if invalid
 */
export const validateCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0) return null;
  // Convert to cents and round to avoid floating point issues
  return Math.round(num * 100);
};

export default {
  isDefined,
  isEmpty,
  validateRequired,
  isValidEmail,
  isValidUUID,
  isValidPhone,
  sanitizeInput,
  isValidDate,
  isInRange,
  validationError,
  getbarbershopId,
  validatePagination,
  buildUpdateObject,
  validateCurrency
};