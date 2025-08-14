// Test if Supabase environment variables are available in client-side code
console.log('🔍 Testing client-side environment variables:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', typeof process?.env?.NEXT_PUBLIC_SUPABASE_URL, process?.env?.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'UNDEFINED')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', typeof process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY, process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'UNDEFINED')

// Try to create a Supabase client to see if it works
try {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('🔍 Attempting to create Supabase client...')
  console.log('URL:', supabaseUrl ? 'Available' : 'Missing')
  console.log('Key:', supabaseKey ? 'Available' : 'Missing')
  
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase client created successfully')
  } else {
    console.log('❌ Missing environment variables for Supabase client')
  }
} catch (error) {
  console.error('❌ Error creating Supabase client:', error.message)
}