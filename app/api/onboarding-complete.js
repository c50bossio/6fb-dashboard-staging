import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    
    const userId = body.userId || 'anonymous-' + Date.now()
    
    // Log onboarding completion for analytics
    console.log('Onboarding completed:', {
      userId,
      data: body,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      userId
    })

  } catch (error) {
    console.error('Onboarding API error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}