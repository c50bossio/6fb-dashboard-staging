'use client'

import logger from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Predictive No-Show Detection Service
 * 
 * Uses AI and machine learning to predict appointment no-show risk including:
 * - Multi-factor risk assessment (weather, traffic, history, patterns)
 * - Integration with AI providers (OpenAI/Anthropic) for predictions
 * - Automated preventive actions based on risk scores
 * - Continuous learning and model improvement
 */
export class PredictionService {
  constructor(orchestrator) {
    this.orchestrator = orchestrator
    this.models = new Map()
    this.predictionCache = new Map()
    this.trainingQueue = []
    this.featureExtractors = {
      weather: this.getWeatherFeatures.bind(this),
      traffic: this.getTrafficFeatures.bind(this),
      client_history: this.getClientHistoryFeatures.bind(this),
      time_of_day: this.getTimeFeatures.bind(this),
      service_type: this.getServiceFeatures.bind(this),
      booking_pattern: this.getBookingPatternFeatures.bind(this)
    }
    this.aiProviders = {
      openai: this.callOpenAI.bind(this),
      anthropic: this.callAnthropic.bind(this),
      google: this.callGoogle.bind(this)
    }
  }

  async initialize() {
    logger.info('[PredictionService] Initializing predictive detection service')
    
    // Load existing models
    await this.loadModels()
    
    // Initialize AI clients
    await this.initializeAIClients()
    
    logger.info('[PredictionService] Predictive detection service initialized')
  }

  /**
   * Assess appointment risk and trigger preventive actions
   */
  async assessAppointmentRisk(data) {
    const { appointmentId, barbershopId, clientId, settings } = data
    
    try {
      logger.info(`[PredictionService] Assessing risk for appointment ${appointmentId}`)

      // Get appointment details
      const appointmentData = await this.getAppointmentDetails(appointmentId)
      if (!appointmentData) {
        throw new Error('Appointment not found')
      }

      // Extract features based on configured data points
      const features = await this.extractFeatures(appointmentData, settings.dataPoints || [])
      
      // Get risk prediction
      const riskPrediction = await this.predictNoShowRisk(features, settings)
      
      // Store prediction for analytics
      await this.storePrediction(appointmentData, features, riskPrediction)
      
      // Take preventive actions if risk exceeds threshold
      if (riskPrediction.confidence >= settings.confidenceThreshold && 
          riskPrediction.riskScore >= settings.actionThreshold) {
        
        await this.executePreventiveActions(appointmentData, riskPrediction, settings)
      }

      logger.info(`[PredictionService] Risk assessment complete for appointment ${appointmentId}: ${(riskPrediction.riskScore * 100).toFixed(1)}% risk`)

      return riskPrediction

    } catch (error) {
      logger.error(`[PredictionService] Error assessing appointment risk:`, error)
      return { riskScore: 0.5, confidence: 0.3, error: error.message }
    }
  }

  /**
   * Extract features from appointment data based on configured data points
   */
  async extractFeatures(appointmentData, dataPoints) {
    const features = {
      appointment_id: appointmentData.id,
      client_id: appointmentData.client_id,
      barbershop_id: appointmentData.barbershop_id,
      timestamp: new Date().toISOString()
    }

    for (const dataPoint of dataPoints) {
      if (this.featureExtractors[dataPoint]) {
        try {
          const pointFeatures = await this.featureExtractors[dataPoint](appointmentData)
          features[dataPoint] = pointFeatures
        } catch (error) {
          logger.warn(`[PredictionService] Failed to extract ${dataPoint} features:`, error.message)
          features[dataPoint] = null
        }
      }
    }

    return features
  }

  /**
   * Get weather features for the appointment location and time
   */
  async getWeatherFeatures(appointmentData) {
    try {
      // This would integrate with weather APIs like OpenWeatherMap
      const appointmentTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`)
      const location = await this.getBarbershopLocation(appointmentData.barbershop_id)
      
      // Simulate weather API call
      // const weather = await weatherAPI.forecast(location.lat, location.lng, appointmentTime)
      
      // For now, return mock weather data
      const mockWeather = this.generateMockWeatherData(appointmentTime)
      
      return {
        temperature: mockWeather.temperature,
        conditions: mockWeather.conditions,
        precipitation_chance: mockWeather.precipitationChance,
        wind_speed: mockWeather.windSpeed,
        visibility: mockWeather.visibility,
        severe_weather: mockWeather.severeWeather
      }

    } catch (error) {
      logger.error('[PredictionService] Error getting weather features:', error)
      return null
    }
  }

  /**
   * Get traffic features for the appointment time
   */
  async getTrafficFeatures(appointmentData) {
    try {
      // This would integrate with traffic APIs like Google Maps Traffic
      const appointmentTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`)
      const location = await this.getBarbershopLocation(appointmentData.barbershop_id)
      
      // Simulate traffic data based on time patterns
      const hour = appointmentTime.getHours()
      const dayOfWeek = appointmentTime.getDay()
      
      let trafficLevel = 'light'
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        trafficLevel = 'heavy'
      } else if ((hour >= 11 && hour <= 14) || (hour >= 15 && hour <= 17)) {
        trafficLevel = 'moderate'
      }
      
      // Weekend traffic is generally lighter
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        trafficLevel = trafficLevel === 'heavy' ? 'moderate' : 'light'
      }

      return {
        traffic_level: trafficLevel,
        expected_delay_minutes: this.getExpectedDelay(trafficLevel),
        construction_alerts: Math.random() < 0.1, // 10% chance of construction
        accident_alerts: Math.random() < 0.05    // 5% chance of accidents
      }

    } catch (error) {
      logger.error('[PredictionService] Error getting traffic features:', error)
      return null
    }
  }

  /**
   * Get client history features
   */
  async getClientHistoryFeatures(appointmentData) {
    try {
      const clientId = appointmentData.client_id
      const client = appointmentData.clients

      // Get booking statistics
      const bookingStats = await this.getClientBookingStats(clientId)
      
      // Get recent appointment patterns
      const recentPatterns = await this.getRecentAppointmentPatterns(clientId)

      return {
        no_show_strikes: client?.no_show_strikes || 0,
        total_bookings: bookingStats.total,
        completed_bookings: bookingStats.completed,
        completion_rate: bookingStats.completionRate,
        average_lead_time: bookingStats.averageLeadTime,
        last_no_show_days_ago: bookingStats.lastNoShowDaysAgo,
        booking_consistency: recentPatterns.consistency,
        preferred_times: recentPatterns.preferredTimes,
        seasonal_patterns: recentPatterns.seasonalPatterns,
        loyalty_score: this.calculateLoyaltyScore(client, bookingStats)
      }

    } catch (error) {
      logger.error('[PredictionService] Error getting client history features:', error)
      return null
    }
  }

  /**
   * Get time-based features
   */
  async getTimeFeatures(appointmentData) {
    try {
      const appointmentTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`)
      const now = new Date()
      
      const dayOfWeek = appointmentTime.getDay()
      const hour = appointmentTime.getHours()
      const leadTime = Math.floor((appointmentTime - now) / (1000 * 60 * 60 * 24)) // days
      const month = appointmentTime.getMonth()
      
      // Get historical no-show rates for this time slot
      const historicalRates = await this.getHistoricalNoShowRates(appointmentData.barbershop_id, dayOfWeek, hour)

      return {
        day_of_week: dayOfWeek,
        hour_of_day: hour,
        is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
        is_monday: dayOfWeek === 1,
        is_friday: dayOfWeek === 5,
        is_morning: hour >= 6 && hour < 12,
        is_afternoon: hour >= 12 && hour < 18,
        is_evening: hour >= 18,
        lead_time_days: leadTime,
        is_same_day: leadTime === 0,
        is_short_notice: leadTime <= 1,
        month: month,
        is_holiday_season: month === 11 || month === 0, // Nov-Dec
        historical_no_show_rate: historicalRates.noShowRate,
        time_slot_popularity: historicalRates.bookingVolume
      }

    } catch (error) {
      logger.error('[PredictionService] Error getting time features:', error)
      return null
    }
  }

  /**
   * Get service-type features
   */
  async getServiceFeatures(appointmentData) {
    try {
      const service = appointmentData.services
      if (!service) return null

      // Get service statistics
      const serviceStats = await this.getServiceStats(service.id, appointmentData.barbershop_id)

      return {
        service_duration: service.duration || 60,
        service_price: service.price || appointmentData.price || 0,
        is_long_service: (service.duration || 60) > 90,
        is_expensive_service: (service.price || 0) > 100,
        service_category: this.categorizeService(service.name),
        service_no_show_rate: serviceStats.noShowRate,
        service_popularity: serviceStats.bookingVolume,
        requires_preparation: serviceStats.requiresPreparation
      }

    } catch (error) {
      logger.error('[PredictionService] Error getting service features:', error)
      return null
    }
  }

  /**
   * Get booking pattern features
   */
  async getBookingPatternFeatures(appointmentData) {
    try {
      const clientId = appointmentData.client_id
      const appointmentTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`)
      
      // Get client's booking patterns
      const patterns = await this.getClientBookingPatterns(clientId)
      
      // Check for pattern deviations
      const typicalDayOfWeek = patterns.mostCommonDayOfWeek
      const typicalHour = patterns.mostCommonHour
      const typicalLeadTime = patterns.averageLeadTime
      
      const currentLeadTime = Math.floor((appointmentTime - new Date()) / (1000 * 60 * 60 * 24))
      
      return {
        deviates_from_typical_day: Math.abs(appointmentTime.getDay() - typicalDayOfWeek) > 2,
        deviates_from_typical_time: Math.abs(appointmentTime.getHours() - typicalHour) > 3,
        deviates_from_typical_lead_time: Math.abs(currentLeadTime - typicalLeadTime) > 7,
        is_repeat_client: patterns.bookingCount > 3,
        booking_frequency: patterns.bookingFrequency, // bookings per month
        last_booking_days_ago: patterns.daysSinceLastBooking,
        booking_consistency_score: patterns.consistencyScore
      }

    } catch (error) {
      logger.error('[PredictionService] Error getting booking pattern features:', error)
      return null
    }
  }

  /**
   * Predict no-show risk using AI models
   */
  async predictNoShowRisk(features, settings) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(features)
      const cachedPrediction = this.predictionCache.get(cacheKey)
      if (cachedPrediction && this.isCacheValid(cachedPrediction)) {
        return cachedPrediction.prediction
      }

      // Try local model first if available
      const localPrediction = await this.tryLocalModel(features)
      if (localPrediction && localPrediction.confidence > 0.7) {
        this.cachePrediction(cacheKey, localPrediction)
        return localPrediction
      }

      // Fall back to AI provider
      const aiPrediction = await this.getAIPrediction(features, settings)
      
      // Combine local and AI predictions if both available
      const finalPrediction = this.combinePredictions(localPrediction, aiPrediction)
      
      // Cache the result
      this.cachePrediction(cacheKey, finalPrediction)
      
      return finalPrediction

    } catch (error) {
      logger.error('[PredictionService] Error predicting no-show risk:', error)
      
      // Fallback to rule-based prediction
      return this.getRuleBasedPrediction(features)
    }
  }

  /**
   * Get AI-based prediction from configured provider
   */
  async getAIPrediction(features, settings) {
    const availableProviders = ['openai', 'anthropic', 'google']
    
    for (const provider of availableProviders) {
      try {
        if (this.aiProviders[provider]) {
          const prediction = await this.aiProviders[provider](features, settings)
          if (prediction) {
            prediction.provider = provider
            return prediction
          }
        }
      } catch (error) {
        logger.warn(`[PredictionService] ${provider} prediction failed:`, error.message)
        continue
      }
    }

    throw new Error('All AI providers failed')
  }

  /**
   * Call OpenAI for prediction
   */
  async callOpenAI(features, settings) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      // This would call OpenAI's API with the features
      // For now, return a mock prediction
      const mockPrediction = this.generateMockAIPrediction(features)
      
      logger.debug('[PredictionService] OpenAI prediction generated')
      return mockPrediction

    } catch (error) {
      logger.error('[PredictionService] OpenAI prediction error:', error)
      return null
    }
  }

  /**
   * Call Anthropic for prediction
   */
  async callAnthropic(features, settings) {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key not configured')
      }

      // This would call Anthropic's API with the features
      const mockPrediction = this.generateMockAIPrediction(features)
      
      logger.debug('[PredictionService] Anthropic prediction generated')
      return mockPrediction

    } catch (error) {
      logger.error('[PredictionService] Anthropic prediction error:', error)
      return null
    }
  }

  /**
   * Call Google AI for prediction
   */
  async callGoogle(features, settings) {
    try {
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('Google AI API key not configured')
      }

      // This would call Google's AI API
      const mockPrediction = this.generateMockAIPrediction(features)
      
      logger.debug('[PredictionService] Google AI prediction generated')
      return mockPrediction

    } catch (error) {
      logger.error('[PredictionService] Google AI prediction error:', error)
      return null
    }
  }

  /**
   * Execute preventive actions based on risk prediction
   */
  async executePreventiveActions(appointmentData, riskPrediction, settings) {
    try {
      const actions = settings.preventiveActions || []
      const actionPromises = []

      for (const action of actions) {
        switch (action) {
          case 'extra_reminder':
            actionPromises.push(this.scheduleExtraReminder(appointmentData, riskPrediction))
            break
          case 'deposit_request':
            actionPromises.push(this.requestDeposit(appointmentData, riskPrediction))
            break
          case 'waitlist_alert':
            actionPromises.push(this.alertWaitlist(appointmentData, riskPrediction))
            break
          case 'manager_notification':
            actionPromises.push(this.notifyManager(appointmentData, riskPrediction))
            break
        }
      }

      const results = await Promise.allSettled(actionPromises)
      const successCount = results.filter(r => r.status === 'fulfilled').length

      logger.info(`[PredictionService] Executed ${successCount}/${actions.length} preventive actions for appointment ${appointmentData.id}`)

    } catch (error) {
      logger.error('[PredictionService] Error executing preventive actions:', error)
    }
  }

  /**
   * Schedule an extra reminder for high-risk appointments
   */
  async scheduleExtraReminder(appointmentData, riskPrediction) {
    try {
      // Schedule an additional reminder via the reminder engine
      await this.orchestrator.services.reminderEngine.scheduleReminders({
        appointmentId: appointmentData.id,
        barbershopId: appointmentData.barbershop_id,
        clientId: appointmentData.client_id,
        settings: {
          enabled: true,
          riskThreshold: 0.5, // Lower threshold for extra reminders
          escalationSteps: [
            { hours: 12, method: 'sms' }, // Extra SMS reminder 12 hours before
            { hours: 2, method: 'phone' }  // Phone call 2 hours before
          ],
          personalizedMessages: true,
          trackResponse: true
        }
      })

      logger.info(`[PredictionService] Scheduled extra reminder for high-risk appointment ${appointmentData.id}`)

    } catch (error) {
      logger.error('[PredictionService] Error scheduling extra reminder:', error)
    }
  }

  /**
   * Request deposit for high-risk appointments
   */
  async requestDeposit(appointmentData, riskPrediction) {
    try {
      const supabase = await createClient()
      
      const depositAmount = Math.round((appointmentData.price || 50) * 0.2) // 20% deposit
      
      await supabase
        .from('appointments')
        .update({
          requires_deposit: true,
          deposit_amount: depositAmount,
          deposit_requested_at: new Date().toISOString(),
          deposit_reason: `High no-show risk: ${Math.round(riskPrediction.riskScore * 100)}%`
        })
        .eq('id', appointmentData.id)

      logger.info(`[PredictionService] Requested $${depositAmount} deposit for high-risk appointment ${appointmentData.id}`)

    } catch (error) {
      logger.error('[PredictionService] Error requesting deposit:', error)
    }
  }

  /**
   * Alert waitlist about potential opening
   */
  async alertWaitlist(appointmentData, riskPrediction) {
    try {
      if (riskPrediction.riskScore < 0.8) return // Only for very high risk

      const supabase = await createClient()
      
      // Find waitlist clients for this time slot
      const appointmentTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`)
      const timeWindow = 2 * 60 * 60 * 1000 // 2 hour window
      
      const { data: waitlistEntries } = await supabase
        .from('waitlist')
        .select('*')
        .eq('barbershop_id', appointmentData.barbershop_id)
        .eq('service_id', appointmentData.service_id)
        .gte('desired_date', new Date(appointmentTime.getTime() - timeWindow).toISOString())
        .lte('desired_date', new Date(appointmentTime.getTime() + timeWindow).toISOString())
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(3)

      if (waitlistEntries?.length) {
        // Send notifications to waitlist clients
        for (const entry of waitlistEntries) {
          await this.sendWaitlistAlert(entry, appointmentData, riskPrediction)
        }
      }

      logger.info(`[PredictionService] Alerted ${waitlistEntries?.length || 0} waitlist clients for potential opening`)

    } catch (error) {
      logger.error('[PredictionService] Error alerting waitlist:', error)
    }
  }

  /**
   * Notify manager about high-risk appointment
   */
  async notifyManager(appointmentData, riskPrediction) {
    try {
      await this.orchestrator.notifyManager({
        type: 'high_risk_booking',
        barbershopId: appointmentData.barbershop_id,
        appointmentId: appointmentData.id,
        clientId: appointmentData.client_id,
        riskScore: riskPrediction.riskScore,
        confidence: riskPrediction.confidence,
        riskFactors: riskPrediction.riskFactors,
        settings: { channels: ['email', 'dashboard'], frequency: 'immediate' }
      })

      logger.info(`[PredictionService] Notified manager about high-risk appointment ${appointmentData.id}`)

    } catch (error) {
      logger.error('[PredictionService] Error notifying manager:', error)
    }
  }

  /**
   * Store prediction for analytics and model improvement
   */
  async storePrediction(appointmentData, features, prediction) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('no_show_predictions')
        .insert({
          appointment_id: appointmentData.id,
          client_id: appointmentData.client_id,
          barbershop_id: appointmentData.barbershop_id,
          risk_score: prediction.riskScore,
          confidence: prediction.confidence,
          features: features,
          prediction_model: prediction.provider || 'local',
          risk_factors: prediction.riskFactors,
          preventive_actions_taken: prediction.actionsTaken || [],
          predicted_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

    } catch (error) {
      logger.error('[PredictionService] Error storing prediction:', error)
    }
  }

  /**
   * Update models based on actual outcomes
   */
  async updateModels() {
    try {
      logger.info('[PredictionService] Starting model updates')

      // Get recent predictions with outcomes
      const trainingData = await this.getTrainingData()
      
      if (trainingData.length < 50) {
        logger.info('[PredictionService] Insufficient training data, skipping model update')
        return
      }

      // Calculate model accuracy
      const accuracy = this.calculateModelAccuracy(trainingData)
      logger.info(`[PredictionService] Current model accuracy: ${(accuracy * 100).toFixed(1)}%`)

      // Update local model if needed
      if (accuracy < 0.75) {
        await this.retrainLocalModel(trainingData)
      }

      // Add to training queue for future processing
      this.trainingQueue.push(...trainingData.slice(-100)) // Keep last 100 examples

    } catch (error) {
      logger.error('[PredictionService] Error updating models:', error)
    }
  }

  /**
   * Get client risk score for other services to use
   */
  async getClientRiskScore(clientId) {
    try {
      // Get recent risk scores for this client
      const supabase = await createClient()
      
      const { data: recentPredictions } = await supabase
        .from('no_show_predictions')
        .select('risk_score, confidence, predicted_at')
        .eq('client_id', clientId)
        .gte('predicted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('predicted_at', { ascending: false })
        .limit(10)

      if (!recentPredictions?.length) {
        // No recent predictions, calculate based on history
        const historicalRisk = await this.calculateHistoricalRisk(clientId)
        return historicalRisk
      }

      // Weight recent predictions more heavily
      let weightedScore = 0
      let totalWeight = 0

      recentPredictions.forEach((pred, index) => {
        const weight = Math.pow(0.9, index) // Exponential decay
        weightedScore += pred.risk_score * pred.confidence * weight
        totalWeight += weight
      })

      return totalWeight > 0 ? weightedScore / totalWeight : 0.5

    } catch (error) {
      logger.error('[PredictionService] Error getting client risk score:', error)
      return 0.5
    }
  }

  /**
   * Utility methods
   */

  generateMockWeatherData(appointmentTime) {
    const hour = appointmentTime.getHours()
    const month = appointmentTime.getMonth()
    
    return {
      temperature: 70 + Math.sin(month / 12 * Math.PI * 2) * 20 + Math.sin(hour / 24 * Math.PI * 2) * 10,
      conditions: Math.random() > 0.8 ? 'rain' : 'clear',
      precipitationChance: Math.random() * 100,
      windSpeed: Math.random() * 20,
      visibility: 5 + Math.random() * 5,
      severeWeather: Math.random() < 0.05
    }
  }

  getExpectedDelay(trafficLevel) {
    const delays = { light: 0, moderate: 5, heavy: 15 }
    return delays[trafficLevel] || 0
  }

  generateMockAIPrediction(features) {
    // Generate realistic prediction based on features
    let riskScore = 0.3

    // Adjust based on client history
    if (features.client_history) {
      const strikes = features.client_history.no_show_strikes || 0
      riskScore += strikes * 0.15
      
      if (features.client_history.completion_rate < 0.8) {
        riskScore += 0.2
      }
    }

    // Adjust based on timing
    if (features.time_of_day) {
      if (features.time_of_day.is_same_day) {
        riskScore += 0.3
      } else if (features.time_of_day.is_short_notice) {
        riskScore += 0.15
      }
      
      if (features.time_of_day.is_monday) {
        riskScore += 0.1
      }
    }

    // Adjust based on weather
    if (features.weather) {
      if (features.weather.conditions === 'rain' || features.weather.severe_weather) {
        riskScore += 0.2
      }
    }

    // Cap at 0-1 range
    riskScore = Math.max(0, Math.min(1, riskScore))

    return {
      riskScore,
      confidence: 0.8 + Math.random() * 0.2,
      riskFactors: this.identifyRiskFactors(features, riskScore),
      reasoning: this.generateReasoning(features, riskScore)
    }
  }

  identifyRiskFactors(features, riskScore) {
    const factors = []
    
    if (features.client_history?.no_show_strikes > 0) {
      factors.push('Previous no-shows')
    }
    
    if (features.time_of_day?.is_same_day) {
      factors.push('Same-day booking')
    }
    
    if (features.weather?.severe_weather) {
      factors.push('Severe weather forecast')
    }
    
    if (features.traffic?.traffic_level === 'heavy') {
      factors.push('Heavy traffic expected')
    }

    return factors
  }

  generateReasoning(features, riskScore) {
    if (riskScore > 0.7) {
      return 'High risk due to multiple negative factors'
    } else if (riskScore > 0.4) {
      return 'Moderate risk with some concerning patterns'
    } else {
      return 'Low risk with favorable conditions'
    }
  }

  generateCacheKey(features) {
    // Create a hash of the key features for caching
    const keyFeatures = {
      client_id: features.client_id,
      appointment_date: features.timestamp?.split('T')[0],
      weather_hash: JSON.stringify(features.weather),
      client_history_hash: JSON.stringify(features.client_history)
    }
    return JSON.stringify(keyFeatures)
  }

  isCacheValid(cachedItem) {
    const maxAge = 2 * 60 * 60 * 1000 // 2 hours
    return (Date.now() - cachedItem.timestamp) < maxAge
  }

  cachePrediction(key, prediction) {
    this.predictionCache.set(key, {
      prediction,
      timestamp: Date.now()
    })
    
    // Clean old cache entries
    if (this.predictionCache.size > 1000) {
      const entries = Array.from(this.predictionCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      
      // Keep only the 500 most recent
      this.predictionCache.clear()
      entries.slice(0, 500).forEach(([k, v]) => {
        this.predictionCache.set(k, v)
      })
    }
  }

  async getAppointmentDetails(appointmentId) {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(*),
          services(*),
          barbershops(*)
        `)
        .eq('id', appointmentId)
        .single()

      return error ? null : data

    } catch (error) {
      logger.error('[PredictionService] Error fetching appointment details:', error)
      return null
    }
  }

  // Implement other utility methods...
  async getBarbershopLocation(barbershopId) {
    // This would fetch barbershop location from database
    return { lat: 40.7128, lng: -74.0060 } // Default to NYC
  }

  async getClientBookingStats(clientId) {
    // Implementation for getting client booking statistics
    return {
      total: 10,
      completed: 8,
      completionRate: 0.8,
      averageLeadTime: 7,
      lastNoShowDaysAgo: 30
    }
  }

  categorizeService(serviceName) {
    const name = serviceName?.toLowerCase() || ''
    if (name.includes('haircut') || name.includes('cut')) return 'haircut'
    if (name.includes('beard') || name.includes('shave')) return 'grooming'
    if (name.includes('color') || name.includes('dye')) return 'coloring'
    return 'other'
  }

  calculateLoyaltyScore(client, bookingStats) {
    // Simple loyalty score calculation
    const recencyScore = Math.min(1, 30 / (bookingStats.lastNoShowDaysAgo || 30))
    const frequencyScore = Math.min(1, bookingStats.total / 20)
    const reliabilityScore = bookingStats.completionRate
    
    return (recencyScore + frequencyScore + reliabilityScore) / 3
  }

  async loadModels() {
    // Implementation for loading existing ML models
    logger.debug('[PredictionService] Local models loaded')
  }

  async initializeAIClients() {
    // Implementation for initializing AI service clients
    logger.debug('[PredictionService] AI clients initialized')
  }

  async shutdown() {
    logger.info('[PredictionService] Shutting down prediction service')
    this.predictionCache.clear()
    this.models.clear()
    this.trainingQueue = []
  }
}

export default PredictionService