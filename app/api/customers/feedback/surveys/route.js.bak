/**
 * Customer Surveys API Routes
 * Handles survey creation, management, and response collection
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

// POST: Create a new survey
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, barbershopId } = authResult
    const body = await request.json()

    const {
      survey_name,
      survey_description,
      survey_type,
      questions,
      target_segments,
      trigger_conditions,
      active_from,
      active_until,
      max_responses,
      send_via_email = true,
      send_via_sms = false,
      follow_up_enabled = false,
      follow_up_delay_hours
    } = body

    // Validate required fields
    if (!survey_name || !survey_type || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ 
        error: 'survey_name, survey_type, and questions array are required' 
      }, { status: 400 })
    }

    // Validate survey type
    const validSurveyTypes = ['nps', 'csat', 'general', 'post_appointment', 'onboarding']
    if (!validSurveyTypes.includes(survey_type)) {
      return NextResponse.json({ 
        error: `survey_type must be one of: ${validSurveyTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Create survey record
    const surveyData = {
      id: crypto.randomUUID(),
      barbershop_id: barbershopId,
      created_by_user_id: user.id,
      survey_name,
      survey_description,
      survey_type,
      questions,
      target_segments,
      trigger_conditions,
      active_from: active_from ? new Date(active_from).toISOString() : null,
      active_until: active_until ? new Date(active_until).toISOString() : null,
      max_responses,
      send_via_email,
      send_via_sms,
      follow_up_enabled,
      follow_up_delay_hours,
      is_active: true,
      response_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert survey
    const { data: surveyResult, error: surveyError } = await supabase
      .from('feedback_surveys')
      .insert(surveyData)
      .select()
      .single()

    if (surveyError) {
      console.error('Error creating survey:', surveyError)
      return NextResponse.json({ error: 'Failed to create survey' }, { status: 400 })
    }

    return NextResponse.json(surveyResult)

  } catch (error) {
    console.error('Error in POST /api/customers/feedback/surveys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: List surveys
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const surveyType = searchParams.get('survey_type')
    const isActive = searchParams.get('is_active')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('feedback_surveys')
      .select('*')
      .eq('barbershop_id', barbershopId)

    // Apply filters
    if (surveyType) query = query.eq('survey_type', surveyType)
    if (isActive !== null) query = query.eq('is_active', isActive === 'true')

    // Apply pagination and ordering
    const { data: surveys, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching surveys:', error)
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 400 })
    }

    return NextResponse.json(surveys)

  } catch (error) {
    console.error('Error in GET /api/customers/feedback/surveys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update survey
export async function PUT(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const body = await request.json()
    const { survey_id, ...updateData } = body

    if (!survey_id) {
      return NextResponse.json({ error: 'survey_id is required' }, { status: 400 })
    }

    // Update survey
    const { data, error } = await supabase
      .from('feedback_surveys')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', survey_id)
      .eq('barbershop_id', barbershopId)
      .select()
      .single()

    if (error) {
      console.error('Error updating survey:', error)
      return NextResponse.json({ error: 'Failed to update survey' }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in PUT /api/customers/feedback/surveys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}