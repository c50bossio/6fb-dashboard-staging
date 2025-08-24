/**
 * Rule Validator Module
 * 
 * Validates booking rules for consistency, completeness, and conflicts
 * before they are saved or evaluated
 */

export class RuleValidator {
  constructor() {
    this.validationErrors = []
    this.validationWarnings = []
  }

  /**
   * Validate a complete rule set
   */
  validate(rules) {
    this.validationErrors = []
    this.validationWarnings = []

    // Validate structure
    this.validateStructure(rules)
    
    // Validate business logic
    this.validateBusinessLogic(rules)
    
    // Validate time consistency
    this.validateTimeConsistency(rules)
    
    // Validate payment logic
    this.validatePaymentLogic(rules)
    
    // Validate dynamic rules
    this.validateDynamicRules(rules)

    return {
      isValid: this.validationErrors.length === 0,
      errors: this.validationErrors,
      warnings: this.validationWarnings
    }
  }

  /**
   * Validate rule structure and required fields
   */
  validateStructure(rules) {
    const requiredSections = ['scheduling', 'hours', 'payment', 'client']
    
    for (const section of requiredSections) {
      if (!rules[section]) {
        this.validationErrors.push({
          field: section,
          message: `Missing required section: ${section}`
        })
      }
    }

    // Validate scheduling structure
    if (rules.scheduling) {
      const requiredSchedulingFields = [
        'advance_booking_days',
        'min_booking_hours',
        'max_bookings_per_day'
      ]
      
      for (const field of requiredSchedulingFields) {
        if (rules.scheduling[field] === undefined) {
          this.validationErrors.push({
            field: `scheduling.${field}`,
            message: `Missing required field: ${field}`
          })
        }
      }
    }

    // Validate hours structure
    if (rules.hours?.regular) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      for (const day of days) {
        if (!rules.hours.regular[day]) {
          this.validationErrors.push({
            field: `hours.regular.${day}`,
            message: `Missing hours for ${day}`
          })
        } else {
          const dayHours = rules.hours.regular[day]
          if (!dayHours.closed && (!dayHours.open || !dayHours.close)) {
            this.validationErrors.push({
              field: `hours.regular.${day}`,
              message: `${day} must have open and close times or be marked as closed`
            })
          }
        }
      }
    }
  }

  /**
   * Validate business logic consistency
   */
  validateBusinessLogic(rules) {
    // Check advance booking logic
    if (rules.scheduling) {
      const { advance_booking_days, min_booking_hours } = rules.scheduling
      
      if (min_booking_hours > advance_booking_days * 24) {
        this.validationErrors.push({
          field: 'scheduling',
          message: 'Minimum booking hours cannot exceed advance booking days'
        })
      }

      if (advance_booking_days < 1) {
        this.validationWarnings.push({
          field: 'scheduling.advance_booking_days',
          message: 'Very short advance booking window may limit customer bookings'
        })
      }

      if (rules.scheduling.max_per_customer_per_day > rules.scheduling.max_bookings_per_day) {
        this.validationErrors.push({
          field: 'scheduling.max_per_customer_per_day',
          message: 'Customer daily limit cannot exceed total daily limit'
        })
      }
    }

    // Check buffer time logic
    if (rules.scheduling?.buffer_between_appointments) {
      const buffer = rules.scheduling.buffer_between_appointments
      
      if (buffer > 60) {
        this.validationWarnings.push({
          field: 'scheduling.buffer_between_appointments',
          message: 'Large buffer time (>60 min) may significantly reduce available slots'
        })
      }

      if (buffer < 0) {
        this.validationErrors.push({
          field: 'scheduling.buffer_between_appointments',
          message: 'Buffer time cannot be negative'
        })
      }
    }

    // Check slot interval logic
    if (rules.scheduling?.slot_intervals) {
      const intervals = rules.scheduling.slot_intervals
      
      if (!Array.isArray(intervals) || intervals.length === 0) {
        this.validationErrors.push({
          field: 'scheduling.slot_intervals',
          message: 'At least one slot interval must be defined'
        })
      } else {
        for (const interval of intervals) {
          if (interval < 5) {
            this.validationWarnings.push({
              field: 'scheduling.slot_intervals',
              message: `Very short interval (${interval} min) may cause scheduling issues`
            })
          }
          if (interval > 240) {
            this.validationWarnings.push({
              field: 'scheduling.slot_intervals',
              message: `Very long interval (${interval} min) may limit flexibility`
            })
          }
        }
      }
    }
  }

  /**
   * Validate time consistency across rules
   */
  validateTimeConsistency(rules) {
    if (!rules.hours?.regular) return

    // Check for at least one open day
    const days = Object.values(rules.hours.regular)
    const hasOpenDay = days.some(day => !day.closed)
    
    if (!hasOpenDay) {
      this.validationErrors.push({
        field: 'hours.regular',
        message: 'At least one day must be open for business'
      })
    }

    // Validate time formats and ranges
    for (const [day, hours] of Object.entries(rules.hours.regular)) {
      if (!hours.closed) {
        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        
        if (!timeRegex.test(hours.open)) {
          this.validationErrors.push({
            field: `hours.regular.${day}.open`,
            message: `Invalid time format: ${hours.open}`
          })
        }
        
        if (!timeRegex.test(hours.close)) {
          this.validationErrors.push({
            field: `hours.regular.${day}.close`,
            message: `Invalid time format: ${hours.close}`
          })
        }

        // Check that close time is after open time
        const [openHour, openMin] = hours.open.split(':').map(Number)
        const [closeHour, closeMin] = hours.close.split(':').map(Number)
        
        const openMinutes = openHour * 60 + openMin
        const closeMinutes = closeHour * 60 + closeMin
        
        if (closeMinutes <= openMinutes) {
          this.validationErrors.push({
            field: `hours.regular.${day}`,
            message: 'Close time must be after open time'
          })
        }

        // Check for reasonable hours
        if (closeMinutes - openMinutes < 60) {
          this.validationWarnings.push({
            field: `hours.regular.${day}`,
            message: 'Very short business hours (< 1 hour)'
          })
        }

        if (closeMinutes - openMinutes > 960) { // 16 hours
          this.validationWarnings.push({
            field: `hours.regular.${day}`,
            message: 'Very long business hours (> 16 hours)'
          })
        }
      }
    }

    // Validate hour overrides
    if (rules.hours.overrides) {
      for (const override of rules.hours.overrides) {
        if (!override.date) {
          this.validationErrors.push({
            field: 'hours.overrides',
            message: 'Override must have a date'
          })
        }

        if (!override.hours && !override.closed) {
          this.validationErrors.push({
            field: 'hours.overrides',
            message: 'Override must specify hours or closed status'
          })
        }
      }
    }
  }

  /**
   * Validate payment and cancellation logic
   */
  validatePaymentLogic(rules) {
    if (!rules.payment) return

    // Check payment method availability
    const { accept_cash, accept_card, accept_online } = rules.payment
    
    if (!accept_cash && !accept_card && !accept_online) {
      this.validationErrors.push({
        field: 'payment',
        message: 'At least one payment method must be accepted'
      })
    }

    // Validate deposit logic
    if (rules.payment.require_deposit) {
      const depositPercentage = rules.payment.deposit_percentage
      
      if (!depositPercentage || depositPercentage <= 0) {
        this.validationErrors.push({
          field: 'payment.deposit_percentage',
          message: 'Deposit percentage must be greater than 0 when deposits are required'
        })
      }
      
      if (depositPercentage > 100) {
        this.validationErrors.push({
          field: 'payment.deposit_percentage',
          message: 'Deposit percentage cannot exceed 100%'
        })
      }

      if (!rules.payment.accept_online) {
        this.validationWarnings.push({
          field: 'payment',
          message: 'Requiring deposits without online payments may be difficult to enforce'
        })
      }
    }

    // Validate cancellation policy
    if (rules.payment.cancellation_window !== undefined) {
      const window = rules.payment.cancellation_window
      
      if (window < 0) {
        this.validationErrors.push({
          field: 'payment.cancellation_window',
          message: 'Cancellation window cannot be negative'
        })
      }
      
      if (window > 168) { // 7 days
        this.validationWarnings.push({
          field: 'payment.cancellation_window',
          message: 'Very long cancellation window (> 7 days) may lead to many cancellations'
        })
      }
    }

    // Validate fees
    if (rules.payment.cancellation_fee !== undefined) {
      if (rules.payment.cancellation_fee < 0) {
        this.validationErrors.push({
          field: 'payment.cancellation_fee',
          message: 'Cancellation fee cannot be negative'
        })
      }
      
      if (rules.payment.cancellation_fee > 200) {
        this.validationWarnings.push({
          field: 'payment.cancellation_fee',
          message: 'Very high cancellation fee may deter bookings'
        })
      }
    }

    if (rules.payment.no_show_fee !== undefined) {
      if (rules.payment.no_show_fee < 0) {
        this.validationErrors.push({
          field: 'payment.no_show_fee',
          message: 'No-show fee cannot be negative'
        })
      }
      
      if (rules.payment.no_show_fee > 200) {
        this.validationWarnings.push({
          field: 'payment.no_show_fee',
          message: 'Very high no-show fee may deter bookings'
        })
      }
    }
  }

  /**
   * Validate dynamic rules
   */
  validateDynamicRules(rules) {
    if (!rules.dynamic || !Array.isArray(rules.dynamic)) return

    for (let i = 0; i < rules.dynamic.length; i++) {
      const rule = rules.dynamic[i]
      
      if (!rule.name) {
        this.validationErrors.push({
          field: `dynamic[${i}]`,
          message: 'Dynamic rule must have a name'
        })
      }

      if (!rule.conditions || !Array.isArray(rule.conditions) || rule.conditions.length === 0) {
        this.validationErrors.push({
          field: `dynamic[${i}].conditions`,
          message: 'Dynamic rule must have at least one condition'
        })
      } else {
        // Validate each condition
        for (let j = 0; j < rule.conditions.length; j++) {
          const condition = rule.conditions[j]
          
          if (!condition.field) {
            this.validationErrors.push({
              field: `dynamic[${i}].conditions[${j}]`,
              message: 'Condition must specify a field'
            })
          }
          
          if (!condition.operator) {
            this.validationErrors.push({
              field: `dynamic[${i}].conditions[${j}]`,
              message: 'Condition must specify an operator'
            })
          }
          
          if (condition.value === undefined) {
            this.validationErrors.push({
              field: `dynamic[${i}].conditions[${j}]`,
              message: 'Condition must specify a value'
            })
          }

          // Validate operator
          const validOperators = [
            'equals', 'not_equals', 'greater_than', 'less_than',
            'contains', 'in', 'between'
          ]
          
          if (!validOperators.includes(condition.operator)) {
            this.validationErrors.push({
              field: `dynamic[${i}].conditions[${j}].operator`,
              message: `Invalid operator: ${condition.operator}`
            })
          }

          // Validate value types for specific operators
          if (condition.operator === 'between' && (!Array.isArray(condition.value) || condition.value.length !== 2)) {
            this.validationErrors.push({
              field: `dynamic[${i}].conditions[${j}].value`,
              message: 'Between operator requires array with two values'
            })
          }
          
          if (condition.operator === 'in' && !Array.isArray(condition.value)) {
            this.validationErrors.push({
              field: `dynamic[${i}].conditions[${j}].value`,
              message: 'In operator requires array value'
            })
          }
        }
      }

      if (!rule.action) {
        this.validationErrors.push({
          field: `dynamic[${i}].action`,
          message: 'Dynamic rule must specify an action'
        })
      } else {
        const validActions = ['block', 'warn', 'surcharge', 'require_approval']
        
        if (!validActions.includes(rule.action)) {
          this.validationErrors.push({
            field: `dynamic[${i}].action`,
            message: `Invalid action: ${rule.action}`
          })
        }

        // Validate action-specific fields
        if (rule.action === 'surcharge' && (!rule.surcharge_percentage || rule.surcharge_percentage <= 0)) {
          this.validationErrors.push({
            field: `dynamic[${i}].surcharge_percentage`,
            message: 'Surcharge action requires positive percentage'
          })
        }
      }
    }
  }

  /**
   * Validate service-specific rules
   */
  validateServiceRules(serviceRules) {
    const errors = []
    const warnings = []

    for (const [serviceId, rules] of Object.entries(serviceRules)) {
      if (rules.min_advance_hours !== undefined && rules.min_advance_hours < 0) {
        errors.push({
          field: `services.${serviceId}.min_advance_hours`,
          message: 'Minimum advance hours cannot be negative'
        })
      }

      if (rules.available_days && (!Array.isArray(rules.available_days) || rules.available_days.length === 0)) {
        errors.push({
          field: `services.${serviceId}.available_days`,
          message: 'Available days must be a non-empty array'
        })
      }

      if (rules.required_barber_ids && !Array.isArray(rules.required_barber_ids)) {
        errors.push({
          field: `services.${serviceId}.required_barber_ids`,
          message: 'Required barber IDs must be an array'
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate barber-specific rules
   */
  validateBarberRules(barberRules) {
    const errors = []
    const warnings = []

    for (const [barberId, rules] of Object.entries(barberRules)) {
      if (rules.custom_hours) {
        // Apply same validation as regular business hours
        for (const [day, hours] of Object.entries(rules.custom_hours)) {
          if (!hours.closed && (!hours.open || !hours.close)) {
            errors.push({
              field: `barbers.${barberId}.custom_hours.${day}`,
              message: 'Custom hours must specify open/close times or closed status'
            })
          }
        }
      }

      if (rules.blocked_services && !Array.isArray(rules.blocked_services)) {
        errors.push({
          field: `barbers.${barberId}.blocked_services`,
          message: 'Blocked services must be an array'
        })
      }
    }

    return { errors, warnings }
  }
}

export default RuleValidator