/**
 * Google Calendar Integration Service
 * Handles appointment sync, calendar management, and iCal export
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import ical from 'ical-generator'
import { encryptionService } from './encryption-service.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class CalendarIntegrationService {
  constructor() {
    this.oauth2Client = null
    this.calendar = null
    this.initialized = false
    this.init()
  }

  async init() {
    try {
      // Validate required environment variables
      const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXT_PUBLIC_APP_URL']
      const missing = requiredVars.filter(varName => !process.env[varName])
      
      if (missing.length > 0) {
        console.warn(`⚠️ Google Calendar credentials not configured. Missing: ${missing.join(', ')}`)
        console.warn('📖 To configure Google Calendar integration:')
        console.warn('1. Create a Google Cloud project at https://console.cloud.google.com/')
        console.warn('2. Enable the Calendar API')
        console.warn('3. Create OAuth2 credentials')
        console.warn('4. Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET')
        return
      }

      // Validate callback URL format
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
      try {
        new URL(callbackUrl)
      } catch (urlError) {
        console.error('❌ Invalid NEXT_PUBLIC_APP_URL format:', process.env.NEXT_PUBLIC_APP_URL)
        return
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl
      )

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
      this.initialized = true

      console.log('✅ Google Calendar service initialized successfully')
      console.log(`📍 OAuth callback URL: ${callbackUrl}`)

    } catch (error) {
      console.error('❌ Failed to initialize Calendar service:', error)
      console.error('🔧 Check your Google Cloud project configuration')
      this.initialized = false
    }
  }

  /**
   * Generate OAuth URL for Google Calendar authorization
   */
  getAuthUrl(userId, barbershopId) {
    if (!this.initialized) {
      throw new Error('Calendar service not initialized')
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ userId, barbershopId })
    })

    return authUrl
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, userId, barbershopId) {
    try {
      if (!this.initialized) {
        throw new Error('Calendar service not initialized')
      }

      const { tokens } = await this.oauth2Client.getAccessToken(code)
      
      // Store tokens securely in database
      const { error } = await supabase
        .from('calendar_integrations')
        .upsert({
          user_id: userId,
          barbershop_id: barbershopId,
          provider: 'google',
          access_token: encryptionService.encryptToken(tokens.access_token, 'access_token'),
          refresh_token: encryptionService.encryptToken(tokens.refresh_token, 'refresh_token'),
          token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          is_active: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        })

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Google Calendar connected successfully'
      }

    } catch (error) {
      console.error('Error exchanging code for tokens:', error)
      throw error
    }
  }

  /**
   * Get stored tokens for user
   */
  async getStoredTokens(userId) {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('access_token, refresh_token, token_expires_at')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return {
        access_token: encryptionService.decryptToken(data.access_token),
        refresh_token: encryptionService.decryptToken(data.refresh_token),
        expiry_date: data.token_expires_at ? new Date(data.token_expires_at).getTime() : null
      }

    } catch (error) {
      console.error('Error getting stored tokens:', error)
      return null
    }
  }

  /**
   * Set up OAuth client with stored tokens
   */
  async setupAuthForUser(userId) {
    const tokens = await this.getStoredTokens(userId)
    if (!tokens) {
      throw new Error('No Google Calendar integration found for user')
    }

    this.oauth2Client.setCredentials(tokens)
    return true
  }

  /**
   * Create calendar event for appointment
   */
  async createAppointmentEvent(userId, appointmentData) {
    const startTime = Date.now()
    
    try {
      // Validate inputs
      if (!userId || !appointmentData) {
        throw new Error('Missing required parameters: userId and appointmentData')
      }

      const requiredFields = ['startDateTime', 'endDateTime', 'customerName', 'serviceName', 'bookingId']
      const missing = requiredFields.filter(field => !appointmentData[field])
      if (missing.length > 0) {
        throw new Error(`Missing required appointment data: ${missing.join(', ')}`)
      }

      // Validate date/time formats
      const startDate = new Date(appointmentData.startDateTime)
      const endDate = new Date(appointmentData.endDateTime)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format in appointment data')
      }

      if (startDate >= endDate) {
        throw new Error('Start time must be before end time')
      }

      // Set up authentication
      await this.setupAuthForUser(userId)
      console.log(`📅 Creating Google Calendar event for appointment ${appointmentData.bookingId}`)

      const {
        title,
        description,
        startDateTime,
        endDateTime,
        customerName,
        customerEmail,
        customerPhone,
        barbershopName,
        barbershopAddress,
        barberName,
        serviceName,
        bookingId
      } = appointmentData

      const event = {
        summary: `${serviceName} - ${customerName}`,
        description: this.buildEventDescription({
          description,
          customerName,
          customerEmail,
          customerPhone,
          barbershopName,
          barberName,
          serviceName,
          bookingId
        }),
        start: {
          dateTime: startDateTime,
          timeZone: appointmentData.timeZone || 'America/New_York'
        },
        end: {
          dateTime: endDateTime,
          timeZone: appointmentData.timeZone || 'America/New_York'
        },
        location: barbershopAddress,
        attendees: customerEmail ? [{ email: customerEmail }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours
            { method: 'popup', minutes: 60 }       // 1 hour
          ]
        },
        extendedProperties: {
          private: {
            booking_id: bookingId,
            customer_phone: customerPhone,
            barber_name: barberName,
            service_name: serviceName,
            created_by: '6fb_booking_system',
            created_at: new Date().toISOString()
          }
        }
      }

      // Create event in Google Calendar
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all'
      })

      if (!response.data?.id) {
        throw new Error('Google Calendar did not return an event ID')
      }

      // Store calendar event ID in database
      const { error: updateError } = await supabase
        .from('appointments') // Updated from 'bookings' to match schema
        .update({
          google_calendar_event_id: response.data.id,
          calendar_synced: true,
          calendar_synced_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (updateError) {
        console.warn(`⚠️ Failed to update appointment ${bookingId} with calendar event ID:`, updateError)
        // Don't fail the whole operation if DB update fails
      }

      const duration = Date.now() - startTime
      console.log(`✅ Calendar event created in ${duration}ms: ${response.data.id}`)

      return {
        success: true,
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        message: 'Appointment added to Google Calendar',
        duration: duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Error creating calendar event (${duration}ms):`, error)
      
      // Handle specific Google API errors
      if (error.code === 401 || error.message?.includes('unauthorized')) {
        console.log('🔄 Token expired, attempting refresh...')
        try {
          await this.refreshTokens(userId)
          console.log('✅ Tokens refreshed, retrying event creation...')
          return this.createAppointmentEvent(userId, appointmentData)
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError)
          throw new Error('Calendar authentication failed. Please reconnect your Google Calendar.')
        }
      }

      // Handle rate limiting
      if (error.code === 403 && error.message?.includes('Rate Limit Exceeded')) {
        throw new Error('Google Calendar rate limit exceeded. Please try again in a few minutes.')
      }

      // Handle quota errors
      if (error.code === 403 && error.message?.includes('Daily Limit Exceeded')) {
        throw new Error('Google Calendar daily quota exceeded. Contact support if this persists.')
      }

      // Handle calendar not found
      if (error.code === 404) {
        throw new Error('Google Calendar not found. Please check your calendar permissions.')
      }

      // Generic error with helpful message
      const errorMessage = error.message || 'Unknown error occurred'
      throw new Error(`Failed to create calendar event: ${errorMessage}`)
    }
  }

  /**
   * Update calendar event for appointment
   */
  async updateAppointmentEvent(userId, eventId, appointmentData) {
    const startTime = Date.now()
    
    try {
      // Validate inputs
      if (!userId || !eventId || !appointmentData) {
        throw new Error('Missing required parameters: userId, eventId, and appointmentData')
      }

      const requiredFields = ['startDateTime', 'endDateTime', 'customerName', 'serviceName']
      const missing = requiredFields.filter(field => !appointmentData[field])
      if (missing.length > 0) {
        throw new Error(`Missing required appointment data: ${missing.join(', ')}`)
      }

      // Validate date/time formats
      const startDate = new Date(appointmentData.startDateTime)
      const endDate = new Date(appointmentData.endDateTime)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format in appointment data')
      }

      if (startDate >= endDate) {
        throw new Error('Start time must be before end time')
      }

      // Set up authentication
      await this.setupAuthForUser(userId)
      console.log(`📅 Updating Google Calendar event ${eventId} for user ${userId}`)

      const {
        title,
        description,
        startDateTime,
        endDateTime,
        customerName,
        customerEmail,
        customerPhone,
        barbershopName,
        barbershopAddress,
        barberName,
        serviceName,
        bookingId
      } = appointmentData

      const event = {
        summary: `${serviceName} - ${customerName}`,
        description: this.buildEventDescription({
          description,
          customerName,
          customerEmail,
          customerPhone,
          barbershopName,
          barberName,
          serviceName,
          bookingId
        }),
        start: {
          dateTime: startDateTime,
          timeZone: appointmentData.timeZone || 'America/New_York'
        },
        end: {
          dateTime: endDateTime,
          timeZone: appointmentData.timeZone || 'America/New_York'
        },
        location: barbershopAddress,
        attendees: customerEmail ? [{ email: customerEmail }] : []
      }

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        sendUpdates: 'all'
      })

      const duration = Date.now() - startTime
      console.log(`✅ Updated Google Calendar event in ${duration}ms:`, {
        eventId: response.data.id,
        summary: response.data.summary,
        start: response.data.start.dateTime,
        end: response.data.end.dateTime
      })

      return {
        success: true,
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        message: 'Appointment updated in Google Calendar'
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Error updating calendar event (${duration}ms):`, error)
      
      // Handle specific Google API errors
      if (error.code === 401 || error.message?.includes('unauthorized')) {
        console.log('🔄 Token expired, attempting refresh...')
        try {
          await this.refreshTokens(userId)
          console.log('✅ Tokens refreshed, retrying event update...')
          return this.updateAppointmentEvent(userId, eventId, appointmentData)
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError)
          throw new Error('Calendar authentication failed. Please reconnect your Google Calendar.')
        }
      }

      // Handle rate limiting
      if (error.code === 403 && error.message?.includes('Rate Limit Exceeded')) {
        throw new Error('Google Calendar rate limit exceeded. Please try again in a few minutes.')
      }

      // Handle quota errors
      if (error.code === 403 && error.message?.includes('Daily Limit Exceeded')) {
        throw new Error('Google Calendar daily quota exceeded. Contact support if this persists.')
      }

      // Handle event not found
      if (error.code === 404) {
        throw new Error('Calendar event not found. It may have been deleted or moved.')
      }

      // Generic error with helpful message
      const errorMessage = error.message || 'Unknown error occurred'
      throw new Error(`Failed to update calendar event: ${errorMessage}`)
    }
  }

  /**
   * Delete calendar event for appointment
   */
  async deleteAppointmentEvent(userId, eventId) {
    const startTime = Date.now()
    
    try {
      // Validate inputs
      if (!userId || !eventId) {
        throw new Error('Missing required parameters: userId and eventId')
      }

      // Set up authentication
      await this.setupAuthForUser(userId)
      console.log(`📅 Deleting Google Calendar event ${eventId} for user ${userId}`)

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      })

      const duration = Date.now() - startTime
      console.log(`✅ Deleted Google Calendar event in ${duration}ms:`, { eventId })

      return {
        success: true,
        message: 'Appointment removed from Google Calendar'
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Error deleting calendar event (${duration}ms):`, error)
      
      // Handle specific Google API errors
      if (error.code === 401 || error.message?.includes('unauthorized')) {
        console.log('🔄 Token expired, attempting refresh...')
        try {
          await this.refreshTokens(userId)
          console.log('✅ Tokens refreshed, retrying event deletion...')
          return this.deleteAppointmentEvent(userId, eventId)
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError)
          throw new Error('Calendar authentication failed. Please reconnect your Google Calendar.')
        }
      }

      // Handle rate limiting
      if (error.code === 403 && error.message?.includes('Rate Limit Exceeded')) {
        throw new Error('Google Calendar rate limit exceeded. Please try again in a few minutes.')
      }

      // Handle quota errors
      if (error.code === 403 && error.message?.includes('Daily Limit Exceeded')) {
        throw new Error('Google Calendar daily quota exceeded. Contact support if this persists.')
      }

      // Handle event not found (may already be deleted)
      if (error.code === 404) {
        console.log('⚠️ Calendar event already deleted or not found')
        return {
          success: true,
          message: 'Appointment was already removed from Google Calendar'
        }
      }

      // Generic error with helpful message
      const errorMessage = error.message || 'Unknown error occurred'
      throw new Error(`Failed to delete calendar event: ${errorMessage}`)
    }
  }

  /**
   * Sync all appointments to calendar
   */
  async syncAllAppointments(userId, barbershopId) {
    const startTime = Date.now()
    
    try {
      // Validate inputs
      if (!userId || !barbershopId) {
        throw new Error('Missing required parameters: userId and barbershopId')
      }

      console.log(`📅 Starting full calendar sync for barbershop ${barbershopId}`)

      // Get all confirmed appointments for the barbershop that don't have calendar events
      const { data: appointments, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (*),
          barbershops (*),
          barbershop_staff (*)
        `)
        .eq('barbershop_id', barbershopId)
        .in('status', ['confirmed', 'checked_in'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .is('google_calendar_event_id', null)

      if (error) {
        console.error('❌ Database error fetching appointments:', error)
        throw new Error(`Failed to fetch appointments: ${error.message}`)
      }

      if (!appointments || appointments.length === 0) {
        console.log('ℹ️ No appointments found to sync')
        return {
          success: true,
          synced: 0,
          failed: 0,
          message: 'No appointments found to sync',
          results: []
        }
      }

      console.log(`📋 Found ${appointments.length} appointments to sync`)

      const results = []
      let successCount = 0
      let failedCount = 0

      // Process appointments with rate limiting awareness
      for (let i = 0; i < appointments.length; i++) {
        const appointment = appointments[i]
        
        try {
          console.log(`⏳ Syncing appointment ${i + 1}/${appointments.length}: ${appointment.id}`)
          
          const appointmentData = this.buildAppointmentData(appointment)
          const result = await this.createAppointmentEvent(userId, appointmentData)
          
          if (result.success) {
            // Update appointment with Google Calendar event ID
            await supabase
              .from('bookings')
              .update({ google_calendar_event_id: result.eventId })
              .eq('id', appointment.id)
          }

          results.push({ 
            bookingId: appointment.id, 
            success: result.success, 
            result,
            appointmentData: {
              customerName: appointmentData.customerName,
              serviceName: appointmentData.serviceName,
              startDateTime: appointmentData.startDateTime
            }
          })
          successCount++
          
        } catch (error) {
          console.error(`❌ Failed to sync appointment ${appointment.id}:`, error)
          results.push({ 
            bookingId: appointment.id, 
            success: false, 
            error: error.message,
            appointmentData: {
              customerName: appointment.customers?.full_name || 'Unknown',
              serviceName: appointment.service_name || 'Unknown Service',
              startDateTime: appointment.appointment_date
            }
          })
          failedCount++

          // If we hit rate limits, wait before continuing
          if (error.message?.includes('rate limit')) {
            console.log('⏱️ Rate limit detected, waiting 60 seconds...')
            await new Promise(resolve => setTimeout(resolve, 60000))
          }
        }

        // Small delay between requests to avoid rate limiting
        if (i < appointments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const duration = Date.now() - startTime
      console.log(`✅ Calendar sync completed in ${duration}ms:`, {
        total: appointments.length,
        synced: successCount,
        failed: failedCount
      })

      return {
        success: true,
        synced: successCount,
        failed: failedCount,
        total: appointments.length,
        duration: duration,
        message: `Synced ${successCount} of ${appointments.length} appointments`,
        results: results
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Error during full calendar sync (${duration}ms):`, error)
      
      // Provide helpful error messages based on error type
      let userMessage = 'Failed to sync appointments to calendar'
      
      if (error.message?.includes('unauthorized') || error.message?.includes('authentication')) {
        userMessage = 'Calendar authentication failed. Please reconnect your Google Calendar.'
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        userMessage = 'Google Calendar usage limit reached. Please try again later.'
      } else if (error.message?.includes('database') || error.message?.includes('fetch appointments')) {
        userMessage = 'Database error while fetching appointments. Please try again.'
      }

      throw new Error(userMessage)
    }
  }

  /**
   * Generate iCal feed for barbershop
   */
  async generateICalFeed(barbershopId, token = null) {
    try {
      // Verify token if provided (for private feeds)
      if (token) {
        const { data: integration, error } = await supabase
          .from('calendar_integrations')
          .select('barbershop_id')
          .eq('ical_token', token)
          .single()

        if (error || !integration || integration.barbershop_id !== barbershopId) {
          throw new Error('Invalid iCal token')
        }
      }

      // Get appointments for the next 3 months
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 3)

      const { data: appointments, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (*),
          barbershops (*),
          barbershop_staff (*)
        `)
        .eq('barbershop_id', barbershopId)
        .in('status', ['confirmed', 'checked_in'])
        .gte('appointment_date', startDate.toISOString().split('T')[0])
        .lte('appointment_date', endDate.toISOString().split('T')[0])

      if (error) {
        throw error
      }

      // Create iCal calendar
      const calendar = ical({
        name: appointments[0]?.barbershops?.name || 'Barbershop Appointments',
        description: 'Appointment schedule',
        timezone: 'America/New_York',
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/ical/${barbershopId}${token ? `?token=${token}` : ''}`,
        ttl: 60 * 60 // 1 hour TTL
      })

      // Add appointments as events
      for (const appointment of appointments || []) {
        const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
        const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 60) * 60000)

        calendar.createEvent({
          uid: `booking-${appointment.id}@bookedbarber.com`,
          start: startDateTime,
          end: endDateTime,
          summary: `${appointment.service_name || 'Appointment'} - ${appointment.customers?.first_name || 'Customer'}`,
          description: this.buildEventDescription({
            customerName: `${appointment.customers?.first_name || ''} ${appointment.customers?.last_name || ''}`.trim(),
            customerEmail: appointment.customers?.email,
            customerPhone: appointment.customers?.phone,
            barbershopName: appointment.barbershops?.name,
            barberName: `${appointment.barbershop_staff?.first_name || ''} ${appointment.barbershop_staff?.last_name || ''}`.trim(),
            serviceName: appointment.service_name,
            bookingId: appointment.id
          }),
          location: appointment.barbershops?.address,
          status: 'confirmed'
        })
      }

      return calendar.toString()

    } catch (error) {
      console.error('Error generating iCal feed:', error)
      throw error
    }
  }

  /**
   * Build appointment data for calendar integration
   */
  buildAppointmentData(appointment) {
    // Handle various date/time formats
    let startDateTime
    
    try {
      // If appointment_date and appointment_time are separate
      if (appointment.appointment_date && appointment.appointment_time) {
        // Handle time format (could be "10:00" or "10:00:00")
        const time = appointment.appointment_time.includes(':') 
          ? appointment.appointment_time 
          : '10:00' // Default time if missing
        startDateTime = new Date(`${appointment.appointment_date}T${time}`)
      } 
      // If it's a combined datetime field
      else if (appointment.datetime || appointment.start_time) {
        startDateTime = new Date(appointment.datetime || appointment.start_time)
      }
      // Fallback to current time + 1 day for testing
      else {
        console.warn('⚠️ No valid date/time found in appointment, using default')
        startDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
      
      // Validate the date
      if (isNaN(startDateTime.getTime())) {
        console.warn('⚠️ Invalid date generated, using fallback')
        startDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    } catch (error) {
      console.error('Date parsing error:', error)
      startDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
    
    const endDateTime = new Date(startDateTime.getTime() + (appointment.duration || 60) * 60000)

    return {
      title: `${appointment.service_name || 'Appointment'} - ${appointment.customers?.first_name || 'Customer'}`,
      description: appointment.notes || '',
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      customerName: `${appointment.customers?.first_name || ''} ${appointment.customers?.last_name || ''}`.trim(),
      customerEmail: appointment.customers?.email,
      customerPhone: appointment.customers?.phone,
      barbershopName: appointment.barbershops?.name,
      barbershopAddress: appointment.barbershops?.address,
      barberName: `${appointment.barbershop_staff?.first_name || ''} ${appointment.barbershop_staff?.last_name || ''}`.trim(),
      serviceName: appointment.service_name || 'Appointment',
      bookingId: appointment.id,
      timeZone: appointment.barbershops?.timezone || 'America/New_York'
    }
  }

  /**
   * Build event description for calendar
   */
  buildEventDescription(data) {
    let description = ''

    if (data.description) {
      description += `${data.description}\n\n`
    }

    description += `Customer: ${data.customerName}\n`
    
    if (data.customerEmail) {
      description += `Email: ${data.customerEmail}\n`
    }
    
    if (data.customerPhone) {
      description += `Phone: ${data.customerPhone}\n`
    }

    description += `\nBarber: ${data.barberName}\n`
    description += `Service: ${data.serviceName}\n`
    description += `Location: ${data.barbershopName}\n`
    description += `\nBooking ID: ${data.bookingId}`

    return description
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(userId) {
    try {
      const tokens = await this.getStoredTokens(userId)
      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available')
      }

      this.oauth2Client.setCredentials(tokens)
      const { credentials } = await this.oauth2Client.refreshAccessToken()

      // Update stored tokens
      await supabase
        .from('calendar_integrations')
        .update({
          access_token: encryptionService.encryptToken(credentials.access_token, 'access_token'),
          token_expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('provider', 'google')

      return true

    } catch (error) {
      console.error('Error refreshing tokens:', error)
      
      // Mark integration as inactive if refresh fails
      await supabase
        .from('calendar_integrations')
        .update({
          is_active: false,
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('provider', 'google')

      throw error
    }
  }


  /**
   * Get service health status
   */
  async getServiceHealth() {
    return {
      service: 'calendar-integration',
      status: this.initialized ? 'healthy' : 'not_configured',
      providers: {
        google: {
          configured: !!process.env.GOOGLE_CLIENT_ID,
          initialized: this.initialized
        }
      },
      features: {
        appointment_sync: true,
        ical_export: true,
        event_management: true,
        oauth_flow: true
      }
    }
  }
}

const calendarIntegrationService = new CalendarIntegrationService()

export {
  calendarIntegrationService,
  CalendarIntegrationService
}