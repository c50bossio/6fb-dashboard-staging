import { NextRequest, NextResponse } from 'next/server'
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
 * POST /api/integrations/trafft/auth
 * Authenticate with Trafft API and store credentials securely
 */
export async function POST(request) {
  const db = initDatabase()
  
  try {
    const { apiKey, apiSecret, barbershopId, baseUrl } = await request.json()

    // Validate required fields
    if (!apiKey || !apiSecret) {    
      return NextResponse.json(
        { error: 'Missing required fields: apiKey and apiSecret' },
        { status: 400 }
      )
    }

    const finalBarbershopId = barbershopId || 'default'

    // Test authentication with Traft
    const trafftClient = createTrafftClient(apiKey, apiSecret, baseUrl)
    
    try {
      const authResult = await trafftClient.authenticate()
      
      // Get connection info for metadata
      const connectionInfo = await trafftClient.getConnectionInfo()
      
      // Store the integration in database
      const integrationData = {
        id: `trafft_${Date.now()}`,
        platform: 'trafft',
        barbershop_id: finalBarbershopId,
        is_active: 1,
        credentials: JSON.stringify({ apiKey, apiSecret, baseUrl }),
        account_info: JSON.stringify(connectionInfo),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync_at: null,
        next_sync_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        sync_schedule: 'hourly',
        metadata: JSON.stringify({
          businessName: authResult.businessName,
          accountId: authResult.accountId,
          email: authResult.email,
          subscription: authResult.subscription,
          timezone: authResult.timezone
        })
      }

      await db.runAsync(`
        INSERT OR REPLACE INTO integrations (
          id, platform, barbershop_id, is_active, credentials, account_info,
          created_at, updated_at, last_sync_at, next_sync_at, sync_schedule, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        integrationData.id,
        integrationData.platform,
        integrationData.barbershop_id,
        integrationData.is_active,
        integrationData.credentials,
        integrationData.account_info,
        integrationData.created_at,
        integrationData.updated_at,
        integrationData.last_sync_at,
        integrationData.next_sync_at,
        integrationData.sync_schedule,
        integrationData.metadata
      ])

      return NextResponse.json({
        success: true,
        integration: {
          id: integrationData.id,
          platform: integrationData.platform,
          barbershopId: finalBarbershopId,
          businessName: authResult.businessName,
          accountId: authResult.accountId,
          email: authResult.email,
          createdAt: integrationData.created_at
        },
        message: 'Traft integration connected successfully'
      })

    } catch (authError) {
      console.error('Traft authentication failed:', authError)
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: authError.message,
          code: 'TRAFFT_AUTH_FAILED'
        },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Error in Traft auth endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * GET /api/integrations/trafft/auth
 * Check Traft integration status
 */
export async function GET(request) {
  const db = initDatabase()
  
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId') || 'default'

    // Get integration status from database
    const integration = await db.getAsync(
      'SELECT * FROM integrations WHERE barbershop_id = ? AND platform = ?',
      [barbershopId, 'trafft']
    )
    
    if (!integration) {
      return NextResponse.json({
        integration: null,
        isConnected: false
      })
    }

    const integrationInfo = {
      id: integration.id,
      platform: integration.platform,
      barbershopId: integration.barbershop_id,
      isActive: Boolean(integration.is_active),
      createdAt: integration.created_at,
      lastSyncAt: integration.last_sync_at,
      nextSyncAt: integration.next_sync_at,
      metadata: integration.metadata ? JSON.parse(integration.metadata) : {}
    }

    return NextResponse.json({
      integration: integrationInfo,
      isConnected: integrationInfo.isActive
    })

  } catch (error) {
    console.error('Error checking Traft integration status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

/**
 * DELETE /api/integrations/trafft/auth
 * Disconnect Traft integration
 */
export async function DELETE(request) {
  const db = initDatabase()
  
  try {
    const { barbershopId } = await request.json()
    const finalBarbershopId = barbershopId || 'default'

    // Remove integration from database
    await db.runAsync(
      'DELETE FROM integrations WHERE barbershop_id = ? AND platform = ?',
      [finalBarbershopId, 'trafft']
    )

    // Also remove related appointments
    await db.runAsync(
      'DELETE FROM appointments WHERE barbershop_id = ? AND platform = ?',
      [finalBarbershopId, 'trafft']
    )

    return NextResponse.json({
      success: true,
      message: 'Traft integration disconnected successfully',
      barbershopId: finalBarbershopId
    })

  } catch (error) {
    console.error('Error disconnecting Traft integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}