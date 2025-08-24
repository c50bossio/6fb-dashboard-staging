import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Customer Behavior Management API
 * Handles CRUD operations for customer behavior scores and risk assessments
 * Integrates with the new database schema for customer intelligence
 */

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { action, barbershop_id, customer_id, data } = await request.json()
    
    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify user access to barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    const userBarbershopId = profile?.shop_id || profile?.barbershop_id
    if (userBarbershopId !== barbershop_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    switch (action) {
      case 'calculate_risk_score':
        return await calculateRiskScore(supabase, barbershop_id, customer_id, data)
      case 'update_behavior_data':
        return await updateBehaviorData(supabase, barbershop_id, customer_id, data)
      case 'bulk_calculate_scores':
        return await bulkCalculateScores(supabase, barbershop_id)
      case 'get_customer_score':
        return await getCustomerScore(supabase, barbershop_id, customer_id)
      case 'update_statistics':
        return await updateStatistics(supabase, barbershop_id)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Customer behavior management error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    
    const barbershop_id = searchParams.get('barbershop_id')
    const customer_id = searchParams.get('customer_id')
    const type = searchParams.get('type') || 'summary'
    
    if (!barbershop_id) {
      return NextResponse.json({ error: 'Barbershop ID is required' }, { status: 400 })
    }
    
    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify user access to barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    const userBarbershopId = profile?.shop_id || profile?.barbershop_id
    if (userBarbershopId !== barbershop_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    switch (type) {
      case 'summary':
        return await getBarbershopSummary(supabase, barbershop_id)
      case 'customer_scores':
        return await getCustomerScores(supabase, barbershop_id, customer_id)
      case 'high_risk_customers':
        return await getHighRiskCustomers(supabase, barbershop_id)
      case 'statistics':
        return await getStatistics(supabase, barbershop_id)
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Customer behavior retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve data' },
      { status: 500 }
    )
  }
}

// Helper Functions

async function calculateRiskScore(supabase, barbershopId, customerId, behaviorData) {
  // Use the database function to calculate risk score
  const { data, error } = await supabase.rpc('calculate_customer_risk_score', {
    p_total_bookings: behaviorData.total_bookings || 0,
    p_no_shows: behaviorData.no_show_count || 0,
    p_late_cancellations: behaviorData.late_cancellation_count || 0,
    p_avg_advance_days: behaviorData.avg_advance_booking_days || 0,
    p_failed_payments: behaviorData.failed_payment_count || 0,
    p_message_responses: behaviorData.message_responses || 0,
    p_total_messages: behaviorData.total_messages_sent || 0
  })
  
  if (error) {
    throw new Error(`Risk score calculation failed: ${error.message}`)
  }
  
  const scoreData = data[0]
  
  // Store the calculated score
  const { error: insertError } = await supabase
    .from('customer_behavior_scores')
    .upsert({
      customer_id: customerId,
      barbershop_id: barbershopId,
      ...behaviorData,
      risk_score: scoreData.risk_score,
      risk_tier: scoreData.risk_tier,
      previous_no_shows_score: scoreData.factor_scores.previous_no_shows,
      late_cancellations_score: scoreData.factor_scores.late_cancellations,
      advance_booking_score: scoreData.factor_scores.advance_booking,
      payment_history_score: scoreData.factor_scores.payment_history,
      communication_score: scoreData.factor_scores.communication,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  
  if (insertError) {
    throw new Error(`Failed to store risk score: ${insertError.message}`)
  }
  
  return NextResponse.json({
    success: true,
    customer_id: customerId,
    risk_score: scoreData.risk_score,
    risk_tier: scoreData.risk_tier,
    factor_breakdown: scoreData.factor_scores
  })
}

async function updateBehaviorData(supabase, barbershopId, customerId, behaviorData) {
  // Update the behavior data and recalculate risk score
  return await calculateRiskScore(supabase, barbershopId, customerId, behaviorData)
}

async function bulkCalculateScores(supabase, barbershopId) {
  // Get all customers for this barbershop
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id')
    .eq('barbershop_id', barbershopId)
  
  if (error) {
    throw new Error(`Failed to get customers: ${error.message}`)
  }
  
  let processed = 0
  let errors = 0
  
  for (const customer of customers) {
    try {
      // Get customer's booking history
      const behaviorData = await getCustomerBehaviorMetrics(supabase, customer.id, barbershopId)
      
      // Calculate and store risk score
      await calculateRiskScore(supabase, barbershopId, customer.id, behaviorData)
      processed++
    } catch (error) {
      console.error(`Failed to process customer ${customer.id}:`, error)
      errors++
    }
  }
  
  return NextResponse.json({
    success: true,
    processed,
    errors,
    total: customers.length
  })
}

async function getCustomerBehaviorMetrics(supabase, customerId, barbershopId) {
  // Get appointment history
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('customer_id', customerId)
    .eq('barbershop_id', barbershopId)
  
  // Get booking history  
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .eq('shop_id', barbershopId)
  
  const allBookings = [...(appointments || []), ...(bookings || [])]
  
  const noShows = allBookings.filter(b => b.status === 'no-show' || b.status === 'NO_SHOW').length
  const lateCancellations = allBookings.filter(b => 
    (b.status === 'cancelled' || b.status === 'CANCELLED') && 
    new Date(b.start_time || b.appointment_time) - new Date(b.created_at) < 24 * 60 * 60 * 1000
  ).length
  
  const advanceBookingTimes = allBookings
    .filter(b => b.start_time && b.created_at)
    .map(b => 
      (new Date(b.start_time) - new Date(b.created_at)) / (1000 * 60 * 60 * 24)
    )
  
  const avgAdvanceBookingDays = advanceBookingTimes.length > 0 
    ? advanceBookingTimes.reduce((a, b) => a + b, 0) / advanceBookingTimes.length 
    : 1
  
  // Get payment data (simplified for now)
  const failedPayments = allBookings.filter(b => b.payment_status === 'failed').length
  
  return {
    total_bookings: allBookings.length,
    no_show_count: noShows,
    late_cancellation_count: lateCancellations,
    avg_advance_booking_days: avgAdvanceBookingDays,
    failed_payment_count: failedPayments,
    total_messages_sent: allBookings.length, // Simplified - assume one message per booking
    message_responses: Math.floor(allBookings.length * 0.8), // Simplified - assume 80% response rate
    last_booking_date: allBookings.length > 0 ? 
      Math.max(...allBookings.map(b => new Date(b.start_time || b.appointment_time || b.created_at).getTime())) 
      : null
  }
}

async function getCustomerScore(supabase, barbershopId, customerId) {
  const { data, error } = await supabase
    .from('customer_behavior_scores')
    .select('*')
    .eq('customer_id', customerId)
    .eq('barbershop_id', barbershopId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // Not found is OK
    throw new Error(`Failed to get customer score: ${error.message}`)
  }
  
  return NextResponse.json({
    success: true,
    customer_score: data || null
  })
}

async function getBarbershopSummary(supabase, barbershopId) {
  // Get summary statistics
  const { data: stats } = await supabase
    .from('barbershop_risk_statistics')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .single()
  
  // Get recent high-risk customers
  const { data: highRiskCustomers } = await supabase
    .from('customer_behavior_scores')
    .select(`
      customer_id,
      risk_score,
      risk_tier,
      customers(name, email)
    `)
    .eq('barbershop_id', barbershopId)
    .eq('risk_tier', 'red')
    .order('risk_score', { ascending: false })
    .limit(10)
  
  return NextResponse.json({
    success: true,
    statistics: stats,
    high_risk_customers: highRiskCustomers
  })
}

async function getCustomerScores(supabase, barbershopId, customerId = null) {
  let query = supabase
    .from('customer_behavior_scores')
    .select(`
      *,
      customers(name, email, phone)
    `)
    .eq('barbershop_id', barbershopId)
  
  if (customerId) {
    query = query.eq('customer_id', customerId)
  }
  
  const { data, error } = await query
    .order('risk_score', { ascending: false })
    .limit(50)
  
  if (error) {
    throw new Error(`Failed to get customer scores: ${error.message}`)
  }
  
  return NextResponse.json({
    success: true,
    customer_scores: data
  })
}

async function getHighRiskCustomers(supabase, barbershopId) {
  const { data, error } = await supabase
    .from('customer_behavior_scores')
    .select(`
      *,
      customers(name, email, phone)
    `)
    .eq('barbershop_id', barbershopId)
    .in('risk_tier', ['red', 'yellow'])
    .order('risk_score', { ascending: false })
    .limit(20)
  
  if (error) {
    throw new Error(`Failed to get high-risk customers: ${error.message}`)
  }
  
  return NextResponse.json({
    success: true,
    high_risk_customers: data
  })
}

async function getStatistics(supabase, barbershopId) {
  const { data, error } = await supabase
    .from('barbershop_risk_statistics')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get statistics: ${error.message}`)
  }
  
  return NextResponse.json({
    success: true,
    statistics: data
  })
}

async function updateStatistics(supabase, barbershopId) {
  // Call the database function to update statistics
  const { error } = await supabase.rpc('update_barbershop_risk_statistics', {
    p_barbershop_id: barbershopId
  })
  
  if (error) {
    throw new Error(`Failed to update statistics: ${error.message}`)
  }
  
  return NextResponse.json({
    success: true,
    message: 'Statistics updated successfully'
  })
}