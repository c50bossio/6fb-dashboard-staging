'use client'

/**
 * Adaptive Flow Engine
 * Intelligently modifies onboarding flow based on user segmentation and behavior
 */

import smartSuggestions from '../../services/SmartSuggestionsAPI'

export default class AdaptiveFlowEngine {
  constructor(segmentationData = {}, userProfile = {}) {
    this.segmentationPath = segmentationData.segmentationPath
    this.userProfile = userProfile
    this.businessExperience = segmentationData.segmentationMetadata?.userProfile?.businessExperience
  }

  /**
   * Adapt step sequence based on segmentation path
   */
  adaptStepSequence(baseSteps) {
    let adaptedSteps = [...baseSteps]

    switch (this.segmentationPath) {
      case 'first_barbershop':
        // New barbershop owners need comprehensive guidance
        adaptedSteps = this.addGuidanceSteps(adaptedSteps)
        adaptedSteps = this.simplifyFinancialSetup(adaptedSteps)
        break

      case 'adding_locations':
        // Multi-location businesses skip basics, focus on scaling
        adaptedSteps = this.streamlineForMultiLocation(adaptedSteps)
        adaptedSteps = this.addLocationManagementSteps(adaptedSteps)
        break

      case 'switching_systems':
        // Migration users need data import assistance
        adaptedSteps = this.addMigrationSteps(adaptedSteps)
        adaptedSteps = this.prioritizeDataIntegrity(adaptedSteps)
        break

      default:
        // Standard flow for existing users
        break
    }

    return adaptedSteps
  }

  /**
   * Add guidance-focused steps for new business owners
   */
  addGuidanceSteps(steps) {
    // Add a business planning step before financial setup
    const financialIndex = steps.findIndex(step => step.id === 'financial')
    if (financialIndex > -1) {
      steps.splice(financialIndex, 0, {
        id: 'business_planning',
        title: 'Business Planning',
        icon: 'ChartBarIcon',
        description: 'Set realistic goals and expectations'
      })
    }

    return steps
  }

  /**
   * Simplify financial setup for new business owners
   */
  simplifyFinancialSetup(steps) {
    const financialStep = steps.find(step => step.id === 'financial')
    if (financialStep) {
      financialStep.simplified = true
      financialStep.description = 'Basic payment setup (advanced features available later)'
    }
    return steps
  }

  /**
   * Streamline flow for multi-location businesses
   */
  streamlineForMultiLocation(steps) {
    // Remove individual business setup, focus on organizational structure
    const businessIndex = steps.findIndex(step => step.id === 'business')
    if (businessIndex > -1) {
      steps[businessIndex] = {
        id: 'organization',
        title: 'Organization Setup',
        icon: 'BuildingOfficeIcon',
        description: 'Configure your enterprise structure'
      }
    }

    return steps
  }

  /**
   * Add location management steps for multi-location businesses
   */
  addLocationManagementSteps(steps) {
    // Add location management after organization setup
    const orgIndex = steps.findIndex(step => step.id === 'organization')
    if (orgIndex > -1) {
      steps.splice(orgIndex + 1, 0, {
        id: 'location_management',
        title: 'Location Management',
        icon: 'MapIcon',
        description: 'Set up your location hierarchy'
      })
    }

    return steps
  }

  /**
   * Add migration-specific steps
   */
  addMigrationSteps(steps) {
    // Add data import step at the beginning
    steps.unshift({
      id: 'data_import',
      title: 'Data Import',
      icon: 'DocumentArrowUpIcon',
      description: 'Import your existing customer and appointment data'
    })

    return steps
  }

  /**
   * Prioritize data integrity for migration users
   */
  prioritizeDataIntegrity(steps) {
    // Add data verification step after import
    const importIndex = steps.findIndex(step => step.id === 'data_import')
    if (importIndex > -1) {
      steps.splice(importIndex + 1, 0, {
        id: 'data_verification',
        title: 'Data Verification',
        icon: 'CheckBadgeIcon',
        description: 'Verify your imported data is correct'
      })
    }

    return steps
  }

  /**
   * Generate smart defaults based on segmentation and business type
   * Now enhanced with AI-powered recommendations from SmartSuggestionsAPI
   */
  async generateSmartDefaults(businessType = 'barbershop', location = null) {
    try {
      // Get AI-powered business defaults
      const aiDefaults = await smartSuggestions.getBusinessDefaults(
        businessType,
        location,
        this.segmentationPath
      )

      // Start with base defaults
      const defaults = {
        // Base defaults for all business types
        numberOfChairs: this.getDefaultChairCount(businessType),
        parkingAvailable: true,
        wifiAvailable: true,
        wheelchairAccessible: true,
      }

      // Apply AI recommendations if available
      if (aiDefaults.success && aiDefaults.defaults) {
        Object.assign(defaults, aiDefaults.defaults)
      }

      // Segmentation-specific enhancements
      switch (this.segmentationPath) {
        case 'first_barbershop':
          defaults.businessHours = defaults.businessHours || this.getBeginnerFriendlyHours()
          defaults.services = defaults.services || this.getEssentialServices(businessType)
          defaults.bookingRules = defaults.bookingRules || this.getSimpleBookingRules()
          defaults._aiInsights = aiDefaults.insights || []
          defaults._confidence = aiDefaults.confidence || 0.8
          break

        case 'adding_locations':
          defaults.businessHours = defaults.businessHours || this.getStandardBusinessHours()
          defaults.services = defaults.services || this.getComprehensiveServices(businessType)
          defaults.bookingRules = defaults.bookingRules || this.getEnterpriseBookingRules()
          defaults._aiInsights = aiDefaults.insights || []
          defaults._confidence = aiDefaults.confidence || 0.85
          break

        case 'switching_systems':
          // Minimal defaults, expecting data import
          defaults.preserveExistingData = true
          defaults._migrationGuidance = aiDefaults.insights || []
          break
      }

      return defaults

    } catch (error) {
      console.warn('Failed to fetch AI defaults, using fallback:', error)
      // Fallback to original logic if API fails
      return this.generateFallbackDefaults(businessType)
    }
  }

  /**
   * Fallback defaults when API is unavailable
   */
  generateFallbackDefaults(businessType = 'barbershop') {
    const defaults = {
      numberOfChairs: this.getDefaultChairCount(businessType),
      parkingAvailable: true,
      wifiAvailable: true,
      wheelchairAccessible: true,
    }

    switch (this.segmentationPath) {
      case 'first_barbershop':
        defaults.businessHours = this.getBeginnerFriendlyHours()
        defaults.services = this.getEssentialServices(businessType)
        defaults.bookingRules = this.getSimpleBookingRules()
        break

      case 'adding_locations':
        defaults.businessHours = this.getStandardBusinessHours()
        defaults.services = this.getComprehensiveServices(businessType)
        defaults.bookingRules = this.getEnterpriseBookingRules()
        break

      case 'switching_systems':
        defaults.preserveExistingData = true
        break
    }

    return defaults
  }

  /**
   * Helper methods for smart defaults
   */
  getDefaultChairCount(businessType) {
    const defaults = {
      'barbershop': 3,
      'salon': 5,
      'spa': 4,
      'beauty_salon': 6
    }
    return defaults[businessType] || 3
  }

  getBeginnerFriendlyHours() {
    return {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { closed: true }
    }
  }

  getStandardBusinessHours() {
    return {
      monday: { open: '08:00', close: '19:00', closed: false },
      tuesday: { open: '08:00', close: '19:00', closed: false },
      wednesday: { open: '08:00', close: '19:00', closed: false },
      thursday: { open: '08:00', close: '19:00', closed: false },
      friday: { open: '08:00', close: '20:00', closed: false },
      saturday: { open: '08:00', close: '18:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: false }
    }
  }

  getEssentialServices(businessType) {
    const essentialServices = {
      'barbershop': [
        { name: 'Haircut', duration: 30, price: 25 },
        { name: 'Beard Trim', duration: 15, price: 15 },
        { name: 'Haircut + Beard', duration: 45, price: 35 }
      ],
      'salon': [
        { name: 'Cut & Style', duration: 60, price: 45 },
        { name: 'Color', duration: 120, price: 85 },
        { name: 'Blowout', duration: 30, price: 30 }
      ],
      'spa': [
        { name: 'Facial', duration: 60, price: 75 },
        { name: 'Massage', duration: 60, price: 85 },
        { name: 'Manicure', duration: 45, price: 35 }
      ]
    }
    return essentialServices[businessType] || essentialServices['barbershop']
  }

  getComprehensiveServices(businessType) {
    // More extensive service list for experienced businesses
    const services = this.getEssentialServices(businessType)
    
    const additionalServices = {
      'barbershop': [
        { name: 'Hot Towel Shave', duration: 45, price: 40 },
        { name: 'Mustache Trim', duration: 10, price: 10 },
        { name: 'Head Shave', duration: 30, price: 30 }
      ],
      'salon': [
        { name: 'Highlights', duration: 180, price: 120 },
        { name: 'Deep Conditioning', duration: 45, price: 25 },
        { name: 'Keratin Treatment', duration: 240, price: 200 }
      ]
    }

    return [...services, ...(additionalServices[businessType] || [])]
  }

  getSimpleBookingRules() {
    return {
      advanceBookingDays: 30,
      cancellationHours: 24,
      bufferMinutes: 15,
      allowOnlineBooking: true,
      requireDeposit: false
    }
  }

  getEnterpriseBookingRules() {
    return {
      advanceBookingDays: 60,
      cancellationHours: 48,
      bufferMinutes: 10,
      allowOnlineBooking: true,
      requireDeposit: true,
      depositPercentage: 20,
      allowWaitlist: true,
      autoConfirmBookings: true
    }
  }

  /**
   * Determine if a step should be skipped based on context
   */
  shouldSkipStep(stepId, formData = {}) {
    // Skip based on segmentation path
    if (this.segmentationPath === 'switching_systems') {
      // Migration users might skip basic setup if they're importing data
      if (stepId === 'services' && formData.hasImportedServices) {
        return true
      }
      if (stepId === 'staff' && formData.hasImportedStaff) {
        return true
      }
    }

    // Skip advanced features for beginners
    if (this.segmentationPath === 'first_barbershop') {
      if (stepId === 'advanced_analytics' || stepId === 'enterprise_features') {
        return true
      }
    }

    return false
  }

  /**
   * Get contextual help content based on segmentation
   */
  getContextualHelp(stepId) {
    const helpContent = {
      'first_barbershop': {
        'business': 'Take your time here - this information helps customers find and trust your new business.',
        'financial': 'Start simple! You can always add more payment options later as you grow.',
        'services': 'Focus on 3-5 core services to start. You can expand your menu once you\'re established.'
      },
      'adding_locations': {
        'organization': 'Set up your brand standards here - they\'ll apply to all your locations.',
        'financial': 'Configure commission structures and payment processing for multiple locations.',
        'location_management': 'Define how your locations will operate independently or together.'
      },
      'switching_systems': {
        'data_import': 'We\'ll help you bring over your existing customers, appointments, and service history.',
        'business': 'Verify this information matches your current system to ensure a smooth transition.',
        'data_verification': 'Double-check that all your important data transferred correctly.'
      }
    }

    return helpContent[this.segmentationPath]?.[stepId] || null
  }

  /**
   * Get completion celebration message based on segmentation
   */
  getCompletionMessage() {
    const messages = {
      'first_barbershop': '🎉 Congratulations! Your barbershop is now ready for customers. You\'ve built a solid foundation for success!',
      'adding_locations': '🚀 Excellent! Your new location is configured and ready to scale with your growing business.',
      'switching_systems': '✅ Migration complete! Your data has been successfully transferred and your new system is ready to use.'
    }

    return messages[this.segmentationPath] || '🎉 Setup complete! Your business is ready to accept online bookings.'
  }
}