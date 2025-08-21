/**
 * Customer Health Score Triggers API
 * Handles automatic health score recalculation based on customer activities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to verify authentication
async function verifyAuth(request) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header', status: 401 }
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Invalid token', status: 401 }
    }

    // Get barbershop_id for the user
    const { data: barbershopData } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    let barbershopId = null
    if (barbershopData) {
      barbershopId = barbershopData.id
    } else {
      // Check if user is a barber
      const { data: barberData } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .single()
      
      if (barberData) {
        barbershopId = barberData.barbershop_id
      }
    }

    if (!barbershopId) {
      return { error: 'User not associated with any barbershop', status: 403 }
    }

    return { user, barbershopId }
  } catch (error) {
    return { error: 'Authentication failed', status: 401 }
  }
}

// Health score calculation engine
class HealthScoreCalculator {
  constructor(barbershopId) {
    this.barbershopId = barbershopId
  }

  async calculateHealthScore(customerId) {
    try {
      // Get customer data and recent activity
      const customerData = await this.getCustomerData(customerId)
      const activityData = await this.getActivityData(customerId)
      const feedbackData = await this.getFeedbackData(customerId)
      
      // Calculate component scores (0-1 scale)
      const recencyScore = this.calculateRecencyScore(activityData)
      const frequencyScore = this.calculateFrequencyScore(activityData)
      const monetaryScore = this.calculateMonetaryScore(activityData)
      const satisfactionScore = this.calculateSatisfactionScore(feedbackData)
      const engagementScore = this.calculateEngagementScore(activityData)
      
      // Weight the scores
      const weights = {
        recency: 0.25,      // How recently they visited
        frequency: 0.20,    // How often they visit
        monetary: 0.20,     // How much they spend
        satisfaction: 0.25, // How satisfied they are
        engagement: 0.10    // How engaged they are (cancellations, no-shows)
      }
      
      const healthScore = (
        recencyScore * weights.recency +
        frequencyScore * weights.frequency +
        monetaryScore * weights.monetary +
        satisfactionScore * weights.satisfaction +
        engagementScore * weights.engagement
      )
      
      return {
        health_score: Math.round(healthScore * 1000) / 1000, // 3 decimal places
        components: {
          recency: recencyScore,
          frequency: frequencyScore,
          monetary: monetaryScore,
          satisfaction: satisfactionScore,
          engagement: engagementScore
        },
        weights,
        calculated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error calculating health score:', error)
      return null
    }
  }

  async getCustomerData(customerId) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('barbershop_id', this.barbershopId)
      .single()
    
    return data
  }

  async getActivityData(customerId) {
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
    
    // Get appointments data
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', this.barbershopId)
      .gte('appointment_date', sixMonthsAgo.toISOString())
      .order('appointment_date', { ascending: false })
    
    // Get loyalty transactions
    const { data: loyaltyTransactions } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .gte('created_at', sixMonthsAgo.toISOString())
    
    return {
      appointments: appointments || [],
      loyaltyTransactions: loyaltyTransactions || []
    }
  }

  async getFeedbackData(customerId) {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    
    const { data: feedback } = await supabase
      .from('customer_feedback')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', this.barbershopId)
      .gte('created_at', oneYearAgo.toISOString())
    
    return feedback || []
  }

  calculateRecencyScore(activityData) {
    const { appointments } = activityData
    
    if (appointments.length === 0) return 0.1
    
    const lastAppointment = appointments[0]
    const daysSinceLastVisit = Math.floor(
      (new Date() - new Date(lastAppointment.appointment_date)) / (1000 * 60 * 60 * 24)
    )
    
    // Score based on days since last visit
    if (daysSinceLastVisit <= 7) return 1.0
    if (daysSinceLastVisit <= 14) return 0.9
    if (daysSinceLastVisit <= 30) return 0.8
    if (daysSinceLastVisit <= 60) return 0.6
    if (daysSinceLastVisit <= 90) return 0.4
    if (daysSinceLastVisit <= 180) return 0.2
    return 0.1
  }

  calculateFrequencyScore(activityData) {
    const { appointments } = activityData
    
    if (appointments.length === 0) return 0.1
    
    // Calculate visits per month over the last 6 months
    const completedAppointments = appointments.filter(apt => apt.status === 'completed')
    const visitsPerMonth = completedAppointments.length / 6
    
    // Score based on frequency
    if (visitsPerMonth >= 2) return 1.0      // 2+ visits per month
    if (visitsPerMonth >= 1.5) return 0.9    // 1.5 visits per month
    if (visitsPerMonth >= 1) return 0.8      // 1 visit per month
    if (visitsPerMonth >= 0.75) return 0.6   // 3 visits per 4 months
    if (visitsPerMonth >= 0.5) return 0.4    // 1 visit per 2 months
    if (visitsPerMonth >= 0.25) return 0.2   // 1 visit per 4 months
    return 0.1
  }

  calculateMonetaryScore(activityData) {
    const { appointments } = activityData
    
    if (appointments.length === 0) return 0.1
    
    const completedAppointments = appointments.filter(apt => apt.status === 'completed')
    const totalSpent = completedAppointments.reduce((sum, apt) => sum + (parseFloat(apt.total_amount) || 0), 0)
    const averageSpend = totalSpent / completedAppointments.length
    
    // Score based on average spend (adjust thresholds based on your barbershop's pricing)
    if (averageSpend >= 100) return 1.0
    if (averageSpend >= 75) return 0.9
    if (averageSpend >= 50) return 0.8
    if (averageSpend >= 35) return 0.6
    if (averageSpend >= 25) return 0.4
    if (averageSpend >= 15) return 0.2
    return 0.1
  }

  calculateSatisfactionScore(feedbackData) {
    if (feedbackData.length === 0) return 0.5 // Neutral if no feedback
    
    let totalRating = 0
    let ratingCount = 0
    let npsTotal = 0
    let npsCount = 0
    
    feedbackData.forEach(feedback => {
      if (feedback.rating && feedback.rating > 0) {
        totalRating += feedback.rating
        ratingCount++
      }
      if (feedback.nps_score !== null && feedback.nps_score !== undefined) {
        npsTotal += feedback.nps_score
        npsCount++
      }
    })
    
    let satisfactionScore = 0.5
    
    if (ratingCount > 0) {
      const avgRating = totalRating / ratingCount
      satisfactionScore = Math.max(satisfactionScore, avgRating / 5) // Normalize to 0-1
    }
    
    if (npsCount > 0) {
      const avgNPS = npsTotal / npsCount
      const npsScore = avgNPS / 10 // Normalize to 0-1
      satisfactionScore = Math.max(satisfactionScore, npsScore)
    }
    
    return satisfactionScore
  }

  calculateEngagementScore(activityData) {
    const { appointments } = activityData
    
    if (appointments.length === 0) return 0.5
    
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length
    const noShowAppointments = appointments.filter(apt => apt.status === 'no_show').length
    
    const completionRate = completedAppointments / totalAppointments
    const cancellationRate = cancelledAppointments / totalAppointments
    const noShowRate = noShowAppointments / totalAppointments
    
    // Good engagement: high completion rate, low cancellation/no-show rates
    const engagementScore = completionRate - (cancellationRate * 0.5) - (noShowRate * 0.8)
    
    return Math.max(0.1, Math.min(1.0, engagementScore))
  }
}

// Helper function to determine health score change triggers
function analyzeHealthScoreChange(oldScore, newScore) {
  const change = newScore - oldScore
  const percentageChange = oldScore > 0 ? (change / oldScore) * 100 : 0
  
  let trigger = null
  let severity = 'low'
  
  if (Math.abs(change) >= 0.1) { // 10% absolute change
    if (change > 0) {
      trigger = 'improvement'
      severity = change >= 0.2 ? 'high' : change >= 0.15 ? 'medium' : 'low'
    } else {
      trigger = 'decline'
      severity = change <= -0.2 ? 'high' : change <= -0.15 ? 'medium' : 'low'
    }
  }
  
  // Special cases
  if (newScore <= 0.3 && oldScore > 0.3) {
    trigger = 'critical_decline'
    severity = 'high'
  } else if (newScore >= 0.8 && oldScore < 0.8) {
    trigger = 'excellent_status'
    severity = 'high'
  }
  
  return {
    trigger,
    severity,
    change,
    percentage_change: percentageChange,
    old_score: oldScore,
    new_score: newScore
  }
}

// POST: Trigger health score recalculation
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const body = await request.json()

    const {
      customer_id,
      trigger_event,
      force_recalculation = false,
      update_churn_risk = true
    } = body

    // Validate required fields
    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }

    const calculator = new HealthScoreCalculator(barbershopId)
    
    // Get current customer intelligence
    const { data: currentIntel, error: intelError } = await supabase
      .from('customer_intelligence')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershopId)
      .single()

    if (intelError && intelError.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ error: 'Failed to fetch customer intelligence' }, { status: 400 })
    }

    const oldHealthScore = currentIntel?.health_score || 0.5

    // Calculate new health score
    const healthScoreResult = await calculator.calculateHealthScore(customer_id)
    
    if (!healthScoreResult) {
      return NextResponse.json({ error: 'Failed to calculate health score' }, { status: 500 })
    }

    const newHealthScore = healthScoreResult.health_score

    // Analyze the change
    const changeAnalysis = analyzeHealthScoreChange(oldHealthScore, newHealthScore)

    // Update or create customer intelligence record
    const intelligenceData = {
      customer_id,
      barbershop_id: barbershopId,
      health_score: newHealthScore,
      health_score_components: healthScoreResult.components,
      health_score_calculated_at: healthScoreResult.calculated_at,
      trigger_event: trigger_event || 'manual',
      updated_at: new Date().toISOString()
    }

    // Calculate churn risk if requested
    if (update_churn_risk) {
      // Simple churn risk calculation based on health score
      let churnRisk = 1 - newHealthScore // Inverse relationship
      
      // Adjust based on recency (recent activity reduces churn risk)
      const recencyBonus = healthScoreResult.components.recency * 0.2
      churnRisk = Math.max(0, churnRisk - recencyBonus)
      
      // Adjust based on satisfaction (high satisfaction reduces churn risk)
      const satisfactionBonus = healthScoreResult.components.satisfaction * 0.1
      churnRisk = Math.max(0, churnRisk - satisfactionBonus)
      
      intelligenceData.churn_risk_score = Math.min(1, churnRisk)
    }

    let result
    if (currentIntel) {
      // Update existing record
      const { data, error } = await supabase
        .from('customer_intelligence')
        .update(intelligenceData)
        .eq('id', currentIntel.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to update customer intelligence' }, { status: 400 })
      }
      result = data
    } else {
      // Create new record
      intelligenceData.id = crypto.randomUUID()
      intelligenceData.created_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('customer_intelligence')
        .insert(intelligenceData)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to create customer intelligence' }, { status: 400 })
      }
      result = data
    }

    // Log the health score change if significant
    if (changeAnalysis.trigger) {
      const healthScoreLog = {
        id: crypto.randomUUID(),
        customer_id,
        barbershop_id: barbershopId,
        old_score: oldHealthScore,
        new_score: newHealthScore,
        change_amount: changeAnalysis.change,
        change_percentage: changeAnalysis.percentage_change,
        trigger_event: trigger_event || 'manual',
        trigger_type: changeAnalysis.trigger,
        severity: changeAnalysis.severity,
        components: healthScoreResult.components,
        created_at: new Date().toISOString()
      }

      await supabase
        .from('health_score_history')
        .insert(healthScoreLog)
    }

    return NextResponse.json({
      success: true,
      customer_id,
      health_score: {
        previous: oldHealthScore,
        current: newHealthScore,
        change: changeAnalysis.change,
        components: healthScoreResult.components
      },
      change_analysis: changeAnalysis,
      churn_risk_score: result.churn_risk_score,
      intelligence_record: result
    })

  } catch (error) {
    console.error('Error in POST /api/customers/analytics/health-score-triggers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get health score history and analysis
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { searchParams } = new URL(request.url)

    const customerId = searchParams.get('customer_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeCurrent = searchParams.get('include_current') === 'true'

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }

    // Get health score history
    const { data: history, error: historyError } = await supabase
      .from('health_score_history')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (historyError) {
      return NextResponse.json({ error: 'Failed to fetch health score history' }, { status: 400 })
    }

    let currentIntelligence = null
    if (includeCurrent) {
      const { data: intel } = await supabase
        .from('customer_intelligence')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', barbershopId)
        .single()
      
      currentIntelligence = intel
    }

    return NextResponse.json({
      customer_id: customerId,
      current_intelligence: currentIntelligence,
      history: history || [],
      total_changes: history?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/customers/analytics/health-score-triggers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}