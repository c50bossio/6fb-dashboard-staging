/**
 * Field Normalizer Utility
 * 
 * Handles conversion between camelCase and snake_case field names
 * to ensure consistency across the booking rules system
 */

export class FieldNormalizer {
  /**
   * Convert camelCase to snake_case
   */
  static toSnakeCase(str) {
    if (!str) return str
    
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '') // Remove leading underscore if present
  }

  /**
   * Convert snake_case to camelCase
   */
  static toCamelCase(str) {
    if (!str) return str
    
    return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
  }

  /**
   * Normalize an entire object from camelCase to snake_case
   */
  static normalizeObject(obj, toSnakeCase = true) {
    if (!obj || typeof obj !== 'object') return obj
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeObject(item, toSnakeCase))
    }
    
    const normalized = {}
    const converter = toSnakeCase ? this.toSnakeCase : this.toCamelCase
    
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = converter(key)
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        normalized[normalizedKey] = this.normalizeObject(value, toSnakeCase)
      } else if (Array.isArray(value)) {
        normalized[normalizedKey] = value.map(item => 
          typeof item === 'object' ? this.normalizeObject(item, toSnakeCase) : item
        )
      } else {
        normalized[normalizedKey] = value
      }
    }
    
    return normalized
  }

  /**
   * Get value from object using either camelCase or snake_case key
   */
  static getValue(obj, key) {
    if (!obj || !key) return undefined
    
    // Try direct access first
    if (obj.hasOwnProperty(key)) {
      return obj[key]
    }
    
    // Try snake_case version
    const snakeKey = this.toSnakeCase(key)
    if (obj.hasOwnProperty(snakeKey)) {
      return obj[snakeKey]
    }
    
    // Try camelCase version
    const camelKey = this.toCamelCase(key)
    if (obj.hasOwnProperty(camelKey)) {
      return obj[camelKey]
    }
    
    return undefined
  }

  /**
   * Set value in object using normalized key
   */
  static setValue(obj, key, value, preferSnakeCase = true) {
    if (!obj || !key) return obj
    
    const normalizedKey = preferSnakeCase ? this.toSnakeCase(key) : this.toCamelCase(key)
    obj[normalizedKey] = value
    
    return obj
  }

  /**
   * Map field names between formats
   */
  static createFieldMap() {
    return {
      // Scheduling fields
      'advanceBookingDays': 'advance_booking_days',
      'minBookingHours': 'min_booking_hours',
      'maxBookingsPerDay': 'max_bookings_per_day',
      'bufferBetweenAppointments': 'buffer_between_appointments',
      'slotIntervals': 'slot_intervals',
      'allowDoubleBooking': 'allow_double_booking',
      'maxPerCustomerPerDay': 'max_per_customer_per_day',
      
      // Business hours
      'businessHours': 'business_hours',
      'hoursOverrides': 'hours_overrides',
      
      // Payment fields
      'acceptCash': 'accept_cash',
      'acceptCard': 'accept_card',
      'acceptOnline': 'accept_online',
      'requireDeposit': 'require_deposit',
      'depositPercentage': 'deposit_percentage',
      'cancellationWindow': 'cancellation_window',
      'cancellationFee': 'cancellation_fee',
      'noShowFee': 'no_show_fee',
      
      // Client fields
      'requirePhone': 'require_phone',
      'requireEmail': 'require_email',
      'allowWalkIns': 'allow_walk_ins',
      'newClientsAllowed': 'new_clients_allowed',
      'requireApproval': 'require_approval',
      
      // Service and barber rules
      'serviceRules': 'service_rules',
      'barberRules': 'barber_rules',
      'dynamicRules': 'dynamic_rules',
      
      // Metadata
      'effectiveFrom': 'effective_from',
      'effectiveUntil': 'effective_until',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'createdBy': 'created_by',
      'updatedBy': 'updated_by'
    }
  }

  /**
   * Migrate legacy field names to new format
   */
  static migrateLegacyFields(data) {
    const fieldMap = this.createFieldMap()
    const migrated = { ...data }
    
    // First pass: rename fields
    for (const [oldName, newName] of Object.entries(fieldMap)) {
      if (migrated.hasOwnProperty(oldName) && !migrated.hasOwnProperty(newName)) {
        migrated[newName] = migrated[oldName]
        delete migrated[oldName]
      }
    }
    
    // Second pass: handle nested objects
    if (migrated.business_hours && typeof migrated.business_hours === 'object') {
      migrated.business_hours = this.normalizeObject(migrated.business_hours, true)
    }
    
    if (migrated.service_rules && typeof migrated.service_rules === 'object') {
      migrated.service_rules = this.normalizeObject(migrated.service_rules, true)
    }
    
    if (migrated.barber_rules && typeof migrated.barber_rules === 'object') {
      migrated.barber_rules = this.normalizeObject(migrated.barber_rules, true)
    }
    
    if (migrated.dynamic_rules && Array.isArray(migrated.dynamic_rules)) {
      migrated.dynamic_rules = migrated.dynamic_rules.map(rule => 
        this.normalizeObject(rule, true)
      )
    }
    
    return migrated
  }

  /**
   * Validate field name consistency
   */
  static validateFieldNames(data, preferSnakeCase = true) {
    const issues = []
    const expectedFormat = preferSnakeCase ? 'snake_case' : 'camelCase'
    const pattern = preferSnakeCase ? /^[a-z]+(_[a-z]+)*$/ : /^[a-z][a-zA-Z0-9]*$/
    
    const checkObject = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return
      
      for (const key of Object.keys(obj)) {
        const fullPath = path ? `${path}.${key}` : key
        
        // Check if key matches expected format
        if (!pattern.test(key)) {
          issues.push({
            path: fullPath,
            key,
            expected: expectedFormat,
            suggestion: preferSnakeCase ? this.toSnakeCase(key) : this.toCamelCase(key)
          })
        }
        
        // Recursively check nested objects
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          checkObject(obj[key], fullPath)
        }
      }
    }
    
    checkObject(data)
    
    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Auto-fix field naming issues
   */
  static autoFix(data, preferSnakeCase = true) {
    return this.normalizeObject(data, preferSnakeCase)
  }

  /**
   * Create a proxy that handles both naming conventions
   */
  static createFlexibleProxy(target) {
    return new Proxy(target, {
      get: (obj, prop) => {
        // Try original property first
        if (prop in obj) {
          return obj[prop]
        }
        
        // Try snake_case version
        const snakeProp = this.toSnakeCase(prop)
        if (snakeProp in obj) {
          return obj[snakeProp]
        }
        
        // Try camelCase version
        const camelProp = this.toCamelCase(prop)
        if (camelProp in obj) {
          return obj[camelProp]
        }
        
        return undefined
      },
      
      set: (obj, prop, value) => {
        // Determine if we should use snake_case based on existing keys
        const hasSnakeCase = Object.keys(obj).some(key => key.includes('_'))
        const normalizedProp = hasSnakeCase ? this.toSnakeCase(prop) : prop
        
        obj[normalizedProp] = value
        return true
      }
    })
  }
}

/**
 * React hook for field normalization
 */
export function useFieldNormalizer(preferSnakeCase = true) {
  const normalize = useCallback((data) => {
    return FieldNormalizer.normalizeObject(data, preferSnakeCase)
  }, [preferSnakeCase])
  
  const getValue = useCallback((obj, key) => {
    return FieldNormalizer.getValue(obj, key)
  }, [])
  
  const setValue = useCallback((obj, key, value) => {
    return FieldNormalizer.setValue(obj, key, value, preferSnakeCase)
  }, [preferSnakeCase])
  
  const validateNames = useCallback((data) => {
    return FieldNormalizer.validateFieldNames(data, preferSnakeCase)
  }, [preferSnakeCase])
  
  const autoFix = useCallback((data) => {
    return FieldNormalizer.autoFix(data, preferSnakeCase)
  }, [preferSnakeCase])
  
  return {
    normalize,
    getValue,
    setValue,
    validateNames,
    autoFix,
    toSnakeCase: FieldNormalizer.toSnakeCase,
    toCamelCase: FieldNormalizer.toCamelCase
  }
}

export default FieldNormalizer