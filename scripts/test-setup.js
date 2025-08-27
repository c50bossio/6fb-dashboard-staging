#!/usr/bin/env node

console.log('🔧 Testing script execution...')
console.log('Node version:', process.version)
console.log('CWD:', process.cwd())

// Check environment variables
console.log('Environment check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING')

// Load dotenv if available
try {
  const dotenv = await import('dotenv')
  dotenv.config()
  console.log('✅ Dotenv loaded')
  console.log('After dotenv - SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
} catch (error) {
  console.log('⚠️  Dotenv not available:', error.message)
}

console.log('✅ Test script completed')