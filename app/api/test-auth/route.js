import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('🔧 Testing auth in API route...')
    
    // Check cookies
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    console.log('🍪 Available cookies:', allCookies.map(c => c.name))
    
    // Check for auth cookies specifically
    const authCookies = allCookies.filter(c => 
      c.name.includes('auth') || c.name.includes('session') || c.name.includes('supabase')
    )
    console.log('🔐 Auth-related cookies:', authCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('👤 User check result:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message
    })
    
    return NextResponse.json({
      success: true,
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message,
      cookieCount: allCookies.length,
      authCookieCount: authCookies.length
    })
    
  } catch (error) {
    console.error('❌ Auth test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}