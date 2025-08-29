import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧪 Testing cookie setting...')
  
  const response = NextResponse.redirect(new URL('/test-session-client', request.url))
  
  // Simulate setting session cookies like Supabase would
  const mockSessionCookies = {
    'sb-dfhqjdoydihajmjxniee-auth-token.0': 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkdZZEd5aDJ6Q1NpckRydXoiLCJ0eXAiOiJKV1QifQ',
    'sb-dfhqjdoydihajmjxniee-auth-token.1': 'eyJleHAiOjE3NTY1MDA5NDcsInNpdGVfdXJsIjoiaHR0cHM6Ly9ib29rZWRiYXJiZXIuY29tIiwiaWQi',
    'sb-dfhqjdoydihajmjxniee-auth-token': 'base64url-encoded-session-data-here'
  }
  
  Object.entries(mockSessionCookies).forEach(([name, value]) => {
    console.log('🍪 Setting test cookie:', name)
    response.cookies.set({ 
      name, 
      value, 
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 34560000 // 400 days like Supabase uses
    })
  })
  
  console.log('✅ Test cookies set, redirecting to test page')
  return response
}