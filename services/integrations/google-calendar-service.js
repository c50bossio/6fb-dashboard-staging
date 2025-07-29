/**
 * Google Calendar Integration Service
 * 
 * Provides OAuth connection and data retrieval wrapper for Google Calendar API.
 * This service connects to existing Google Calendar accounts and normalizes
 * appointment data for AI agent consumption.
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`
    )
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    this.scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ]
  }

  /**
   * Generate OAuth authorization URL for connecting Google Calendar
   */
  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent'
    })
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code)
      this.oauth2Client.setCredentials(tokens)
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope
      }
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error.message}`)
    }
  }

  /**
   * Set stored credentials for authenticated requests
   */
  setCredentials(credentials) {
    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expires_at,
      token_type: credentials.token_type
    })
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshAccessToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      return {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date,
        token_type: credentials.token_type || 'Bearer'
      }
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error.message}`)
    }
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList() {
    try {
      const response = await this.calendar.calendarList.list()
      return response.data.items?.map(calendar => ({
        id: calendar.id,
        name: calendar.summary,
        description: calendar.description,
        timezone: calendar.timeZone,
        primary: calendar.primary || false,
        accessRole: calendar.accessRole,
        colorId: calendar.colorId,
        backgroundColor: calendar.backgroundColor
      })) || []
    } catch (error) {
      throw new Error(`Failed to fetch calendar list: ${error.message}`)
    }
  }

  /**
   * Get appointments from specified calendar(s) within date range
   */
  async getAppointments(options = {}) {
    const {
      calendarId = 'primary',
      timeMin = new Date().toISOString(),
      timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      maxResults = 100,
      orderBy = 'startTime',
      singleEvents = true
    } = options

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents,
        orderBy
      })

      return response.data.items?.map(event => this.normalizeAppointment(event)) || []
    } catch (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`)
    }
  }

  /**
   * Get appointments from multiple calendars
   */
  async getAppointmentsFromMultipleCalendars(calendarIds, options = {}) {
    const appointmentPromises = calendarIds.map(calendarId =>
      this.getAppointments({ ...options, calendarId })
    )

    try {
      const results = await Promise.all(appointmentPromises)
      const allAppointments = results.flat()
      
      // Sort by start time
      return allAppointments.sort((a, b) => 
        new Date(a.startTime) - new Date(b.startTime)
      )
    } catch (error) {
      throw new Error(`Failed to fetch appointments from multiple calendars: ${error.message}`)
    }
  }

  /**
   * Get upcoming appointments (next 7 days)
   */
  async getUpcomingAppointments(calendarId = 'primary', days = 7) {
    const timeMin = new Date()
    const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    return this.getAppointments({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      orderBy: 'startTime'
    })
  }

  /**
   * Get today's appointments
   */
  async getTodaysAppointments(calendarId = 'primary') {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    return this.getAppointments({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      orderBy: 'startTime'
    })
  }

  /**
   * Normalize Google Calendar event to standard appointment format
   */
  normalizeAppointment(event) {
    const startTime = event.start?.dateTime || event.start?.date
    const endTime = event.end?.dateTime || event.end?.date
    const isAllDay = !event.start?.dateTime

    return {
      // Standard appointment fields
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      startTime: startTime,
      endTime: endTime,
      isAllDay,
      duration: isAllDay ? null : this.calculateDuration(startTime, endTime),
      
      // Location and attendees
      location: event.location || '',
      attendees: event.attendees?.map(attendee => ({
        email: attendee.email,
        name: attendee.displayName || attendee.email,
        status: attendee.responseStatus || 'needsAction'
      })) || [],
      
      // Metadata
      status: event.status || 'confirmed',
      visibility: event.visibility || 'default',
      recurring: !!event.recurringEventId,
      recurringEventId: event.recurringEventId,
      
      // Google Calendar specific
      platform: 'google_calendar',
      platformEventId: event.id,
      calendarId: event.organizer?.email,
      organizer: event.organizer ? {
        email: event.organizer.email,
        name: event.organizer.displayName || event.organizer.email
      } : null,
      
      // Timestamps
      created: event.created,
      updated: event.updated,
      
      // Additional metadata for AI context
      metadata: {
        eventType: event.eventType || 'default',
        conference: event.conferenceData ? {
          type: event.conferenceData.conferenceSolution?.name,
          url: event.conferenceData.entryPoints?.[0]?.uri
        } : null,
        attachments: event.attachments || [],
        source: event.source || null
      }
    }
  }

  /**
   * Calculate duration in minutes
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return Math.round((end - start) / (1000 * 60)) // Duration in minutes
  }

  /**
   * Test connection with stored credentials
   */
  async testConnection() {
    try {
      const calendars = await this.getCalendarList()
      return {
        success: true,
        calendarsCount: calendars.length,
        primaryCalendar: calendars.find(cal => cal.primary)?.name || 'Unknown'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get connection status and basic info
   */
  async getConnectionInfo() {
    try {
      const calendars = await this.getCalendarList()
      const primaryCalendar = calendars.find(cal => cal.primary)
      
      return {
        connected: true,
        accountEmail: primaryCalendar?.id,
        calendarsCount: calendars.length,
        timezone: primaryCalendar?.timezone,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      }
    }
  }

  /**
   * Search events by query
   */
  async searchEvents(query, options = {}) {
    const {
      calendarId = 'primary',
      timeMin = new Date().toISOString(),
      timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      maxResults = 50
    } = options

    try {
      const response = await this.calendar.events.list({
        calendarId,
        q: query,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items?.map(event => this.normalizeAppointment(event)) || []
    } catch (error) {
      throw new Error(`Failed to search events: ${error.message}`)
    }
  }
}

export default GoogleCalendarService