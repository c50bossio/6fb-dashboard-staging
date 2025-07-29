/**
 * Unified Integration Data API Route
 * Provides normalized appointment data and AI context from all connected integrations
 */

import { NextResponse } from 'next/server'
import AIContextBuilder from '../../../../services/integrations/ai-context-builder.js'
import DataNormalizationService from '../../../../services/integrations/data-normalization-service.js'
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
 * GET /api/integrations/data
 * Get normalized appointment data and AI context for all integrations
 */
export async function GET(request) {
  const db = initDatabase()
  
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId') || 'default'
    const dataType = searchParams.get('type') || 'full' // 'appointments', 'context', 'full'
    const includePastDays = parseInt(searchParams.get('pastDays')) || 30
    const includeFutureDays = parseInt(searchParams.get('futureDays')) || 30
    const platform = searchParams.get('platform') // Optional: filter by platform
    
    // Check if any integrations exist
    const integrations = await db.allAsync(`
      SELECT * FROM integrations 
      WHERE barbershop_id = ? AND is_active = 1
    `, [barbershopId])
    
    if (integrations.length === 0) {
      return NextResponse.json({
        success: true,
        barbershopId,
        message: 'No active integrations found',
        integrations: [],
        appointments: [],
        context: null
      })
    }
    
    let response = {
      success: true,
      barbershopId,
      integrations: integrations.map(integration => ({
        id: integration.id,
        platform: integration.platform,
        lastSyncAt: integration.last_sync_at,
        nextSyncAt: integration.next_sync_at,
        lastSyncError: integration.last_sync_error,
        metadata: integration.metadata ? JSON.parse(integration.metadata) : {}
      }))
    }
    
    // Get appointment data if requested
    if (dataType === 'appointments' || dataType === 'full') {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - includePastDays * 24 * 60 * 60 * 1000)
      const futureDate = new Date(endDate.getTime() + includeFutureDays * 24 * 60 * 60 * 1000)
      
      let appointmentsQuery = `
        SELECT * FROM appointments 
        WHERE barbershop_id = ? 
        AND start_time BETWEEN ? AND ?
      `
      let queryParams = [barbershopId, startDate.toISOString(), futureDate.toISOString()]
      
      // Add platform filter if specified
      if (platform) {
        appointmentsQuery += ' AND platform = ?'
        queryParams.push(platform)
      }
      
      appointmentsQuery += ' ORDER BY start_time ASC'
      
      const rawAppointments = await db.allAsync(appointmentsQuery, queryParams)
      
      // Normalize appointments from different platforms
      const normalizedAppointments = []
      const platformCounts = {}
      
      for (const appointment of rawAppointments) {
        try {
          const metadata = JSON.parse(appointment.metadata || '{}')
          const attendees = JSON.parse(appointment.attendees || '[]')
          
          const appointmentForNormalization = {
            id: appointment.platform_appointment_id,
            platformId: appointment.platform_appointment_id,
            platform: appointment.platform,
            title: appointment.title,
            description: appointment.description,
            startTime: appointment.start_time,
            endTime: appointment.end_time,
            duration: appointment.duration_minutes,
            location: appointment.location,
            status: appointment.status,
            attendees: attendees,
            metadata: metadata,
            created: appointment.created_at,
            updated: appointment.updated_at,
            syncedAt: appointment.synced_at
          }
          
          const normalized = DataNormalizationService.normalizeAppointments(
            [appointmentForNormalization], 
            appointment.platform
          )[0]
          
          normalizedAppointments.push(normalized)
          platformCounts[appointment.platform] = (platformCounts[appointment.platform] || 0) + 1
          
        } catch (normalizationError) {
          console.warn('Failed to normalize appointment:', appointment.id, normalizationError.message)
        }
      }
      
      // Add appointment data to response
      response.appointments = {
        total: normalizedAppointments.length,
        data: normalizedAppointments,
        summary: DataNormalizationService.generateAIContext(normalizedAppointments),
        platforms: platformCounts,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          futureDate: futureDate.toISOString()
        }
      }
    }
    
    // Get AI context if requested
    if (dataType === 'context' || dataType === 'full') {
      try {
        const context = await AIContextBuilder.buildContext(barbershopId, {
          includePastDays,
          includeFutureDays,
          includeAnalytics: true,
          includeRecommendations: true
        })
        
        response.context = context
      } catch (contextError) {
        console.error('Failed to build AI context:', contextError)
        response.context = {
          error: 'Failed to build AI context',
          details: contextError.message
        }
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching integration data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch integration data',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * POST /api/integrations/data
 * Trigger sync for all integrations and return updated data
 */
export async function POST(request) {
  const db = initDatabase()
  
  try {
    const { barbershopId, syncType = 'incremental', platforms } = await request.json()
    
    if (!barbershopId) {
      return NextResponse.json(
        { success: false, error: 'barbershopId is required' },
        { status: 400 }
      )
    }
    
    // Get active integrations
    let integrationsQuery = `
      SELECT * FROM integrations 
      WHERE barbershop_id = ? AND is_active = 1
    `
    let queryParams = [barbershopId]
    
    // Filter by platforms if specified
    if (platforms && platforms.length > 0) {
      integrationsQuery += ` AND platform IN (${platforms.map(() => '?').join(',')})`
      queryParams.push(...platforms)
    }
    
    const integrations = await db.allAsync(integrationsQuery, queryParams)
    
    if (integrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active integrations found to sync',
        syncResults: []
      })
    }
    
    // Trigger sync for each integration
    const syncResults = []
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9999'
    
    for (const integration of integrations) {
      try {
        let syncEndpoint = `/api/integrations/${integration.platform}/sync`
        
        const syncResponse = await fetch(`${baseUrl}${syncEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            integrationId: integration.id,
            barbershopId,
            syncType
          })
        })
        
        const syncResult = await syncResponse.json()
        
        syncResults.push({
          integrationId: integration.id,
          platform: integration.platform,
          success: syncResult.success,
          result: syncResult.success ? syncResult : null,
          error: syncResult.success ? null : syncResult.error
        })
        
      } catch (syncError) {
        console.error(`Failed to sync ${integration.platform}:`, syncError)
        syncResults.push({
          integrationId: integration.id,
          platform: integration.platform,
          success: false,
          result: null,
          error: syncError.message
        })
      }
    }
    
    // Get updated data after sync
    const updatedDataResponse = await fetch(`${baseUrl}/api/integrations/data?barbershopId=${barbershopId}&type=full`, {
      method: 'GET'
    })
    
    const updatedData = await updatedDataResponse.json()
    
    return NextResponse.json({
      success: true,
      barbershopId,
      syncType,
      syncResults,
      summary: {
        totalIntegrations: integrations.length,
        successfulSyncs: syncResults.filter(r => r.success).length,
        failedSyncs: syncResults.filter(r => !r.success).length
      },
      data: updatedData.success ? updatedData : null
    })
    
  } catch (error) {
    console.error('Error syncing integration data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync integration data',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * PUT /api/integrations/data
 * Update appointment data or trigger specific actions
 */
export async function PUT(request) {
  const db = initDatabase()
  
  try {
    const { barbershopId, action, appointmentId, data } = await request.json()
    
    if (!barbershopId || !action) {
      return NextResponse.json(
        { success: false, error: 'barbershopId and action are required' },
        { status: 400 }
      )
    }
    
    let result = {}
    
    switch (action) {
      case 'update_appointment_status':
        if (!appointmentId || !data?.status) {
          return NextResponse.json(
            { success: false, error: 'appointmentId and status are required for status update' },
            { status: 400 }
          )
        }
        
        await db.runAsync(`
          UPDATE appointments 
          SET status = ?, updated_at = ?, synced_at = ?
          WHERE barbershop_id = ? AND platform_appointment_id = ?
        `, [data.status, new Date().toISOString(), new Date().toISOString(), barbershopId, appointmentId])
        
        result = {
          appointmentId,
          newStatus: data.status,
          updatedAt: new Date().toISOString()
        }
        break
        
      case 'mark_no_show':
        if (!appointmentId) {
          return NextResponse.json(
            { success: false, error: 'appointmentId is required for no-show marking' },
            { status: 400 }
          )
        }
        
        await db.runAsync(`
          UPDATE appointments 
          SET status = 'no_show', updated_at = ?, synced_at = ?
          WHERE barbershop_id = ? AND platform_appointment_id = ?
        `, [new Date().toISOString(), new Date().toISOString(), barbershopId, appointmentId])
        
        result = {
          appointmentId,
          newStatus: 'no_show',
          updatedAt: new Date().toISOString()
        }
        break
        
      case 'refresh_context':
        const context = await AIContextBuilder.buildContext(barbershopId, {
          includePastDays: 30,
          includeFutureDays: 30,
          includeAnalytics: true,
          includeRecommendations: true
        })
        
        result = { context }
        break
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      barbershopId,
      action,
      result
    })
    
  } catch (error) {
    console.error('Error updating integration data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update integration data',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}