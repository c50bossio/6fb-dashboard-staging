import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧪 Testing direct cookie setting...')
  
  // Create a simple JSON response
  const response = NextResponse.json({ 
    success: true,
    message: 'Cookies set directly'
  })
  
  // Set test session cookies using the correct method signature
  const testCookies = {
    'sb-dfhqjdoydihajmjxniee-auth-token': 'direct-main-token',
    'sb-dfhqjdoydihajmjxniee-auth-token.0': 'direct-chunk-0',
    'sb-dfhqjdoydihajmjxniee-auth-token.1': 'direct-chunk-1'
  }
  
  Object.entries(testCookies).forEach(([name, value]) => {
    console.log('🍪 Setting direct cookie:', name)
    // Use the correct method: cookies.set(name, value, options)
    response.cookies.set(name, value, {
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 3600
    })
  })
  
  console.log('✅ Direct cookies set')
  return response
}