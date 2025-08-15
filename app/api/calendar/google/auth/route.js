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

    
    const AuthUrl = `https://accounts.google.com/oauth2/auth?client_id=demo&redirect_uri=${encodeURIComponent(
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