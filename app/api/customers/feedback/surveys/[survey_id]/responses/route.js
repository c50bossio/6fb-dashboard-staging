/**
 * Survey Responses API Routes
 * Handles survey response submission and analytics
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

// POST: Submit survey response
export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { survey_id } = params
    const body = await request.json()

    const {
      customer_id,
      appointment_id,
      responses,
      completion_time_seconds,
      ip_address,
      user_agent
    } = body

    // Validate required fields
    if (!customer_id || !responses || typeof responses !== 'object') {
      return NextResponse.json({ 
        error: 'customer_id and responses object are required' 
      }, { status: 400 })
    }

    // Verify survey exists and belongs to this barbershop
    const { data: surveyData, error: surveyError } = await supabase
      .from('feedback_surveys')
      .select('*')
      .eq('id', survey_id)
      .eq('barbershop_id', barbershopId)
      .single()

    if (surveyError || !surveyData) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Check if survey is active
    if (!surveyData.is_active) {
      return NextResponse.json({ error: 'Survey is not active' }, { status: 400 })
    }

    // Check if survey has reached max responses
    if (surveyData.max_responses && surveyData.response_count >= surveyData.max_responses) {
      return NextResponse.json({ error: 'Survey has reached maximum responses' }, { status: 400 })
    }

    // Check if survey is within active period
    const now = new Date()
    if (surveyData.active_from && new Date(surveyData.active_from) > now) {
      return NextResponse.json({ error: 'Survey is not yet active' }, { status: 400 })
    }
    if (surveyData.active_until && new Date(surveyData.active_until) < now) {
      return NextResponse.json({ error: 'Survey has expired' }, { status: 400 })
    }

    // Check if customer has already responded to this survey
    const { data: existingResponse, error: existingError } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', survey_id)
      .eq('customer_id', customer_id)
      .single()

    if (existingResponse) {
      return NextResponse.json({ error: 'Customer has already responded to this survey' }, { status: 400 })
    }

    // Create survey response record
    const responseData = {
      id: crypto.randomUUID(),
      survey_id,
      barbershop_id: barbershopId,
      customer_id,
      appointment_id,
      responses,
      completion_time_seconds,
      ip_address,
      user_agent,
      submitted_at: new Date().toISOString()
    }

    // Insert survey response
    const { data: responseResult, error: responseError } = await supabase
      .from('survey_responses')
      .insert(responseData)
      .select()
      .single()

    if (responseError) {
      console.error('Error submitting survey response:', responseError)
      return NextResponse.json({ error: 'Failed to submit survey response' }, { status: 400 })
    }

    // Update survey response count
    const { error: updateError } = await supabase
      .from('feedback_surveys')
      .update({ 
        response_count: surveyData.response_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', survey_id)

    if (updateError) {
      console.error('Error updating survey response count:', updateError)
    }

    // Process responses for feedback insights
    await processResponseForInsights(responseResult, surveyData, barbershopId)

    return NextResponse.json({
      success: true,
      response_id: responseResult.id,
      survey_name: surveyData.survey_name
    })

  } catch (error) {
    console.error('Error in POST /api/customers/feedback/surveys/[survey_id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get survey responses
export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { survey_id } = params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const customerId = searchParams.get('customer_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeAnalytics = searchParams.get('include_analytics') === 'true'

    // Verify survey exists and belongs to this barbershop
    const { data: surveyData, error: surveyError } = await supabase
      .from('feedback_surveys')
      .select('*')
      .eq('id', survey_id)
      .eq('barbershop_id', barbershopId)
      .single()

    if (surveyError || !surveyData) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Build query for responses
    let query = supabase
      .from('survey_responses')
      .select(`
        *,
        customers!customer_id(name, email)
      `)
      .eq('survey_id', survey_id)
      .eq('barbershop_id', barbershopId)

    if (customerId) query = query.eq('customer_id', customerId)

    // Apply pagination and ordering
    const { data: responses, error: responsesError } = await query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (responsesError) {
      console.error('Error fetching survey responses:', responsesError)
      return NextResponse.json({ error: 'Failed to fetch survey responses' }, { status: 400 })
    }

    // Format responses
    const formattedResponses = responses.map(response => ({
      ...response,
      customer_name: response.customers?.name || null,
      customer_email: response.customers?.email || null,
      customers: undefined
    }))

    let analytics = null
    if (includeAnalytics) {
      analytics = await generateSurveyAnalytics(survey_id, surveyData, barbershopId)
    }

    const result = {
      survey: surveyData,
      responses: formattedResponses,
      total_responses: surveyData.response_count,
      analytics
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in GET /api/customers/feedback/surveys/[survey_id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to process response for insights
async function processResponseForInsights(responseData, surveyData, barbershopId) {
  try {
    // Extract key metrics from responses
    const responses = responseData.responses
    let rating = null
    let npsScore = null
    let comment = null

    // Process based on survey type
    if (surveyData.survey_type === 'nps') {
      // Look for NPS score in responses
      npsScore = Object.values(responses).find(value => 
        typeof value === 'number' && value >= 0 && value <= 10
      )
    } else if (surveyData.survey_type === 'csat') {
      // Look for rating in responses
      rating = Object.values(responses).find(value => 
        typeof value === 'number' && value >= 1 && value <= 5
      )
    }

    // Look for comment/text responses
    comment = Object.values(responses).find(value => 
      typeof value === 'string' && value.length > 10
    )

    // Create corresponding feedback record if we have meaningful data
    if (rating || npsScore || comment) {
      const feedbackData = {
        id: crypto.randomUUID(),
        barbershop_id: barbershopId,
        customer_id: responseData.customer_id,
        appointment_id: responseData.appointment_id,
        feedback_type: surveyData.survey_type,
        rating,
        nps_score: npsScore,
        comment,
        status: 'pending',
        metadata: {
          source: 'survey',
          survey_id: surveyData.id,
          survey_response_id: responseData.id
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('customer_feedback')
        .insert(feedbackData)
    }
  } catch (error) {
    console.error('Error processing response for insights:', error)
  }
}

// Helper function to generate survey analytics
async function generateSurveyAnalytics(surveyId, surveyData, barbershopId) {
  try {
    // Get all responses for this survey
    const { data: responses, error } = await supabase
      .from('survey_responses')
      .select('responses, submitted_at, completion_time_seconds')
      .eq('survey_id', surveyId)
      .eq('barbershop_id', barbershopId)

    if (error || !responses) {
      return null
    }

    const totalResponses = responses.length
    if (totalResponses === 0) {
      return {
        total_responses: 0,
        completion_rate: 0,
        average_completion_time: 0,
        response_distribution: {},
        trends: []
      }
    }

    // Calculate completion time statistics
    const completionTimes = responses
      .map(r => r.completion_time_seconds)
      .filter(time => time && time > 0)
    
    const averageCompletionTime = completionTimes.length > 0 
      ? Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length)
      : 0

    // Analyze response patterns
    const responseDistribution = {}
    const questionAnalytics = {}

    responses.forEach(response => {
      Object.entries(response.responses).forEach(([questionId, answer]) => {
        if (!questionAnalytics[questionId]) {
          questionAnalytics[questionId] = {
            total_responses: 0,
            answer_distribution: {}
          }
        }
        
        questionAnalytics[questionId].total_responses++
        
        const answerKey = typeof answer === 'object' ? JSON.stringify(answer) : String(answer)
        questionAnalytics[questionId].answer_distribution[answerKey] = 
          (questionAnalytics[questionId].answer_distribution[answerKey] || 0) + 1
      })
    })

    // Calculate response trends over time (weekly)
    const trends = []
    const weeklyData = {}
    
    responses.forEach(response => {
      const date = new Date(response.submitted_at)
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
    })

    Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([week, count]) => {
        trends.push({ period: week, responses: count })
      })

    return {
      total_responses: totalResponses,
      average_completion_time: averageCompletionTime,
      question_analytics: questionAnalytics,
      trends,
      completion_time_stats: {
        min: Math.min(...completionTimes),
        max: Math.max(...completionTimes),
        median: completionTimes.length > 0 
          ? completionTimes.sort((a, b) => a - b)[Math.floor(completionTimes.length / 2)]
          : 0
      }
    }
  } catch (error) {
    console.error('Error generating survey analytics:', error)
    return null
  }
}