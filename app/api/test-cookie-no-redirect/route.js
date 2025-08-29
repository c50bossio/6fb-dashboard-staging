import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧪 Testing cookie setting WITHOUT redirect...')
  
  // Return HTML page instead of redirect, with cookies set
  const response = NextResponse.json({ 
    message: 'Cookies set successfully',
    instructions: 'Check document.cookie in browser console'
  })
  
  const mockSessionCookies = {
    'test-cookie-1': 'test-value-1',
    'test-cookie-2': 'test-value-2',
    'sb-dfhqjdoydihajmjxniee-auth-token': 'test-session-value'
  }
  
  Object.entries(mockSessionCookies).forEach(([name, value]) => {
    console.log('🍪 Setting test cookie (no redirect):', name)
    response.cookies.set({ 
      name, 
      value, 
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    })
  })
  
  console.log('✅ Test cookies set without redirect')
  return response
}