import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🧹 Clearing all cookies...')
  
  const response = NextResponse.json({ message: 'Cookies cleared' })
  
  // Clear all possible Supabase cookies
  const cookiesToClear = [
    'sb-dfhqjdoydihajmjxniee-auth-token',
    'sb-dfhqjdoydihajmjxniee-auth-token.0',
    'sb-dfhqjdoydihajmjxniee-auth-token.1', 
    'sb-dfhqjdoydihajmjxniee-auth-token.2',
    'sb-dfhqjdoydihajmjxniee-auth-token.3',
    'sb-dfhqjdoydihajmjxniee-auth-token.4',
    'sb-dfhqjdoydihajmjxniee-auth-token.5',
    'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier'
  ]
  
  cookiesToClear.forEach(cookieName => {
    response.cookies.set({
      name: cookieName,
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax'
    })
    console.log('🗑️ Cleared cookie:', cookieName)
  })
  
  return response
}