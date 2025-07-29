/**
 * List All Integrations API Route
 * Returns all connected integrations for a barbershop
 */

import { NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'
import { promisify } from 'util'

const DATABASE_PATH = process.env.DATABASE_PATH || '/Users/bossio/6FB AI Agent System/agent_system.db'

/**
 * Initialize database connection
 */
function initDatabase() {
  const db = new sqlite3.Database(DATABASE_PATH)
  
  // Promisify database methods
  db.getAsync = promisify(db.get.bind(db))
  db.allAsync = promisify(db.all.bind(db))
  db.runAsync = promisify(db.run.bind(db))
  
  return db
}

/**
 * GET /api/integrations/list
 * Get all integrations for a barbershop
 */
export async function GET(request) {
  const db = initDatabase()
  
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId') || 'default'
    
    // Get all integrations with their stats
    const integrations = await db.allAsync(`
      SELECT 
        i.*,
        COALESCE(s.total_appointments, 0) as total_appointments,
        COALESCE(s.total_customers, 0) as total_customers,
        COALESCE(s.total_revenue, 0.0) as total_revenue,
        COALESCE(s.last_updated, i.created_at) as stats_updated
      FROM integrations i
      LEFT JOIN integration_stats s ON i.id = s.integration_id
      WHERE i.barbershop_id = ?
      ORDER BY i.created_at DESC
    `, [barbershopId])
    
    // Format integrations data
    const formattedIntegrations = integrations.map(integration => ({
      id: integration.id,
      platform: integration.platform,
      barbershopId: integration.barbershop_id,
      isActive: Boolean(integration.is_active),
      createdAt: integration.created_at,
      lastSyncAt: integration.last_sync_at,
      nextSyncAt: integration.next_sync_at,
      syncSchedule: integration.sync_schedule,
      lastSyncError: integration.last_sync_error,
      stats: {
        totalAppointments: integration.total_appointments,
        totalCustomers: integration.total_customers,
        totalRevenue: parseFloat(integration.total_revenue),
        lastUpdated: integration.stats_updated
      },
      metadata: integration.metadata ? JSON.parse(integration.metadata) : {}
    }))
    
    // Calculate summary statistics
    const summary = {
      totalIntegrations: formattedIntegrations.length,
      activeIntegrations: formattedIntegrations.filter(i => i.isActive).length,
      totalAppointments: formattedIntegrations.reduce((sum, i) => sum + (i.stats.totalAppointments || 0), 0),
      totalRevenue: formattedIntegrations.reduce((sum, i) => sum + (i.stats.totalRevenue || 0), 0),
      platforms: [...new Set(formattedIntegrations.map(i => i.platform))]
    }
    
    return NextResponse.json({
      success: true,
      integrations: formattedIntegrations,
      summary
    })
    
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch integrations',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * POST /api/integrations/list
 * Bulk operations on integrations (enable/disable, sync all, etc.)
 */
export async function POST(request) {
  const db = initDatabase()
  
  try {
    const { barbershopId, action, integrationIds } = await request.json()
    
    if (!barbershopId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: barbershopId, action' },
        { status: 400 }
      )
    }
    
    let result = {}
    
    switch (action) {
      case 'sync_all':
        result = await syncAllIntegrations(db, barbershopId, integrationIds)
        break
        
      case 'enable_all':
        result = await enableIntegrations(db, barbershopId, integrationIds)
        break
        
      case 'disable_all':
        result = await disableIntegrations(db, barbershopId, integrationIds)
        break
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      action,
      ...result
    })
    
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform bulk operation',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * Trigger sync for all or specified integrations
 */
async function syncAllIntegrations(db, barbershopId, integrationIds = null) {
  let whereClause = 'barbershop_id = ? AND is_active = 1'
  let params = [barbershopId]
  
  if (integrationIds && integrationIds.length > 0) {
    whereClause += ` AND id IN (${integrationIds.map(() => '?').join(',')})`
    params.push(...integrationIds)
  }
  
  const integrations = await db.allAsync(`
    SELECT id, platform FROM integrations WHERE ${whereClause}
  `, params)
  
  const syncResults = []
  const syncPromises = integrations.map(async (integration) => {
    try {
      // Trigger sync for this integration
      const syncResult = await triggerIntegrationSync(integration.platform, {
        barbershopId,
        integrationId: integration.id,
        syncType: 'incremental'
      })
      
      syncResults.push({
        integrationId: integration.id,
        platform: integration.platform,
        success: true,
        result: syncResult
      })
    } catch (error) {
      syncResults.push({
        integrationId: integration.id,
        platform: integration.platform,
        success: false,
        error: error.message
      })
    }
  })
  
  await Promise.all(syncPromises)
  
  return {
    syncedIntegrations: syncResults.length,
    successfulSyncs: syncResults.filter(r => r.success).length,
    failedSyncs: syncResults.filter(r => !r.success).length,
    results: syncResults
  }
}

/**
 * Enable specified integrations
 */
async function enableIntegrations(db, barbershopId, integrationIds) {
  if (!integrationIds || integrationIds.length === 0) {
    return { enabledCount: 0, message: 'No integrations specified' }
  }
  
  const placeholders = integrationIds.map(() => '?').join(',')
  const result = await db.runAsync(`
    UPDATE integrations 
    SET is_active = 1, updated_at = datetime('now')
    WHERE barbershop_id = ? AND id IN (${placeholders})
  `, [barbershopId, ...integrationIds])
  
  return {
    enabledCount: result.changes,
    message: `Enabled ${result.changes} integrations`
  }
}

/**
 * Disable specified integrations
 */
async function disableIntegrations(db, barbershopId, integrationIds) {
  if (!integrationIds || integrationIds.length === 0) {
    return { disabledCount: 0, message: 'No integrations specified' }
  }
  
  const placeholders = integrationIds.map(() => '?').join(',')
  const result = await db.runAsync(`
    UPDATE integrations 
    SET is_active = 0, updated_at = datetime('now')
    WHERE barbershop_id = ? AND id IN (${placeholders})
  `, [barbershopId, ...integrationIds])
  
  return {
    disabledCount: result.changes,
    message: `Disabled ${result.changes} integrations`
  }
}

/**
 * Trigger sync for a specific integration platform
 */
async function triggerIntegrationSync(platform, syncData) {
  // This would normally make an HTTP request to the specific platform's sync endpoint
  // For now, we'll simulate the sync
  
  const platformEndpoints = {
    trafft: '/api/integrations/trafft/sync',
    google: '/api/integrations/google/sync',
    acuity: '/api/integrations/acuity/sync',
    square: '/api/integrations/square/sync',
    booksy: '/api/integrations/booksy/sync',
    generic: '/api/integrations/generic/sync'
  }
  
  const endpoint = platformEndpoints[platform]
  if (!endpoint) {
    throw new Error(`No sync endpoint configured for platform: ${platform}`)
  }
  
  // In a real implementation, this would make an HTTP request to the sync endpoint
  // For now, return a mock response
  return {
    platform,
    syncType: syncData.syncType,
    timestamp: new Date().toISOString(),
    summary: {
      appointments: Math.floor(Math.random() * 50),
      customers: Math.floor(Math.random() * 20),
      services: Math.floor(Math.random() * 10)
    }
  }
}