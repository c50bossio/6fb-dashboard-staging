/**
 * Google Calendar Integration Service
 * Handles appointment sync, calendar management, and iCal export
 */

const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')
const ical = require('ical-generator')

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
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️ Google Calendar credentials not configured')
        return
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
      )

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
      this.initialized = true
      console.log('📅 Calendar Integration Service initialized')

    } catch (error) {
      console.error('❌ Failed to initialize Calendar service:', error)
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
          access_token: this.encryptToken(tokens.access_token),
          refresh_token: this.encryptToken(tokens.refresh_token),
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
        access_token: this.decryptToken(data.access_token),
        refresh_token: this.decryptToken(data.refresh_token),
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
    try {
      await this.setupAuthForUser(userId)

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
            service_name: serviceName
          }
        }
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all'
      })

      // Store calendar event ID in database
      await supabase
        .from('bookings')
        .update({
          google_calendar_event_id: response.data.id,
          calendar_synced: true,
          calendar_synced_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      return {
        success: true,
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        message: 'Appointment added to Google Calendar'
      }

    } catch (error) {
      console.error('Error creating calendar event:', error)
      
      // Handle specific Google API errors
      if (error.code === 401) {
        await this.refreshTokens(userId)
        // Retry once after token refresh
        return this.createAppointmentEvent(userId, appointmentData)
      }

      throw error
    }
  }

  /**
   * Update calendar event for appointment
   */
  async updateAppointmentEvent(userId, eventId, appointmentData) {
    try {
      await this.setupAuthForUser(userId)

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

      return {
        success: true,
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        message: 'Appointment updated in Google Calendar'
      }

    } catch (error) {
      console.error('Error updating calendar event:', error)
      
      if (error.code === 401) {
        await this.refreshTokens(userId)
        return this.updateAppointmentEvent(userId, eventId, appointmentData)
      }

      throw error
    }
  }

  /**
   * Delete calendar event for appointment
   */
  async deleteAppointmentEvent(userId, eventId) {
    try {
      await this.setupAuthForUser(userId)

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      })

      return {
        success: true,
        message: 'Appointment removed from Google Calendar'
      }

    } catch (error) {
      console.error('Error deleting calendar event:', error)
      
      if (error.code === 401) {
        await this.refreshTokens(userId)
        return this.deleteAppointmentEvent(userId, eventId)
      }

      throw error
    }
  }

  /**
   * Sync all appointments to calendar
   */
  async syncAllAppointments(userId, barbershopId) {
    try {
      // Get all confirmed appointments for the barbershop
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
        throw error
      }

      const results = []

      for (const appointment of appointments || []) {
        try {
          const appointmentData = this.buildAppointmentData(appointment)
          const result = await this.createAppointmentEvent(userId, appointmentData)
          results.push({ bookingId: appointment.id, success: true, result })
        } catch (error) {
          console.error(`Failed to sync appointment ${appointment.id}:`, error)
          results.push({ bookingId: appointment.id, success: false, error: error.message })
        }
      }

      return {
        success: true,
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      }

    } catch (error) {
      console.error('Error syncing appointments:', error)
      throw error
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
    const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
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
          access_token: this.encryptToken(credentials.access_token),
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
   * Simple token encryption (replace with proper encryption in production)
   */
  encryptToken(token) {
    if (!token) return null
    // In production, use proper encryption with a secret key
    return Buffer.from(token).toString('base64')
  }

  /**
   * Simple token decryption (replace with proper decryption in production)
   */
  decryptToken(encryptedToken) {
    if (!encryptedToken) return null
    // In production, use proper decryption with a secret key
    return Buffer.from(encryptedToken, 'base64').toString('utf-8')
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

module.exports = {
  calendarIntegrationService,
  CalendarIntegrationService
}