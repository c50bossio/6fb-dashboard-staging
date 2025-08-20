#!/usr/bin/env node

/**
 * Test script to verify Google OAuth configuration
 * Run this after setting up Google Cloud Console and Supabase
 */

require('dotenv').config({ path: '.env.local' })

async function testGoogleOAuthSetup() {
  console.log('🔍 Testing Google OAuth Configuration...\n')
  
  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  let missingVars = []
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName]
    if (!value || value.includes('your-') || value.includes('placeholder')) {
      missingVars.push(varName)
    } else {
      console.log(`✅ ${varName}: Set (${value.substring(0, 20)}...)`)
    }
  })
  
  if (missingVars.length > 0) {
    console.log('\n❌ Missing or placeholder environment variables:')
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`)
    })
    console.log('\n📝 Please update these in your .env.local file with real values')
    return false
  }
  
  // Test Supabase configuration
  try {
    console.log('\n🔍 Testing Supabase connection...')
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Test a simple query
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
    if (error && !error.message.includes('relation "profiles" does not exist')) {
      console.log(`❌ Supabase connection error: ${error.message}`)
      return false
    }
    console.log('✅ Supabase connection successful')
    
  } catch (error) {
    console.log(`❌ Supabase test failed: ${error.message}`)
    return false
  }
  
  // Check Google Client ID format
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId.includes('.apps.googleusercontent.com')) {
    console.log('⚠️  Warning: Google Client ID should end with .apps.googleusercontent.com')
  }
  
  console.log('\n🎉 Configuration looks good!')
  console.log('\n📋 Next steps:')
  console.log('1. Ensure Google OAuth is enabled in Supabase Dashboard')
  console.log('2. Add Google Client ID and Secret to Supabase Auth providers')
  console.log('3. Test the login flow in your application')
  
  return true
}

if (require.main === module) {
  testGoogleOAuthSetup().catch(console.error)
}

module.exports = { testGoogleOAuthSetup }