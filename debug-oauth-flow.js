// Debug OAuth Flow Test
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

console.log('🔐 Testing OAuth Configuration...')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testOAuthFlow() {
  try {
    console.log('1. Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1)
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message)
      return
    }
    console.log('✅ Supabase connection working')

    console.log('\n2. Testing OAuth provider configuration...')
    
    // Test OAuth URL generation (this should work without browser)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:9999/api/auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
    
    if (error) {
      console.error('❌ OAuth configuration error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return
    }
    
    console.log('✅ OAuth provider configured correctly')
    console.log('OAuth data:', JSON.stringify(data, null, 2))
    
    console.log('\n🎉 OAuth setup is working! The redirect URL should be:')
    console.log(data.url)
    
  } catch (err) {
    console.error('🔥 Unexpected error:', err.message)
    console.error('Stack:', err.stack)
  }
}

testOAuthFlow()