/**
 * NPS (Net Promoter Score) API Routes
 * Handles NPS calculation, metrics, and analytics
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

// Helper function to calculate NPS score
async function calculateNPSScore(barbershopId, dateFrom, dateTo, barberId = null, serviceType = null) {
  try {
    let query = supabase
      .from('customer_feedback')
      .select('nps_score')
      .eq('barbershop_id', barbershopId)
      .eq('feedback_type', 'nps')
      .not('nps_score', 'is', null)

    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    if (barberId) query = query.eq('barber_id', barberId)

    const { data: responses, error } = await query

    if (error) {
      console.error('Error fetching NPS responses:', error)
      return { error: 'Failed to fetch NPS data' }
    }

    if (!responses || responses.length === 0) {
      return {
        total_responses: 0,
        nps_score: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        promoter_percentage: 0,
        passive_percentage: 0,
        detractor_percentage: 0
      }
    }

    const scores = responses.map(r => r.nps_score).filter(score => score !== null)
    const total = scores.length

    const promoters = scores.filter(score => score >= 9).length
    const passives = scores.filter(score => score >= 7 && score <= 8).length
    const detractors = scores.filter(score => score <= 6).length

    const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0

    return {
      total_responses: total,
      nps_score: Math.round(npsScore * 100) / 100,
      promoters,
      passives,
      detractors,
      promoter_percentage: total > 0 ? Math.round((promoters / total) * 10000) / 100 : 0,
      passive_percentage: total > 0 ? Math.round((passives / total) * 10000) / 100 : 0,
      detractor_percentage: total > 0 ? Math.round((detractors / total) * 10000) / 100 : 0
    }
  } catch (error) {
    console.error('Error calculating NPS:', error)
    return { error: 'Failed to calculate NPS' }
  }
}

// GET: Get NPS metrics
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const dateFromParam = searchParams.get('date_from')
    const dateToParam = searchParams.get('date_to')
    const barberId = searchParams.get('barber_id')
    const serviceType = searchParams.get('service_type')
    const includeTrend = searchParams.get('include_trend') === 'true'

    // Default to last 30 days if no dates provided
    const dateTo = dateToParam ? new Date(dateToParam) : new Date()
    const dateFrom = dateFromParam ? new Date(dateFromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Calculate current period NPS
    const currentNPS = await calculateNPSScore(
      barbershopId,
      dateFrom.toISOString(),
      dateTo.toISOString(),
      barberId,
      serviceType
    )

    if (currentNPS.error) {
      return NextResponse.json({ error: currentNPS.error }, { status: 400 })
    }

    let trendData = null
    if (includeTrend) {
      // Calculate previous period for trend
      const periodDays = Math.ceil((dateTo - dateFrom) / (1000 * 60 * 60 * 24))
      const previousDateTo = new Date(dateFrom.getTime() - 24 * 60 * 60 * 1000)
      const previousDateFrom = new Date(previousDateTo.getTime() - periodDays * 24 * 60 * 60 * 1000)

      const previousNPS = await calculateNPSScore(
        barbershopId,
        previousDateFrom.toISOString(),
        previousDateTo.toISOString(),
        barberId,
        serviceType
      )

      if (!previousNPS.error) {
        const change = currentNPS.nps_score - previousNPS.nps_score
        trendData = {
          previous_period_score: previousNPS.nps_score,
          change,
          trend_direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
          change_percentage: previousNPS.nps_score > 0 ? Math.round((change / previousNPS.nps_score) * 10000) / 100 : 0
        }
      }
    }

    const response = {
      period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      ...currentNPS,
      trend: trendData
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/customers/feedback/nps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Submit NPS score
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
      appointment_id,
      barber_id,
      nps_score,
      comment,
      follow_up_reason,
      anonymous = false
    } = body

    // Validate required fields
    if (!customer_id || nps_score === undefined) {
      return NextResponse.json({ error: 'customer_id and nps_score are required' }, { status: 400 })
    }

    if (nps_score < 0 || nps_score > 10) {
      return NextResponse.json({ error: 'nps_score must be between 0 and 10' }, { status: 400 })
    }

    // Determine NPS category
    let npsCategory = 'detractor'
    if (nps_score >= 9) npsCategory = 'promoter'
    else if (nps_score >= 7) npsCategory = 'passive'

    // Create NPS feedback record
    const feedbackData = {
      id: crypto.randomUUID(),
      barbershop_id: barbershopId,
      customer_id,
      appointment_id,
      barber_id,
      feedback_type: 'nps',
      nps_score,
      comment,
      sentiment_score: nps_score >= 7 ? 'positive' : nps_score >= 4 ? 'neutral' : 'negative',
      sentiment_confidence: 0.8,
      status: 'pending',
      anonymous,
      metadata: {
        nps_category: npsCategory,
        follow_up_reason
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert NPS feedback
    const { data: feedbackResult, error: feedbackError } = await supabase
      .from('customer_feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (feedbackError) {
      console.error('Error inserting NPS feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to submit NPS score' }, { status: 400 })
    }

    // Get updated NPS metrics for this barbershop
    const currentMetrics = await calculateNPSScore(barbershopId, null, null)

    const response = {
      feedback: feedbackResult,
      nps_category: npsCategory,
      current_metrics: currentMetrics
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in POST /api/customers/feedback/nps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}