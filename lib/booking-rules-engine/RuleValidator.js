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
   * Enhanced conflict detection for barbershop-specific rules
   * Detects conflicts that would cause issues in practical barbershop operations
   */
  detectRuleConflicts(rules, services = [], averageServicePrice = 50) {
    const conflicts = []
    const warnings = []

    // Conflict 1: Cancellation window longer than booking window
    if (rules.cancellationWindow && rules.minAdvanceBooking) {
      const cancellationMinutes = rules.cancellationWindow * 60
      if (cancellationMinutes > rules.minAdvanceBooking) {
        conflicts.push({
          type: 'critical',
          field: ['cancellationWindow', 'minAdvanceBooking'],
          title: 'Impossible Cancellation Policy',
          message: `Cancellation window (${rules.cancellationWindow}h) is longer than minimum booking advance (${Math.round(rules.minAdvanceBooking / 60)}h). Clients cannot cancel within your policy.`,
          impact: 'Clients will be unable to follow your cancellation policy',
          suggestion: `Reduce cancellation window to ${Math.round(rules.minAdvanceBooking / 60 / 2)}h or increase booking advance time`
        })
      }
    }

    // Conflict 2: Deposit requirements with no online payment processing
    // Note: We assume online payments are available if deposits are required for this demo
    // In a real implementation, this would check actual payment processor configuration
    if (rules.requireDeposit && rules.acceptOnlinePayments === false) {
      conflicts.push({
        type: 'critical',
        field: ['requireDeposit', 'acceptOnlinePayments'],
        title: 'Deposit Without Payment Processing',
        message: 'Requiring deposits but not accepting online payments makes enforcement nearly impossible.',
        impact: 'Cannot collect deposits, defeats the purpose of the policy',
        suggestion: 'Enable online payment processing or remove deposit requirement'
      })
    }

    // Conflict 3: No-show fees higher than average service price
    if (rules.noShowFee && rules.noShowFeeType === 'fixed' && rules.noShowFee > averageServicePrice * 1.5) {
      conflicts.push({
        type: 'major',
        field: ['noShowFee'],
        title: 'Excessive No-Show Fee',
        message: `No-show fee ($${rules.noShowFee}) exceeds 150% of average service price ($${averageServicePrice}).`,
        impact: 'May violate consumer protection laws and deter legitimate bookings',
        suggestion: `Reduce to $${Math.round(averageServicePrice * 0.5)} or use percentage-based fee`
      })
    }

    // Conflict 4: Percentage fees that could exceed service cost
    if (rules.noShowFee && rules.noShowFeeType === 'percentage' && rules.noShowFee > 100) {
      conflicts.push({
        type: 'critical',
        field: ['noShowFee'],
        title: 'Invalid Percentage Fee',
        message: `No-show fee percentage (${rules.noShowFee}%) cannot exceed 100% of service cost.`,
        impact: 'Mathematically impossible to calculate fees',
        suggestion: 'Set percentage between 25-100% or use fixed fee amount'
      })
    }

    // Conflict 5: Conflicting booking limits
    if (rules.maxBookingsPerDay > 0 && rules.maxBookingsPerWeek > 0) {
      const theoreticalWeeklyMax = rules.maxBookingsPerDay * 7
      if (rules.maxBookingsPerWeek > theoreticalWeeklyMax) {
        conflicts.push({
          type: 'minor',
          field: ['maxBookingsPerDay', 'maxBookingsPerWeek'],
          title: 'Inconsistent Booking Limits',
          message: `Weekly limit (${rules.maxBookingsPerWeek}) exceeds 7 days × daily limit (${theoreticalWeeklyMax}).`,
          impact: 'Weekly limit will never be reached, making it meaningless',
          suggestion: `Set weekly limit to ${theoreticalWeeklyMax} or lower`
        })
      }
    }

    // Conflict 6: Unrealistic booking advance requirements
    if (rules.maxAdvanceBooking && rules.minAdvanceBooking) {
      const maxAdvanceMinutes = rules.maxAdvanceBooking * 24 * 60
      if (rules.minAdvanceBooking >= maxAdvanceMinutes) {
        conflicts.push({
          type: 'critical',
          field: ['minAdvanceBooking', 'maxAdvanceBooking'],
          title: 'Impossible Booking Window',
          message: 'Minimum advance booking meets or exceeds maximum advance booking window.',
          impact: 'No valid booking window exists for clients',
          suggestion: 'Ensure minimum advance is significantly less than maximum advance'
        })
      }
    }

    // Conflict 7: Reschedule window conflicts
    if (rules.allowRescheduling && rules.rescheduleWindow && rules.cancellationWindow) {
      if (rules.rescheduleWindow > rules.cancellationWindow) {
        warnings.push({
          type: 'minor',
          field: ['rescheduleWindow', 'cancellationWindow'],
          title: 'Reschedule vs Cancellation Policy Mismatch',
          message: `Reschedule window (${rules.rescheduleWindow}h) is longer than cancellation window (${rules.cancellationWindow}h).`,
          impact: 'Clients may cancel instead of rescheduling',
          suggestion: 'Consider making reschedule window shorter than or equal to cancellation window'
        })
      }
    }

    // Conflict 8: Full payment + deposit requirement
    if (rules.requireFullPayment && rules.requireDeposit) {
      conflicts.push({
        type: 'minor',
        field: ['requireFullPayment', 'requireDeposit'],
        title: 'Redundant Payment Requirements',
        message: 'Requiring both full payment and deposits is redundant.',
        impact: 'Confusing for clients, unnecessary complexity',
        suggestion: 'Choose either full payment OR deposit requirement, not both'
      })
    }

    // Conflict 9: No-show strikes with blocking but no enforcement
    if (rules.blockAfterNoShows && rules.noShowStrikeLimit > 0 && !rules.requirePhoneVerification && !rules.requireEmailConfirmation) {
      warnings.push({
        type: 'major',
        field: ['blockAfterNoShows', 'requirePhoneVerification', 'requireEmailConfirmation'],
        title: 'Unenforceable Client Blocking',
        message: 'Blocking clients after no-shows requires verified contact information.',
        impact: 'Blocked clients can easily create new accounts',
        suggestion: 'Enable phone or email verification to make blocking effective'
      })
    }

    // Conflict 10: Same-day booking with long advance requirements
    if (rules.allowSameDayBooking && rules.minAdvanceBooking > 480) { // 8 hours
      warnings.push({
        type: 'minor',
        field: ['allowSameDayBooking', 'minAdvanceBooking'],
        title: 'Contradictory Same-Day Policy',
        message: `Allowing same-day booking but requiring ${Math.round(rules.minAdvanceBooking / 60)}h advance notice.`,
        impact: 'Same-day booking feature will rarely be usable',
        suggestion: 'Reduce advance notice to 2-4 hours for effective same-day booking'
      })
    }

    // Conflict 11: Unrealistic service-specific conflicts
    if (services && services.length > 0) {
      services.forEach(service => {
        if (service.duration && rules.minAdvanceBooking) {
          // Service longer than advance booking window
          if (service.duration > rules.minAdvanceBooking) {
            warnings.push({
              type: 'major',
              field: ['minAdvanceBooking'],
              title: `Service Duration Conflict: ${service.name}`,
              message: `${service.name} (${service.duration}min) is longer than minimum advance booking window.`,
              impact: 'This service cannot be booked under current rules',
              suggestion: 'Increase advance booking window or create service-specific rules'
            })
          }
        }
      })
    }

    // Conflict 12: Notification conflicts
    if ((rules.sendReminderEmail || rules.sendReminderSMS) && rules.reminderTiming > rules.cancellationWindow) {
      warnings.push({
        type: 'minor',
        field: ['reminderTiming', 'cancellationWindow'],
        title: 'Reminder After Cancellation Deadline',
        message: `Reminders sent ${rules.reminderTiming}h before, but cancellations allowed only ${rules.cancellationWindow}h before.`,
        impact: 'Clients receive reminders after they can no longer cancel',
        suggestion: 'Send reminders before cancellation deadline or extend cancellation window'
      })
    }

    return {
      conflicts: conflicts.filter(c => c.type === 'critical' || c.type === 'major'),
      warnings: [...conflicts.filter(c => c.type === 'minor'), ...warnings],
      hasConflicts: conflicts.some(c => c.type === 'critical' || c.type === 'major'),
      hasWarnings: conflicts.some(c => c.type === 'minor') || warnings.length > 0
    }
  }

  /**
   * Validate rules against business context (service prices, operating hours, etc.)
   */
  validateBusinessContext(rules, businessContext = {}) {
    const contextErrors = []
    const contextWarnings = []

    const {
      averageServicePrice = 50,
      peakHours = ['9:00-12:00', '17:00-19:00'],
      services = [],
      operatingHours = { open: '09:00', close: '18:00' }
    } = businessContext

    // Check fee reasonableness against service prices
    if (rules.cancellationFee && rules.cancellationFeeType === 'fixed') {
      if (rules.cancellationFee > averageServicePrice * 0.75) {
        contextWarnings.push({
          field: 'cancellationFee',
          message: `Cancellation fee ($${rules.cancellationFee}) is high compared to average service price ($${averageServicePrice})`
        })
      }
    }

    // Check if booking limits are reasonable for operating hours
    if (rules.maxBookingsPerDay > 0) {
      const operatingMinutes = this.calculateOperatingMinutes(operatingHours)
      const averageServiceDuration = services.length > 0 
        ? services.reduce((sum, s) => sum + (s.duration || 30), 0) / services.length
        : 30

      const theoreticalMaxBookings = Math.floor(operatingMinutes / averageServiceDuration)
      
      if (rules.maxBookingsPerDay > theoreticalMaxBookings * 1.5) {
        contextWarnings.push({
          field: 'maxBookingsPerDay',
          message: `Daily booking limit (${rules.maxBookingsPerDay}) seems unrealistic for ${Math.round(operatingMinutes/60)}h operating day`
        })
      }
    }

    // Check reminder timing against business hours
    if (rules.reminderTiming > 24) {
      const operatingDays = this.getOperatingDays(businessContext.schedule || {})
      if (operatingDays < 6) { // If not open most days
        contextWarnings.push({
          field: 'reminderTiming',
          message: `${rules.reminderTiming}h reminder may fall on non-operating days`
        })
      }
    }

    return { errors: contextErrors, warnings: contextWarnings }
  }

  /**
   * Helper method to calculate operating minutes per day
   */
  calculateOperatingMinutes(operatingHours) {
    if (!operatingHours || !operatingHours.open || !operatingHours.close) return 480 // Default 8 hours
    
    const [openHour, openMin] = operatingHours.open.split(':').map(Number)
    const [closeHour, closeMin] = operatingHours.close.split(':').map(Number)
    
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    return closeMinutes - openMinutes
  }

  /**
   * Helper method to count operating days
   */
  getOperatingDays(schedule) {
    if (!schedule || typeof schedule !== 'object') return 7 // Default to 7 days
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return days.filter(day => schedule[day] && !schedule[day].closed).length
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

  /**
   * Apply automatic fix for a specific rule conflict or warning
   * @param {Object} rules - Current rules object
   * @param {Object} issue - The conflict/warning issue to fix
   * @param {Array} services - Available services for context
   * @returns {Object} Updated rules object with fix applied
   */
  static applyFix(rules, issue, services = []) {
    const updatedRules = { ...rules }

    switch (issue.field?.[0] || issue.field) {
      case 'cancellationWindow':
      case 'minAdvanceBooking':
        // Fix: Service Duration Conflict or Cancellation/Advance booking mismatch
        if (issue.title?.includes('Service Duration Conflict')) {
          // Find the longest service duration
          const maxServiceDuration = Math.max(...services.map(s => s.duration || 30))
          updatedRules.minAdvanceBooking = Math.max(maxServiceDuration + 60, updatedRules.minAdvanceBooking || 0)
        } else if (issue.title?.includes('Impossible Cancellation Policy')) {
          // Reduce cancellation window to half of min advance booking
          updatedRules.cancellationWindow = Math.floor((updatedRules.minAdvanceBooking || 120) / 60 / 2)
        }
        break

      case 'reminderTiming':
        // Fix: Reminder After Cancellation Deadline
        if (issue.title?.includes('Reminder After Cancellation Deadline')) {
          // Set reminder timing to be 2 hours before cancellation deadline
          updatedRules.reminderTiming = Math.max(1, (updatedRules.cancellationWindow || 24) - 2)
        }
        break

      case 'noShowFee':
        // Fix: Excessive No-Show Fee
        if (issue.title?.includes('Excessive No-Show Fee')) {
          const averageServicePrice = services.length > 0 
            ? services.reduce((sum, s) => sum + (s.price || 50), 0) / services.length 
            : 50
          updatedRules.noShowFee = Math.round(averageServicePrice * 0.5)
        } else if (issue.title?.includes('Invalid Percentage Fee')) {
          updatedRules.noShowFee = 75 // Set to 75%
        }
        break

      case 'requireFullPayment':
        // Fix: Redundant Payment Requirements
        if (issue.title?.includes('Redundant Payment Requirements')) {
          updatedRules.requireFullPayment = false // Keep deposit, remove full payment
        }
        break

      case 'requireDeposit':
        // Fix: Deposit Without Payment Processing
        if (issue.title?.includes('Deposit Without Payment Processing')) {
          updatedRules.acceptOnlinePayments = true
        }
        break

      case 'maxBookingsPerWeek':
        // Fix: Inconsistent Booking Limits
        if (issue.title?.includes('Inconsistent Booking Limits')) {
          const theoreticalWeeklyMax = (updatedRules.maxBookingsPerDay || 10) * 7
          updatedRules.maxBookingsPerWeek = theoreticalWeeklyMax
        }
        break

      case 'allowSameDayBooking':
        // Fix: Contradictory Same-Day Policy
        if (issue.title?.includes('Contradictory Same-Day Policy')) {
          updatedRules.minAdvanceBooking = 240 // 4 hours
        }
        break

      case 'rescheduleWindow':
        // Fix: Reschedule vs Cancellation Policy Mismatch
        if (issue.title?.includes('Reschedule vs Cancellation Policy Mismatch')) {
          updatedRules.rescheduleWindow = updatedRules.cancellationWindow || 24
        }
        break

      case 'requirePhoneVerification':
      case 'requireEmailConfirmation':
        // Fix: Unenforceable Client Blocking
        if (issue.title?.includes('Unenforceable Client Blocking')) {
          updatedRules.requirePhoneVerification = true
        }
        break

      default:
        console.warn('No auto-fix available for issue:', issue.title)
        return rules // Return unchanged if no fix available
    }

    return updatedRules
  }

  /**
   * Get human-readable explanation of what a fix will do
   * @param {Object} issue - The issue to fix
   * @param {Array} services - Available services for context
   * @returns {string} Human-readable explanation
   */
  static getFixExplanation(issue, services = []) {
    switch (issue.field?.[0] || issue.field) {
      case 'cancellationWindow':
      case 'minAdvanceBooking':
        if (issue.title?.includes('Service Duration Conflict')) {
          const maxDuration = Math.max(...services.map(s => s.duration || 30))
          return `Will increase minimum advance booking to ${maxDuration + 60} minutes to accommodate longest service duration.`
        } else if (issue.title?.includes('Impossible Cancellation Policy')) {
          return 'Will reduce cancellation window to allow clients to actually cancel within policy.'
        }
        break

      case 'reminderTiming':
        return 'Will adjust reminder timing to be sent before the cancellation deadline.'

      case 'noShowFee':
        if (issue.title?.includes('Excessive No-Show Fee')) {
          return 'Will reduce no-show fee to 50% of average service price.'
        } else if (issue.title?.includes('Invalid Percentage Fee')) {
          return 'Will set no-show fee to 75% of service price.'
        }
        break

      case 'requireFullPayment':
        return 'Will disable full payment requirement to remove redundancy with deposit requirement.'

      case 'requireDeposit':
        return 'Will enable online payment processing to support deposit collection.'

      case 'maxBookingsPerWeek':
        return 'Will align weekly booking limit with daily limit × 7 days.'

      case 'allowSameDayBooking':
        return 'Will reduce advance booking requirement to 4 hours for effective same-day booking.'

      case 'rescheduleWindow':
        return 'Will align reschedule window with cancellation window.'

      case 'requirePhoneVerification':
        return 'Will enable phone verification to make client blocking enforceable.'

      default:
        return 'Will apply recommended fix for this policy conflict.'
    }
  }
}

export default RuleValidator