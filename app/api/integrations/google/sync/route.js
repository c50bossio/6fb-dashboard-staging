/**
 * Google Calendar Data Sync Route
 * Fetches appointment data from Google Calendar and stores normalized data
 */

import { NextResponse } from 'next/server'
import GoogleCalendarService from '../../../../../services/integrations/google-calendar-service.js'
import sqlite3 from 'sqlite3'
import { promisify } from 'util'

const DATABASE_PATH = process.env.DATABASE_PATH || '/Users/bossio/6FB AI Agent System/agent_system.db'

function initDatabase() {
  const db = new sqlite3.Database(DATABASE_PATH)
  db.getAsync = promisify(db.get.bind(db))
  db.allAsync = promisify(db.all.bind(db))
  db.runAsync = promisify(db.run.bind(db))
  return db
}

/**
 * POST /api/integrations/google/sync
 * Sync appointment data from Google Calendar
 */
export async function POST(request) {
  const db = initDatabase()
  
  try {
    const { integrationId, barbershopId, syncType = 'incremental', dateRange } = await request.json()

    if (!integrationId && !barbershopId) {
      return NextResponse.json(
        { success: false, error: 'Either integrationId or barbershopId is required' },
        { status: 400 }
      )
    }

    // Get integration details
    let integration
    if (integrationId) {
      integration = await db.getAsync(
        'SELECT * FROM integrations WHERE id = ? AND platform = ?',
        [integrationId, 'google_calendar']
      )
    } else {
      integration = await db.getAsync(
        'SELECT * FROM integrations WHERE barbershop_id = ? AND platform = ? AND is_active = 1',
        [barbershopId, 'google_calendar']
      )
    }

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar integration not found or inactive' },
        { status: 404 }
      )
    }

    // Initialize Google Calendar service with stored credentials
    const googleService = new GoogleCalendarService()
    const credentials = JSON.parse(integration.credentials)
    
    // Check if token needs refresh
    const now = Date.now()
    if (credentials.expires_at && now >= credentials.expires_at - 300000) { // 5 minutes buffer
      try {
        googleService.setCredentials(credentials)
        const refreshedTokens = await googleService.refreshAccessToken()
        
        // Update stored credentials
        const updatedCredentials = { ...credentials, ...refreshedTokens }
        await db.runAsync(
          'UPDATE integrations SET credentials = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(updatedCredentials), new Date().toISOString(), integration.id]
        )
        
        googleService.setCredentials(updatedCredentials)
      } catch (refreshError) {
        console.error('Failed to refresh Google Calendar token:', refreshError)
        return NextResponse.json(
          { success: false, error: 'Failed to refresh access token. Re-authorization may be required.' },
          { status: 401 }
        )
      }
    } else {
      googleService.setCredentials(credentials)
    }

    // Determine sync date range
    let timeMin, timeMax
    if (dateRange) {
      timeMin = dateRange.start
      timeMax = dateRange.end
    } else if (syncType === 'full') {
      // Full sync: last 30 days + next 90 days
      timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      // Incremental sync: from last sync or last 7 days + next 30 days
      const lastSync = integration.last_sync_at ? new Date(integration.last_sync_at) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      timeMin = lastSync.toISOString()
      timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Get calendars and fetch appointments
    const calendars = await googleService.getCalendarList()
    const primaryCalendar = calendars.find(cal => cal.primary)
    
    let allAppointments = []
    const syncResults = []

    // Sync from primary calendar and any additional selected calendars
    const calendarsToSync = calendars.filter(cal => cal.primary || cal.accessRole === 'owner')
    
    for (const calendar of calendarsToSync) {
      try {
        const appointments = await googleService.getAppointments({
          calendarId: calendar.id,
          timeMin,
          timeMax,
          maxResults: 250
        })

        allAppointments = allAppointments.concat(appointments)
        syncResults.push({
          calendarId: calendar.id,
          calendarName: calendar.name,
          appointmentsCount: appointments.length,
          success: true
        })
      } catch (calendarError) {
        console.error(`Error syncing calendar ${calendar.id}:`, calendarError)
        syncResults.push({
          calendarId: calendar.id,
          calendarName: calendar.name,
          appointmentsCount: 0,
          success: false,
          error: calendarError.message
        })
      }
    }

    // Store normalized appointments
    let syncedCount = 0
    let updatedCount = 0
    let errors = []

    for (const appointment of allAppointments) {
      try {
        // Check if appointment already exists
        const existingAppointment = await db.getAsync(
          'SELECT id FROM appointments WHERE integration_id = ? AND platform_appointment_id = ?',
          [integration.id, appointment.platformEventId]
        )

        const appointmentData = {
          integration_id: integration.id,
          barbershop_id: integration.barbershop_id,
          platform: 'google_calendar',
          platform_appointment_id: appointment.platformEventId,
          title: appointment.title,
          description: appointment.description,
          start_time: appointment.startTime,
          end_time: appointment.endTime,
          duration_minutes: appointment.duration,
          location: appointment.location,
          status: appointment.status,
          attendees: JSON.stringify(appointment.attendees),
          metadata: JSON.stringify(appointment.metadata),
          created_at: appointment.created,
          updated_at: appointment.updated,
          synced_at: new Date().toISOString()
        }

        if (existingAppointment) {
          // Update existing appointment
          await db.runAsync(`
            UPDATE appointments SET
              title = ?, description = ?, start_time = ?, end_time = ?, duration_minutes = ?,
              location = ?, status = ?, attendees = ?, metadata = ?, updated_at = ?, synced_at = ?
            WHERE integration_id = ? AND platform_appointment_id = ?
          `, [
            appointmentData.title, appointmentData.description, appointmentData.start_time,
            appointmentData.end_time, appointmentData.duration_minutes, appointmentData.location,
            appointmentData.status, appointmentData.attendees, appointmentData.metadata,
            appointmentData.updated_at, appointmentData.synced_at,
            appointmentData.integration_id, appointmentData.platform_appointment_id
          ])
          updatedCount++
        } else {
          // Insert new appointment
          await db.runAsync(`
            INSERT INTO appointments (
              integration_id, barbershop_id, platform, platform_appointment_id,
              title, description, start_time, end_time, duration_minutes, location,
              status, attendees, metadata, created_at, updated_at, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            appointmentData.integration_id, appointmentData.barbershop_id, appointmentData.platform,
            appointmentData.platform_appointment_id, appointmentData.title, appointmentData.description,
            appointmentData.start_time, appointmentData.end_time, appointmentData.duration_minutes,
            appointmentData.location, appointmentData.status, appointmentData.attendees,
            appointmentData.metadata, appointmentData.created_at, appointmentData.updated_at,
            appointmentData.synced_at
          ])
          syncedCount++
        }
      } catch (appointmentError) {
        console.error('Error storing appointment:', appointmentError)
        errors.push({
          appointmentId: appointment.id,
          error: appointmentError.message
        })
      }
    }

    // Update integration sync status
    const nextSyncAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    await db.runAsync(`
      UPDATE integrations SET 
        last_sync_at = ?, 
        next_sync_at = ?, 
        updated_at = ?,
        last_sync_error = NULL
      WHERE id = ?
    `, [new Date().toISOString(), nextSyncAt, new Date().toISOString(), integration.id])

    // Update integration stats
    const totalAppointments = await db.getAsync(
      'SELECT COUNT(*) as count FROM appointments WHERE integration_id = ?',
      [integration.id]
    )

    await db.runAsync(`
      INSERT OR REPLACE INTO integration_stats (
        integration_id, total_appointments, total_customers, total_revenue, last_updated
      ) VALUES (?, ?, 0, 0.0, ?)
    `, [integration.id, totalAppointments.count, new Date().toISOString()])

    return NextResponse.json({
      success: true,
      sync: {
        syncType,
        timeRange: { timeMin, timeMax },
        calendarsSync: syncResults,
        appointmentsSynced: syncedCount,
        appointmentsUpdated: updatedCount,
        totalAppointments: allAppointments.length,
        errors: errors.length > 0 ? errors : null
      },
      integration: {
        id: integration.id,
        platform: integration.platform,
        barbershopId: integration.barbershop_id,
        lastSyncAt: new Date().toISOString(),
        nextSyncAt
      }
    })

  } catch (error) {
    console.error('Error syncing Google Calendar:', error)
    
    // Update integration with error
    if (integration) {
      await db.runAsync(
        'UPDATE integrations SET last_sync_error = ?, updated_at = ? WHERE id = ?',
        [error.message, new Date().toISOString(), integration.id]
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync Google Calendar data',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * GET /api/integrations/google/sync
 * Get sync status and recent sync history
 */
export async function GET(request) {
  const db = initDatabase()
  
  try {
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('integrationId')
    const barbershopId = searchParams.get('barbershopId')

    if (!integrationId && !barbershopId) {
      return NextResponse.json(
        { success: false, error: 'Either integrationId or barbershopId is required' },
        { status: 400 }
      )
    }

    // Get integration details
    let integration
    if (integrationId) {
      integration = await db.getAsync(
        'SELECT * FROM integrations WHERE id = ? AND platform = ?',
        [integrationId, 'google_calendar']
      )
    } else {
      integration = await db.getAsync(
        'SELECT * FROM integrations WHERE barbershop_id = ? AND platform = ? AND is_active = 1',
        [barbershopId, 'google_calendar']
      )
    }

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar integration not found' },
        { status: 404 }
      )
    }

    // Get sync statistics
    const stats = await db.getAsync(
      'SELECT * FROM integration_stats WHERE integration_id = ?',
      [integration.id]
    )

    // Get recent appointments count
    const recentAppointments = await db.getAsync(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE integration_id = ? AND synced_at > datetime('now', '-7 days')
    `, [integration.id])

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        platform: integration.platform,
        barbershopId: integration.barbershop_id,
        isActive: Boolean(integration.is_active),
        lastSyncAt: integration.last_sync_at,
        nextSyncAt: integration.next_sync_at,
        syncSchedule: integration.sync_schedule,
        lastSyncError: integration.last_sync_error
      },
      stats: {
        totalAppointments: stats?.total_appointments || 0,
        recentlySync: recentAppointments?.count || 0,
        lastUpdated: stats?.last_updated
      }
    })

  } catch (error) {
    console.error('Error getting Google Calendar sync status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get sync status',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}