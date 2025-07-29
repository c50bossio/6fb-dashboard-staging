/**
 * Sync Orchestrator Service
 * Manages data synchronization across all connected booking platforms
 * Handles conflict resolution, rate limiting, and unified data normalization
 */

import sqlite3 from 'sqlite3'
import { promisify } from 'util'
import GoogleCalendarAdapter from '../lib/adapters/google-calendar-adapter.js'

const DATABASE_PATH = process.env.DATABASE_PATH || '/Users/bossio/6FB AI Agent System/agent_system.db'

// Rate limiting configuration
const RATE_LIMITS = {
  google: { requests: 1000, window: 60 * 60 * 1000 }, // 1000 requests per hour
  trafft: { requests: 100, window: 60 * 1000 },        // 100 requests per minute
  acuity: { requests: 300, window: 60 * 60 * 1000 },   // 300 requests per hour
  square: { requests: 500, window: 60 * 60 * 1000 },   // 500 requests per hour
  booksy: { requests: 50, window: 60 * 1000 },         // 50 requests per minute
  generic: { requests: 10, window: 60 * 1000 }         // 10 requests per minute
}

// Sync priorities
const SYNC_PRIORITIES = {
  high: 1,    // Real-time sync (webhooks)
  medium: 2,  // Regular sync (hourly)
  low: 3      // Background sync (daily)
}

class SyncOrchestrator {
  constructor() {
    this.db = null
    this.rateLimitTrackers = new Map()
    this.activeSyncs = new Map()
    this.adapters = new Map()
    this.conflictResolvers = new Map()
    
    this.initializeAdapters()
    this.initializeConflictResolvers()
  }

  /**
   * Initialize database connection
   */
  initDatabase() {
    if (!this.db) {
      this.db = new sqlite3.Database(DATABASE_PATH)
      this.db.getAsync = promisify(this.db.get.bind(this.db))
      this.db.allAsync = promisify(this.db.all.bind(this.db))
      this.db.runAsync = promisify(this.db.run.bind(this.db))
    }
    return this.db
  }

  /**
   * Initialize platform adapters
   */
  initializeAdapters() {
    this.adapters.set('google', new GoogleCalendarAdapter())
    // Additional adapters would be initialized here
    // this.adapters.set('trafft', new TrafftAdapter())
    // this.adapters.set('acuity', new AcuityAdapter())
    // etc.
  }

  /**
   * Initialize conflict resolution strategies
   */
  initializeConflictResolvers() {
    // Last-write-wins strategy
    this.conflictResolvers.set('last_write_wins', (existing, incoming) => {
      return new Date(incoming.metadata.lastModified) > new Date(existing.metadata.lastModified) 
        ? incoming : existing
    })

    // Platform priority strategy (Trafft > Google > Others)
    this.conflictResolvers.set('platform_priority', (existing, incoming) => {
      const priorities = { trafft: 1, google: 2, square: 3, acuity: 4, booksy: 5, generic: 6 }
      const existingPriority = priorities[existing.platformId] || 999
      const incomingPriority = priorities[incoming.platformId] || 999
      
      return incomingPriority < existingPriority ? incoming : existing
    })

    // Revenue-based priority (appointments with higher revenue win)
    this.conflictResolvers.set('revenue_priority', (existing, incoming) => {
      return (incoming.payment?.total || 0) > (existing.payment?.total || 0) ? incoming : existing
    })
  }

  /**
   * Orchestrate sync for all active integrations of a barbershop
   */
  async orchestrateSync(barbershopId, options = {}) {
    const db = this.initDatabase()
    
    try {
      const {
        platforms = null,       // Specific platforms to sync
        syncType = 'incremental', // 'full' or 'incremental'
        priority = 'medium',    // 'high', 'medium', 'low'
        conflictStrategy = 'platform_priority'
      } = options

      // Get active integrations
      let whereClause = 'barbershop_id = ? AND is_active = 1'
      let params = [barbershopId]
      
      if (platforms && platforms.length > 0) {
        whereClause += ` AND platform IN (${platforms.map(() => '?').join(',')})`
        params.push(...platforms)
      }

      const integrations = await db.allAsync(`
        SELECT * FROM integrations WHERE ${whereClause}
        ORDER BY 
          CASE platform 
            WHEN 'trafft' THEN 1 
            WHEN 'google' THEN 2 
            ELSE 3 
          END
      `, params)

      if (integrations.length === 0) {
        return {
          success: true,
          message: 'No active integrations to sync',
          results: []
        }
      }

      // Start sync for each integration
      const syncResults = []
      const syncPromises = integrations.map(async (integration) => {
        try {
          const result = await this.syncIntegration(integration, {
            syncType,
            priority,
            conflictStrategy
          })
          
          syncResults.push({
            integrationId: integration.id,
            platform: integration.platform,
            success: true,
            ...result
          })
        } catch (error) {
          console.error(`Sync failed for ${integration.platform}:`, error)
          
          syncResults.push({
            integrationId: integration.id,
            platform: integration.platform,
            success: false,
            error: error.message
          })
          
          // Update integration with error
          await this.updateIntegrationError(integration.id, error.message)
        }
      })

      await Promise.all(syncPromises)

      // Process conflicts and merge data
      const mergedData = await this.processConflictsAndMerge(
        barbershopId, 
        syncResults.filter(r => r.success),
        conflictStrategy
      )

      // Update business context
      await this.updateBusinessContext(barbershopId, mergedData)

      return {
        success: true,
        syncedIntegrations: syncResults.length,
        successfulSyncs: syncResults.filter(r => r.success).length,
        failedSyncs: syncResults.filter(r => !r.success).length,
        totalAppointments: mergedData.totalAppointments,
        totalRevenue: mergedData.totalRevenue,
        conflicts: mergedData.conflicts,
        results: syncResults
      }

    } catch (error) {
      console.error('Orchestration error:', error)
      throw error
    }
  }

  /**
   * Sync a single integration
   */
  async syncIntegration(integration, options = {}) {
    const { syncType, priority } = options
    const platform = integration.platform
    
    // Check rate limits
    if (!await this.checkRateLimit(platform)) {
      throw new Error(`Rate limit exceeded for platform: ${platform}`)
    }

    // Check if sync is already in progress
    const syncKey = `${integration.barbershop_id}-${integration.id}`
    if (this.activeSyncs.has(syncKey)) {
      throw new Error(`Sync already in progress for integration: ${integration.id}`)
    }

    this.activeSyncs.set(syncKey, Date.now())

    try {
      // Get the adapter for this platform
      const adapter = this.adapters.get(platform)
      if (!adapter) {
        throw new Error(`No adapter found for platform: ${platform}`)
      }

      // Set adapter credentials from integration
      const credentials = integration.credentials ? JSON.parse(integration.credentials) : null
      if (credentials) {
        adapter.setCredentials(credentials)
      }

      // Determine date range for sync
      const dateRange = this.getSyncDateRange(integration, syncType)
      
      // Fetch appointments from the platform
      const rawAppointments = await adapter.fetchAppointments(
        integration.barbershop_id, 
        dateRange
      )

      // Normalize appointments to unified schema
      const normalizedAppointments = []
      for (const rawAppointment of rawAppointments) {
        try {
          const normalized = await adapter.normalizeAppointment(
            rawAppointment, 
            integration.barbershop_id
          )
          normalizedAppointments.push(normalized)
        } catch (error) {
          console.warn(`Failed to normalize appointment from ${platform}:`, error)
        }
      }

      // Store appointments in database
      const storedCount = await this.storeAppointments(
        integration.barbershop_id,
        normalizedAppointments,
        integration.id
      )

      // Update integration sync status
      await this.updateIntegrationSyncStatus(integration.id, {
        lastSyncAt: new Date().toISOString(),
        lastSyncError: null,
        totalAppointments: storedCount
      })

      // Update rate limit tracker
      this.updateRateLimit(platform)

      return {
        totalFetched: rawAppointments.length,
        totalNormalized: normalizedAppointments.length,
        totalStored: storedCount,
        dateRange,
        syncType
      }

    } finally {
      this.activeSyncs.delete(syncKey)
    }
  }

  /**
   * Check rate limits for a platform
   */
  async checkRateLimit(platform) {
    const limit = RATE_LIMITS[platform]
    if (!limit) return true

    const tracker = this.rateLimitTrackers.get(platform) || { requests: 0, windowStart: Date.now() }
    const now = Date.now()

    // Reset window if expired
    if (now - tracker.windowStart > limit.window) {
      tracker.requests = 0
      tracker.windowStart = now
    }

    // Check if we're within limits
    if (tracker.requests >= limit.requests) {
      console.warn(`Rate limit exceeded for ${platform}: ${tracker.requests}/${limit.requests}`)
      return false
    }

    return true
  }

  /**
   * Update rate limit tracker
   */
  updateRateLimit(platform) {
    const tracker = this.rateLimitTrackers.get(platform) || { requests: 0, windowStart: Date.now() }
    tracker.requests += 1
    this.rateLimitTrackers.set(platform, tracker)
  }

  /**
   * Get sync date range based on integration and sync type
   */
  getSyncDateRange(integration, syncType) {
    const now = new Date()
    let dateFrom, dateTo = now.toISOString()

    if (syncType === 'full') {
      // Full sync: get all data from the beginning
      dateFrom = new Date(integration.created_at).toISOString()
    } else {
      // Incremental sync: get data since last sync
      const lastSync = integration.last_sync_at 
        ? new Date(integration.last_sync_at)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Default: last 7 days
      
      dateFrom = lastSync.toISOString()
    }

    return { dateFrom, dateTo }
  }

  /**
   * Store normalized appointments in database
   */
  async storeAppointments(barbershopId, appointments, integrationId) {
    const db = this.initDatabase()
    let storedCount = 0

    for (const appointment of appointments) {
      try {
        // Check if appointment already exists
        const existing = await db.getAsync(`
          SELECT id FROM unified_appointments 
          WHERE barbershop_id = ? AND external_id = ? AND platform_id = ?
        `, [barbershopId, appointment.externalId, appointment.platformId])

        if (existing) {
          // Update existing appointment
          await db.runAsync(`
            UPDATE unified_appointments SET
              client_data = ?,
              service_data = ?,
              staff_data = ?,
              scheduling_data = ?,
              business_data = ?,
              payment_data = ?,
              feedback_data = ?,
              metadata = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `, [
            JSON.stringify(appointment.client),
            JSON.stringify(appointment.service),
            JSON.stringify(appointment.staff),
            JSON.stringify(appointment.scheduling),
            JSON.stringify(appointment.business),
            JSON.stringify(appointment.payment),
            JSON.stringify(appointment.feedback),
            JSON.stringify(appointment.metadata),
            existing.id
          ])
        } else {
          // Insert new appointment
          await db.runAsync(`
            INSERT INTO unified_appointments (
              barbershop_id, external_id, platform_id, integration_id,
              client_data, service_data, staff_data, scheduling_data,
              business_data, payment_data, feedback_data, metadata,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, [
            barbershopId,
            appointment.externalId,
            appointment.platformId,
            integrationId,
            JSON.stringify(appointment.client),
            JSON.stringify(appointment.service),
            JSON.stringify(appointment.staff),
            JSON.stringify(appointment.scheduling),
            JSON.stringify(appointment.business),
            JSON.stringify(appointment.payment),
            JSON.stringify(appointment.feedback),
            JSON.stringify(appointment.metadata)
          ])
        }

        storedCount++
      } catch (error) {
        console.error('Error storing appointment:', error)
      }
    }

    return storedCount
  }

  /**
   * Process conflicts and merge data from multiple platforms
   */
  async processConflictsAndMerge(barbershopId, syncResults, conflictStrategy) {
    const db = this.initDatabase()
    
    // Get potential conflicts (appointments with same client/time from different platforms)
    const conflicts = await db.allAsync(`
      SELECT 
        a1.id as id1, a1.platform_id as platform1, a1.external_id as external1,
        a2.id as id2, a2.platform_id as platform2, a2.external_id as external2,
        a1.client_data, a1.scheduling_data
      FROM unified_appointments a1
      JOIN unified_appointments a2 ON (
        a1.barbershop_id = a2.barbershop_id AND
        a1.id < a2.id AND
        json_extract(a1.client_data, '$.email') = json_extract(a2.client_data, '$.email') AND
        json_extract(a1.scheduling_data, '$.dateTime') = json_extract(a2.scheduling_data, '$.dateTime')
      )
      WHERE a1.barbershop_id = ?
    `, [barbershopId])

    // Resolve conflicts using the specified strategy
    const resolver = this.conflictResolvers.get(conflictStrategy)
    const resolvedConflicts = []

    for (const conflict of conflicts) {
      try {
        // Get full appointment data for both conflicting records
        const appointment1 = await this.getFullAppointment(conflict.id1)
        const appointment2 = await this.getFullAppointment(conflict.id2)

        // Resolve conflict
        const winner = resolver ? resolver(appointment1, appointment2) : appointment1
        const loser = winner.id === appointment1.id ? appointment2 : appointment1

        // Mark loser as duplicate
        await db.runAsync(`
          UPDATE unified_appointments 
          SET metadata = json_set(metadata, '$.isDuplicate', true, '$.duplicateOf', ?)
          WHERE id = ?
        `, [winner.id, loser.id])

        resolvedConflicts.push({
          conflictType: 'duplicate_appointment',
          winner: { id: winner.id, platform: winner.platformId },
          loser: { id: loser.id, platform: loser.platformId },
          strategy: conflictStrategy
        })
      } catch (error) {
        console.error('Error resolving conflict:', error)
      }
    }

    // Calculate merged statistics
    const stats = await db.getAsync(`
      SELECT 
        COUNT(*) as totalAppointments,
        COUNT(DISTINCT json_extract(client_data, '$.email')) as uniqueClients,
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as totalRevenue
      FROM unified_appointments 
      WHERE barbershop_id = ? AND json_extract(metadata, '$.isDuplicate') IS NULL
    `, [barbershopId])

    return {
      totalAppointments: stats.totalAppointments || 0,
      uniqueClients: stats.uniqueClients || 0,
      totalRevenue: stats.totalRevenue || 0.0,
      conflicts: resolvedConflicts
    }
  }

  /**
   * Get full appointment data
   */
  async getFullAppointment(appointmentId) {
    const db = this.initDatabase()
    
    const appointment = await db.getAsync(`
      SELECT * FROM unified_appointments WHERE id = ?
    `, [appointmentId])

    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`)
    }

    return {
      id: appointment.id,
      externalId: appointment.external_id,
      platformId: appointment.platform_id,
      client: JSON.parse(appointment.client_data),
      service: JSON.parse(appointment.service_data),
      staff: JSON.parse(appointment.staff_data),
      scheduling: JSON.parse(appointment.scheduling_data),
      business: JSON.parse(appointment.business_data),
      payment: JSON.parse(appointment.payment_data),
      feedback: JSON.parse(appointment.feedback_data),
      metadata: JSON.parse(appointment.metadata)
    }
  }

  /**
   * Update business context for AI agents
   */
  async updateBusinessContext(barbershopId, mergedData) {
    const db = this.initDatabase()
    
    try {
      // Generate business insights from merged data
      const insights = await this.generateBusinessInsights(barbershopId, mergedData)
      
      // Update business context in database
      await db.runAsync(`
        INSERT OR REPLACE INTO business_context (
          barbershop_id, context_type, context_data, generated_at
        ) VALUES (?, 'sync_summary', ?, datetime('now'))
      `, [barbershopId, JSON.stringify(insights)])

      console.log(`Updated business context for barbershop ${barbershopId}`)
    } catch (error) {
      console.error('Error updating business context:', error)
    }
  }

  /**
   * Generate business insights from merged data
   */
  async generateBusinessInsights(barbershopId, mergedData) {
    const db = this.initDatabase()
    
    // Get recent appointment trends
    const recentAppointments = await db.allAsync(`
      SELECT 
        json_extract(scheduling_data, '$.dateTime') as appointment_date,
        json_extract(service_data, '$.category') as service_category,
        json_extract(payment_data, '$.total') as revenue
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', '-30 days')
      ORDER BY appointment_date DESC
    `, [barbershopId])

    // Calculate insights
    const totalRevenue = recentAppointments.reduce((sum, apt) => sum + (parseFloat(apt.revenue) || 0), 0)
    const avgRevenuePerAppointment = recentAppointments.length > 0 
      ? totalRevenue / recentAppointments.length 
      : 0

    // Popular services
    const serviceCount = {}
    recentAppointments.forEach(apt => {
      const category = apt.service_category || 'unknown'
      serviceCount[category] = (serviceCount[category] || 0) + 1
    })

    const popularServices = Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([service, count]) => ({ service, count }))

    return {
      period: 'last_30_days',
      totalAppointments: recentAppointments.length,
      totalRevenue: totalRevenue,
      averageRevenuePerAppointment: avgRevenuePerAppointment,
      popularServices,
      syncTimestamp: new Date().toISOString(),
      conflicts: mergedData.conflicts?.length || 0
    }
  }

  /**
   * Update integration sync status
   */
  async updateIntegrationSyncStatus(integrationId, status) {
    const db = this.initDatabase()
    
    await db.runAsync(`
      UPDATE integrations SET
        last_sync_at = ?,
        last_sync_error = ?,
        next_sync_at = datetime('now', '+4 hours'),
        updated_at = datetime('now')
      WHERE id = ?
    `, [status.lastSyncAt, status.lastSyncError, integrationId])

    // Update integration stats
    if (status.totalAppointments !== undefined) {
      await db.runAsync(`
        INSERT OR REPLACE INTO integration_stats (
          integration_id, total_appointments, last_updated
        ) VALUES (?, ?, datetime('now'))
      `, [integrationId, status.totalAppointments])
    }
  }

  /**
   * Update integration error status
   */
  async updateIntegrationError(integrationId, errorMessage) {
    const db = this.initDatabase()
    
    await db.runAsync(`
      UPDATE integrations SET
        last_sync_error = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [errorMessage, integrationId])
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Export singleton instance
const syncOrchestrator = new SyncOrchestrator()
export default syncOrchestrator