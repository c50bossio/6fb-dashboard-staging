import { NextRequest, NextResponse } from 'next/server'
import { createTrafftClient, TrafftEventTypes } from '../../../../../lib/trafft-api.js'
import {
  getIntegrationCredentials,
  getIntegrationStatus,
  storeWebhookEvent,
  markWebhookProcessed,
  storeExternalAppointments,
  storeExternalCustomers,
  storeIntegrationAnalytics
} from '../../../../../services/trafft-database-service.js'
import crypto from 'crypto'

/**
 * POST /api/integrations/trafft/webhooks
 * Handle real-time updates from Trafft via webhooks
 */
export async function POST(request) {
  let webhookEventId = null
  
  try {
    const payload = await request.json()
    const signature = request.headers.get('x-trafft-signature')
    const eventType = request.headers.get('x-trafft-event') || payload.event_type
    const barbershopId = payload.barbershop_id || payload.account_id || 'default'
    
    // Get integration info to validate webhook
    const integration = await getIntegrationStatus(barbershopId, 'trafft')
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Store incoming webhook event
    webhookEventId = await storeWebhookEvent(
      integration.integrationId,
      barbershopId,
      eventType,
      payload,
      Object.fromEntries(request.headers.entries())
    )

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, integration.webhookSecret)) {
      await markWebhookProcessed(webhookEventId, 401, null, 'Invalid signature')
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    console.log('Received Trafft webhook:', eventType, payload)

    // Process webhook based on event type
    const result = await processWebhookEvent(integration, eventType, payload)

    // Mark webhook as successfully processed
    await markWebhookProcessed(webhookEventId, 200, result)

    return NextResponse.json({
      success: true,
      eventType,
      processed: true,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('Error processing Trafft webhook:', error)
    
    // Mark webhook as failed if we have the event ID
    if (webhookEventId) {
      await markWebhookProcessed(webhookEventId, 500, null, error.message)
    }
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * Process different types of webhook events
 */
async function processWebhookEvent(integration, eventType, payload) {
  const barbershopId = integration.barbershopId
  const { data } = payload

  switch (eventType) {
    case TrafftEventTypes.APPOINTMENT_CREATED:
    case 'appointment.created':
    case 'appointment_created':
      return await handleAppointmentCreated(integration, barbershopId, data || payload)
    
    case TrafftEventTypes.APPOINTMENT_UPDATED:
    case 'appointment.updated':
    case 'appointment_updated':
      return await handleAppointmentUpdated(integration, barbershopId, data || payload)
    
    case TrafftEventTypes.APPOINTMENT_CANCELLED:
    case 'appointment.cancelled':
    case 'appointment_cancelled':
      return await handleAppointmentCancelled(integration, barbershopId, data || payload)
    
    case TrafftEventTypes.CUSTOMER_CREATED:
    case 'customer.created':
    case 'customer_created':
      return await handleCustomerCreated(integration, barbershopId, data || payload)
    
    case TrafftEventTypes.CUSTOMER_UPDATED:
    case 'customer.updated':
    case 'customer_updated':
      return await handleCustomerUpdated(integration, barbershopId, data || payload)
      
    default:
      console.log('Unknown webhook event type:', eventType)
      return { message: 'Event type not supported', eventType }
  }
}

/**
 * Handle new appointment creation
 */
async function handleAppointmentCreated(integration, barbershopId, appointmentData) {
  try {
    // Normalize appointment data
    const appointment = {
      id: appointmentData.id,
      clientName: appointmentData.customerName || appointmentData.client_name,
      clientEmail: appointmentData.customerEmail || appointmentData.client_email,
      clientPhone: appointmentData.customerPhone || appointmentData.client_phone,
      employeeName: appointmentData.employeeName || appointmentData.employee_name,
      serviceName: appointmentData.serviceName || appointmentData.service_name,
      scheduledAt: appointmentData.dateTime || appointmentData.scheduled_at,
      duration: appointmentData.duration || 60,
      price: parseFloat(appointmentData.price || 0),
      status: appointmentData.status || 'confirmed'
    }

    // Store appointment in database
    const result = await storeExternalAppointments(
      integration.integrationId,
      barbershopId,
      [appointment]
    )

    // Update business analytics in real-time
    await updateBusinessAnalytics(integration, barbershopId, 'appointment_created', appointment)

    // Trigger AI analysis for business insights
    const aiInsights = await generateAIInsightsForNewAppointment(appointment)

    console.log('New appointment created:', appointment.id, result)

    return {
      action: 'appointment_created',
      appointmentId: appointment.id,
      stored: result.success > 0,
      aiInsights,
      analyticsUpdated: true
    }

  } catch (error) {
    console.error('Error handling appointment creation:', error)
    throw error
  }
}

/**
 * Handle appointment updates
 */
async function handleAppointmentUpdated(integration, barbershopId, appointmentData) {
  try {
    // Normalize updated appointment data
    const appointment = {
      id: appointmentData.id,
      clientName: appointmentData.customerName || appointmentData.client_name,
      clientEmail: appointmentData.customerEmail || appointmentData.client_email,
      clientPhone: appointmentData.customerPhone || appointmentData.client_phone,
      employeeName: appointmentData.employeeName || appointmentData.employee_name,
      serviceName: appointmentData.serviceName || appointmentData.service_name,
      scheduledAt: appointmentData.dateTime || appointmentData.scheduled_at,
      duration: appointmentData.duration || 60,
      price: parseFloat(appointmentData.price || 0),
      status: appointmentData.status || 'confirmed'
    }

    // Update appointment in database (upsert)
    const result = await storeExternalAppointments(
      integration.integrationId,
      barbershopId,
      [appointment]
    )

    // Update analytics if price or status changed
    if (appointmentData.price || appointmentData.status) {
      await updateBusinessAnalytics(integration, barbershopId, 'appointment_updated', appointment)
    }

    console.log('Appointment updated:', appointmentData.id, result)

    return {
      action: 'appointment_updated',
      appointmentId: appointmentData.id,
      updated: result.success > 0,
      fields: ['scheduledAt', 'status', 'price']
    }

  } catch (error) {
    console.error('Error handling appointment update:', error)
    throw error
  }
}

/**
 * Handle appointment cancellation
 */
async function handleAppointmentCancelled(barbershopId, appointmentData) {
  try {
    const cancellation = {
      id: appointmentData.id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: appointmentData.reason || 'Not specified',
      refundAmount: parseFloat(appointmentData.refundAmount || 0)
    }

    // TODO: Update in database
    // await updateAppointment(appointmentData.id, cancellation)

    // Update analytics
    await updateBusinessAnalytics(barbershopId, 'appointment_cancelled', cancellation)

    // Alert AI agents about cancellation patterns
    const cancellationAnalysis = await analyzeCancellationPattern(barbershopId, appointmentData)

    console.log('Appointment cancelled:', appointmentData.id)

    return {
      action: 'appointment_cancelled',
      appointmentId: appointmentData.id,
      refunded: cancellation.refundAmount > 0,
      cancellationAnalysis
    }

  } catch (error) {
    console.error('Error handling appointment cancellation:', error)
    throw error
  }
}

/**
 * Handle new customer creation
 */
async function handleCustomerCreated(barbershopId, customerData) {
  try {
    const customer = {
      id: customerData.id,
      barbershopId,
      name: `${customerData.firstName} ${customerData.lastName}`,
      email: customerData.email,
      phone: customerData.phone,
      createdAt: new Date().toISOString(),
      source: 'trafft',
      isNewClient: true
    }

    // TODO: Save to database
    // await saveCustomer(customer)

    // Update customer analytics
    await updateBusinessAnalytics(barbershopId, 'customer_created', customer)

    // Trigger new client onboarding flow
    const onboardingTasks = await generateNewClientOnboarding(customer)

    console.log('New customer created:', customer.id)

    return {
      action: 'customer_created',
      customerId: customer.id,
      onboardingTasks,
      analyticsUpdated: true
    }

  } catch (error) {
    console.error('Error handling customer creation:', error)
    throw error
  }
}

/**
 * Handle customer updates
 */
async function handleCustomerUpdated(barbershopId, customerData) {
  try {
    const updatedFields = {
      name: `${customerData.firstName} ${customerData.lastName}`,
      email: customerData.email,
      phone: customerData.phone,
      updatedAt: new Date().toISOString()
    }

    // TODO: Update in database
    // await updateCustomer(customerData.id, updatedFields)

    console.log('Customer updated:', customerData.id)

    return {
      action: 'customer_updated',
      customerId: customerData.id,
      fields: Object.keys(updatedFields)
    }

  } catch (error) {
    console.error('Error handling customer update:', error)
    throw error
  }
}

/**
 * Update business analytics in real-time
 */
async function updateBusinessAnalytics(integration, barbershopId, eventType, eventData) {
  try {
    const today = new Date()
    
    // Create analytics data based on event type
    const analyticsData = {
      appointments: { total: 0 },
      revenue: { total: 0, avgTicket: 0 },
      clients: { new: 0, returning: 0 },
      businessInsights: {}
    }

    // Update metrics based on event type
    switch (eventType) {
      case 'appointment_created':
        analyticsData.appointments.total = 1
        analyticsData.revenue.total = eventData.price || 0
        analyticsData.revenue.avgTicket = eventData.price || 0
        break
        
      case 'appointment_cancelled':
        analyticsData.appointments.total = -1
        analyticsData.revenue.total = -(eventData.refundAmount || eventData.price || 0)
        break
        
      case 'customer_created':
        analyticsData.clients.new = 1
        break
    }

    // Store analytics update
    await storeIntegrationAnalytics(
      integration.integrationId,
      barbershopId,
      analyticsData,
      today
    )

    console.log('Analytics updated for:', eventType, analyticsData)
    return analyticsData

  } catch (error) {
    console.error('Error updating business analytics:', error)
    throw error
  }
}

/**
 * Generate AI insights for new appointments
 */
async function generateAIInsightsForNewAppointment(appointment) {
  const insights = {
    revenueImpact: appointment.price,
    timeOptimization: checkTimeSlotOptimization(appointment),
    clientType: determineClientType(appointment),
    serviceAnalysis: analyzeServiceBooking(appointment),
    recommendations: []
  }

  // Add recommendations based on insights
  if (insights.timeOptimization.isPeakTime) {
    insights.recommendations.push({
      type: 'pricing',
      message: 'Consider premium pricing for peak time slots',
      impact: 'high'
    })
  }

  if (insights.clientType === 'new') {
    insights.recommendations.push({
      type: 'retention',
      message: 'Focus on excellent first-time experience for client retention',
      impact: 'high'
    })
  }

  return insights
}

/**
 * Analyze cancellation patterns
 */
async function analyzeCancellationPattern(barbershopId, appointmentData) {
  // TODO: Implement sophisticated cancellation analysis
  return {
    timeOfDay: new Date(appointmentData.dateTime).getHours(),
    dayOfWeek: new Date(appointmentData.dateTime).getDay(),
    reason: appointmentData.reason,
    recommendations: [
      'Consider implementing deposit requirements for peak times',
      'Send appointment reminders 24 hours in advance'
    ]
  }
}

/**
 * Generate new client onboarding tasks
 */
async function generateNewClientOnboarding(customer) {
  return [
    {
      task: 'Send welcome email with salon information',
      priority: 'high',
      dueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    },
    {
      task: 'Add to new client follow-up sequence',
      priority: 'medium',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    },
    {
      task: 'Schedule first appointment follow-up',
      priority: 'medium',
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }
  ]
}

/**
 * Helper functions
 */
function verifyWebhookSignature(payload, signature, webhookSecret) {
  if (!signature || !webhookSecret) {
    return signature && signature.length > 0 // Basic check if no secret configured
  }

  try {
    // Generate expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex')
    
    // Compare signatures (timing-safe comparison)
    const providedSignature = signature.replace('sha256=', '')
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

function checkTimeSlotOptimization(appointment) {
  const hour = new Date(appointment.scheduledAt).getHours()
  const isPeakTime = hour >= 17 || (hour >= 10 && hour <= 14) // Evening or lunch time
  
  return {
    hour,
    isPeakTime,
    suggestion: isPeakTime ? 'Premium pricing opportunity' : 'Standard pricing'
  }
}

function determineClientType(appointment) {
  // TODO: Check if customer is new or returning
  return appointment.clientId ? 'returning' : 'new'
}

function analyzeServiceBooking(appointment) {
  return {
    serviceId: appointment.serviceId,
    price: appointment.price,
    duration: appointment.duration,
    profitability: appointment.price > 60 ? 'high' : 'standard'
  }
}