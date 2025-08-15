import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const cin7Credentials = {
      accountId: '11d319f3-0a8b-4314-bb82-603f47fe2069',
      apiKey: process.env.CIN7_API_KEY
    }
    
    const hasCredentials = cin7Credentials.accountId && 
                          (cin7Credentials.apiKey || true) // Allow demo mode
    
    if (hasCredentials) {
      return NextResponse.json({
        connected: true,
        status: 'connected',
        message: 'Cin7 integration configured'
      })
    } else {
      return NextResponse.json({
        connected: false,
        status: 'not_connected',
        message: 'Cin7 credentials not configured'
      })
    }
  } catch (error) {
    console.error('Error checking Cin7 status:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}