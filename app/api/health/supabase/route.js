import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if environment variables are available
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Import our simple client
    const { supabase, supabaseService } = await import('@/lib/supabase-simple')
    
    // Test client creation
    const clientStatus = {
      client_created: !!supabase,
      service_created: !!supabaseService,
      environment: {
        url: hasUrl,
        anonKey: hasAnonKey,
        serviceKey: hasServiceKey
      }
    }
    
    // Try a simple query if client exists
    let queryTest = null
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        queryTest = {
          success: !error,
          error: error?.message
        }
      } catch (err) {
        queryTest = {
          success: false,
          error: err.message
        }
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Supabase health check',
      timestamp: new Date().toISOString(),
      supabase: clientStatus,
      query_test: queryTest
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}