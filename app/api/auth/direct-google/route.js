import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get('redirect') || '/auth/debug-callback'
  
  // Get Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ 
      error: 'Supabase not configured',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    }, { status: 500 })
  }
  
  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  
  if (!projectRef) {
    return NextResponse.json({ 
      error: 'Invalid Supabase URL format',
      url: supabaseUrl
    }, { status: 500 })
  }
  
  // Build the direct OAuth URL
  const baseUrl = `${supabaseUrl}/auth/v1/authorize`
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: `${request.headers.get('origin')}${redirectTo}`,
    scopes: 'email profile',
    response_type: 'code',
    client_id: supabaseAnonKey
  })
  
  const oauthUrl = `${baseUrl}?${params.toString()}`
  
  // Log for debugging
  console.log('Direct OAuth URL:', oauthUrl)
  console.log('Redirect to:', `${request.headers.get('origin')}${redirectTo}`)
  console.log('Project ref:', projectRef)
  
  // Redirect directly to Supabase OAuth
  return NextResponse.redirect(oauthUrl)
}

export async function POST(request) {
  try {
    const { redirectTo = '/auth/debug-callback' } = await request.json()
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Build OAuth URL with PKCE
    const baseUrl = `${supabaseUrl}/auth/v1/authorize`
    
    // Generate code verifier for PKCE
    const codeVerifier = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    // Generate code challenge
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    const params = new URLSearchParams({
      provider: 'google',
      redirect_to: `${request.headers.get('origin')}${redirectTo}`,
      response_type: 'code',
      client_id: supabaseAnonKey,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })
    
    const oauthUrl = `${baseUrl}?${params.toString()}`
    
    return NextResponse.json({
      url: oauthUrl,
      codeVerifier,
      projectRef: supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1],
      redirectTo: `${request.headers.get('origin')}${redirectTo}`,
      note: 'Use this URL to start OAuth flow with PKCE'
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}