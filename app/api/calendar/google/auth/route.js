import { NextResponse } from 'next/server'

/**
 * GET /api/calendar/google/auth
 * Initiate Google Calendar OAuth flow
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId')
    
    if (!barbershopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
    }
    
    // Mock OAuth flow for development - in production this would:
    // 1. Generate OAuth state with barbershopId
    // 2. Create Google OAuth URL with proper scopes
    // 3. Redirect to Google's authorization server
    
    const mockAuthData = {
      success: true,
      message: 'Google Calendar integration initiated',
      authUrl: `https://accounts.google.com/oauth/authorize?client_id=mock&redirect_uri=${encodeURIComponent(`${request.nextUrl.origin}/api/calendar/google/callback`)}&scope=https://www.googleapis.com/auth/calendar&response_type=code&state=${barbershopId}`,
      // For development, we'll simulate successful connection
      mockConnection: {
        id: `gauth-${Date.now()}`,
        email: `shop-${barbershopId.slice(-4)}@gmail.com`,
        provider: 'google',
        connected_at: new Date().toISOString(),
        scope: 'calendar.readonly calendar.events'
      }
    }
    
    // In development, immediately simulate successful connection
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Development mode: Google Calendar connection simulated',
        account: mockAuthData.mockConnection,
        redirect: false // Don't redirect in development
      })
    }
    
    // In production, return the auth URL to redirect to
    return NextResponse.json({
      success: true,
      authUrl: mockAuthData.authUrl,
      redirect: true
    })
    
  } catch (error) {
    console.error('Error initiating Google Calendar auth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authentication' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/calendar/google/auth
 * Complete Google Calendar OAuth flow (handle callback)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { code, state: barbershopId, error: authError } = body
    
    if (authError) {
      return NextResponse.json(
        { error: `OAuth error: ${authError}` },
        { status: 400 }
      )
    }
    
    if (!code || !barbershopId) {
      return NextResponse.json(
        { error: 'Authorization code and shop ID required' },
        { status: 400 }
      )
    }
    
    // Mock token exchange - in production this would:
    // 1. Exchange authorization code for access/refresh tokens
    // 2. Get user's calendar info
    // 3. Store tokens securely (encrypted)
    // 4. Create calendar integration record
    
    const mockTokenResponse = {
      access_token: `mock_access_token_${Date.now()}`,
      refresh_token: `mock_refresh_token_${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/calendar'
    }
    
    const mockCalendarAccount = {
      id: `gcal-${Date.now()}`,
      barbershop_id: barbershopId,
      email: `user-${barbershopId.slice(-4)}@gmail.com`,
      provider: 'google',
      access_token: mockTokenResponse.access_token, // Would be encrypted in production
      refresh_token: mockTokenResponse.refresh_token, // Would be encrypted in production
      expires_at: new Date(Date.now() + mockTokenResponse.expires_in * 1000).toISOString(),
      sync_enabled: true,
      last_sync: null,
      created_at: new Date().toISOString(),
      scopes: ['calendar.readonly', 'calendar.events']
    }
    
    return NextResponse.json({
      success: true,
      message: 'Google Calendar connected successfully',
      account: mockCalendarAccount
    })
    
  } catch (error) {
    console.error('Error completing Google Calendar auth:', error)
    return NextResponse.json(
      { error: 'Failed to complete Google Calendar authentication' },
      { status: 500 }
    )
  }
}