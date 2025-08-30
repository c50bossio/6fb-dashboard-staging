import { NextResponse } from 'next/server'
import { getCacheStats, healthCheck } from '@/lib/redis-client'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/client-care/cache-stats
 * Monitor Redis cache performance for client care system
 * 
 * Returns:
 * - Cache hit/miss rates
 * - Redis connection health
 * - Performance metrics
 * - Error rates and troubleshooting info
 * 
 * Used by system administrators and monitoring tools
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Verify authentication (admin/owner only)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, barberbarbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check authorization - only owners/managers can view cache stats
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Only shop owners and managers can view cache statistics'
      }, { status: 403 })
    }

    // Get cache statistics and health info
    const [cacheStats, redisHealth] = await Promise.all([
      getCacheStats(),
      healthCheck()
    ])

    // Performance assessment
    const performanceAssessment = {
      overall: 'unknown',
      recommendations: []
    }

    if (cacheStats.total_requests > 10) {
      if (cacheStats.hit_rate >= 70) {
        performanceAssessment.overall = 'excellent'
        performanceAssessment.recommendations.push('Cache performing well - no action needed')
      } else if (cacheStats.hit_rate >= 40) {
        performanceAssessment.overall = 'good'
        performanceAssessment.recommendations.push('Consider increasing cache TTL for better hit rates')
      } else if (cacheStats.hit_rate >= 20) {
        performanceAssessment.overall = 'fair'
        performanceAssessment.recommendations.push('Cache hit rate could be improved')
        performanceAssessment.recommendations.push('Check if cache invalidation is too aggressive')
      } else {
        performanceAssessment.overall = 'poor'
        performanceAssessment.recommendations.push('Low cache hit rate - investigate cache configuration')
        performanceAssessment.recommendations.push('Verify Redis is properly configured and accessible')
      }
    } else {
      performanceAssessment.overall = 'insufficient_data'
      performanceAssessment.recommendations.push('Not enough requests to assess performance')
    }

    // Error rate assessment
    if (cacheStats.error_rate > 5) {
      performanceAssessment.recommendations.push('High cache error rate - check Redis connection stability')
    }

    // Connection health assessment
    if (!redisHealth.healthy) {
      performanceAssessment.recommendations.push('Redis connection issues detected - check configuration')
    }

    return NextResponse.json({
      cache_statistics: cacheStats,
      redis_health: redisHealth,
      performance_assessment: performanceAssessment,
      monitoring: {
        timestamp: new Date().toISOString(),
        barberbarbershop_id: profile.barbershop_id || profile.shop_id,
        checked_by: user.email
      },
      recommendations: {
        optimal_hit_rate: '70%+',
        max_acceptable_response_time: '200ms',
        max_acceptable_error_rate: '5%'
      }
    })
    
  } catch (error) {
    console.error('Error fetching cache stats:', error)
    return NextResponse.json({
      error: 'Failed to fetch cache statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      cache_statistics: {
        hits: 0,
        misses: 0,
        errors: 0,
        total_requests: 0,
        hit_rate: 0,
        error_rate: 0,
        redis_connected: false
      }
    }, { status: 500 })
  }
}

/**
 * POST /api/client-care/cache-stats
 * Reset cache statistics (for testing/maintenance)
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Verify authentication (admin only)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check authorization - only super admins can reset stats
    const authorizedRoles = ['SUPER_ADMIN', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Only administrators can reset cache statistics'
      }, { status: 403 })
    }

    const { action } = await request.json()
    
    if (action === 'reset_stats') {
      // Import resetCacheStats function
      const { resetCacheStats } = await import('@/lib/redis-client')
      resetCacheStats()
      
      // Log the reset action
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'cache_stats_reset',
          details: {
            timestamp: new Date().toISOString(),
            reason: 'Manual reset via API'
          }
        })
      
      return NextResponse.json({ 
        success: true,
        message: 'Cache statistics reset successfully'
      })
    } else {
      return NextResponse.json({ 
        error: 'Invalid action',
        valid_actions: ['reset_stats']
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error managing cache stats:', error)
    return NextResponse.json({
      error: 'Failed to manage cache statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}