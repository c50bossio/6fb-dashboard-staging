'use client'

/**
 * Enhanced No-Show Policy Engine
 * Provides intelligent, tiered penalty system with grace periods and client history consideration
 * Enhanced with flexible client segmentation and penalty system
 */

export class EnhancedNoShowPolicy {
  constructor(rules, clientHistory = {}) {
    this.rules = rules
    this.clientHistory = clientHistory
    this.businessHours = rules.businessHours || { start: 9, end: 18 } // Default business hours
  }

  /**
   * Advanced client segmentation based on booking history, tenure, and spending
   * @param {Object} client - Client information and history
   * @returns {string} Client segment: 'new', 'regular', 'vip', or 'loyal'
   */
  determineClientSegment(client) {
    try {
      const segmentationRules = this.rules.clientSegmentation || {
        new: { maxBookings: 3, maxMonths: 3 },
        regular: { minBookings: 4, minMonths: 3, maxBookings: 20 },
        vip: { minBookings: 20, minMonths: 6 },
        loyal: { minBookings: 30, minMonths: 12, minSpent: 500 }
      }

      const bookingCount = client.totalBookings || 0
      const monthsActive = client.loyaltyMonths || 0
      const totalSpent = client.totalSpent || 0
      const cancellationRate = client.cancellationHistory ? 
        (client.cancellationHistory.filter(c => c.type === 'no_show').length / client.cancellationHistory.length) : 0

      // Check loyal segment first (highest tier)
      if (bookingCount >= segmentationRules.loyal.minBookings &&
          monthsActive >= segmentationRules.loyal.minMonths &&
          totalSpent >= segmentationRules.loyal.minSpent &&
          cancellationRate < 0.1) {
        return 'loyal'
      }

      // Check VIP segment
      if (bookingCount >= segmentationRules.vip.minBookings &&
          monthsActive >= segmentationRules.vip.minMonths &&
          cancellationRate < 0.15) {
        return 'vip'
      }

      // Check regular segment
      if (bookingCount >= segmentationRules.regular.minBookings &&
          monthsActive >= segmentationRules.regular.minMonths &&
          bookingCount <= segmentationRules.regular.maxBookings) {
        return 'regular'
      }

      // Default to new client
      return 'new'
    } catch (error) {
      console.warn('Error determining client segment:', error)
      return 'new' // Safe fallback
    }
  }

  /**
   * Check if grace period applies to client based on segment and history
   * @param {Object} client - Client information and history
   * @param {string} clientSegment - Client segment from determineClientSegment
   * @returns {Object} Grace period result
   */
  checkGracePeriod(client, clientSegment) {
    try {
      const graceRules = this.rules.flexibleGracePeriods || {
        new: { total: 2, annual: 3, quarterly: 1 },
        regular: { total: 1, annual: 2, quarterly: 1 },
        vip: { total: 3, annual: 4, quarterly: 2 },
        loyal: { total: 4, annual: 6, quarterly: 3 }
      }

      const segmentGrace = graceRules[clientSegment] || graceRules.new
      const clientStrikes = client.noShowStrikes || 0
      const currentYear = new Date().getFullYear()
      const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1

      // Calculate grace periods used
      const graceHistory = client.graceHistory || []
      const totalGraceUsed = graceHistory.length
      const annualGraceUsed = graceHistory.filter(g => 
        new Date(g.date).getFullYear() === currentYear
      ).length
      const quarterlyGraceUsed = graceHistory.filter(g => {
        const graceDate = new Date(g.date)
        return graceDate.getFullYear() === currentYear &&
               Math.floor(graceDate.getMonth() / 3) + 1 === currentQuarter
      }).length

      // Check if any grace period applies
      let graceType = null
      let graceUsed = 0
      let graceRemaining = 0

      if (totalGraceUsed < segmentGrace.total) {
        graceType = 'total'
        graceUsed = totalGraceUsed
        graceRemaining = segmentGrace.total - totalGraceUsed
      } else if (annualGraceUsed < segmentGrace.annual) {
        graceType = 'annual'
        graceUsed = annualGraceUsed
        graceRemaining = segmentGrace.annual - annualGraceUsed
      } else if (quarterlyGraceUsed < segmentGrace.quarterly) {
        graceType = 'quarterly'
        graceUsed = quarterlyGraceUsed
        graceRemaining = segmentGrace.quarterly - quarterlyGraceUsed
      }

      if (graceType) {
        return {
          applies: true,
          reason: `Grace period applied (${clientSegment} client - ${graceType} grace: ${graceUsed + 1}/${graceUsed + graceRemaining + 1})`,
          graceUsed: graceUsed + 1,
          graceRemaining: graceRemaining - 1,
          graceType
        }
      }

      return {
        applies: false,
        reason: `No grace periods remaining for ${clientSegment} client`,
        graceUsed: totalGraceUsed,
        graceRemaining: 0
      }
    } catch (error) {
      console.warn('Error checking grace period:', error)
      return {
        applies: false,
        reason: 'Error checking grace period - no grace applied',
        graceUsed: 0,
        graceRemaining: 0
      }
    }
  }

  /**
   * Calculate flexible penalty based on client segment and strike history
   * @param {number} clientStrikes - Current strike count
   * @param {string} clientSegment - Client segment
   * @param {Object} appointment - Appointment details
   * @returns {Object} Penalty calculation result
   */
  calculateFlexiblePenalty(clientStrikes, clientSegment, appointment) {
    try {
      const penaltyRules = this.rules.flexiblePenalties || {
        new: [
          { strike: 1, action: 'warning', amount: 0 },
          { strike: 2, action: 'fee', amount: 50, type: 'percentage' },
          { strike: 3, action: 'fee', amount: 75, type: 'percentage' }
        ],
        regular: [
          { strike: 1, action: 'fee', amount: 25, type: 'fixed' },
          { strike: 2, action: 'fee', amount: 75, type: 'percentage' }
        ],
        vip: [
          { strike: 1, action: 'warning', amount: 0 },
          { strike: 2, action: 'warning', amount: 0 },
          { strike: 3, action: 'fee', amount: 25, type: 'percentage' }
        ],
        loyal: [
          { strike: 1, action: 'warning', amount: 0 },
          { strike: 2, action: 'warning', amount: 0 },
          { strike: 3, action: 'fee', amount: 20, type: 'percentage' }
        ]
      }

      const segmentPenalties = penaltyRules[clientSegment] || penaltyRules.new
      const strikeNumber = clientStrikes + 1

      // Find appropriate penalty rule for current strike
      let penaltyRule = segmentPenalties.find(rule => rule.strike === strikeNumber)
      
      // If no exact match, use the highest available rule
      if (!penaltyRule && segmentPenalties.length > 0) {
        penaltyRule = segmentPenalties[segmentPenalties.length - 1]
      }

      // Fallback penalty if no rules defined
      if (!penaltyRule) {
        penaltyRule = { strike: strikeNumber, action: 'fee', amount: 25, type: 'fixed' }
      }

      let feeAmount = 0
      let penaltyLevel = 'none'
      let shouldChargeFee = false

      if (penaltyRule.action === 'warning') {
        penaltyLevel = 'warning'
        shouldChargeFee = false
        feeAmount = 0
      } else if (penaltyRule.action === 'fee') {
        shouldChargeFee = true
        penaltyLevel = strikeNumber === 1 ? 'low' : strikeNumber === 2 ? 'medium' : 'high'

        if (penaltyRule.type === 'percentage') {
          const servicePrice = appointment.servicePrice || 50 // Default service price
          feeAmount = Math.round((penaltyRule.amount / 100) * servicePrice)
        } else {
          feeAmount = penaltyRule.amount
        }
      }

      return {
        shouldChargeFee,
        feeAmount,
        feeType: penaltyRule.type === 'percentage' ? 'calculated' : 'fixed',
        penaltyLevel,
        action: penaltyRule.action,
        reasoning: `${clientSegment} client, strike ${strikeNumber}: ${penaltyRule.action} applied`
      }
    } catch (error) {
      console.warn('Error calculating flexible penalty:', error)
      // Fallback to basic penalty
      return {
        shouldChargeFee: true,
        feeAmount: this.rules.noShowFee || 25,
        feeType: 'fixed',
        penaltyLevel: 'medium',
        action: 'fee',
        reasoning: 'Fallback penalty applied due to calculation error'
      }
    }
  }

  /**
   * Get segment-specific configuration with fallbacks
   * @param {string} segment - Client segment
   * @returns {Object} Segment configuration
   */
  getSegmentConfiguration(segment) {
    try {
      const defaultConfig = {
        segmentation: { maxBookings: 3, maxMonths: 3 },
        gracePeriods: { total: 1, annual: 2, quarterly: 1 },
        penalties: [{ strike: 1, action: 'fee', amount: 25, type: 'fixed' }]
      }

      const segmentationRules = this.rules.clientSegmentation || {}
      const graceRules = this.rules.flexibleGracePeriods || {}
      const penaltyRules = this.rules.flexiblePenalties || {}

      return {
        segmentation: segmentationRules[segment] || defaultConfig.segmentation,
        gracePeriods: graceRules[segment] || defaultConfig.gracePeriods,
        penalties: penaltyRules[segment] || defaultConfig.penalties
      }
    } catch (error) {
      console.warn('Error getting segment configuration:', error)
      return {
        segmentation: { maxBookings: 3, maxMonths: 3 },
        gracePeriods: { total: 1, annual: 2, quarterly: 1 },
        penalties: [{ strike: 1, action: 'fee', amount: 25, type: 'fixed' }]
      }
    }
  }

  /**
   * Calculate penalty for a no-show based on client history and service details
   * @param {Object} appointment - Appointment details
   * @param {Object} client - Client information and history
   * @returns {Object} Penalty calculation result
   */
  calculateNoShowPenalty(appointment, client = {}) {
    const result = {
      shouldChargeFee: false,
      feeAmount: 0,
      feeType: 'fixed', // 'fixed' or 'percentage'
      penaltyLevel: 'none', // 'none', 'warning', 'low', 'medium', 'high'
      reasoning: [],
      gracePeriodApplied: false,
      loyaltyDiscountApplied: false,
      nextStrikeCount: (client.noShowStrikes || 0) + 1,
      recommendedAction: 'none', // 'none', 'warning', 'fee', 'block', 'require_deposit'
      clientSegment: 'new', // 'new', 'regular', 'vip', 'loyal'
      graceDetails: null
    }

    try {
      // Skip if no-show fees are disabled
      if (!this.rules.noShowFee || this.rules.noShowFee === 0) {
        result.reasoning.push('No-show fees disabled in policy')
        return result
      }

      // Determine client segment
      const clientSegment = this.determineClientSegment(client)
      result.clientSegment = clientSegment
      result.reasoning.push(`Client classified as: ${clientSegment}`)

      // Check if grace period applies
      const graceResult = this.checkGracePeriod(client, clientSegment)
      result.graceDetails = graceResult
      
      if (graceResult.applies) {
        result.gracePeriodApplied = true
        result.penaltyLevel = 'warning'
        result.recommendedAction = 'warning'
        result.reasoning.push(graceResult.reason)
        result.nextStrikeCount = client.noShowStrikes || 0 // Don't increment on grace
        return result
      }

      // Use flexible penalty system if available
      if (this.rules.flexiblePenalties) {
        const flexiblePenalty = this.calculateFlexiblePenalty(
          client.noShowStrikes || 0,
          clientSegment,
          appointment
        )

        result.shouldChargeFee = flexiblePenalty.shouldChargeFee
        result.feeAmount = flexiblePenalty.feeAmount
        result.feeType = flexiblePenalty.feeType
        result.penaltyLevel = flexiblePenalty.penaltyLevel
        result.reasoning.push(flexiblePenalty.reasoning)
        
        // Apply service-specific adjustments
        const serviceMultiplier = this.calculateServiceMultiplier(appointment)
        if (serviceMultiplier !== 1 && result.shouldChargeFee) {
          result.feeAmount = Math.round(result.feeAmount * serviceMultiplier)
          result.reasoning.push(`Service-specific adjustment: ${Math.round((serviceMultiplier - 1) * 100)}%`)
        }
      } else {
        // Fallback to legacy system
        this.calculateLegacyPenalty(appointment, client, result)
      }

      // Determine recommended action
      const isLoyalClient = clientSegment === 'loyal' || clientSegment === 'vip'
      result.recommendedAction = this.getRecommendedAction(result.nextStrikeCount, isLoyalClient)

      // Add final reasoning
      if (result.shouldChargeFee) {
        result.reasoning.push(`Final no-show fee: $${result.feeAmount}`)
      }

      return result
    } catch (error) {
      console.error('Error calculating no-show penalty:', error)
      result.reasoning.push('Error in penalty calculation - applying default fee')
      result.shouldChargeFee = true
      result.feeAmount = this.rules.noShowFee || 25
      result.penaltyLevel = 'medium'
      result.recommendedAction = 'fee'
      return result
    }
  }

  /**
   * Legacy penalty calculation for backward compatibility (modifies result in-place)
   * @private
   */
  calculateLegacyPenalty(appointment, client, result) {
    const clientStrikes = client.noShowStrikes || 0
    const isLoyalClient = (client.loyaltyMonths || 0) >= 6 && (client.totalBookings || 0) >= 10

    // Calculate base penalty level based on strike history
    let penaltyMultiplier = 1
    let penaltyLevel = 'low'

    if (clientStrikes === 0) {
      penaltyLevel = 'low'
      penaltyMultiplier = 0.5 // 50% of normal fee for first offense
      result.reasoning.push('First no-show offense - reduced penalty applied')
    } else if (clientStrikes === 1) {
      penaltyLevel = 'medium' 
      penaltyMultiplier = 0.75 // 75% of normal fee
      result.reasoning.push('Second no-show offense - standard penalty applied')
    } else if (clientStrikes >= 2) {
      penaltyLevel = 'high'
      penaltyMultiplier = 1.25 // 125% of normal fee for repeat offenders
      result.reasoning.push('Repeat no-show offender - enhanced penalty applied')
    }

    // Apply loyalty discount
    if (isLoyalClient && clientStrikes < 3) {
      penaltyMultiplier *= 0.75 // 25% loyalty discount
      result.loyaltyDiscountApplied = true
      result.reasoning.push('Loyal client discount applied (25% reduction)')
    }

    // Calculate service-specific adjustments
    const serviceMultiplier = this.calculateServiceMultiplier(appointment)
    if (serviceMultiplier !== 1) {
      penaltyMultiplier *= serviceMultiplier
      result.reasoning.push(`Service-specific adjustment: ${Math.round((serviceMultiplier - 1) * 100)}%`)
    }

    // Calculate final fee
    const baseFee = this.rules.noShowFee
    const baseFeeType = this.rules.noShowFeeType || 'percentage'
    
    if (baseFeeType === 'percentage') {
      result.feeAmount = Math.round((baseFee * penaltyMultiplier / 100) * (appointment.servicePrice || 50))
      result.feeType = 'fixed'
    } else {
      result.feeAmount = Math.round(baseFee * penaltyMultiplier)
      result.feeType = 'fixed'
    }

    // Determine if fee should be charged
    result.shouldChargeFee = result.feeAmount > 0
    result.penaltyLevel = penaltyLevel

    // No return needed since we're modifying in-place
  }

  /**
   * Calculate service-specific penalty multiplier
   * @param {Object} appointment - Appointment details
   * @returns {number} Multiplier (1.0 = normal, >1.0 = higher penalty, <1.0 = lower penalty)
   */
  calculateServiceMultiplier(appointment) {
    if (!appointment.serviceDuration && !appointment.servicePrice) {
      return 1.0 // No adjustment if service details unknown
    }

    let multiplier = 1.0

    // Duration-based adjustment
    if (appointment.serviceDuration) {
      if (appointment.serviceDuration >= 120) { // 2+ hour services
        multiplier *= 1.5
      } else if (appointment.serviceDuration >= 60) { // 1+ hour services
        multiplier *= 1.25
      } else if (appointment.serviceDuration <= 30) { // Quick services
        multiplier *= 0.75
      }
    }

    // Price-based adjustment
    if (appointment.servicePrice) {
      if (appointment.servicePrice >= 100) { // Premium services
        multiplier *= 1.3
      } else if (appointment.servicePrice <= 25) { // Basic services
        multiplier *= 0.8
      }
    }

    return Math.min(multiplier, 2.0) // Cap at 2x multiplier
  }

  /**
   * Get recommended action based on strike count and client status
   * @param {number} strikeCount - Current strike count
   * @param {boolean} isLoyalClient - Whether client is considered loyal
   * @returns {string} Recommended action
   */
  getRecommendedAction(strikeCount, isLoyalClient = false) {
    const strikeLimit = this.rules.noShowStrikeLimit || 3

    if (strikeCount === 1) {
      return 'warning'
    } else if (strikeCount === 2) {
      return 'fee'
    } else if (strikeCount === strikeLimit - 1 && isLoyalClient) {
      return 'require_deposit' // Give loyal clients one more chance with deposit requirement
    } else if (strikeCount >= strikeLimit && this.rules.blockAfterNoShows) {
      return 'block'
    } else if (strikeCount >= strikeLimit / 2) {
      return 'require_deposit'
    }

    return 'fee'
  }

  /**
   * Check if client should be blocked from booking based on segment and strike history
   * @param {Object} client - Client information
   * @returns {Object} Blocking decision with segment-aware recovery options
   */
  shouldBlockClient(client) {
    const result = {
      shouldBlock: false,
      reason: '',
      canRecover: false,
      recoveryOptions: [],
      clientSegment: 'new',
      strikeAnalysis: {}
    }

    try {
      if (!this.rules.blockAfterNoShows) {
        result.reason = 'Client blocking disabled in policy'
        return result
      }

      const clientSegment = this.determineClientSegment(client)
      result.clientSegment = clientSegment

      const strikeLimit = this.rules.noShowStrikeLimit || 3
      const clientStrikes = client.noShowStrikes || 0
      
      // Segment-specific strike limits (if configured)
      const segmentStrikeLimits = this.rules.segmentStrikeLimits || {}
      const effectiveStrikeLimit = segmentStrikeLimits[clientSegment] || strikeLimit

      result.strikeAnalysis = {
        currentStrikes: clientStrikes,
        strikeLimit: effectiveStrikeLimit,
        remainingStrikes: Math.max(0, effectiveStrikeLimit - clientStrikes)
      }

      if (clientStrikes >= effectiveStrikeLimit) {
        result.shouldBlock = true
        result.reason = `Exceeded no-show limit (${clientStrikes}/${effectiveStrikeLimit} strikes) for ${clientSegment} client`
        
        // Determine recovery options based on client segment
        result.canRecover = true
        
        switch (clientSegment) {
          case 'loyal':
            result.recoveryOptions = [
              'manager_approval', // Prioritize personal touch for loyal clients
              'deposit_required_period',
              'pay_outstanding_fees'
            ]
            break
            
          case 'vip':
            result.recoveryOptions = [
              'manager_approval',
              'deposit_required_period',
              'pay_outstanding_fees'
            ]
            break
            
          case 'regular':
            result.recoveryOptions = [
              'pay_outstanding_fees',
              'deposit_required_period',
              'manager_approval'
            ]
            break
            
          case 'new':
          default:
            result.recoveryOptions = [
              'pay_outstanding_fees',
              'deposit_required_period',
              'waiting_period'
            ]
        }
      } else if (clientStrikes >= effectiveStrikeLimit - 1) {
        // Warning for clients close to limit
        result.reason = `Warning: ${result.strikeAnalysis.remainingStrikes} strike(s) remaining before blocking`
      }

      return result
    } catch (error) {
      console.warn('Error checking client blocking status:', error)
      result.shouldBlock = false
      result.reason = 'Error checking blocking status - allowing booking'
      return result
    }
  }

  /**
   * Generate client-friendly explanation of penalty with segment-aware messaging
   * @param {Object} penaltyResult - Result from calculateNoShowPenalty
   * @param {Object} appointment - Appointment details
   * @returns {Object} Formatted explanation
   */
  generatePenaltyExplanation(penaltyResult, appointment) {
    const explanation = {
      title: '',
      message: '',
      nextSteps: [],
      policyReminder: '',
      segmentInfo: '',
      graceInfo: ''
    }

    try {
      // Add segment-specific messaging
      const segmentMessages = {
        new: 'As a new client',
        regular: 'As a valued client',
        vip: 'As a VIP client',
        loyal: 'As one of our most valued long-term clients'
      }

      explanation.segmentInfo = segmentMessages[penaltyResult.clientSegment] || 'As our client'

      if (penaltyResult.gracePeriodApplied) {
        const graceDetails = penaltyResult.graceDetails || {}
        
        explanation.title = `${penaltyResult.clientSegment.toUpperCase()} Client - Grace Period Applied`
        explanation.message = `${explanation.segmentInfo}, we understand that schedules can change unexpectedly. We're applying a grace period instead of charging a fee.`
        
        if (graceDetails.graceRemaining !== undefined) {
          explanation.graceInfo = `Grace periods remaining: ${graceDetails.graceRemaining} (${graceDetails.graceType || 'total'})`
        }

        explanation.nextSteps = [
          'This counts as a grace period usage',
          penaltyResult.clientSegment === 'new' 
            ? 'Future no-shows may result in fees as you build your appointment history'
            : 'Future no-shows may result in fees as outlined in our policy',
          'Please call us at least 24 hours ahead to avoid any charges'
        ]

        if (graceDetails.graceRemaining === 0) {
          explanation.nextSteps.push('⚠️ This was your last available grace period')
        }

      } else if (penaltyResult.shouldChargeFee) {
        explanation.title = `No-Show Fee Applied - $${penaltyResult.feeAmount}`
        explanation.message = `${explanation.segmentInfo}, a no-show fee has been applied to your account for the missed appointment on ${appointment.date || 'your scheduled date'}.`
        
        if (penaltyResult.loyaltyDiscountApplied) {
          explanation.message += ` We've applied a loyalty discount to this fee in recognition of your history with us.`
        }

        // Add segment-specific reasoning if available
        if (penaltyResult.reasoning && penaltyResult.reasoning.length > 0) {
          const segmentReason = penaltyResult.reasoning.find(r => r.includes(penaltyResult.clientSegment))
          if (segmentReason) {
            explanation.message += ` (${segmentReason})`
          }
        }

        explanation.nextSteps = [
          `Fee amount: $${penaltyResult.feeAmount}`,
          'Fee will be charged to your payment method on file',
          `You now have ${penaltyResult.nextStrikeCount} no-show${penaltyResult.nextStrikeCount > 1 ? 's' : ''} on record`,
          'Please arrive on time for future appointments to avoid additional fees'
        ]

        // Add segment-specific next steps
        if (penaltyResult.clientSegment === 'loyal' || penaltyResult.clientSegment === 'vip') {
          explanation.nextSteps.push('If you need to discuss this fee, please contact our manager directly')
        }

      } else {
        explanation.title = 'No-Show Recorded - No Fee Applied'
        explanation.message = `${explanation.segmentInfo}, we've recorded this no-show but no fee has been applied at this time.`
        explanation.nextSteps = [
          `You now have ${penaltyResult.nextStrikeCount} no-show${penaltyResult.nextStrikeCount > 1 ? 's' : ''} on record`,
          'Future no-shows may result in fees',
          'Please call us at least 24 hours ahead to cancel appointments'
        ]
      }

      // Add policy reminder with segment-specific strike limits
      const strikeLimit = this.rules.segmentStrikeLimits?.[penaltyResult.clientSegment] || 
                          this.rules.noShowStrikeLimit || 3

      if (penaltyResult.nextStrikeCount >= strikeLimit - 1) {
        const remainingStrikes = strikeLimit - penaltyResult.nextStrikeCount
        
        if (remainingStrikes > 0) {
          explanation.policyReminder = `Please note: You have ${remainingStrikes} strike${remainingStrikes > 1 ? 's' : ''} remaining before booking restrictions apply. We value your business and want to help you maintain your appointment schedule.`
        } else {
          explanation.policyReminder = `Please note: You have reached the maximum number of no-shows (${strikeLimit}). Booking restrictions may now apply. Please contact us to discuss your account status.`
        }
      }

      // Add recommended action context
      if (penaltyResult.recommendedAction === 'require_deposit') {
        explanation.policyReminder += ' Future bookings may require a deposit.'
      } else if (penaltyResult.recommendedAction === 'manager_approval') {
        explanation.policyReminder += ' Future bookings may require manager approval.'
      } else if (penaltyResult.recommendedAction === 'block') {
        explanation.policyReminder += ' Your booking privileges may be temporarily suspended.'
      }

    } catch (error) {
      console.warn('Error generating penalty explanation:', error)
      // Fallback to basic explanation
      explanation.title = 'No-Show Fee Applied'
      explanation.message = 'A no-show fee has been applied to your account.'
      explanation.nextSteps = ['Please contact us for details']
    }

    return explanation
  }

  /**
   * Get recovery options for blocked clients
   * @param {Object} client - Client information
   * @returns {Array} Recovery options with details
   */
  getRecoveryOptions(client) {
    const blockingResult = this.shouldBlockClient(client)
    
    if (!blockingResult.canRecover) {
      return []
    }

    const options = []

    if (blockingResult.recoveryOptions.includes('pay_outstanding_fees')) {
      options.push({
        id: 'pay_outstanding_fees',
        title: 'Pay Outstanding Fees',
        description: 'Pay all outstanding no-show fees to restore booking privileges',
        requirements: ['Payment of all outstanding fees'],
        timeframe: 'Immediate upon payment',
        difficulty: 'easy'
      })
    }

    if (blockingResult.recoveryOptions.includes('deposit_required_period')) {
      options.push({
        id: 'deposit_required_period',
        title: 'Deposit-Required Period',
        description: 'Book future appointments with required deposits for 3 months',
        requirements: ['20% deposit for all bookings', '3 consecutive successful appointments'],
        timeframe: '3 months with good standing',
        difficulty: 'moderate'
      })
    }

    if (blockingResult.recoveryOptions.includes('manager_approval')) {
      options.push({
        id: 'manager_approval',
        title: 'Manager Review',
        description: 'Speak with management about your account status',
        requirements: ['Schedule call with manager', 'Discuss account history'],
        timeframe: 'Case-by-case basis',
        difficulty: 'moderate'
      })
    }

    if (blockingResult.recoveryOptions.includes('waiting_period')) {
      options.push({
        id: 'waiting_period',
        title: 'Waiting Period',
        description: 'Wait 6 months before booking privileges are restored',
        requirements: ['6-month waiting period', 'No booking attempts during period'],
        timeframe: '6 months',
        difficulty: 'difficult'
      })
    }

    return options
  }

  /**
   * Validate enhanced no-show policy configuration including flexible segmentation
   * @returns {Array} Array of validation warnings/errors
   */
  validatePolicyConfiguration() {
    const warnings = []

    try {
      // Legacy validation
      if (this.rules.noShowFee > 100 && this.rules.noShowFeeType === 'percentage') {
        warnings.push({
          type: 'error',
          field: 'noShowFee',
          message: 'No-show fee cannot exceed 100% of service price'
        })
      }

      if (this.rules.noShowStrikeLimit === 1 && this.rules.blockAfterNoShows) {
        warnings.push({
          type: 'warning',
          field: 'noShowStrikeLimit',
          message: 'Single-strike blocking may be too harsh for client retention'
        })
      }

      if (!this.rules.requirePhoneVerification && !this.rules.requireEmailConfirmation && this.rules.blockAfterNoShows) {
        warnings.push({
          type: 'warning',
          field: 'blockAfterNoShows',
          message: 'Blocking clients requires verified contact information for effective enforcement'
        })
      }

      // Flexible segmentation validation
      if (this.rules.clientSegmentation) {
        const segments = this.rules.clientSegmentation
        
        // Validate segment hierarchy (new < regular < vip < loyal)
        if (segments.new && segments.regular && segments.new.maxBookings >= segments.regular.minBookings) {
          warnings.push({
            type: 'warning',
            field: 'clientSegmentation',
            message: 'New client maxBookings should be less than regular client minBookings'
          })
        }

        // Validate loyal client requirements
        if (segments.loyal && (!segments.loyal.minSpent || segments.loyal.minSpent < 100)) {
          warnings.push({
            type: 'warning',
            field: 'clientSegmentation.loyal.minSpent',
            message: 'Loyal client minimum spending threshold may be too low'
          })
        }
      }

      // Flexible grace periods validation
      if (this.rules.flexibleGracePeriods) {
        const gracePeriods = this.rules.flexibleGracePeriods
        
        Object.entries(gracePeriods).forEach(([segment, grace]) => {
          if (grace.total > grace.annual) {
            warnings.push({
              type: 'warning',
              field: `flexibleGracePeriods.${segment}`,
              message: `Total grace period cannot exceed annual grace period for ${segment} clients`
            })
          }
          
          if (grace.annual > 12) {
            warnings.push({
              type: 'warning',
              field: `flexibleGracePeriods.${segment}.annual`,
              message: `Annual grace period of ${grace.annual} may be excessive for ${segment} clients`
            })
          }
        })
      }

      // Flexible penalties validation
      if (this.rules.flexiblePenalties) {
        const penalties = this.rules.flexiblePenalties
        
        Object.entries(penalties).forEach(([segment, penaltyRules]) => {
          if (!Array.isArray(penaltyRules)) {
            warnings.push({
              type: 'error',
              field: `flexiblePenalties.${segment}`,
              message: `Penalty rules for ${segment} must be an array`
            })
            return
          }

          penaltyRules.forEach((rule, index) => {
            if (rule.type === 'percentage' && rule.amount > 100) {
              warnings.push({
                type: 'error',
                field: `flexiblePenalties.${segment}[${index}]`,
                message: `Percentage penalty cannot exceed 100% for ${segment} clients`
              })
            }

            if (rule.type === 'fixed' && rule.amount > 200) {
              warnings.push({
                type: 'warning',
                field: `flexiblePenalties.${segment}[${index}]`,
                message: `Fixed penalty of $${rule.amount} may be excessive for ${segment} clients`
              })
            }

            if (!['warning', 'fee', 'block'].includes(rule.action)) {
              warnings.push({
                type: 'error',
                field: `flexiblePenalties.${segment}[${index}].action`,
                message: `Invalid penalty action '${rule.action}' for ${segment} clients`
              })
            }
          })
        })
      }

      // Segment-specific strike limits validation
      if (this.rules.segmentStrikeLimits) {
        const strikeLimits = this.rules.segmentStrikeLimits
        const defaultLimit = this.rules.noShowStrikeLimit || 3

        Object.entries(strikeLimits).forEach(([segment, limit]) => {
          if (limit < 1) {
            warnings.push({
              type: 'error',
              field: `segmentStrikeLimits.${segment}`,
              message: `Strike limit must be at least 1 for ${segment} clients`
            })
          }

          if (segment === 'loyal' && limit < defaultLimit) {
            warnings.push({
              type: 'warning',
              field: `segmentStrikeLimits.${segment}`,
              message: `Loyal clients should have equal or higher strike limits than default (${defaultLimit})`
            })
          }
        })
      }

      // Configuration completeness check
      const hasFlexibleFeatures = this.rules.clientSegmentation || 
                                  this.rules.flexibleGracePeriods || 
                                  this.rules.flexiblePenalties

      if (hasFlexibleFeatures) {
        if (!this.rules.clientSegmentation) {
          warnings.push({
            type: 'warning',
            field: 'clientSegmentation',
            message: 'Client segmentation rules recommended when using flexible features'
          })
        }

        if (!this.rules.flexibleGracePeriods) {
          warnings.push({
            type: 'info',
            field: 'flexibleGracePeriods',
            message: 'Consider adding segment-specific grace periods for better client experience'
          })
        }
      }

    } catch (error) {
      warnings.push({
        type: 'error',
        field: 'configuration',
        message: `Error validating configuration: ${error.message}`
      })
    }

    return warnings
  }

  /**
   * Get comprehensive client analysis including segment, grace status, and penalty preview
   * @param {Object} client - Client information
   * @param {Object} appointment - Optional appointment for penalty preview
   * @returns {Object} Complete client analysis
   */
  analyzeClient(client, appointment = null) {
    try {
      const analysis = {
        clientSegment: this.determineClientSegment(client),
        segmentConfiguration: {},
        graceStatus: {},
        penaltyPreview: null,
        blockingStatus: {},
        recommendations: []
      }

      // Get segment configuration
      analysis.segmentConfiguration = this.getSegmentConfiguration(analysis.clientSegment)

      // Check grace period status
      analysis.graceStatus = this.checkGracePeriod(client, analysis.clientSegment)

      // Get blocking status
      analysis.blockingStatus = this.shouldBlockClient(client)

      // Generate penalty preview if appointment provided
      if (appointment) {
        analysis.penaltyPreview = this.calculateNoShowPenalty(appointment, client)
      }

      // Generate recommendations based on analysis
      const currentStrikes = client.noShowStrikes || 0
      const strikeLimit = this.rules.segmentStrikeLimits?.[analysis.clientSegment] || 
                          this.rules.noShowStrikeLimit || 3

      if (currentStrikes === 0) {
        if (analysis.graceStatus.graceRemaining > 0) {
          analysis.recommendations.push('Client has clean record with available grace periods')
        } else {
          analysis.recommendations.push('Client has clean record but no grace periods available')
        }
      } else if (currentStrikes >= strikeLimit - 1) {
        analysis.recommendations.push('⚠️ Client is at risk of booking restrictions')
        analysis.recommendations.push('Consider proactive outreach or deposit requirements')
      } else if (currentStrikes >= strikeLimit * 0.5) {
        analysis.recommendations.push('Client approaching strike threshold - monitor closely')
      }

      if (analysis.clientSegment === 'loyal' || analysis.clientSegment === 'vip') {
        analysis.recommendations.push('High-value client - consider personal outreach for any issues')
      }

      if (analysis.blockingStatus.shouldBlock) {
        analysis.recommendations.push(`Blocking recommended: ${analysis.blockingStatus.reason}`)
        analysis.recommendations.push(`Recovery options: ${analysis.blockingStatus.recoveryOptions.join(', ')}`)
      }

      return analysis
    } catch (error) {
      console.warn('Error analyzing client:', error)
      return {
        clientSegment: 'new',
        segmentConfiguration: {},
        graceStatus: { applies: false, reason: 'Error analyzing grace status' },
        penaltyPreview: null,
        blockingStatus: { shouldBlock: false, reason: 'Error checking blocking status' },
        recommendations: ['Error analyzing client - manual review recommended']
      }
    }
  }

  /**
   * Generate a comprehensive policy summary for administrative use
   * @returns {Object} Policy configuration summary
   */
  getPolicySummary() {
    try {
      const summary = {
        basicConfiguration: {
          noShowFeeEnabled: !!(this.rules.noShowFee && this.rules.noShowFee > 0),
          baseFee: this.rules.noShowFee || 0,
          feeType: this.rules.noShowFeeType || 'percentage',
          strikeLimit: this.rules.noShowStrikeLimit || 3,
          blockingEnabled: !!this.rules.blockAfterNoShows
        },
        flexibleFeatures: {
          clientSegmentationEnabled: !!this.rules.clientSegmentation,
          flexibleGracePeriodsEnabled: !!this.rules.flexibleGracePeriods,
          flexiblePenaltiesEnabled: !!this.rules.flexiblePenalties,
          segmentStrikeLimitsEnabled: !!this.rules.segmentStrikeLimits
        },
        segmentBreakdown: {},
        validationIssues: []
      }

      // Add segment breakdown if segmentation is enabled
      if (this.rules.clientSegmentation) {
        Object.keys(this.rules.clientSegmentation).forEach(segment => {
          const config = this.getSegmentConfiguration(segment)
          summary.segmentBreakdown[segment] = {
            requirements: config.segmentation,
            gracePeriods: config.gracePeriods,
            penalties: config.penalties,
            strikeLimit: this.rules.segmentStrikeLimits?.[segment] || summary.basicConfiguration.strikeLimit
          }
        })
      }

      // Add validation issues
      summary.validationIssues = this.validatePolicyConfiguration()

      // Add usage statistics if available
      if (this.clientHistory) {
        summary.statistics = {
          totalClientsAnalyzed: Object.keys(this.clientHistory).length,
          segmentDistribution: {},
          averageStrikes: 0
        }

        const segments = {}
        let totalStrikes = 0
        let clientCount = 0

        Object.values(this.clientHistory).forEach(client => {
          const segment = this.determineClientSegment(client)
          segments[segment] = (segments[segment] || 0) + 1
          totalStrikes += client.noShowStrikes || 0
          clientCount++
        })

        summary.statistics.segmentDistribution = segments
        summary.statistics.averageStrikes = clientCount > 0 ? (totalStrikes / clientCount).toFixed(2) : 0
      }

      return summary
    } catch (error) {
      console.warn('Error generating policy summary:', error)
      return {
        basicConfiguration: { noShowFeeEnabled: false },
        flexibleFeatures: { allDisabled: true },
        segmentBreakdown: {},
        validationIssues: [{ type: 'error', message: 'Error generating summary' }]
      }
    }
  }
}

export default EnhancedNoShowPolicy