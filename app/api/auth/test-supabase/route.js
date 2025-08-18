import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const results = {
    timestamp: new Date().toISOString(),
    environment: {},
    connection: {},
    auth: {},
    database: {},
    timing: {}
  }
  
  try {
    // Check environment variables
    results.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/https:\/\/([^.]+)\..*/, 'https://$1.[hidden]') : 
        'NOT SET',
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set'
    }
    
    // Test Supabase connection
    const supabase = createClient()
    results.connection.clientCreated = true
    
    // Test auth service
    const authStartTime = Date.now()
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      results.auth = {
        getSessionSuccess: !error,
        hasSession: !!session,
        sessionUser: session?.user?.email || null,
        error: error?.message || null,
        responseTime: Date.now() - authStartTime + 'ms'
      }
    } catch (authError) {
      results.auth = {
        getSessionSuccess: false,
        error: authError.message,
        responseTime: Date.now() - authStartTime + 'ms'
      }
    }
    
    // Test database connection
    const dbStartTime = Date.now()
    try {
      // Try a simple query to test database connection
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        
      results.database = {
        connected: !error,
        error: error?.message || null,
        tableAccessible: !error,
        responseTime: Date.now() - dbStartTime + 'ms'
      }
    } catch (dbError) {
      results.database = {
        connected: false,
        error: dbError.message,
        responseTime: Date.now() - dbStartTime + 'ms'
      }
    }
    
    // Test OAuth providers configuration
    try {
      // This doesn't actually make an API call, just checks if the client is configured
      const providers = ['google']
      results.auth.providers = {
        configured: providers,
        note: 'Provider configuration is done in Supabase Dashboard'
      }
    } catch (err) {
      results.auth.providers = { error: err.message }
    }
    
    // Overall timing
    results.timing = {
      totalTime: Date.now() - startTime + 'ms',
      authTime: results.auth.responseTime,
      dbTime: results.database.responseTime
    }
    
    // Determine overall health
    results.healthy = !!(
      results.environment.hasSupabaseUrl && 
      results.environment.hasAnonKey &&
      results.connection.clientCreated &&
      results.auth.getSessionSuccess !== false &&
      results.database.connected
    )
    
    // Add recommendations if not healthy
    if (!results.healthy) {
      results.recommendations = []
      
      if (!results.environment.hasSupabaseUrl || !results.environment.hasAnonKey) {
        results.recommendations.push('Check environment variables in Vercel dashboard')
      }
      
      if (results.auth.error) {
        results.recommendations.push(`Auth error: ${results.auth.error}`)
      }
      
      if (!results.database.connected) {
        results.recommendations.push('Database connection failed - check Supabase project status')
      }
    }
    
  } catch (error) {
    results.error = {
      message: error.message,
      stack: error.stack
    }
    results.healthy = false
  }
  
  return NextResponse.json(results, {
    status: results.healthy ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}