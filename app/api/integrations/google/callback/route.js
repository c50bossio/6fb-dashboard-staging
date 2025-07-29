/**
 * Google Calendar OAuth Callback Route
 * Handles the OAuth redirect from Google and completes the authorization flow
 */

import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

/**
 * GET /api/integrations/google/callback
 * Handle OAuth redirect from Google
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      const errorParam = encodeURIComponent(
        error === 'access_denied' 
          ? 'Authorization was cancelled by user'
          : `OAuth error: ${error}`
      )
      return redirect(`/dashboard/integrations?error=${errorParam}`)
    }

    if (!code) {
      return redirect('/dashboard/integrations?error=' + encodeURIComponent('No authorization code received'))
    }

    // Decode state to get barbershop ID and return URL
    let stateData = {}
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString())
      } catch (e) {
        console.warn('Could not decode state parameter:', e.message)
      }
    }

    // Complete OAuth flow by calling our auth endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9999'
    const authResponse = await fetch(`${baseUrl}/api/integrations/google/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        state,
        barbershopId: stateData.barbershopId
      })
    })

    const authResult = await authResponse.json()

    if (authResult.success) {
      const successMessage = encodeURIComponent('Google Calendar connected successfully!')
      const returnUrl = authResult.returnUrl || '/dashboard/integrations'
      return redirect(`${returnUrl}?success=${successMessage}`)
    } else {
      const errorMessage = encodeURIComponent(authResult.error || 'Failed to connect Google Calendar')
      return redirect(`/dashboard/integrations?error=${errorMessage}`)
    }

  } catch (error) {
    console.error('Error in Google OAuth callback:', error)
    const errorMessage = encodeURIComponent('An unexpected error occurred during authorization')
    return redirect(`/dashboard/integrations?error=${errorMessage}`)
  }
}