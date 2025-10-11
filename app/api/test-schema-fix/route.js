import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test the services query with barbershop_id (our fix)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b')
      .limit(1)

    // Test that would have failed before (shop_id column is deprecated/empty)
    const { data: oldServices, error: oldError } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b')
      .limit(1)
    
    return NextResponse.json({
      success: true,
      test: 'Database schema fix verification',
      results: {
        newQuery: {
          success: !servicesError,
          error: servicesError?.message || null,
          count: services?.length || 0
        },
        oldQuery: {
          success: !oldError,
          error: oldError?.message || null,
          expectedToFail: true,
          count: oldServices?.length || 0
        }
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}