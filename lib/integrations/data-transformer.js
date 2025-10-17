/**
 * Data Transformer - Universal data transformation and normalization
 * Handles field mapping, data type conversion, and normalization
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

export class DataTransformer {
  constructor(options = {}) {
    this.options = {
      defaultCountry: options.defaultCountry || 'US',
      dateFormat: options.dateFormat || 'MM/DD/YYYY',
      strictValidation: options.strictValidation || false,
      ...options
    }
  }

  /**
   * Universal schema definitions for each entity type
   */
  static UNIVERSAL_SCHEMA = {
    customers: {
      required: {
        name: {
          sourceFields: ['first_name+last_name', 'full_name', 'client_name', 'customer_name', 'name'],
          transform: 'combineName'
        },
        email: {
          sourceFields: ['email', 'email_address', 'client_email', 'e-mail'],
          transform: 'normalizeEmail'
        }
      },
      optional: {
        phone: {
          sourceFields: ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'tel'],
          transform: 'normalizePhone'
        },
        address: {
          sourceFields: ['address', 'street_address', 'full_address', 'location'],
          transform: 'normalizeAddress'
        },
        birthdate: {
          sourceFields: ['date_of_birth', 'dob', 'birthday', 'birth_date'],
          transform: 'parseDate'
        },
        notes: {
          sourceFields: ['notes', 'client_notes', 'comments', 'customer_notes'],
          transform: 'cleanText'
        },
        tags: {
          sourceFields: ['tags', 'client_tags', 'labels', 'categories'],
          transform: 'parseTags'
        },
        created_at: {
          sourceFields: ['date_created', 'created_at', 'joined_date', 'signup_date'],
          transform: 'parseDate'
        },
        last_visit: {
          sourceFields: ['date_last_seen', 'last_appointment', 'last_visit', 'last_booking'],
          transform: 'parseDate'
        },
        preferred_barber: {
          sourceFields: ['preferred_barber', 'favorite_barber', 'barber', 'stylist'],
          transform: 'cleanText'
        }
      }
    },
    
    appointments: {
      required: {
        date: {
          sourceFields: ['date', 'appointment_date', 'start_date', 'booking_date'],
          transform: 'parseDate'
        },
        time: {
          sourceFields: ['time', 'appointment_time', 'start_time', 'booking_time'],
          transform: 'parseTime'
        },
        service: {
          sourceFields: ['service', 'appointment_type', 'service_name', 'treatment'],
          transform: 'cleanText'
        },
        customer_ref: {
          sourceFields: ['customer_name', 'client_name', 'customer_id', 'client', 'customer'],
          transform: 'cleanText'
        }
      },
      optional: {
        barber: {
          sourceFields: ['provider', 'staff', 'calendar', 'barber_name', 'stylist', 'employee'],
          transform: 'cleanText'
        },
        duration: {
          sourceFields: ['duration', 'length', 'appointment_duration', 'time_length'],
          transform: 'parseDuration'
        },
        price: {
          sourceFields: ['price', 'cost', 'service_price', 'amount', 'total'],
          transform: 'parsePrice'
        },
        status: {
          sourceFields: ['status', 'appointment_status', 'state', 'booking_status'],
          transform: 'normalizeStatus'
        },
        notes: {
          sourceFields: ['notes', 'appointment_notes', 'comments', 'special_instructions'],
          transform: 'cleanText'
        },
        end_time: {
          sourceFields: ['end_time', 'finish_time', 'end', 'appointment_end'],
          transform: 'parseTime'
        }
      }
    },
    
    services: {
      required: {
        name: {
          sourceFields: ['service_name', 'name', 'title', 'service', 'treatment_name'],
          transform: 'cleanText'
        },
        duration: {
          sourceFields: ['duration', 'length', 'time', 'service_duration', 'minutes'],
          transform: 'parseDuration'
        },
        price: {
          sourceFields: ['price', 'cost', 'rate', 'service_price', 'fee'],
          transform: 'parsePrice'
        }
      },
      optional: {
        description: {
          sourceFields: ['description', 'details', 'info', 'service_description', 'notes'],
          transform: 'cleanText'
        },
        category: {
          sourceFields: ['category', 'type', 'service_type', 'service_category', 'group'],
          transform: 'cleanText'
        },
        active: {
          sourceFields: ['active', 'enabled', 'available', 'is_active', 'status'],
          transform: 'parseBoolean'
        }
      }
    },
    
    barbers: {
      required: {
        name: {
          sourceFields: ['staff_name', 'barber_name', 'provider_name', 'employee_name', 'stylist_name', 'full_name', 'name'],
          transform: 'combineName'
        },
        email: {
          sourceFields: ['email', 'staff_email', 'barber_email', 'work_email', 'e-mail'],
          transform: 'normalizeEmail'
        }
      },
      optional: {
        phone: {
          sourceFields: ['phone', 'mobile', 'cell', 'work_phone', 'contact_number'],
          transform: 'normalizePhone'
        },
        profile_photo_url: {
          sourceFields: ['photo_url', 'profile_photo', 'avatar_url', 'picture', 'image_url', 'headshot', 'photo'],
          transform: 'validateUrl'
        },
        bio: {
          sourceFields: ['bio', 'description', 'about', 'profile', 'introduction'],
          transform: 'cleanText'
        },
        specialties: {
          sourceFields: ['specialties', 'services', 'skills', 'expertise', 'certifications'],
          transform: 'parseTags'
        },
        commission_rate: {
          sourceFields: ['commission', 'commission_rate', 'commission_percentage', 'rate'],
          transform: 'parsePercentage'
        },
        active: {
          sourceFields: ['active', 'status', 'enabled', 'is_active', 'employed'],
          transform: 'parseBoolean'
        },
        hire_date: {
          sourceFields: ['hire_date', 'start_date', 'employment_date', 'joined_date'],
          transform: 'parseDate'
        },
        license_number: {
          sourceFields: ['license', 'license_number', 'certification', 'registration'],
          transform: 'cleanText'
        },
        instagram: {
          sourceFields: ['instagram', 'ig', 'social_media', 'instagram_handle'],
          transform: 'cleanText'
        },
        years_experience: {
          sourceFields: ['experience', 'years_experience', 'years_in_industry', 'experience_years'],
          transform: 'parseNumber'
        },
        schedule: {
          sourceFields: ['schedule', 'working_hours', 'availability', 'work_schedule'],
          transform: 'parseSchedule'
        }
      }
    }
  }

  /**
   * Transform raw data based on entity type and mapping
   * @param {Array} rawData - Raw CSV data
   * @param {string} entityType - Type of entity (customers, appointments, services)
   * @param {Object} fieldMapping - Custom field mapping (optional)
   * @returns {Object} Transformed data with validation results
   */
  async transformData(rawData, entityType, fieldMapping = null) {
    const schema = DataTransformer.UNIVERSAL_SCHEMA[entityType]
    if (!schema) {
      throw new Error(`Unknown entity type: ${entityType}`)
    }

    const results = {
      data: [],
      errors: [],
      warnings: [],
      stats: {
        total: rawData.length,
        valid: 0,
        invalid: 0,
        warnings: 0
      }
    }

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const transformed = await this.transformRow(row, schema, fieldMapping, i + 1)
      
      results.data.push(transformed)
      
      if (transformed.isValid) {
        results.stats.valid++
      } else {
        results.stats.invalid++
        results.errors.push(...transformed.errors)
      }
      
      if (transformed.warnings.length > 0) {
        results.stats.warnings++
        results.warnings.push(...transformed.warnings)
      }
    }

    return results
  }

  /**
   * Transform a single row of data
   * @param {Object} row - Raw row data
   * @param {Object} schema - Schema definition
   * @param {Object} customMapping - Custom field mapping
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object} Transformed row with metadata
   */
  async transformRow(row, schema, customMapping, rowNumber) {
    const result = {
      original: row,
      transformed: {},
      isValid: true,
      errors: [],
      warnings: [],
      rowNumber: rowNumber
    }

    // Process required fields
    for (const [targetField, config] of Object.entries(schema.required)) {
      const value = this.extractFieldValue(row, config.sourceFields, customMapping?.[targetField])
      
      if (value === null || value === undefined || value === '') {
        result.isValid = false
        result.errors.push({
          row: rowNumber,
          field: targetField,
          type: 'missing_required',
          message: `Required field "${targetField}" is missing`
        })
      } else {
        const transformed = await this.applyTransformation(value, config.transform)
        if (transformed.error) {
          result.errors.push({
            row: rowNumber,
            field: targetField,
            type: 'transformation_error',
            message: transformed.error
          })
          result.isValid = false
        } else {
          result.transformed[targetField] = transformed.value
          if (transformed.warning) {
            result.warnings.push({
              row: rowNumber,
              field: targetField,
              type: 'transformation_warning',
              message: transformed.warning
            })
          }
        }
      }
    }

    // Process optional fields
    for (const [targetField, config] of Object.entries(schema.optional || {})) {
      const value = this.extractFieldValue(row, config.sourceFields, customMapping?.[targetField])
      
      if (value !== null && value !== undefined && value !== '') {
        const transformed = await this.applyTransformation(value, config.transform)
        if (transformed.error && this.options.strictValidation) {
          result.errors.push({
            row: rowNumber,
            field: targetField,
            type: 'transformation_error',
            message: transformed.error
          })
        } else if (transformed.value !== null) {
          result.transformed[targetField] = transformed.value
          if (transformed.warning) {
            result.warnings.push({
              row: rowNumber,
              field: targetField,
              type: 'transformation_warning',
              message: transformed.warning
            })
          }
        }
      }
    }

    return result
  }

  /**
   * Extract field value from row using multiple possible source fields
   * @param {Object} row - Data row
   * @param {Array} sourceFields - Possible source field names
   * @param {string} customMapping - Custom mapping override
   * @returns {*} Field value
   */
  extractFieldValue(row, sourceFields, customMapping) {
    // Use custom mapping if provided
    if (customMapping && row[customMapping] !== undefined) {
      return row[customMapping]
    }

    // Try each source field
    for (const field of sourceFields) {
      // Handle field combinations (e.g., "first_name+last_name")
      if (field.includes('+')) {
        const parts = field.split('+')
        const values = parts.map(part => row[part]).filter(v => v)
        if (values.length === parts.length) {
          return values.join(' ')
        }
      } else if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field]
      }
    }

    // Try case-insensitive match
    const rowKeysLower = Object.keys(row).map(k => k.toLowerCase())
    for (const field of sourceFields) {
      const fieldLower = field.toLowerCase()
      const index = rowKeysLower.indexOf(fieldLower)
      if (index !== -1) {
        const actualKey = Object.keys(row)[index]
        return row[actualKey]
      }
    }

    return null
  }

  /**
   * Apply transformation to a value
   * @param {*} value - Value to transform
   * @param {string} transformType - Type of transformation
   * @returns {Object} Transformed value with error/warning
   */
  async applyTransformation(value, transformType) {
    try {
      switch (transformType) {
        case 'combineName':
          return { value: this.combineName(value) }
        
        case 'normalizeEmail':
          return this.normalizeEmail(value)
        
        case 'normalizePhone':
          return this.normalizePhone(value)
        
        case 'normalizeAddress':
          return { value: this.normalizeAddress(value) }
        
        case 'parseDate':
          return this.parseDate(value)
        
        case 'parseTime':
          return this.parseTime(value)
        
        case 'parseDuration':
          return this.parseDuration(value)
        
        case 'parsePrice':
          return this.parsePrice(value)
        
        case 'normalizeStatus':
          return this.normalizeStatus(value)
        
        case 'cleanText':
          return { value: this.cleanText(value) }
        
        case 'parseTags':
          return { value: this.parseTags(value) }
        
        case 'parseBoolean':
          return { value: this.parseBoolean(value) }
        
        default:
          return { value: value }
      }
    } catch (error) {
      return { error: error.message, value: null }
    }
  }

  // Transformation methods

  combineName(value) {
    if (typeof value !== 'string') return String(value)
    return value.trim().replace(/\s+/g, ' ')
  }

  normalizeEmail(email) {
    const cleaned = String(email).toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(cleaned)) {
      return { 
        value: cleaned,
        warning: `Invalid email format: ${email}`
      }
    }
    
    return { value: cleaned }
  }

  normalizePhone(phone) {
    try {
      const phoneStr = String(phone).replace(/\D/g, '')
      
      // Handle 10-digit US numbers
      if (phoneStr.length === 10 && this.options.defaultCountry === 'US') {
        const formatted = `+1${phoneStr}`
        return { value: formatted }
      }
      
      // Try to parse with libphonenumber
      const parsed = parsePhoneNumber(phone, this.options.defaultCountry)
      if (parsed && parsed.isValid()) {
        return { value: parsed.format('E.164') }
      }
      
      return {
        value: phoneStr,
        warning: `Could not validate phone number: ${phone}`
      }
    } catch (error) {
      return {
        value: String(phone).replace(/\D/g, ''),
        warning: `Phone number parsing failed: ${error.message}`
      }
    }
  }

  normalizeAddress(address) {
    if (!address) return ''
    return String(address).trim().replace(/\s+/g, ' ')
  }

  parseDate(dateStr) {
    if (!dateStr) return { value: null }
    
    const formats = {
      'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
      'MM-DD-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/
    }
    
    let parsed = null
    
    // Try ISO format first
    if (dateStr.includes('T')) {
      parsed = new Date(dateStr)
    } else {
      // Try configured format
      const format = this.options.dateFormat
      const regex = formats[format]
      
      if (regex) {
        const match = String(dateStr).match(regex)
        if (match) {
          if (format === 'MM/DD/YYYY' || format === 'MM-DD-YYYY') {
            parsed = new Date(match[3], match[1] - 1, match[2])
          } else if (format === 'DD/MM/YYYY') {
            parsed = new Date(match[3], match[2] - 1, match[1])
          } else if (format === 'YYYY-MM-DD') {
            parsed = new Date(match[1], match[2] - 1, match[3])
          }
        }
      }
    }
    
    if (parsed && !isNaN(parsed.getTime())) {
      return { value: parsed.toISOString() }
    }
    
    return {
      value: null,
      warning: `Could not parse date: ${dateStr}`
    }
  }

  parseTime(timeStr) {
    if (!timeStr) return { value: null }
    
    const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
    const match = String(timeStr).match(timeRegex)
    
    if (match) {
      let hours = parseInt(match[1])
      const minutes = parseInt(match[2])
      const seconds = match[3] ? parseInt(match[3]) : 0
      const meridiem = match[4]
      
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12
        if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0
      }
      
      return {
        value: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
    }
    
    return {
      value: timeStr,
      warning: `Could not parse time: ${timeStr}`
    }
  }

  parseDuration(duration) {
    if (typeof duration === 'number') {
      return { value: duration }
    }
    
    const str = String(duration).toLowerCase()
    
    // Try to parse different formats
    if (str.includes('hour') || str.includes('hr')) {
      const hours = parseFloat(str.match(/(\d+(?:\.\d+)?)/)?.[1] || 0)
      return { value: hours * 60 }
    }
    
    if (str.includes('min')) {
      const minutes = parseFloat(str.match(/(\d+(?:\.\d+)?)/)?.[1] || 0)
      return { value: minutes }
    }
    
    // Assume it's already in minutes
    const parsed = parseFloat(str)
    if (!isNaN(parsed)) {
      return { value: parsed }
    }
    
    return {
      value: 60, // Default to 1 hour
      warning: `Could not parse duration: ${duration}`
    }
  }

  parsePrice(price) {
    if (typeof price === 'number') {
      return { value: price }
    }
    
    // Remove currency symbols and parse
    const cleaned = String(price).replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    
    if (!isNaN(parsed)) {
      return { value: Math.round(parsed * 100) / 100 }
    }
    
    return {
      value: 0,
      warning: `Could not parse price: ${price}`
    }
  }

  normalizeStatus(status) {
    const str = String(status).toLowerCase().trim()
    
    const statusMap = {
      'confirmed': 'confirmed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'no-show': 'no_show',
      'no show': 'no_show',
      'pending': 'pending',
      'scheduled': 'confirmed',
      'done': 'completed',
      'finished': 'completed'
    }
    
    return {
      value: statusMap[str] || str,
      warning: !statusMap[str] ? `Unknown status: ${status}` : null
    }
  }

  cleanText(text) {
    if (!text) return ''
    return String(text).trim().replace(/\s+/g, ' ')
  }

  parseTags(tags) {
    if (Array.isArray(tags)) return tags
    
    const str = String(tags)
    if (str.includes(',')) {
      return str.split(',').map(t => t.trim()).filter(t => t)
    }
    if (str.includes(';')) {
      return str.split(';').map(t => t.trim()).filter(t => t)
    }
    
    return str ? [str.trim()] : []
  }

  parseBoolean(value) {
    const str = String(value).toLowerCase().trim()
    return str === 'true' || str === 'yes' || str === '1' || str === 'active' || str === 'enabled'
  }

  /**
   * Validate and normalize URL (especially for profile photos)
   * Handles various URL formats from different platforms
   */
  validateUrl(url) {
    if (!url) return { value: null }
    
    const urlStr = String(url).trim()
    
    // Handle data URLs (base64 encoded images)
    if (urlStr.startsWith('data:image')) {
      return { 
        value: urlStr,
        isDataUrl: true,
        warning: 'Image is base64 encoded - may need conversion'
      }
    }
    
    // Handle relative URLs (may need platform-specific prefix)
    if (urlStr.startsWith('/')) {
      return {
        value: urlStr,
        isRelative: true,
        warning: 'Relative URL detected - may need platform domain prefix'
      }
    }
    
    // Validate full URLs
    try {
      const parsed = new URL(urlStr)
      // Check if it's a valid image URL based on extension
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
      const hasImageExtension = imageExtensions.some(ext => 
        parsed.pathname.toLowerCase().endsWith(ext)
      )
      
      // Also check for image services (common CDNs)
      const imageServices = ['cloudinary', 'imgix', 'amazonaws', 'googleusercontent', 'squarespace', 'square-cdn']
      const isImageService = imageServices.some(service => 
        parsed.hostname.includes(service)
      )
      
      return {
        value: urlStr,
        isValid: true,
        isImage: hasImageExtension || isImageService,
        hostname: parsed.hostname
      }
    } catch (e) {
      // Not a valid URL, might be a platform-specific ID
      return {
        value: urlStr,
        isValid: false,
        warning: `Invalid URL format: ${urlStr}`,
        needsResolution: true
      }
    }
  }

  /**
   * Parse percentage values (for commission rates)
   */
  parsePercentage(value) {
    if (!value) return { value: null }
    
    const str = String(value).trim()
    
    // Remove % sign if present
    const cleaned = str.replace('%', '').trim()
    const parsed = parseFloat(cleaned)
    
    if (!isNaN(parsed)) {
      // If value is greater than 1, assume it's already a percentage
      // If less than or equal to 1, assume it's a decimal (0.5 = 50%)
      const percentage = parsed > 1 ? parsed : parsed * 100
      
      // Validate reasonable commission range (0-100%)
      if (percentage < 0 || percentage > 100) {
        return {
          value: percentage,
          warning: `Unusual commission rate: ${percentage}%`
        }
      }
      
      return { value: percentage }
    }
    
    return {
      value: null,
      warning: `Could not parse percentage: ${value}`
    }
  }

  /**
   * Parse numeric values (for years of experience, etc.)
   */
  parseNumber(value) {
    if (!value) return { value: null }
    
    const cleaned = String(value).replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    
    if (!isNaN(parsed)) {
      return { value: Math.round(parsed) }
    }
    
    // Try to extract number from text like "5 years" or "10+ years"
    const match = String(value).match(/(\d+)/)
    if (match) {
      return { value: parseInt(match[1]) }
    }
    
    return {
      value: null,
      warning: `Could not parse number: ${value}`
    }
  }

  /**
   * Parse schedule/availability data
   * This is complex as different platforms use different formats
   */
  parseSchedule(value) {
    if (!value) return { value: null }
    
    const str = String(value).trim()
    
    // Try to parse JSON schedule
    try {
      const parsed = JSON.parse(str)
      return { value: parsed }
    } catch (e) {
      // Not JSON, try other formats
    }
    
    // Common schedule formats:
    // "Mon-Fri: 9-5, Sat: 10-3"
    // "Monday to Friday 9:00 AM - 5:00 PM"
    // "M-F 9-5"
    
    const schedule = {}
    const days = {
      'mon': 'monday',
      'tue': 'tuesday',
      'wed': 'wednesday',
      'thu': 'thursday',
      'fri': 'friday',
      'sat': 'saturday',
      'sun': 'sunday'
    }
    
    // Try to extract day-time pairs
    const dayTimePattern = /([a-z]{3})[a-z]*\s*[-to]*\s*([a-z]{3})[a-z]*\s*:?\s*(\d{1,2}):?(\d{2})?\s*([ap]m)?\s*[-to]*\s*(\d{1,2}):?(\d{2})?\s*([ap]m)?/gi
    const singleDayPattern = /([a-z]{3})[a-z]*\s*:?\s*(\d{1,2}):?(\d{2})?\s*([ap]m)?\s*[-to]*\s*(\d{1,2}):?(\d{2})?\s*([ap]m)?/gi
    
    // For now, return as raw text - actual parsing would be more complex
    return {
      value: str,
      isParsed: false,
      warning: 'Schedule stored as text - may need manual review'
    }
  }
}

export default new DataTransformer()