import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}