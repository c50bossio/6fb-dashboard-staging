import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧪 Testing cookies on redirect response...')
  
  // Create redirect response  
  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  
  // Try to set cookies on redirect
  const testCookies = {
    'test-redirect-1': 'value1',
    'test-redirect-2': 'value2',
    'sb-test-auth-token.0': 'test-chunk-0',
    'sb-test-auth-token.1': 'test-chunk-1'
  }
  
  Object.entries(testCookies).forEach(([name, value]) => {
    console.log('🍪 Setting cookie on redirect:', name)
    response.cookies.set(name, value, {
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 3600
    })
  })
  
  console.log('✅ Redirecting with cookies...')
  return response
}