/**
 * Customer Feedback API Routes
 * Handles feedback submission, reviews, NPS, surveys, and analytics
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
    const { data: barbershopData, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    let barbershopId = null
    if (barbershopData) {
      barbershopId = barbershopData.id
    } else {
      // Check if user is a barber
      const { data: barberData, error: barberError } = await supabase
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

// Helper function to analyze sentiment
function analyzeSentiment(text) {
  if (!text) return { score: 'neutral', confidence: 0.5 }
  
  const textLower = text.toLowerCase()
  
  const positiveKeywords = [
    'excellent', 'amazing', 'fantastic', 'outstanding', 'perfect', 'love', 'great',
    'wonderful', 'awesome', 'brilliant', 'superb', 'exceptional', 'pleased', 'satisfied',
    'happy', 'thrilled', 'impressed', 'recommend', 'professional', 'clean', 'friendly'
  ]
  
  const negativeKeywords = [
    'terrible', 'awful', 'horrible', 'disgusting', 'worst', 'hate', 'disappointed',
    'unsatisfied', 'unprofessional', 'dirty', 'rude', 'slow', 'expensive', 'bad',
    'poor', 'unacceptable', 'frustrated', 'angry', 'upset', 'complaint'
  ]
  
  const positiveCount = positiveKeywords.filter(word => textLower.includes(word)).length
  const negativeCount = negativeKeywords.filter(word => textLower.includes(word)).length
  const totalWords = textLower.split(' ').length
  
  if (positiveCount > negativeCount) {
    if (positiveCount >= 3 || positiveCount / totalWords > 0.1) {
      return { score: 'very_positive', confidence: Math.min(0.8 + (positiveCount * 0.05), 0.95) }
    } else {
      return { score: 'positive', confidence: 0.6 + (positiveCount * 0.05) }
    }
  } else if (negativeCount > positiveCount) {
    if (negativeCount >= 3 || negativeCount / totalWords > 0.1) {
      return { score: 'very_negative', confidence: Math.max(0.2 - (negativeCount * 0.05), 0.05) }
    } else {
      return { score: 'negative', confidence: 0.4 - (negativeCount * 0.05) }
    }
  } else {
    return { score: 'neutral', confidence: 0.5 }
  }
}

// Helper function to update customer intelligence
async function updateCustomerIntelligence(customerId, feedbackData, barbershopId) {
  try {
    // Get current customer intelligence
    const { data: intelData, error: intelError } = await supabase
      .from('customer_intelligence')
      .select('*')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .single()

    if (intelData) {
      // Update satisfaction score based on feedback
      const newSatisfaction = (feedbackData.rating || 3) / 5.0 // Normalize to 0-1
      const currentSatisfaction = intelData.satisfaction_score || 0.5
      
      // Weighted average (70% current, 30% new)
      const updatedSatisfaction = (currentSatisfaction * 0.7) + (newSatisfaction * 0.3)
      
      // Update health score if satisfaction changed significantly
      let healthAdjustment = 0
      if (newSatisfaction >= 0.8) { // 4-5 star rating
        healthAdjustment = 0.05
      } else if (newSatisfaction <= 0.4) { // 1-2 star rating
        healthAdjustment = -0.1
      }
      
      const newHealthScore = Math.max(0, Math.min(1, (intelData.health_score || 0.5) + healthAdjustment))
      
      // Update the intelligence record
      const { error: updateError } = await supabase
        .from('customer_intelligence')
        .update({
          satisfaction_score: updatedSatisfaction,
          health_score: newHealthScore,
          last_feedback_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', intelData.id)

      if (updateError) {
        console.error('Error updating customer intelligence:', updateError)
      }
    }
  } catch (error) {
    console.error('Error in updateCustomerIntelligence:', error)
  }
}

// POST: Submit feedback
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, barbershopId } = authResult
    const body = await request.json()

    const {
      customer_id,
      appointment_id,
      barber_id,
      feedback_type,
      rating,
      nps_score,
      title,
      comment,
      service_aspects,
      would_recommend,
      anonymous = false,
      metadata = {}
    } = body

    // Validate required fields
    if (!customer_id || !feedback_type) {
      return NextResponse.json({ error: 'customer_id and feedback_type are required' }, { status: 400 })
    }

    // Validate feedback type specific requirements
    if ((feedback_type === 'review' || feedback_type === 'csat') && !rating) {
      return NextResponse.json({ error: 'Rating is required for reviews and CSAT feedback' }, { status: 400 })
    }

    if (feedback_type === 'nps' && nps_score === undefined) {
      return NextResponse.json({ error: 'NPS score is required for NPS feedback' }, { status: 400 })
    }

    // Analyze sentiment if comment provided
    const sentiment = analyzeSentiment(comment)

    // Create feedback record
    const feedbackData = {
      id: crypto.randomUUID(),
      barbershop_id: barbershopId,
      customer_id,
      appointment_id,
      barber_id,
      feedback_type,
      rating,
      nps_score,
      title,
      comment,
      service_aspects,
      would_recommend,
      sentiment_score: sentiment.score,
      sentiment_confidence: sentiment.confidence,
      status: 'pending',
      anonymous,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert feedback
    const { data: feedbackResult, error: feedbackError } = await supabase
      .from('customer_feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 400 })
    }

    // Get customer and barber info for response
    const { data: customerData } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', customer_id)
      .single()

    let barberData = null
    if (barber_id) {
      const { data } = await supabase
        .from('barbers')
        .select('name')
        .eq('id', barber_id)
        .single()
      barberData = data
    }

    // Update customer intelligence in background
    updateCustomerIntelligence(customer_id, feedbackData, barbershopId)

    // Prepare response
    const response = {
      ...feedbackResult,
      customer_name: customerData?.name || null,
      customer_email: anonymous ? null : customerData?.email || null,
      barber_name: barberData?.name || null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in POST /api/customers/feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: List feedback with filters
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const feedbackType = searchParams.get('feedback_type')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const customerId = searchParams.get('customer_id')
    const barberId = searchParams.get('barber_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('customer_feedback')
      .select(`
        *,
        customers!customer_id(name, email),
        barbers!barber_id(name)
      `)
      .eq('barbershop_id', barbershopId)

    // Apply filters
    if (feedbackType) query = query.eq('feedback_type', feedbackType)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    if (customerId) query = query.eq('customer_id', customerId)
    if (barberId) query = query.eq('barber_id', barberId)

    // Apply pagination and ordering
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 400 })
    }

    // Format response
    const formattedData = data.map(feedback => ({
      ...feedback,
      customer_name: feedback.customers?.name || null,
      customer_email: feedback.anonymous ? null : feedback.customers?.email || null,
      barber_name: feedback.barbers?.name || null,
      customers: undefined,
      barbers: undefined
    }))

    return NextResponse.json(formattedData)

  } catch (error) {
    console.error('Error in GET /api/customers/feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update feedback status
export async function PUT(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const body = await request.json()
    const { feedback_id, status, internal_notes, resolution_notes, assigned_to_user_id } = body

    if (!feedback_id || !status) {
      return NextResponse.json({ error: 'feedback_id and status are required' }, { status: 400 })
    }

    // Update feedback
    const { data, error } = await supabase
      .from('customer_feedback')
      .update({
        status,
        internal_notes,
        resolution_notes,
        assigned_to_user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', feedback_id)
      .eq('barbershop_id', barbershopId)
      .select()
      .single()

    if (error) {
      console.error('Error updating feedback:', error)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in PUT /api/customers/feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}