/**
 * Automation Prediction Service
 * 
 * AI-powered no-show prediction using multiple data points.
 * Integrates with OpenAI for prediction analysis.
 */

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export class AutomationPredictionService {
  constructor() {
    this.initialized = false
  }

  async initialize() {
    this.initialized = true
    console.log('✅ Prediction Service initialized')
  }

  /**
   * Predict no-show risk for appointment
   */
  async predictNoShowRisk({ shopId, appointmentId, dataPoints = [], jobId }) {
    const supabase = await createClient()
    
    try {
      console.log(`🔮 Processing prediction: ${jobId}`)
      
      // Gather comprehensive data for prediction
      const predictionData = await this.gatherPredictionData(supabase, shopId, appointmentId, dataPoints)
      
      // Run AI prediction
      const prediction = await this.runAIPrediction(predictionData)
      
      // Store prediction results
      await this.storePredictionResults({
        supabase,
        appointmentId,
        shopId,
        prediction,
        dataPoints: predictionData,
        jobId
      })

      // Trigger preventive actions if high risk
      if (prediction.riskScore >= 0.85) {
        await this.triggerPreventiveActions({
          supabase,
          shopId,
          appointmentId,
          prediction,
          jobId
        })
      }

      console.log(`✅ Prediction completed: ${jobId} (Risk: ${(prediction.riskScore * 100).toFixed(1)}%)`)
      
      return {
        success: true,
        riskScore: prediction.riskScore,
        confidence: prediction.confidence,
        factors: prediction.factors,
        recommendations: prediction.recommendations
      }
      
    } catch (error) {
      console.error(`❌ Prediction failed: ${jobId}`, error)
      throw error
    }
  }

  /**
   * Gather data points for prediction
   */
  async gatherPredictionData(supabase, shopId, appointmentId, requestedDataPoints) {
    const data = {
      appointment: null,
      customer: null,
      weather: null,
      traffic: null,
      historical: null
    }

    // Get appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        *,
        customers:customers(*),
        services:services(*),
        barbers:profiles!appointments_barber_id_fkey(*)
      `)
      .eq('id', appointmentId)
      .single()
    
    data.appointment = appointment
    data.customer = appointment?.customers

    // Get customer history if requested
    if (requestedDataPoints.includes('client_history')) {
      const { data: history } = await supabase
        .from('appointments')
        .select('status, no_show, cancelled_at')
        .eq('customer_id', appointment.customer_id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      data.historical = {
        totalAppointments: history?.length || 0,
        noShows: history?.filter(a => a.no_show).length || 0,
        cancellations: history?.filter(a => a.cancelled_at).length || 0,
        completedAppointments: history?.filter(a => a.status === 'completed').length || 0
      }
    }

    // Get weather data if requested (placeholder)
    if (requestedDataPoints.includes('weather')) {
      data.weather = await this.getWeatherData(appointment.appointment_time)
    }

    // Get traffic data if requested (placeholder)
    if (requestedDataPoints.includes('traffic')) {
      data.traffic = await this.getTrafficData(appointment.appointment_time)
    }

    return data
  }

  /**
   * Run AI prediction using OpenAI
   */
  async runAIPrediction(data) {
    const prompt = this.buildPredictionPrompt(data)
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert appointment no-show predictor. Analyze the provided data and return a JSON response with riskScore (0-1), confidence (0-1), factors (array of contributing factors), and recommendations (array of preventive actions).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })

      const result = JSON.parse(response.choices[0].message.content)
      
      return {
        riskScore: Math.max(0, Math.min(1, result.riskScore)),
        confidence: Math.max(0, Math.min(1, result.confidence)),
        factors: result.factors || [],
        recommendations: result.recommendations || [],
        rawResponse: response.choices[0].message.content
      }
      
    } catch (error) {
      console.error('AI prediction error:', error)
      
      // Fallback to rule-based prediction
      return this.fallbackPrediction(data)
    }
  }

  /**
   * Build prediction prompt for AI
   */
  buildPredictionPrompt(data) {
    const { appointment, customer, historical, weather, traffic } = data
    
    return `
Analyze this appointment for no-show risk:

APPOINTMENT:
- Service: ${appointment.services?.name}
- Date/Time: ${appointment.appointment_time}
- Day of Week: ${new Date(appointment.appointment_time).toLocaleDateString('en-US', { weekday: 'long' })}
- Duration: ${appointment.services?.duration} minutes
- Price: $${appointment.services?.price}

CUSTOMER:
- First time client: ${historical?.totalAppointments <= 1}
- Total appointments: ${historical?.totalAppointments}
- No-show rate: ${historical?.totalAppointments > 0 ? (historical.noShows / historical.totalAppointments * 100).toFixed(1) : 0}%
- Cancellation rate: ${historical?.totalAppointments > 0 ? (historical.cancellations / historical.totalAppointments * 100).toFixed(1) : 0}%
- Completed appointments: ${historical?.completedAppointments}

${weather ? `WEATHER: ${JSON.stringify(weather)}` : ''}
${traffic ? `TRAFFIC: ${JSON.stringify(traffic)}` : ''}

Please provide a risk assessment with specific factors and recommendations.
    `.trim()
  }

  /**
   * Fallback rule-based prediction
   */
  fallbackPrediction(data) {
    const { appointment, customer, historical } = data
    let riskScore = 0.3 // Base risk
    const factors = []

    // Customer history factors
    if (historical?.totalAppointments === 0) {
      riskScore += 0.2
      factors.push('First-time customer')
    }

    if (historical?.noShows > 0) {
      const noShowRate = historical.noShows / historical.totalAppointments
      riskScore += noShowRate * 0.4
      factors.push(`Previous no-shows: ${historical.noShows}`)
    }

    // Time-based factors
    const appointmentHour = new Date(appointment.appointment_time).getHours()
    if (appointmentHour < 10) {
      riskScore += 0.1
      factors.push('Early morning appointment')
    }

    // Day of week factors
    const dayOfWeek = new Date(appointment.appointment_time).getDay()
    if (dayOfWeek === 1) { // Monday
      riskScore += 0.1
      factors.push('Monday appointment')
    }

    return {
      riskScore: Math.min(1, riskScore),
      confidence: 0.7, // Lower confidence for rule-based
      factors,
      recommendations: this.generateRecommendations(riskScore, factors)
    }
  }

  /**
   * Generate recommendations based on risk factors
   */
  generateRecommendations(riskScore, factors) {
    const recommendations = []

    if (riskScore >= 0.7) {
      recommendations.push('Send additional reminder')
      recommendations.push('Consider requiring deposit')
    }

    if (riskScore >= 0.8) {
      recommendations.push('Call customer to confirm')
      recommendations.push('Add to waitlist priority')
    }

    if (factors.includes('First-time customer')) {
      recommendations.push('Send welcome message with directions')
    }

    return recommendations
  }

  /**
   * Get weather data (placeholder)
   */
  async getWeatherData(appointmentTime) {
    // In production, integrate with weather API
    return {
      condition: 'clear',
      temperature: 72,
      precipitation: 0
    }
  }

  /**
   * Get traffic data (placeholder)
   */
  async getTrafficData(appointmentTime) {
    // In production, integrate with traffic API
    return {
      congestion: 'low',
      delay: 0
    }
  }

  /**
   * Store prediction results
   */
  async storePredictionResults({ supabase, appointmentId, shopId, prediction, dataPoints, jobId }) {
    try {
      await supabase
        .from('automation_predictions')
        .insert({
          appointment_id: appointmentId,
          shop_id: shopId,
          risk_score: prediction.riskScore,
          confidence: prediction.confidence,
          factors: prediction.factors,
          recommendations: prediction.recommendations,
          data_points: dataPoints,
          automation_job_id: jobId,
          predicted_at: new Date().toISOString()
        })
        
    } catch (error) {
      console.error('Failed to store prediction results:', error)
    }
  }

  /**
   * Trigger preventive actions for high-risk appointments
   */
  async triggerPreventiveActions({ supabase, shopId, appointmentId, prediction, jobId }) {
    try {
      // This could trigger other automation jobs
      console.log(`🚨 High-risk appointment detected: ${appointmentId} (${(prediction.riskScore * 100).toFixed(1)}% risk)`)
      
      // Example: Trigger additional reminder
      // await queueManager.addReminderJob(shopId, appointmentId, customerId, prediction.riskScore)
      
    } catch (error) {
      console.error('Failed to trigger preventive actions:', error)
    }
  }

  async shutdown() {
    this.initialized = false
    console.log('✅ Prediction Service shutdown')
  }
}