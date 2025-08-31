/**
 * Automated Feedback Collection System API
 * Handles automated feedback requests after appointments
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

// Helper function to get automation settings
async function getAutomationSettings(barbershopId) {
  try {
    const { data: settings, error } = await supabase
      .from('feedback_automation_settings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    // Default settings if none exist
    return settings || {
      post_appointment_enabled: true,
      post_appointment_delay_hours: 2,
      post_appointment_channels: ['email'],
      nps_survey_enabled: true,
      nps_survey_delay_hours: 24,
      review_request_enabled: true,
      review_request_delay_hours: 6,
      max_requests_per_customer_per_month: 2,
      exclude_negative_feedback_customers: true,
      follow_up_enabled: false,
      follow_up_delay_days: 7
    }
  } catch (error) {
    console.error('Error getting automation settings:', error)
    return null
  }
}

// Helper function to check if customer should receive feedback request
async function shouldSendFeedbackRequest(customerId, barbershopId, settings) {
  try {
    // Check monthly limit
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const { data: recentRequests, error } = await supabase
      .from('feedback_requests')
      .select('id')
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .gte('created_at', oneMonthAgo.toISOString())

    if (error) {
      console.error('Error checking recent requests:', error)
      return { should_send: false, reason: 'Error checking limits' }
    }

    if (recentRequests.length >= settings.max_requests_per_customer_per_month) {
      return { should_send: false, reason: 'Monthly limit reached' }
    }

    // Check if customer has given negative feedback recently
    if (settings.exclude_negative_feedback_customers) {
      const { data: recentFeedback, error: feedbackError } = await supabase
        .from('customer_feedback')
        .select('rating, nps_score, sentiment_score')
        .eq('customer_id', customerId)
        .eq('barbershop_id', barbershopId)
        .gte('created_at', oneMonthAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3)

      if (!feedbackError && recentFeedback.length > 0) {
        const hasNegativeFeedback = recentFeedback.some(feedback => 
          (feedback.rating && feedback.rating <= 2) ||
          (feedback.nps_score !== null && feedback.nps_score <= 6) ||
          (feedback.sentiment_score && ['negative', 'very_negative'].includes(feedback.sentiment_score))
        )

        if (hasNegativeFeedback) {
          return { should_send: false, reason: 'Recent negative feedback' }
        }
      }
    }

    return { should_send: true, reason: 'Eligible for feedback request' }
  } catch (error) {
    console.error('Error checking feedback eligibility:', error)
    return { should_send: false, reason: 'Error checking eligibility' }
  }
}

// Helper function to create feedback request
async function createFeedbackRequest(customerId, appointmentId, barbershopId, requestType, settings) {
  try {
    let delayHours = 2
    let channels = ['email']

    switch (requestType) {
      case 'post_appointment':
        delayHours = settings.post_appointment_delay_hours || 2
        channels = settings.post_appointment_channels || ['email']
        break
      case 'nps_survey':
        delayHours = settings.nps_survey_delay_hours || 24
        channels = ['email']
        break
      case 'review_request':
        delayHours = settings.review_request_delay_hours || 6
        channels = ['email', 'sms']
        break
    }

    const scheduledTime = new Date(Date.now() + (delayHours * 60 * 60 * 1000))

    const feedbackRequest = {
      id: crypto.randomUUID(),
      barbershop_id: barbershopId,
      customer_id: customerId,
      appointment_id: appointmentId,
      request_type: requestType,
      scheduled_for: scheduledTime.toISOString(),
      status: 'scheduled',
      channels: channels,
      attempts: 0,
      max_attempts: 3,
      metadata: {
        delay_hours: delayHours,
        automation_settings: {
          post_appointment_enabled: settings.post_appointment_enabled,
          nps_survey_enabled: settings.nps_survey_enabled,
          review_request_enabled: settings.review_request_enabled
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('feedback_requests')
      .insert(feedbackRequest)
      .select()
      .single()

    if (error) {
      console.error('Error creating feedback request:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createFeedbackRequest:', error)
    return null
  }
}

// Helper function to generate feedback survey link
function generateFeedbackLink(feedbackRequestId, barbershopId, customerId, appointmentId) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://6fb.ai'
  return `${baseUrl}/feedback/${feedbackRequestId}?barbershop=${barbershopId}&customer=${customerId}&appointment=${appointmentId}`
}

// Helper function to process pending feedback requests
async function processPendingRequests(barbershopId) {
  try {
    const now = new Date()
    
    // Get requests that are due to be sent
    const { data: pendingRequests, error } = await supabase
      .from('feedback_requests')
      .select(`
        *,
        customers!customer_id(name, email, phone),
        appointments!appointment_id(appointment_date, service_amount),
        barbershops!barbershop_id(name, email)
      `)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
      .lt('attempts', 3) // Haven't exceeded max attempts

    if (error) {
      console.error('Error fetching pending requests:', error)
      return { processed: 0, errors: [error.message] }
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: []
    }

    for (const request of pendingRequests || []) {
      try {
        // Generate feedback link
        const feedbackLink = generateFeedbackLink(
          request.id,
          request.barbershop_id,
          request.customer_id,
          request.appointment_id
        )

        // Prepare email content based on request type
        let emailSubject = ''
        let emailContent = ''

        switch (request.request_type) {
          case 'post_appointment':
            emailSubject = `How was your visit to ${request.barbershops.name}?`
            emailContent = `
              Hi ${request.customers.name},
              
              Thank you for visiting ${request.barbershops.name}! We hope you had a great experience.
              
              We'd love to hear about your visit. Your feedback helps us continue to provide excellent service.
              
              Please take a moment to share your thoughts: ${feedbackLink}
              
              Thank you for your time!
              
              Best regards,
              ${request.barbershops.name}
            `
            break
          
          case 'nps_survey':
            emailSubject = `Quick question about ${request.barbershops.name}`
            emailContent = `
              Hi ${request.customers.name},
              
              On a scale of 0-10, how likely are you to recommend ${request.barbershops.name} to a friend or colleague?
              
              Please let us know: ${feedbackLink}
              
              Your feedback is very important to us and helps us improve our service.
              
              Thank you!
              
              ${request.barbershops.name}
            `
            break
          
          case 'review_request':
            emailSubject = `Would you mind leaving us a review?`
            emailContent = `
              Hi ${request.customers.name},
              
              We're so glad you chose ${request.barbershops.name} for your recent visit!
              
              If you were happy with your experience, would you mind taking a moment to leave us a review?
              
              Share your experience: ${feedbackLink}
              
              Reviews help other customers find us and help us continue to improve.
              
              Thank you so much!
              
              ${request.barbershops.name}
            `
            break
        }

        // Here you would integrate with your email service (SendGrid, Mailgun, etc.)
        // For now, we'll simulate sending and mark as sent
        
        // Update request status
        const { error: updateError } = await supabase
          .from('feedback_requests')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: request.attempts + 1,
            last_attempt_at: new Date().toISOString(),
            email_subject: emailSubject,
            email_content: emailContent,
            feedback_link: feedbackLink,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id)

        if (updateError) {
          results.errors.push(`Failed to update request ${request.id}: ${updateError.message}`)
          results.failed++
        } else {
          results.sent++
        }

        results.processed++

      } catch (requestError) {
        console.error(`Error processing request ${request.id}:`, requestError)
        results.errors.push(`Request ${request.id}: ${requestError.message}`)
        results.failed++
      }
    }

    return results
  } catch (error) {
    console.error('Error processing pending requests:', error)
    return { processed: 0, errors: [error.message] }
  }
}

// POST: Schedule feedback request after appointment
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
      request_types = ['post_appointment'],
      force_send = false
    } = body

    // Validate required fields
    if (!customer_id || !appointment_id) {
      return NextResponse.json({ 
        error: 'customer_id and appointment_id are required' 
      }, { status: 400 })
    }

    // Get automation settings
    const settings = await getAutomationSettings(barbershopId)
    if (!settings) {
      return NextResponse.json({ error: 'Failed to get automation settings' }, { status: 500 })
    }

    // Check if customer should receive feedback request
    const eligibilityCheck = await shouldSendFeedbackRequest(customer_id, barbershopId, settings)
    
    if (!force_send && !eligibilityCheck.should_send) {
      return NextResponse.json({ 
        success: false,
        reason: eligibilityCheck.reason,
        requests_created: 0
      })
    }

    const results = {
      success: true,
      requests_created: 0,
      requests: [],
      skipped: []
    }

    // Create feedback requests based on enabled types
    for (const requestType of request_types) {
      let shouldCreate = false

      switch (requestType) {
        case 'post_appointment':
          shouldCreate = settings.post_appointment_enabled
          break
        case 'nps_survey':
          shouldCreate = settings.nps_survey_enabled
          break
        case 'review_request':
          shouldCreate = settings.review_request_enabled
          break
        default:
          shouldCreate = false
      }

      if (shouldCreate || force_send) {
        const feedbackRequest = await createFeedbackRequest(
          customer_id,
          appointment_id,
          barbershopId,
          requestType,
          settings
        )

        if (feedbackRequest) {
          results.requests.push(feedbackRequest)
          results.requests_created++
        } else {
          results.skipped.push({
            type: requestType,
            reason: 'Failed to create request'
          })
        }
      } else {
        results.skipped.push({
          type: requestType,
          reason: 'Type not enabled in settings'
        })
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error in POST /api/customers/feedback/automation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Process pending feedback requests (cron job endpoint)
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult

    // Process pending requests
    const results = await processPendingRequests(barbershopId)

    return NextResponse.json({
      success: true,
      ...results,
      processed_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in GET /api/customers/feedback/automation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update automation settings
export async function PUT(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const body = await request.json()

    const {
      post_appointment_enabled,
      post_appointment_delay_hours,
      post_appointment_channels,
      nps_survey_enabled,
      nps_survey_delay_hours,
      review_request_enabled,
      review_request_delay_hours,
      max_requests_per_customer_per_month,
      exclude_negative_feedback_customers,
      follow_up_enabled,
      follow_up_delay_days
    } = body

    // Prepare settings data
    const settingsData = {
      barbershop_id: barbershopId,
      post_appointment_enabled: post_appointment_enabled ?? true,
      post_appointment_delay_hours: post_appointment_delay_hours ?? 2,
      post_appointment_channels: post_appointment_channels ?? ['email'],
      nps_survey_enabled: nps_survey_enabled ?? true,
      nps_survey_delay_hours: nps_survey_delay_hours ?? 24,
      review_request_enabled: review_request_enabled ?? true,
      review_request_delay_hours: review_request_delay_hours ?? 6,
      max_requests_per_customer_per_month: max_requests_per_customer_per_month ?? 2,
      exclude_negative_feedback_customers: exclude_negative_feedback_customers ?? true,
      follow_up_enabled: follow_up_enabled ?? false,
      follow_up_delay_days: follow_up_delay_days ?? 7,
      updated_at: new Date().toISOString()
    }

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('feedback_automation_settings')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('feedback_automation_settings')
        .update(settingsData)
        .eq('barbershop_id', barbershopId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 400 })
      }
      result = data
    } else {
      // Create new settings
      settingsData.id = crypto.randomUUID()
      settingsData.created_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('feedback_automation_settings')
        .insert(settingsData)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 400 })
      }
      result = data
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in PUT /api/customers/feedback/automation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}