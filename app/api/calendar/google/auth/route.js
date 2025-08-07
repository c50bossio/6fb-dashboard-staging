import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    // In a real implementation, import the CalendarSyncService
    // from services.calendar_sync_service import CalendarSyncService
    // service = CalendarSyncService()
    // auth_url = service.get_google_auth_url(barber_id)
    
    // For demo purposes, return a mock auth URL
    const mockAuthUrl = `https://accounts.google.com/oauth2/auth?client_id=demo&redirect_uri=${encodeURIComponent(
      'http://localhost:9999/api/calendar/google/callback'
    )}&scope=${encodeURIComponent(
      'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email'
    )}&response_type=code&access_type=offline&state=${Buffer.from(JSON.stringify({ barber_id })).toString('base64')}`

    return NextResponse.json({
      success: true,
      auth_url: mockAuthUrl
    })
  } catch (error) {
    console.error('Error getting Google auth URL:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}