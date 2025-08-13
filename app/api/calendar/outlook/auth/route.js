import { NextResponse } from 'next/server'
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

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
    // auth_url = service.get_outlook_auth_url(barber_id)
    
    // For demo purposes, return a mock auth URL
    const mockAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=demo&redirect_uri=${encodeURIComponent(
      'http://localhost:9999/api/calendar/outlook/callback'
    )}&scope=${encodeURIComponent(
      'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read'
    )}&response_type=code&state=${Buffer.from(JSON.stringify({ barber_id })).toString('base64')}`

    return NextResponse.json({
      success: true,
      auth_url: mockAuthUrl
    })
  } catch (error) {
    console.error('Error getting Outlook auth URL:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}