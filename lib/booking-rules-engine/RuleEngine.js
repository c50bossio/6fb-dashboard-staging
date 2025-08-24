/**
 * Enterprise Booking Rules Engine
 * 
 * Core engine for evaluating booking rules with support for:
 * - Dependency resolution
 * - Caching strategies
 * - Conflict detection
 * - Rule inheritance
 * - Dynamic rule evaluation
 */

import { createClient } from '@/lib/supabase/server-client'
import { RuleValidator } from './RuleValidator'
import { RuleCache } from './RuleCache'
import { ConflictDetector } from './ConflictDetector'
import { RuleAuditor } from './RuleAuditor'

export class RuleEngine {
  constructor(barbershopId) {
    this.barbershopId = barbershopId
    this.cache = new RuleCache(barbershopId)
    this.validator = new RuleValidator()
    this.conflictDetector = new ConflictDetector()
    this.auditor = new RuleAuditor(barbershopId)
    this.rules = null
    this.lastFetch = null
  }

  /**
   * Load rules from database or cache
   */
  async loadRules(force = false) {
    // Check cache first (5 minute TTL)
    if (!force && this.cache.isValid()) {
      this.rules = await this.cache.get()
      if (this.rules) return this.rules
    }

    const supabase = await createClient()
    
    // Fetch unified rules from new structure
    const { data: ruleData, error } = await supabase
      .from('booking_rules_v2')
      .select('*')
      .eq('barbershop_id', this.barbershopId)
      .eq('is_active', true)
      .single()

    if (error || !ruleData) {
      // Fallback to legacy data structure
      return this.loadLegacyRules()
    }

    this.rules = this.normalizeRules(ruleData)
    await this.cache.set(this.rules)
    this.lastFetch = new Date()
    
    return this.rules
  }

  /**
   * Normalize rules to consistent format
   */
  normalizeRules(data) {
    return {
      // Core scheduling rules
      scheduling: {
        advance_booking_days: data.rules?.advance_booking_days || 30,
        min_booking_hours: data.rules?.min_booking_hours || 2,
        max_bookings_per_day: data.rules?.max_bookings_per_day || 50,
        buffer_between_appointments: data.rules?.buffer_between_appointments || 15,
        slot_intervals: data.rules?.slot_intervals || [15, 30, 45, 60],
        allow_double_booking: data.rules?.allow_double_booking || false,
        max_per_customer_per_day: data.rules?.max_per_customer_per_day || 2
      },
      
      // Business hours with overrides
      hours: {
        regular: data.rules?.business_hours || this.getDefaultHours(),
        overrides: data.rules?.hours_overrides || [],
        holidays: data.rules?.holidays || []
      },
      
      // Payment and cancellation
      payment: {
        accept_cash: data.rules?.accept_cash ?? true,
        accept_card: data.rules?.accept_card ?? true,
        accept_online: data.rules?.accept_online ?? false,
        require_deposit: data.rules?.require_deposit || false,
        deposit_percentage: data.rules?.deposit_percentage || 20,
        cancellation_window: data.rules?.cancellation_window || 24,
        cancellation_fee: data.rules?.cancellation_fee || 25,
        no_show_fee: data.rules?.no_show_fee || 50
      },
      
      // Client requirements
      client: {
        require_phone: data.rules?.require_phone ?? true,
        require_email: data.rules?.require_email ?? false,
        allow_walk_ins: data.rules?.allow_walk_ins ?? true,
        new_clients_allowed: data.rules?.new_clients_allowed ?? true,
        require_approval: data.rules?.require_approval || false
      },
      
      // Service-specific rules
      services: data.rules?.service_rules || {},
      
      // Barber-specific rules
      barbers: data.rules?.barber_rules || {},
      
      // Dynamic rules (time-based, capacity-based)
      dynamic: data.rules?.dynamic_rules || [],
      
      // Metadata
      metadata: {
        version: data.version || 1,
        updated_at: data.updated_at,
        effective_from: data.effective_from,
        effective_until: data.effective_until
      }
    }
  }

  /**
   * Evaluate if a booking request is allowed
   */
  async evaluate(bookingRequest) {
    if (!this.rules) {
      await this.loadRules()
    }

    const context = {
      request: bookingRequest,
      rules: this.rules,
      timestamp: new Date(),
      violations: [],
      warnings: []
    }

    // Run validation pipeline
    const checks = [
      this.checkBusinessHours(context),
      this.checkAdvanceBooking(context),
      this.checkCapacity(context),
      this.checkClientRestrictions(context),
      this.checkPaymentRequirements(context),
      this.checkServiceRules(context),
      this.checkBarberRules(context),
      this.checkDynamicRules(context),
      this.checkConflicts(context)
    ]

    await Promise.all(checks)

    // Audit the evaluation
    await this.auditor.logEvaluation(context)

    return {
      allowed: context.violations.length === 0,
      violations: context.violations,
      warnings: context.warnings,
      requiredActions: this.determineRequiredActions(context),
      metadata: {
        evaluatedAt: context.timestamp,
        rulesVersion: this.rules.metadata.version
      }
    }
  }

  /**
   * Check if booking time is within business hours
   */
  async checkBusinessHours(context) {
    const { request, rules } = context
    const requestDate = new Date(request.date)
    const dayOfWeek = requestDate.toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
    
    // Check for holiday
    const isHoliday = rules.hours.holidays.some(holiday => {
      const holidayDate = new Date(holiday.date)
      return holidayDate.toDateString() === requestDate.toDateString()
    })

    if (isHoliday) {
      context.violations.push({
        code: 'HOLIDAY_CLOSURE',
        message: 'The shop is closed on this holiday'
      })
      return
    }

    // Check for override
    const override = rules.hours.overrides.find(o => {
      const overrideDate = new Date(o.date)
      return overrideDate.toDateString() === requestDate.toDateString()
    })

    const hours = override?.hours || rules.hours.regular[dayOfWeek]
    
    if (!hours || hours.closed) {
      context.violations.push({
        code: 'CLOSED_DAY',
        message: `The shop is closed on ${dayOfWeek}s`
      })
      return
    }

    // Check if time is within hours
    const requestTime = request.time // Format: "HH:MM"
    const [reqHour, reqMin] = requestTime.split(':').map(Number)
    const [openHour, openMin] = hours.open.split(':').map(Number)
    const [closeHour, closeMin] = hours.close.split(':').map(Number)
    
    const reqMinutes = reqHour * 60 + reqMin
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    // Account for appointment duration
    const endMinutes = reqMinutes + (request.duration || 30)
    
    if (reqMinutes < openMinutes || endMinutes > closeMinutes) {
      context.violations.push({
        code: 'OUTSIDE_HOURS',
        message: `Appointments must be between ${hours.open} and ${hours.close}`
      })
    }
  }

  /**
   * Check advance booking restrictions
   */
  async checkAdvanceBooking(context) {
    const { request, rules } = context
    const now = new Date()
    const requestDate = new Date(request.date + 'T' + request.time)
    
    const hoursUntil = (requestDate - now) / (1000 * 60 * 60)
    const daysUntil = hoursUntil / 24

    if (hoursUntil < rules.scheduling.min_booking_hours) {
      context.violations.push({
        code: 'INSUFFICIENT_NOTICE',
        message: `Bookings require at least ${rules.scheduling.min_booking_hours} hours advance notice`
      })
    }

    if (daysUntil > rules.scheduling.advance_booking_days) {
      context.violations.push({
        code: 'TOO_FAR_ADVANCE',
        message: `Bookings cannot be made more than ${rules.scheduling.advance_booking_days} days in advance`
      })
    }
  }

  /**
   * Check capacity and double-booking rules
   */
  async checkCapacity(context) {
    const { request, rules } = context
    const supabase = await createClient()
    
    // Check daily capacity
    const startOfDay = new Date(request.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(request.date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: dailyBookings, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('barbershop_id', this.barbershopId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .eq('status', 'confirmed')

    if (!error && dailyBookings?.length >= rules.scheduling.max_bookings_per_day) {
      context.violations.push({
        code: 'DAILY_CAPACITY_EXCEEDED',
        message: 'No more appointments available for this day'
      })
    }

    // Check customer daily limit
    if (request.customer_id) {
      const { data: customerBookings } = await supabase
        .from('appointments')
        .select('id')
        .eq('barbershop_id', this.barbershopId)
        .eq('customer_id', request.customer_id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('status', 'confirmed')

      if (customerBookings?.length >= rules.scheduling.max_per_customer_per_day) {
        context.violations.push({
          code: 'CUSTOMER_DAILY_LIMIT',
          message: `Customers are limited to ${rules.scheduling.max_per_customer_per_day} appointments per day`
        })
      }
    }

    // Check for double booking if not allowed
    if (!rules.scheduling.allow_double_booking && request.barber_id) {
      const startTime = new Date(request.date + 'T' + request.time)
      const endTime = new Date(startTime.getTime() + (request.duration || 30) * 60000)
      
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time')
        .eq('barber_id', request.barber_id)
        .eq('status', 'confirmed')
        .or(`start_time.gte.${startTime.toISOString()},start_time.lt.${endTime.toISOString()}`)
        .or(`end_time.gt.${startTime.toISOString()},end_time.lte.${endTime.toISOString()}`)

      if (conflicts?.length > 0) {
        context.violations.push({
          code: 'DOUBLE_BOOKING',
          message: 'This time slot is already booked'
        })
      }
    }
  }

  /**
   * Check client-specific restrictions
   */
  async checkClientRestrictions(context) {
    const { request, rules } = context

    if (!rules.client.new_clients_allowed && request.is_new_client) {
      context.violations.push({
        code: 'NEW_CLIENTS_RESTRICTED',
        message: 'New client bookings are currently not accepted'
      })
    }

    if (rules.client.require_phone && !request.customer_phone) {
      context.violations.push({
        code: 'PHONE_REQUIRED',
        message: 'Phone number is required for booking'
      })
    }

    if (rules.client.require_email && !request.customer_email) {
      context.violations.push({
        code: 'EMAIL_REQUIRED',
        message: 'Email address is required for booking'
      })
    }

    if (!rules.client.allow_walk_ins && request.is_walk_in) {
      context.violations.push({
        code: 'NO_WALK_INS',
        message: 'Walk-in appointments are not accepted'
      })
    }
  }

  /**
   * Check payment requirements
   */
  async checkPaymentRequirements(context) {
    const { request, rules } = context

    if (rules.payment.require_deposit && !request.deposit_paid) {
      context.violations.push({
        code: 'DEPOSIT_REQUIRED',
        message: `A ${rules.payment.deposit_percentage}% deposit is required`
      })
    }

    // Check payment method
    const paymentMethod = request.payment_method || 'cash'
    
    if (paymentMethod === 'cash' && !rules.payment.accept_cash) {
      context.violations.push({
        code: 'CASH_NOT_ACCEPTED',
        message: 'Cash payments are not accepted'
      })
    }

    if (paymentMethod === 'card' && !rules.payment.accept_card) {
      context.violations.push({
        code: 'CARD_NOT_ACCEPTED',
        message: 'Card payments are not accepted'
      })
    }

    if (paymentMethod === 'online' && !rules.payment.accept_online) {
      context.violations.push({
        code: 'ONLINE_NOT_ACCEPTED',
        message: 'Online payments are not available'
      })
    }
  }

  /**
   * Check service-specific rules
   */
  async checkServiceRules(context) {
    const { request, rules } = context
    
    if (!request.service_id || !rules.services[request.service_id]) {
      return // No service-specific rules
    }

    const serviceRules = rules.services[request.service_id]
    
    // Check minimum advance booking for this service
    if (serviceRules.min_advance_hours) {
      const now = new Date()
      const requestDate = new Date(request.date + 'T' + request.time)
      const hoursUntil = (requestDate - now) / (1000 * 60 * 60)
      
      if (hoursUntil < serviceRules.min_advance_hours) {
        context.violations.push({
          code: 'SERVICE_ADVANCE_NOTICE',
          message: `This service requires ${serviceRules.min_advance_hours} hours advance notice`
        })
      }
    }

    // Check if service requires specific barber
    if (serviceRules.required_barber_ids && 
        !serviceRules.required_barber_ids.includes(request.barber_id)) {
      context.violations.push({
        code: 'SERVICE_BARBER_RESTRICTION',
        message: 'This service is only available with specific barbers'
      })
    }

    // Check day restrictions
    if (serviceRules.available_days) {
      const requestDate = new Date(request.date)
      const dayOfWeek = requestDate.toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
      
      if (!serviceRules.available_days.includes(dayOfWeek)) {
        context.violations.push({
          code: 'SERVICE_DAY_RESTRICTION',
          message: `This service is not available on ${dayOfWeek}s`
        })
      }
    }
  }

  /**
   * Check barber-specific rules
   */
  async checkBarberRules(context) {
    const { request, rules } = context
    
    if (!request.barber_id || !rules.barbers[request.barber_id]) {
      return // No barber-specific rules
    }

    const barberRules = rules.barbers[request.barber_id]
    
    // Check barber's custom hours
    if (barberRules.custom_hours) {
      const requestDate = new Date(request.date)
      const dayOfWeek = requestDate.toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
      const hours = barberRules.custom_hours[dayOfWeek]
      
      if (!hours || hours.closed) {
        context.violations.push({
          code: 'BARBER_UNAVAILABLE',
          message: 'This barber is not available on this day'
        })
        return
      }

      // Check time within barber's hours
      const requestTime = request.time
      const [reqHour, reqMin] = requestTime.split(':').map(Number)
      const [openHour, openMin] = hours.open.split(':').map(Number)
      const [closeHour, closeMin] = hours.close.split(':').map(Number)
      
      const reqMinutes = reqHour * 60 + reqMin
      const openMinutes = openHour * 60 + openMin
      const closeMinutes = closeHour * 60 + closeMin
      
      if (reqMinutes < openMinutes || reqMinutes >= closeMinutes) {
        context.violations.push({
          code: 'OUTSIDE_BARBER_HOURS',
          message: `This barber works ${hours.open} to ${hours.close}`
        })
      }
    }

    // Check barber's service restrictions
    if (barberRules.blocked_services && 
        barberRules.blocked_services.includes(request.service_id)) {
      context.violations.push({
        code: 'BARBER_SERVICE_RESTRICTION',
        message: 'This barber does not offer this service'
      })
    }

    // Check barber's client restrictions
    if (barberRules.new_clients_allowed === false && request.is_new_client) {
      context.violations.push({
        code: 'BARBER_NEW_CLIENT_RESTRICTION',
        message: 'This barber is not accepting new clients'
      })
    }
  }

  /**
   * Check dynamic rules (surge pricing, capacity-based, etc.)
   */
  async checkDynamicRules(context) {
    const { request, rules } = context
    
    for (const rule of rules.dynamic) {
      if (!rule.is_active) continue
      
      // Evaluate rule conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, request)
      
      if (conditionsMet) {
        // Apply rule actions
        if (rule.action === 'block') {
          context.violations.push({
            code: rule.code || 'DYNAMIC_RULE_BLOCK',
            message: rule.message || 'Booking not allowed at this time'
          })
        } else if (rule.action === 'warn') {
          context.warnings.push({
            code: rule.code || 'DYNAMIC_RULE_WARN',
            message: rule.message || 'Please note special conditions apply'
          })
        } else if (rule.action === 'surcharge') {
          context.warnings.push({
            code: 'SURGE_PRICING',
            message: `A ${rule.surcharge_percentage}% surcharge applies`,
            surcharge: rule.surcharge_percentage
          })
        }
      }
    }
  }

  /**
   * Check for scheduling conflicts using interval tree
   */
  async checkConflicts(context) {
    const { request } = context
    
    if (!request.barber_id) return
    
    const conflicts = await this.conflictDetector.findConflicts({
      barbershop_id: this.barbershopId,
      barber_id: request.barber_id,
      start_time: new Date(request.date + 'T' + request.time),
      duration: request.duration || 30
    })

    if (conflicts.length > 0) {
      context.violations.push({
        code: 'SCHEDULING_CONFLICT',
        message: 'This time slot conflicts with existing appointments',
        conflicts: conflicts.map(c => ({
          id: c.id,
          start: c.start_time,
          end: c.end_time
        }))
      })
    }
  }

  /**
   * Evaluate dynamic rule conditions
   */
  async evaluateConditions(conditions, request) {
    for (const condition of conditions) {
      const { field, operator, value } = condition
      const requestValue = this.getNestedValue(request, field)
      
      switch (operator) {
        case 'equals':
          if (requestValue !== value) return false
          break
        case 'not_equals':
          if (requestValue === value) return false
          break
        case 'greater_than':
          if (requestValue <= value) return false
          break
        case 'less_than':
          if (requestValue >= value) return false
          break
        case 'contains':
          if (!requestValue?.includes(value)) return false
          break
        case 'in':
          if (!value.includes(requestValue)) return false
          break
        case 'between':
          const [min, max] = value
          if (requestValue < min || requestValue > max) return false
          break
        default:
          console.warn(`Unknown operator: ${operator}`)
      }
    }
    
    return true
  }

  /**
   * Determine required actions based on violations
   */
  determineRequiredActions(context) {
    const actions = []
    
    for (const violation of context.violations) {
      switch (violation.code) {
        case 'DEPOSIT_REQUIRED':
          actions.push({
            type: 'payment',
            action: 'collect_deposit',
            amount: context.rules.payment.deposit_percentage
          })
          break
        case 'PHONE_REQUIRED':
          actions.push({
            type: 'information',
            action: 'collect_phone'
          })
          break
        case 'EMAIL_REQUIRED':
          actions.push({
            type: 'information',
            action: 'collect_email'
          })
          break
        case 'NEW_CLIENTS_RESTRICTED':
          actions.push({
            type: 'approval',
            action: 'request_approval'
          })
          break
      }
    }
    
    return actions
  }

  /**
   * Get nested object value by path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj)
  }

  /**
   * Get default business hours
   */
  getDefaultHours() {
    return {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '10:00', close: '17:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    }
  }

  /**
   * Load legacy rules from multiple tables (backward compatibility)
   */
  async loadLegacyRules() {
    const supabase = await createClient()
    
    // Fetch from multiple legacy tables
    const [businessSettings, barbershopData] = await Promise.all([
      supabase
        .from('business_settings')
        .select('*')
        .eq('barbershop_id', this.barbershopId)
        .single(),
      supabase
        .from('barbershops')
        .select('booking_settings, payment_settings, business_hours')
        .eq('id', this.barbershopId)
        .single()
    ])

    // Merge legacy data into unified format
    const merged = {
      rules: {
        ...businessSettings.data?.booking_rules,
        ...barbershopData.data?.booking_settings,
        business_hours: barbershopData.data?.business_hours,
        ...barbershopData.data?.payment_settings
      }
    }

    return this.normalizeRules(merged)
  }

  /**
   * Subscribe to real-time rule updates
   */
  subscribeToUpdates(callback) {
    const supabase = createClient()
    
    const subscription = supabase
      .channel(`booking-rules-${this.barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_rules_v2',
          filter: `barbershop_id=eq.${this.barbershopId}`
        },
        async (payload) => {
          // Invalidate cache
          await this.cache.invalidate()
          
          // Reload rules
          await this.loadRules(true)
          
          // Notify callback
          if (callback) {
            callback(payload)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }
}

export default RuleEngine