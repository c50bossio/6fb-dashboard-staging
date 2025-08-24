// Test Google OAuth Flow
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testGoogleOAuth() {
  console.log('Testing Google OAuth configuration...')
  
  // Test 1: Check if Supabase client is initialized
  console.log('✓ Supabase client initialized')
  
  // Test 2: Generate OAuth URL
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:9999/auth/callback',
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account'
      }
    }
  })
  
  if (error) {
    console.error('❌ OAuth error:', error)
    return
  }
  
  if (data?.url) {
    console.log('✓ OAuth URL generated successfully')
    console.log('OAuth URL:', data.url)
    
    // Parse the URL to check components
    const url = new URL(data.url)
    console.log('\nOAuth URL Components:')
    console.log('- Host:', url.host)
    console.log('- Provider:', url.searchParams.get('provider'))
    console.log('- Redirect:', url.searchParams.get('redirect_to'))
    console.log('- Has code challenge:', url.searchParams.has('code_challenge'))
    console.log('- PKCE method:', url.searchParams.get('code_challenge_method'))
  } else {
    console.log('❌ No OAuth URL returned')
  }
}

testGoogleOAuth().catch(console.error)