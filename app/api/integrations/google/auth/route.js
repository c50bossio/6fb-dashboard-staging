/**
 * Google Calendar OAuth Authentication Route
 * Handles the initial OAuth flow for connecting Google Calendar accounts
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
 * GET /api/integrations/google/auth
 * Generate Google OAuth authorization URL
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId') || 'default'
    const returnUrl = searchParams.get('returnUrl') || '/dashboard/integrations'

    const googleService = new GoogleCalendarService()
    const authUrl = googleService.getAuthUrl()

    // Store the state for callback verification
    const state = Buffer.from(JSON.stringify({
      barbershopId,
      returnUrl,
      timestamp: Date.now()
    })).toString('base64')

    const authUrlWithState = `${authUrl}&state=${encodeURIComponent(state)}`

    return NextResponse.json({
      success: true,
      authUrl: authUrlWithState,
      message: 'Redirect user to this URL to authorize Google Calendar access'
    })

  } catch (error) {
    console.error('Error generating Google auth URL:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate authorization URL',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/google/auth
 * Handle OAuth callback and exchange code for tokens
 */
export async function POST(request) {
  const db = initDatabase()
  
  try {
    const { code, state, barbershopId } = await request.json()

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Decode and validate state
    let stateData = {}
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      } catch (e) {
        console.warn('Invalid state parameter:', e.message)
      }
    }

    const finalBarbershopId = barbershopId || stateData.barbershopId || 'default'

    // Exchange code for tokens
    const googleService = new GoogleCalendarService()
    const tokens = await googleService.exchangeCodeForTokens(code)

    // Test the connection and get account info
    googleService.setCredentials(tokens)
    const connectionInfo = await googleService.getConnectionInfo()

    if (!connectionInfo.connected) {
      throw new Error('Failed to establish connection with Google Calendar')
    }

    // Store the integration in database
    const integrationData = {
      id: `google_${Date.now()}`,
      platform: 'google_calendar',
      barbershop_id: finalBarbershopId,
      is_active: 1,
      credentials: JSON.stringify(tokens),
      account_info: JSON.stringify(connectionInfo),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null,
      next_sync_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      sync_schedule: 'hourly',
      metadata: JSON.stringify({
        accountEmail: connectionInfo.accountEmail,
        calendarsCount: connectionInfo.calendarsCount,
        timezone: connectionInfo.timezone
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
        accountEmail: connectionInfo.accountEmail,
        calendarsCount: connectionInfo.calendarsCount,
        timezone: connectionInfo.timezone,
        createdAt: integrationData.created_at
      },
      message: 'Google Calendar integration connected successfully',
      returnUrl: stateData.returnUrl || '/dashboard/integrations'
    })

  } catch (error) {
    console.error('Error handling Google OAuth callback:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to complete Google Calendar authorization',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}