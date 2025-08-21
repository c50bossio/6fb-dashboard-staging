/**
 * Appointment Completion Integration API
 * Handles loyalty points, health score updates, and feedback requests after appointment completion
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

// Helper function to calculate loyalty points
async function calculateLoyaltyPoints(serviceAmount, loyaltyProgram) {
  try {
    const earningRules = loyaltyProgram.earning_rules || {}
    
    // Default earning rule: 1 point per dollar spent
    const pointsPerDollar = earningRules.points_per_dollar || 1
    const multiplier = earningRules.multiplier || 1
    const bonusThreshold = earningRules.bonus_threshold || null
    const bonusPoints = earningRules.bonus_points || 0
    
    let basePoints = Math.floor(serviceAmount * pointsPerDollar * multiplier)
    let bonusAmount = 0
    
    // Apply bonus if service amount exceeds threshold
    if (bonusThreshold && serviceAmount >= bonusThreshold) {
      bonusAmount = bonusPoints
    }
    
    // Apply any daily/transaction limits
    const maxPointsPerTransaction = loyaltyProgram.max_points_per_transaction || null
    const totalPoints = basePoints + bonusAmount
    
    return {
      base_points: basePoints,
      bonus_points: bonusAmount,
      total_points: maxPointsPerTransaction ? Math.min(totalPoints, maxPointsPerTransaction) : totalPoints,
      capped: maxPointsPerTransaction && totalPoints > maxPointsPerTransaction
    }
  } catch (error) {
    console.error('Error calculating loyalty points:', error)
    return { base_points: 0, bonus_points: 0, total_points: 0, capped: false }
  }
}

// Helper function to update customer intelligence
async function updateCustomerIntelligence(customerId, barbershopId, serviceAmount, appointmentData) {
  try {
    // Get current customer intelligence
    const { data: intelData, error: intelError } = await supabase
      .from('customer_intelligence')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .single()

    if (intelData) {
      const currentCLV = parseFloat(intelData.clv || 0)
      const currentHealthScore = parseFloat(intelData.health_score || 0.5)
      const visitCount = parseInt(intelData.total_visits || 0)
      
      // Update CLV - add service amount
      const newCLV = currentCLV + parseFloat(serviceAmount)
      
      // Update health score - completed appointments improve health
      const healthImprovement = 0.05 // 5% improvement for completed appointment
      const newHealthScore = Math.min(1.0, currentHealthScore + healthImprovement)
      
      // Calculate days since last visit
      const lastVisitDate = intelData.last_visit_date ? new Date(intelData.last_visit_date) : new Date()
      const daysSinceLastVisit = Math.floor((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24))
      
      // Update visit frequency score based on consistency
      let visitFrequencyScore = parseFloat(intelData.visit_frequency_score || 0.5)
      if (daysSinceLastVisit <= 30) {
        visitFrequencyScore = Math.min(1.0, visitFrequencyScore + 0.1)
      } else if (daysSinceLastVisit <= 60) {
        visitFrequencyScore = Math.max(0.3, visitFrequencyScore - 0.05)
      } else {
        visitFrequencyScore = Math.max(0.1, visitFrequencyScore - 0.1)
      }
      
      // Reduce churn risk for recent visits
      let churnRiskScore = parseFloat(intelData.churn_risk_score || 0.5)
      churnRiskScore = Math.max(0.0, churnRiskScore - 0.1)
      
      // Update the intelligence record
      const { error: updateError } = await supabase
        .from('customer_intelligence')
        .update({
          clv: newCLV,
          health_score: newHealthScore,
          visit_frequency_score: visitFrequencyScore,
          churn_risk_score: churnRiskScore,
          total_visits: visitCount + 1,
          last_visit_date: new Date().toISOString(),
          last_purchase_amount: parseFloat(serviceAmount),
          last_purchase_days_ago: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', intelData.id)

      if (updateError) {
        console.error('Error updating customer intelligence:', updateError)
      }

      return {
        previous_clv: currentCLV,
        new_clv: newCLV,
        previous_health_score: currentHealthScore,
        new_health_score: newHealthScore,
        health_improved: newHealthScore > currentHealthScore
      }
    }
  } catch (error) {
    console.error('Error updating customer intelligence:', error)
    return null
  }
}

// Helper function to schedule feedback request
async function scheduleFeedbackRequest(customerId, appointmentId, barbershopId, delayHours = 2) {
  try {
    // Create a scheduled feedback request
    const scheduledTime = new Date(Date.now() + (delayHours * 60 * 60 * 1000))
    
    const feedbackRequest = {
      id: crypto.randomUUID(),
      barbershop_id: barbershopId,
      customer_id: customerId,
      appointment_id: appointmentId,
      request_type: 'post_appointment',
      scheduled_for: scheduledTime.toISOString(),
      status: 'scheduled',
      channels: ['email', 'sms'], // Can be configured per barbershop
      metadata: {
        delay_hours: delayHours,
        created_from: 'appointment_completion'
      },
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('feedback_requests')
      .insert(feedbackRequest)
      .select()
      .single()

    if (error) {
      console.error('Error scheduling feedback request:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in scheduleFeedbackRequest:', error)
    return null
  }
}

// POST: Process appointment completion
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const body = await request.json()

    const {
      appointment_id,
      customer_id,
      service_amount,
      barber_id,
      services_provided = [],
      payment_method = null,
      tip_amount = 0,
      skip_loyalty = false,
      skip_feedback_request = false
    } = body

    // Validate required fields
    if (!appointment_id || !customer_id || service_amount === undefined) {
      return NextResponse.json({ 
        error: 'appointment_id, customer_id, and service_amount are required' 
      }, { status: 400 })
    }

    const totalAmount = parseFloat(service_amount) + parseFloat(tip_amount || 0)
    const results = {
      appointment_id,
      customer_id,
      service_amount: parseFloat(service_amount),
      total_amount: totalAmount,
      loyalty_points_awarded: 0,
      intelligence_updated: false,
      feedback_request_scheduled: false,
      tier_upgraded: false,
      errors: []
    }

    // Process loyalty points if not skipped
    if (!skip_loyalty) {
      try {
        // Get active loyalty program for this barbershop
        const { data: loyaltyProgram, error: loyaltyError } = await supabase
          .from('loyalty_programs')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .eq('is_active', true)
          .single()

        if (loyaltyProgram) {
          // Check if customer is enrolled
          const { data: enrollment, error: enrollmentError } = await supabase
            .from('loyalty_enrollments')
            .select('*')
            .eq('customer_id', customer_id)
            .eq('loyalty_program_id', loyaltyProgram.id)
            .eq('is_active', true)
            .single()

          if (enrollment) {
            // Calculate points to award
            const pointsCalculation = await calculateLoyaltyPoints(totalAmount, loyaltyProgram)
            
            if (pointsCalculation.total_points > 0) {
              // Create points transaction
              const pointsTransaction = {
                id: crypto.randomUUID(),
                customer_id,
                loyalty_program_id: loyaltyProgram.id,
                transaction_type: 'earned',
                points_amount: pointsCalculation.total_points,
                source_type: 'appointment',
                source_id: appointment_id,
                earning_rate: loyaltyProgram.earning_rules?.points_per_dollar || 1,
                base_amount: totalAmount,
                multiplier: loyaltyProgram.earning_rules?.multiplier || 1,
                description: `Points earned from appointment completion`,
                metadata: {
                  barber_id,
                  services_provided,
                  base_points: pointsCalculation.base_points,
                  bonus_points: pointsCalculation.bonus_points,
                  capped: pointsCalculation.capped
                },
                created_at: new Date().toISOString()
              }

              const { data: transactionResult, error: transactionError } = await supabase
                .from('loyalty_transactions')
                .insert(pointsTransaction)
                .select()
                .single()

              if (!transactionError) {
                // Update customer's points balance
                const { error: balanceError } = await supabase
                  .from('loyalty_enrollments')
                  .update({
                    current_points: enrollment.current_points + pointsCalculation.total_points,
                    lifetime_points_earned: enrollment.lifetime_points_earned + pointsCalculation.total_points,
                    last_activity_date: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', enrollment.id)

                if (!balanceError) {
                  results.loyalty_points_awarded = pointsCalculation.total_points
                  
                  // Check for tier upgrades
                  // This would involve checking tier qualification rules
                  // and upgrading if the customer now qualifies for a higher tier
                }
              } else {
                results.errors.push(`Failed to create loyalty transaction: ${transactionError.message}`)
              }
            }
          } else {
            // Auto-enroll customer if program allows
            if (loyaltyProgram.auto_enroll_new_customers) {
              const newEnrollment = {
                id: crypto.randomUUID(),
                customer_id,
                loyalty_program_id: loyaltyProgram.id,
                enrollment_date: new Date().toISOString(),
                is_active: true,
                current_points: 0,
                lifetime_points_earned: 0,
                lifetime_points_redeemed: 0,
                enrollment_source: 'appointment_completion',
                created_at: new Date().toISOString()
              }

              const { error: enrollError } = await supabase
                .from('loyalty_enrollments')
                .insert(newEnrollment)

              if (!enrollError) {
                // Process points for the newly enrolled customer
                // (would recursively call the loyalty logic above)
                results.errors.push('Customer auto-enrolled in loyalty program')
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing loyalty points:', error)
        results.errors.push(`Loyalty processing error: ${error.message}`)
      }
    }

    // Update customer intelligence
    try {
      const intelligenceUpdate = await updateCustomerIntelligence(
        customer_id, 
        barbershopId, 
        service_amount, 
        { appointment_id, barber_id, services_provided }
      )
      
      if (intelligenceUpdate) {
        results.intelligence_updated = true
        results.intelligence_changes = intelligenceUpdate
      }
    } catch (error) {
      console.error('Error updating customer intelligence:', error)
      results.errors.push(`Intelligence update error: ${error.message}`)
    }

    // Schedule feedback request
    if (!skip_feedback_request) {
      try {
        const feedbackRequest = await scheduleFeedbackRequest(
          customer_id,
          appointment_id,
          barbershopId,
          2 // 2 hours delay
        )
        
        if (feedbackRequest) {
          results.feedback_request_scheduled = true
          results.feedback_request_id = feedbackRequest.id
        }
      } catch (error) {
        console.error('Error scheduling feedback request:', error)
        results.errors.push(`Feedback scheduling error: ${error.message}`)
      }
    }

    // Update appointment status to completed
    try {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          service_amount: parseFloat(service_amount),
          tip_amount: parseFloat(tip_amount || 0),
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment_id)
        .eq('barbershop_id', barbershopId)

      if (appointmentError) {
        results.errors.push(`Failed to update appointment status: ${appointmentError.message}`)
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      results.errors.push(`Appointment update error: ${error.message}`)
    }

    // Calculate success status
    const hasErrors = results.errors.length > 0
    results.success = !hasErrors
    results.warning = hasErrors && (results.loyalty_points_awarded > 0 || results.intelligence_updated)

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error in POST /api/customers/loyalty/appointment-completion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}