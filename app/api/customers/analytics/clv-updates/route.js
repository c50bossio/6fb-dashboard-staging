/**
 * Customer Lifetime Value (CLV) Updates API
 * Handles CLV calculation and updates after transactions
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

// CLV calculation engine
class CLVCalculator {
  constructor(barbershopId) {
    this.barbershopId = barbershopId
  }

  async calculateCLV(customerId, method = 'historical_plus_predictive') {
    try {
      const customerData = await this.getCustomerData(customerId)
      const transactionHistory = await this.getTransactionHistory(customerId)
      const behaviorData = await this.getBehaviorData(customerId)
      
      switch (method) {
        case 'historical':
          return this.calculateHistoricalCLV(transactionHistory)
        case 'predictive':
          return this.calculatePredictiveCLV(customerData, transactionHistory, behaviorData)
        case 'historical_plus_predictive':
        default:
          return this.calculateCombinedCLV(customerData, transactionHistory, behaviorData)
      }
    } catch (error) {
      console.error('Error calculating CLV:', error)
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
    
    if (error) throw error
    return data
  }

  async getTransactionHistory(customerId) {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', this.barbershopId)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: true })
    
    if (error) throw error
    return appointments || []
  }

  async getBehaviorData(customerId) {
    // Get loyalty data
    const { data: loyaltyData } = await supabase
      .from('loyalty_enrollments')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    // Get feedback data
    const { data: feedbackData } = await supabase
      .from('customer_feedback')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', this.barbershopId)

    // Get referral data
    const { data: referralData } = await supabase
      .from('customer_referrals')
      .select('*')
      .eq('referrer_customer_id', customerId)
      .eq('barbershop_id', this.barbershopId)

    return {
      loyalty: loyaltyData,
      feedback: feedbackData || [],
      referrals: referralData || []
    }
  }

  calculateHistoricalCLV(transactions) {
    if (transactions.length === 0) {
      return {
        historical_clv: 0,
        total_revenue: 0,
        transaction_count: 0,
        average_order_value: 0,
        method: 'historical'
      }
    }

    const totalRevenue = transactions.reduce((sum, txn) => {
      return sum + (parseFloat(txn.total_amount) || parseFloat(txn.service_amount) || 0)
    }, 0)

    const transactionCount = transactions.length
    const averageOrderValue = totalRevenue / transactionCount

    return {
      historical_clv: totalRevenue,
      total_revenue: totalRevenue,
      transaction_count: transactionCount,
      average_order_value: averageOrderValue,
      first_purchase: transactions[0]?.appointment_date,
      last_purchase: transactions[transactions.length - 1]?.appointment_date,
      method: 'historical'
    }
  }

  calculatePredictiveCLV(customerData, transactions, behaviorData) {
    if (transactions.length === 0) {
      return {
        predictive_clv: 0,
        predicted_ltv: 0,
        method: 'predictive'
      }
    }

    // Calculate key metrics
    const totalRevenue = transactions.reduce((sum, txn) => 
      sum + (parseFloat(txn.total_amount) || parseFloat(txn.service_amount) || 0), 0)
    const transactionCount = transactions.length
    const averageOrderValue = totalRevenue / transactionCount

    // Calculate customer lifespan in months
    const firstPurchase = new Date(transactions[0].appointment_date)
    const lastPurchase = new Date(transactions[transactions.length - 1].appointment_date)
    const lifespanMonths = Math.max(1, (lastPurchase - firstPurchase) / (1000 * 60 * 60 * 24 * 30))

    // Calculate purchase frequency (purchases per month)
    const purchaseFrequency = transactionCount / lifespanMonths

    // Calculate predicted customer lifespan based on behavior
    let predictedLifespanMonths = lifespanMonths

    // Adjust based on satisfaction scores
    const avgSatisfaction = this.calculateAverageSatisfaction(behaviorData.feedback)
    if (avgSatisfaction > 0.8) {
      predictedLifespanMonths *= 1.5 // High satisfaction extends lifespan
    } else if (avgSatisfaction < 0.5) {
      predictedLifespanMonths *= 0.7 // Low satisfaction reduces lifespan
    }

    // Adjust based on loyalty engagement
    if (behaviorData.loyalty && behaviorData.loyalty.current_points > 0) {
      predictedLifespanMonths *= 1.2 // Loyalty members stay longer
    }

    // Adjust based on referral behavior
    if (behaviorData.referrals.length > 0) {
      predictedLifespanMonths *= 1.3 // Referrers are more loyal
    }

    // Calculate recency factor (how recently they purchased)
    const daysSinceLastPurchase = (new Date() - lastPurchase) / (1000 * 60 * 60 * 24)
    let recencyFactor = 1.0
    
    if (daysSinceLastPurchase > 180) {
      recencyFactor = 0.5 // Very inactive
    } else if (daysSinceLastPurchase > 90) {
      recencyFactor = 0.7 // Somewhat inactive
    } else if (daysSinceLastPurchase <= 30) {
      recencyFactor = 1.2 // Very active
    }

    // Predictive CLV formula: AOV × Purchase Frequency × Predicted Lifespan × Recency Factor
    const predictiveCLV = averageOrderValue * purchaseFrequency * predictedLifespanMonths * recencyFactor

    return {
      predictive_clv: Math.round(predictiveCLV * 100) / 100,
      predicted_ltv: Math.round(predictiveCLV * 100) / 100,
      average_order_value: averageOrderValue,
      purchase_frequency: purchaseFrequency,
      predicted_lifespan_months: predictedLifespanMonths,
      recency_factor: recencyFactor,
      satisfaction_factor: avgSatisfaction,
      loyalty_enrolled: !!behaviorData.loyalty,
      referral_count: behaviorData.referrals.length,
      method: 'predictive'
    }
  }

  calculateCombinedCLV(customerData, transactions, behaviorData) {
    const historical = this.calculateHistoricalCLV(transactions)
    const predictive = this.calculatePredictiveCLV(customerData, transactions, behaviorData)

    // Weight historical vs predictive based on customer maturity
    const transactionCount = transactions.length
    let historicalWeight, predictiveWeight

    if (transactionCount >= 10) {
      // Mature customer - weight more towards historical
      historicalWeight = 0.7
      predictiveWeight = 0.3
    } else if (transactionCount >= 5) {
      // Moderate customer - balanced approach
      historicalWeight = 0.5
      predictiveWeight = 0.5
    } else {
      // New customer - weight more towards predictive
      historicalWeight = 0.3
      predictiveWeight = 0.7
    }

    const combinedCLV = (historical.historical_clv * historicalWeight) + 
                       (predictive.predictive_clv * predictiveWeight)

    return {
      combined_clv: Math.round(combinedCLV * 100) / 100,
      historical_component: historical.historical_clv,
      predictive_component: predictive.predictive_clv,
      historical_weight: historicalWeight,
      predictive_weight: predictiveWeight,
      transaction_count: historical.transaction_count,
      average_order_value: historical.average_order_value,
      purchase_frequency: predictive.purchase_frequency,
      predicted_lifespan_months: predictive.predicted_lifespan_months,
      satisfaction_factor: predictive.satisfaction_factor,
      method: 'combined'
    }
  }

  calculateAverageSatisfaction(feedbackData) {
    if (feedbackData.length === 0) return 0.7 // Default neutral-positive

    let totalSatisfaction = 0
    let count = 0

    feedbackData.forEach(feedback => {
      if (feedback.rating && feedback.rating > 0) {
        totalSatisfaction += feedback.rating / 5 // Normalize to 0-1
        count++
      }
      if (feedback.nps_score !== null && feedback.nps_score !== undefined) {
        totalSatisfaction += feedback.nps_score / 10 // Normalize to 0-1
        count++
      }
    })

    return count > 0 ? totalSatisfaction / count : 0.7
  }

  // Calculate CLV tier based on value
  calculateCLVTier(clvValue) {
    if (clvValue >= 1000) return 'platinum'
    if (clvValue >= 500) return 'gold'
    if (clvValue >= 250) return 'silver'
    if (clvValue >= 100) return 'bronze'
    return 'standard'
  }

  // Calculate CLV percentile within barbershop
  async calculateCLVPercentile(clvValue) {
    try {
      const { data: allCLVs, error } = await supabase
        .from('customer_intelligence')
        .select('clv')
        .eq('barbershop_id', this.barbershopId)
        .not('clv', 'is', null)
        .order('clv', { ascending: true })

      if (error || !allCLVs || allCLVs.length === 0) {
        return 50 // Default to 50th percentile
      }

      const sortedCLVs = allCLVs.map(c => parseFloat(c.clv)).sort((a, b) => a - b)
      const position = sortedCLVs.filter(c => c <= clvValue).length
      const percentile = Math.round((position / sortedCLVs.length) * 100)

      return percentile
    } catch (error) {
      console.error('Error calculating CLV percentile:', error)
      return 50
    }
  }
}

// POST: Update CLV after transaction
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
      transaction_amount,
      transaction_type = 'appointment',
      appointment_id = null,
      calculation_method = 'historical_plus_predictive',
      update_tier = true
    } = body

    // Validate required fields
    if (!customer_id || transaction_amount === undefined) {
      return NextResponse.json({ 
        error: 'customer_id and transaction_amount are required' 
      }, { status: 400 })
    }

    const calculator = new CLVCalculator(barbershopId)

    // Get current CLV
    const { data: currentIntel, error: intelError } = await supabase
      .from('customer_intelligence')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('barbershop_id', barbershopId)
      .single()

    const oldCLV = currentIntel?.clv || 0

    // Calculate new CLV
    const clvResult = await calculator.calculateCLV(customer_id, calculation_method)
    
    if (!clvResult) {
      return NextResponse.json({ error: 'Failed to calculate CLV' }, { status: 500 })
    }

    const newCLV = clvResult.combined_clv || clvResult.historical_clv || clvResult.predictive_clv

    // Calculate additional metrics
    const clvTier = calculator.calculateCLVTier(newCLV)
    const clvPercentile = await calculator.calculateCLVPercentile(newCLV)

    // Prepare intelligence data
    const intelligenceData = {
      customer_id,
      barbershop_id: barbershopId,
      clv: newCLV,
      clv_tier: clvTier,
      clv_percentile: clvPercentile,
      clv_calculation_method: calculation_method,
      clv_components: clvResult,
      last_transaction_amount: parseFloat(transaction_amount),
      last_transaction_type: transaction_type,
      last_transaction_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
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

    // Log CLV change
    const clvChange = newCLV - oldCLV
    if (Math.abs(clvChange) > 0.01) { // Log changes greater than 1 cent
      const clvLog = {
        id: crypto.randomUUID(),
        customer_id,
        barbershop_id: barbershopId,
        old_clv: oldCLV,
        new_clv: newCLV,
        change_amount: clvChange,
        transaction_amount: parseFloat(transaction_amount),
        transaction_type,
        appointment_id,
        calculation_method,
        tier_before: calculator.calculateCLVTier(oldCLV),
        tier_after: clvTier,
        percentile: clvPercentile,
        created_at: new Date().toISOString()
      }

      await supabase
        .from('clv_history')
        .insert(clvLog)
    }

    // Update loyalty tier if customer is enrolled and tier changed
    if (update_tier && currentIntel) {
      const oldTier = calculator.calculateCLVTier(oldCLV)
      if (oldTier !== clvTier) {
        // Check if customer is enrolled in loyalty program
        const { data: enrollment } = await supabase
          .from('loyalty_enrollments')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('is_active', true)
          .single()

        if (enrollment) {
          // Update loyalty tier based on CLV
          await supabase
            .from('loyalty_enrollments')
            .update({
              vip_status: clvTier === 'platinum' || clvTier === 'gold',
              updated_at: new Date().toISOString()
            })
            .eq('id', enrollment.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      customer_id,
      clv: {
        previous: oldCLV,
        current: newCLV,
        change: clvChange,
        tier: clvTier,
        percentile: clvPercentile
      },
      calculation_details: clvResult,
      intelligence_record: result
    })

  } catch (error) {
    console.error('Error in POST /api/customers/analytics/clv-updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get CLV analysis for customer
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { searchParams } = new URL(request.url)

    const customerId = searchParams.get('customer_id')
    const includeHistory = searchParams.get('include_history') === 'true'
    const includeComponents = searchParams.get('include_components') === 'true'

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }

    const calculator = new CLVCalculator(barbershopId)

    // Get current intelligence
    const { data: currentIntel } = await supabase
      .from('customer_intelligence')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .single()

    // Calculate fresh CLV for comparison
    const freshCLV = await calculator.calculateCLV(customerId)

    let history = null
    if (includeHistory) {
      const { data: historyData } = await supabase
        .from('clv_history')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      history = historyData
    }

    return NextResponse.json({
      customer_id: customerId,
      current_intelligence: currentIntel,
      fresh_calculation: includeComponents ? freshCLV : { clv: freshCLV?.combined_clv || 0 },
      clv_tier: currentIntel?.clv_tier || calculator.calculateCLVTier(currentIntel?.clv || 0),
      clv_percentile: currentIntel?.clv_percentile,
      history: history
    })

  } catch (error) {
    console.error('Error in GET /api/customers/analytics/clv-updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}