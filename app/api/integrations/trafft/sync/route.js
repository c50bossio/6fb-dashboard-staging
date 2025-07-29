/**
 * Traft Data Sync Route
 * Fetches appointment data from Traft and stores normalized data
 */

import { NextResponse } from 'next/server'
import { createTrafftClient } from '../../../../../services/integrations/trafft-service.js'
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
 * POST /api/integrations/trafft/sync
 * Sync appointment data from Traft
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
        [integrationId, 'trafft']
      )
    } else {
      integration = await db.getAsync(
        'SELECT * FROM integrations WHERE barbershop_id = ? AND platform = ? AND is_active = 1',
        [barbershopId, 'trafft']
      )
    }

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Traft integration not found or inactive' },
        { status: 404 }
      )
    }

    // Initialize Traft service with stored credentials
    const credentials = JSON.parse(integration.credentials)
    const trafftClient = createTrafftClient(credentials.apiKey, credentials.apiSecret, credentials.baseUrl)

    // Test connection first
    const connectionTest = await trafftClient.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to connect to Traft API. Please check credentials.' },
        { status: 401 }
      )
    }

    // Determine sync date range
    let startDate, endDate
    if (dateRange) {
      startDate = dateRange.start.split('T')[0]
      endDate = dateRange.end.split('T')[0]
    } else if (syncType === 'full') {
      // Full sync: last 30 days + next 90 days
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } else {
      // Incremental sync: from last sync or last 7 days + next 30 days
      const lastSync = integration.last_sync_at ? new Date(integration.last_sync_at) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      startDate = lastSync.toISOString().split('T')[0]
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    // Get locations for multi-location sync
    const locations = await trafftClient.getLocations()
    let allAppointments = []
    const syncResults = []

    // Sync appointments from all active locations
    const locationsToSync = locations.filter(loc => loc.isActive)
    
    if (locationsToSync.length === 0) {
      // If no specific locations, sync without location filter
      locationsToSync.push({ id: null, name: 'All Locations' })
    }

    for (const location of locationsToSync) {
      try {
        const appointmentsResponse = await trafftClient.getAppointments({
          locationId: location.id,
          startDate,
          endDate,
          limit: 250
        })

        const appointments = appointmentsResponse.appointments || []
        allAppointments = allAppointments.concat(appointments)
        
        syncResults.push({
          locationId: location.id,
          locationName: location.name,
          appointmentsCount: appointments.length,
          success: true
        })
      } catch (locationError) {
        console.error(`Error syncing location ${location.id}:`, locationError)
        syncResults.push({
          locationId: location.id,
          locationName: location.name,
          appointmentsCount: 0,
          success: false,
          error: locationError.message
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
          platform: 'trafft',
          platform_appointment_id: appointment.platformEventId,
          title: appointment.title,
          description: appointment.description,
          start_time: appointment.startTime,
          end_time: appointment.endTime,
          duration_minutes: appointment.duration,
          location: appointment.location,
          status: appointment.status,
          attendees: JSON.stringify(appointment.attendees),
          metadata: JSON.stringify({
            ...appointment.metadata,
            serviceName: appointment.serviceName,
            servicePrice: appointment.servicePrice,
            staffName: appointment.staffName,
            customerName: appointment.customerName,
            locationId: appointment.locationId
          }),
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

    // Get analytics if requested
    let analytics = null
    if (syncType === 'full') {
      try {
        analytics = await trafftClient.getAnalytics({
          startDate,
          endDate
        })
      } catch (analyticsError) {
        console.warn('Analytics not available:', analyticsError.message)
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
        dateRange: { startDate, endDate },
        locationsSync: syncResults,
        appointmentsSynced: syncedCount,
        appointmentsUpdated: updatedCount,
        totalAppointments: allAppointments.length,
        analytics: analytics,
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
    console.error('Error syncing Traft:', error)
    
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
        error: 'Failed to sync Traft data',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * GET /api/integrations/trafft/sync
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
        [integrationId, 'trafft']
      )
    } else {
      integration = await db.getAsync(
        'SELECT * FROM integrations WHERE barbershop_id = ? AND platform = ? AND is_active = 1',
        [barbershopId, 'trafft']
      )
    }

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Traft integration not found' },
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
    console.error('Error getting Traft sync status:', error)
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