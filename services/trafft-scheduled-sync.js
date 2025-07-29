/**
 * Trafft Scheduled Sync Service
 * Handles periodic synchronization of data from Trafft for consistency
 */

import { createTrafftClient } from '../lib/trafft-api.js'
import {
  getIntegrationCredentials,
  createSyncOperation,
  updateSyncOperation,
  storeExternalAppointments,
  storeExternalCustomers,
  storeExternalServices,
  storeExternalEmployees,
  storeIntegrationAnalytics,
  pool
} from './trafft-database-service.js'
import cron from 'node-cron'

// Sync job configurations
const SYNC_SCHEDULES = {
  // Incremental sync every hour during business hours (8 AM - 8 PM)
  incremental: '0 8-20 * * *',
  
  // Full sync once daily at 2 AM
  full: '0 2 * * *',
  
  // Analytics sync every 30 minutes during business hours
  analytics: '*/30 8-20 * * *',
  
  // Customer sync twice daily
  customers: '0 9,17 * * *'
}

class TrafftScheduledSyncService {
  constructor() {
    this.jobs = new Map()
    this.isRunning = false
  }

  /**
   * Start all scheduled sync jobs
   */
  start() {
    if (this.isRunning) {
      console.log('Trafft scheduled sync service is already running')
      return
    }

    console.log('Starting Trafft scheduled sync service...')

    // Schedule incremental sync
    this.jobs.set('incremental', cron.schedule(SYNC_SCHEDULES.incremental, async () => {
      console.log('Running incremental sync...')
      await this.runScheduledSync('incremental')
    }, { scheduled: false }))

    // Schedule full sync
    this.jobs.set('full', cron.schedule(SYNC_SCHEDULES.full, async () => {
      console.log('Running full sync...')
      await this.runScheduledSync('full')
    }, { scheduled: false }))

    // Schedule analytics sync
    this.jobs.set('analytics', cron.schedule(SYNC_SCHEDULES.analytics, async () => {
      console.log('Running analytics sync...')
      await this.runScheduledSync('analytics')
    }, { scheduled: false }))

    // Schedule customer sync
    this.jobs.set('customers', cron.schedule(SYNC_SCHEDULES.customers, async () => {
      console.log('Running customer sync...')
      await this.runScheduledSync('customers')
    }, { scheduled: false }))

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start()
      console.log(`✅ Started ${name} sync schedule: ${SYNC_SCHEDULES[name]}`)
    })

    this.isRunning = true
    console.log('Trafft scheduled sync service started successfully')
  }

  /**
   * Stop all scheduled sync jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('Trafft scheduled sync service is not running')
      return
    }

    console.log('Stopping Trafft scheduled sync service...')

    this.jobs.forEach((job, name) => {
      job.stop()
      console.log(`❌ Stopped ${name} sync schedule`)
    })

    this.jobs.clear()
    this.isRunning = false
    console.log('Trafft scheduled sync service stopped')
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      schedules: SYNC_SCHEDULES
    }
  }

  /**
   * Run scheduled sync for all active integrations
   */
  async runScheduledSync(syncType) {
    try {
      // Get all active Trafft integrations
      const activeIntegrations = await this.getActiveIntegrations()
      
      if (activeIntegrations.length === 0) {
        console.log('No active Trafft integrations found')
        return
      }

      console.log(`Running ${syncType} sync for ${activeIntegrations.length} integrations`)

      // Process each integration
      const syncPromises = activeIntegrations.map(integration => 
        this.syncIntegration(integration, syncType)
      )

      const results = await Promise.allSettled(syncPromises)
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      console.log(`${syncType} sync completed: ${successful} successful, ${failed} failed`)

      return {
        successful,
        failed,
        results: results.map((result, index) => ({
          integration: activeIntegrations[index].barbershopId,
          status: result.status,
          error: result.status === 'rejected' ? result.reason?.message : null
        }))
      }

    } catch (error) {
      console.error(`Error running scheduled ${syncType} sync:`, error)
      throw error
    }
  }

  /**
   * Get all active Trafft integrations
   */
  async getActiveIntegrations() {
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT i.id as integration_id, i.barbershop_id, i.credentials, i.sync_settings
        FROM integrations i
        WHERE i.provider = 'trafft' 
          AND i.status = 'active'
          AND i.sync_settings->>'autoSync' = 'true'
      `)

      return result.rows.map(row => ({
        integrationId: row.integration_id,
        barbershopId: row.barbershop_id,
        credentials: row.credentials,
        syncSettings: row.sync_settings
      }))

    } catch (error) {
      console.error('Error getting active integrations:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Sync a single integration
   */
  async syncIntegration(integration, syncType) {
    let syncId = null

    try {
      // Get credentials
      const credentials = await getIntegrationCredentials(integration.barbershopId, 'trafft')
      if (!credentials) {
        throw new Error('Integration credentials not found')
      }

      // Create Trafft client
      const trafftClient = createTrafftClient(credentials.apiKey, credentials.apiSecret)

      // Determine sync date range
      const { dateFrom, dateTo } = this.getSyncDateRange(syncType)

      // Create sync operation record
      syncId = await createSyncOperation(
        integration.integrationId,
        integration.barbershopId,
        syncType,
        dateFrom,
        dateTo
      )

      // Perform sync based on type
      let syncResults = {}

      if (syncType === 'full' || syncType === 'incremental') {
        syncResults = await this.performFullSync(trafftClient, credentials, integration, dateFrom, dateTo)
      } else if (syncType === 'analytics') {
        syncResults = await this.performAnalyticsSync(trafftClient, credentials, integration, dateFrom, dateTo)
      } else if (syncType === 'customers') {
        syncResults = await this.performCustomerSync(trafftClient, credentials, integration)
      }

      // Calculate success metrics
      const totalRecords = Object.values(syncResults).reduce((sum, result) => sum + (result?.total || 0), 0)
      const successRecords = Object.values(syncResults).reduce((sum, result) => sum + (result?.stored?.success || 0), 0)

      // Update sync operation with success
      await updateSyncOperation(syncId, 'success', {
        recordsProcessed: totalRecords,
        recordsSuccess: successRecords,
        recordsFailed: totalRecords - successRecords,
        summary: this.createSyncSummary(syncResults)
      })

      console.log(`✅ ${syncType} sync completed for ${integration.barbershopId}:`, {
        records: totalRecords,
        success: successRecords
      })

      return {
        integrationId: integration.integrationId,
        barbershopId: integration.barbershopId,
        syncType,
        success: true,
        records: totalRecords,
        successRate: totalRecords > 0 ? (successRecords / totalRecords) * 100 : 100
      }

    } catch (error) {
      console.error(`❌ ${syncType} sync failed for ${integration.barbershopId}:`, error)

      // Update sync operation with error
      if (syncId) {
        await updateSyncOperation(syncId, 'failed', {
          errors: [{ error: error.message, timestamp: new Date().toISOString() }]
        })
      }

      throw error
    }
  }

  /**
   * Perform full/incremental sync
   */
  async performFullSync(trafftClient, credentials, integration, dateFrom, dateTo) {
    const results = {}

    // Sync appointments
    console.log(`Syncing appointments for ${integration.barbershopId}...`)
    const appointments = await trafftClient.getAppointments({
      dateFrom,
      dateTo,
      status: 'all'
    })
    const appointmentData = appointments.data || appointments || []
    
    results.appointments = {
      total: appointmentData.length,
      data: appointmentData,
      stored: await storeExternalAppointments(
        integration.integrationId,
        integration.barbershopId,
        appointmentData
      )
    }

    // Sync customers
    console.log(`Syncing customers for ${integration.barbershopId}...`)
    const customers = await trafftClient.getCustomers()
    const customerData = customers.data || customers || []
    
    results.customers = {
      total: customerData.length,
      data: customerData,
      stored: await storeExternalCustomers(
        integration.integrationId,
        integration.barbershopId,
        customerData
      )
    }

    // Sync services
    console.log(`Syncing services for ${integration.barbershopId}...`)
    const services = await trafftClient.getServices()
    const serviceData = services.data || services || []
    
    results.services = {
      total: serviceData.length,
      data: serviceData,
      stored: await storeExternalServices(
        integration.integrationId,
        integration.barbershopId,
        serviceData
      )
    }

    // Sync employees
    console.log(`Syncing employees for ${integration.barbershopId}...`)
    const employees = await trafftClient.getEmployees()
    const employeeData = employees.data || employees || []
    
    results.employees = {
      total: employeeData.length,
      data: employeeData,
      stored: await storeExternalEmployees(
        integration.integrationId,
        integration.barbershopId,
        employeeData
      )
    }

    return results
  }

  /**
   * Perform analytics-only sync
   */
  async performAnalyticsSync(trafftClient, credentials, integration, dateFrom, dateTo) {
    console.log(`Syncing analytics for ${integration.barbershopId}...`)
    
    const analytics = await trafftClient.getBusinessAnalytics(
      dateFrom,
      dateTo,
      integration.barbershopId
    )
    
    // Store analytics
    await storeIntegrationAnalytics(
      integration.integrationId,
      integration.barbershopId,
      analytics
    )

    return {
      analytics: {
        total: 1,
        data: analytics,
        stored: { success: 1, failed: 0 }
      }
    }
  }

  /**
   * Perform customer-only sync
   */
  async performCustomerSync(trafftClient, credentials, integration) {
    console.log(`Syncing customers for ${integration.barbershopId}...`)
    
    const customers = await trafftClient.getCustomers()
    const customerData = customers.data || customers || []
    
    const stored = await storeExternalCustomers(
      integration.integrationId,
      integration.barbershopId,
      customerData
    )

    return {
      customers: {
        total: customerData.length,
        data: customerData,
        stored
      }
    }
  }

  /**
   * Get sync date range based on sync type
   */
  getSyncDateRange(syncType) {
    const now = new Date()
    let dateFrom, dateTo

    switch (syncType) {
      case 'full':
        // Full sync: last 90 days
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break

      case 'incremental':
        // Incremental sync: last 2 days (to catch any missed updates)
        dateFrom = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break

      case 'analytics':
        // Analytics sync: last 7 days
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break

      default:
        // Default: last 30 days
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
    }

    return { dateFrom, dateTo }
  }

  /**
   * Create sync summary from results
   */
  createSyncSummary(syncResults) {
    const summary = {}

    Object.entries(syncResults).forEach(([key, result]) => {
      summary[key] = {
        total: result.total || 0,
        success: result.stored?.success || 0,
        failed: result.stored?.failed || 0
      }
    })

    // Calculate totals
    summary.totals = {
      records: Object.values(summary).reduce((sum, item) => sum + (item.total || 0), 0),
      success: Object.values(summary).reduce((sum, item) => sum + (item.success || 0), 0),
      failed: Object.values(summary).reduce((sum, item) => sum + (item.failed || 0), 0)
    }

    return summary
  }

  /**
   * Force sync for a specific barbershop (manual trigger)
   */
  async forceSyncIntegration(barbershopId, syncType = 'full') {
    try {
      const credentials = await getIntegrationCredentials(barbershopId, 'trafft')
      if (!credentials) {
        throw new Error('Integration not found or not active')
      }

      const integration = {
        integrationId: credentials.integrationId,
        barbershopId,
        credentials
      }

      const result = await this.syncIntegration(integration, syncType)
      console.log(`Force sync completed for ${barbershopId}:`, result)
      
      return result

    } catch (error) {
      console.error(`Force sync failed for ${barbershopId}:`, error)
      throw error
    }
  }
}

// Create singleton instance
const trafftScheduledSync = new TrafftScheduledSyncService()

// Export functions for use in API routes
export async function startScheduledSync() {
  return trafftScheduledSync.start()
}

export async function stopScheduledSync() {
  return trafftScheduledSync.stop()
}

export async function getScheduledSyncStatus() {
  return trafftScheduledSync.getStatus()
}

export async function runManualSync(barbershopId, syncType = 'full') {
  return trafftScheduledSync.forceSyncIntegration(barbershopId, syncType)
}

export async function runAllScheduledSync(syncType) {
  return trafftScheduledSync.runScheduledSync(syncType)
}

// Start sync service automatically if in production
if (process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    console.log('Auto-starting Trafft scheduled sync service in production mode...')
    startScheduledSync()
  }, 5000) // Wait 5 seconds after server start
}

export default trafftScheduledSync