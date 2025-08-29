import { NextResponse } from 'next/server'

/**
 * GET /api/calendar/google/callback
 * Handle Google OAuth callback
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This contains our shopId
    const error = searchParams.get('error')
    
    if (error) {
      console.error('Google OAuth error:', error)
      // Redirect to frontend with error
      return NextResponse.redirect(
        new URL(`/dashboard/calendar?error=${encodeURIComponent(error)}`, request.url)
      )
    }
    
    if (!code || !state) {
      console.error('Missing code or state in OAuth callback')
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=invalid_callback', request.url)
      )
    }
    
    // In a real implementation, this would:
    // 1. Exchange the code for tokens
    // 2. Store the tokens securely
    // 3. Create calendar integration record
    
    // For development, simulate successful integration
    const mockIntegration = {
      id: `gcal-${Date.now()}`,
      shopId: state,
      email: `shop-${state.slice(-4)}@gmail.com`,
      provider: 'google',
      connected: true,
      connectedAt: new Date().toISOString()
    }
    
    console.log('🗓️ Mock Google Calendar integration created:', mockIntegration)
    
    // Redirect back to calendar settings with success
    return NextResponse.redirect(
      new URL(`/dashboard/calendar?connected=true&provider=google`, request.url)
    )
    
  } catch (error) {
    console.error('Error handling Google Calendar callback:', error)
    return NextResponse.redirect(
      new URL('/dashboard/calendar?error=callback_failed', request.url)
    )
  }
}