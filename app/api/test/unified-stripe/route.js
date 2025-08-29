import { NextResponse } from 'next/server'

/**
 * GET /api/test/unified-stripe
 * 
 * Test endpoint to verify UnifiedStripeManager import and basic functionality
 * No authentication required for debugging
 */
export async function GET(request) {
  try {
    // Test import
    const { default: unifiedStripeManager } = await import('@/lib/stripe/UnifiedStripeManager')
    
    // Test basic functionality
    const testResult = {
      import_successful: !!unifiedStripeManager,
      manager_type: typeof unifiedStripeManager,
      has_methods: {
        getUnifiedStatus: typeof unifiedStripeManager.getUnifiedStatus === 'function',
        orchestrateSetup: typeof unifiedStripeManager.orchestrateSetup === 'function',
        generateOnboardingLink: typeof unifiedStripeManager.generateOnboardingLink === 'function'
      },
      cache_initialized: !!unifiedStripeManager.cache,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      test_result: testResult,
      message: 'UnifiedStripeManager import test completed'
    })

  } catch (error) {
    console.error('UnifiedStripeManager import test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack trace
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/test/unified-stripe
 * 
 * Test endpoint to verify UnifiedStripeManager method execution
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const testBarbershopId = body.barbershopId || 'test-shop-123'
    
    // Test import
    const { default: unifiedStripeManager } = await import('@/lib/stripe/UnifiedStripeManager')
    
    // Test method execution (this will likely fail due to missing auth/data, but we can see how it fails)
    const methodTestResults = {}
    
    try {
      const status = await unifiedStripeManager.getUnifiedStatus(testBarbershopId)
      methodTestResults.getUnifiedStatus = { success: true, result: status }
    } catch (err) {
      methodTestResults.getUnifiedStatus = { success: false, error: err.message }
    }

    return NextResponse.json({
      success: true,
      test_barbershop_id: testBarbershopId,
      method_tests: methodTestResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('UnifiedStripeManager method test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}