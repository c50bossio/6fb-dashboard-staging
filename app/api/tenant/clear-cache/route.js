import { NextResponse } from 'next/server'
import { clearTenantCache } from '@/lib/tenant-resolver'

/**
 * Clear tenant resolver cache
 *
 * This endpoint clears the tenant resolution cache, forcing fresh lookups
 * from the database. Useful after shop switching to bypass the 5-minute cache.
 */
export async function POST(request) {
  try {
    // Clear all tenant cache entries
    clearTenantCache()

    console.log('✅ [Clear Cache API] Tenant cache cleared successfully')

    return NextResponse.json({
      success: true,
      message: 'Tenant cache cleared'
    })
  } catch (error) {
    console.error('❌ [Clear Cache API] Failed to clear cache:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
