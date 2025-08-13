// Debug script to test OAuth functionality
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testOAuth() {
  console.log('🔍 TESTING OAUTH CONFIGURATION')
  console.log('===============================\n')
  
  console.log('📋 Environment Variables:')
  console.log('SUPABASE_URL:', supabaseUrl)
  console.log('GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Missing')
  console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing')
  console.log()
  
  console.log('🔐 Testing OAuth Provider Setup:')
  try {
    // Test OAuth URL generation
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://bookedbarber.com/api/auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
    
    if (error) {
      console.error('❌ OAuth configuration error:', error.message)
      console.error('   Full error:', error)
    } else {
      console.log('✅ OAuth URL generation successful')
      console.log('   Redirect URL:', data?.url || 'No URL returned')
    }
  } catch (err) {
    console.error('❌ Exception during OAuth test:', err.message)
  }
  
  console.log('\n🌐 Expected OAuth Flow:')
  console.log('1. User clicks "Sign up with Google"')
  console.log('2. Redirected to Google OAuth consent screen')
  console.log('3. After consent, Google redirects to: https://bookedbarber.com/api/auth/callback')
  console.log('4. Callback exchanges code for session')
  console.log('5. User redirected to subscription page')
  
  console.log('\n💡 Potential Issues:')
  console.log('- Supabase Auth settings may not include bookedbarber.com redirect URLs')
  console.log('- Google OAuth app may not include bookedbarber.com as authorized domain')
  console.log('- Environment variables may not be properly deployed')
}

testOAuth().catch(console.error)