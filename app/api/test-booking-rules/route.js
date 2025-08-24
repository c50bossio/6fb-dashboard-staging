import { NextResponse } from 'next/server'
import { ConflictDetector } from '@/lib/booking-rules-engine/ConflictDetector'

/**
 * Test endpoint for the Enterprise Booking Rules System
 * This endpoint tests the core functionality without requiring authentication
 */

export async function GET() {
  try {
    console.log('🧪 Starting Enterprise Booking Rules System Test...')
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    }
    
    // Test 1: ConflictDetector instantiation
    console.log('Testing ConflictDetector instantiation...')
    try {
      const detector = new ConflictDetector()
      results.tests.instantiation = {
        status: 'PASS',
        message: 'ConflictDetector created successfully',
        hasMethod: typeof detector.findConflicts === 'function'
      }
    } catch (error) {
      results.tests.instantiation = {
        status: 'FAIL',
        message: `Failed to instantiate ConflictDetector: ${error.message}`,
        error: error.name
      }
    }
    
    // Test 2: Basic conflict detection with mock data
    console.log('Testing basic conflict detection...')
    try {
      const detector = new ConflictDetector()
      
      // Mock appointments data for testing
      const mockAppointments = [
        {
          id: 'apt-1',
          start_time: '2025-08-24T10:00:00Z',
          duration: 60, // 10:00-11:00
          barber_id: 'barber-1',
          barbershop_id: 'test-shop',
          status: 'confirmed'
        },
        {
          id: 'apt-2',
          start_time: '2025-08-24T11:30:00Z', 
          duration: 90, // 11:30-13:00
          barber_id: 'barber-1',
          barbershop_id: 'test-shop',
          status: 'confirmed'
        }
      ]
      
      // Test exact overlap
      const conflicts = await detector.findConflicts({
        barbershop_id: 'test-shop',
        barber_id: 'barber-1',
        start_time: '2025-08-24T10:00:00Z',
        duration: 60,
        existing_appointments: mockAppointments
      })
      
      results.tests.conflictDetection = {
        status: conflicts.length === 1 ? 'PASS' : 'FAIL',
        message: `Found ${conflicts.length} conflicts (expected: 1)`,
        conflictsFound: conflicts.length,
        expectedConflicts: 1,
        conflictDetails: conflicts.map(c => ({
          id: c.id,
          conflict_type: c.conflict_type
        }))
      }
      
    } catch (error) {
      results.tests.conflictDetection = {
        status: 'FAIL',
        message: `Conflict detection failed: ${error.message}`,
        error: error.name,
        stack: error.stack?.split('\n').slice(0, 5)
      }
    }
    
    // Test 3: Available slots finding
    console.log('Testing available slots finding...')
    try {
      const detector = new ConflictDetector()
      
      const businessHours = {
        open: '09:00',
        close: '18:00'
      }
      
      const availableSlots = await detector.findAvailableSlots({
        barbershop_id: 'test-shop',
        barber_id: 'barber-1',
        date: '2025-08-24',
        duration: 60,
        business_hours: businessHours,
        slot_interval: 30,
        buffer_time: 0,
        existing_appointments: [] // Empty for testing
      })
      
      results.tests.availableSlots = {
        status: availableSlots.length > 0 ? 'PASS' : 'FAIL',
        message: `Found ${availableSlots.length} available slots`,
        slotsFound: availableSlots.length,
        sampleSlots: availableSlots.slice(0, 3).map(slot => slot.start_time)
      }
      
    } catch (error) {
      results.tests.availableSlots = {
        status: 'FAIL', 
        message: `Available slots test failed: ${error.message}`,
        error: error.name
      }
    }
    
    // Test 4: API route structure
    console.log('Testing API route structure...')
    try {
      // Check if the main API route exists
      const apiRoute = await import('@/app/api/booking-rules/conflicts/route.js')
      
      results.tests.apiStructure = {
        status: 'PASS',
        message: 'API route structure is valid',
        exports: {
          POST: typeof apiRoute.POST === 'function',
          GET: typeof apiRoute.GET === 'function', 
          DELETE: typeof apiRoute.DELETE === 'function'
        }
      }
      
    } catch (error) {
      results.tests.apiStructure = {
        status: 'FAIL',
        message: `API route test failed: ${error.message}`,
        error: error.name
      }
    }
    
    // Test 5: Statistics functionality
    console.log('Testing statistics functionality...')
    try {
      const detector = new ConflictDetector()
      const stats = detector.getStats()
      
      results.tests.statistics = {
        status: 'PASS',
        message: 'Statistics functionality working',
        statsStructure: {
          hasTrees: 'trees' in stats,
          hasMetadata: 'metadata' in stats,
          keys: Object.keys(stats)
        }
      }
      
    } catch (error) {
      results.tests.statistics = {
        status: 'FAIL',
        message: `Statistics test failed: ${error.message}`,
        error: error.name
      }
    }
    
    // Calculate overall results
    const totalTests = Object.keys(results.tests).length
    const passedTests = Object.values(results.tests).filter(test => test.status === 'PASS').length
    const failedTests = totalTests - passedTests
    
    results.summary = {
      totalTests,
      passedTests,
      failedTests,
      successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
      overallStatus: passedTests === totalTests ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED'
    }
    
    console.log(`🎯 Test Results: ${passedTests}/${totalTests} tests passed`)
    
    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('❌ Test execution failed:', error)
    
    return NextResponse.json({
      error: 'Test execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500
    })
  }
}

export async function POST(request) {
  try {
    const { testType, testData } = await request.json()
    
    console.log(`🧪 Running specific test: ${testType}`)
    
    const detector = new ConflictDetector()
    let result = {}
    
    switch (testType) {
      case 'conflict-detection':
        result = await detector.findConflicts(testData)
        break
        
      case 'available-slots':
        result = await detector.findAvailableSlots(testData)
        break
        
      case 'cache-clear':
        if (testData.barber_id) {
          detector.clearCache(testData.barber_id)
          result = { message: `Cache cleared for barber ${testData.barber_id}` }
        } else {
          detector.clearAllCaches()
          result = { message: 'All caches cleared' }
        }
        break
        
      default:
        throw new Error(`Unknown test type: ${testType}`)
    }
    
    return NextResponse.json({
      testType,
      result,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS'
    })
    
  } catch (error) {
    console.error(`❌ Specific test failed:`, error)
    
    return NextResponse.json({
      error: 'Specific test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500
    })
  }
}