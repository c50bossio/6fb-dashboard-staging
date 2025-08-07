/**
 * Health Check Endpoint for Unified Business Service
 * Provides status information about the business data service and its dependencies
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const startTime = Date.now();
    
    // Check Python backend availability
    let pythonBackendStatus = 'unknown';
    let pythonBackendResponseTime = null;
    
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
      const pythonStartTime = Date.now();
      
      const response = await fetch(`${pythonServiceUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });
      
      pythonBackendResponseTime = Date.now() - pythonStartTime;
      pythonBackendStatus = response.ok ? 'healthy' : 'error';
      
    } catch (pythonError) {
      pythonBackendStatus = 'unavailable';
      pythonBackendResponseTime = null;
    }

    // Check unified business data service availability
    let businessServiceStatus = 'unknown';
    let cacheStatus = null;
    
    try {
      // Try to get cache status from the Python service
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
      const cacheResponse = await fetch(`${pythonServiceUrl}/business-data/cache-status`, {
        method: 'GET',
        timeout: 3000,
      });
      
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        businessServiceStatus = 'healthy';
        cacheStatus = cacheData;
      } else {
        businessServiceStatus = 'degraded';
      }
      
    } catch (serviceError) {
      businessServiceStatus = 'fallback_only';
      cacheStatus = {
        cache_entries: 0,
        is_valid: false,
        database_type: 'none',
        last_update: null,
        note: 'Using fallback data only'
      };
    }

    // Test data fetch capability
    let dataFetchStatus = 'unknown';
    let dataFetchTime = null;
    
    try {
      const dataStartTime = Date.now();
      
      // Test the unified business data endpoint
      const dataResponse = await fetch(`${request.nextUrl.origin}/api/business-data/metrics?format=json`, {
        method: 'GET',
        timeout: 10000,
      });
      
      dataFetchTime = Date.now() - dataStartTime;
      dataFetchStatus = dataResponse.ok ? 'healthy' : 'error';
      
    } catch (dataError) {
      dataFetchStatus = 'error';
      dataFetchTime = null;
    }

    // Calculate overall health status
    let overallStatus = 'healthy';
    let statusReason = [];
    
    if (pythonBackendStatus === 'unavailable') {
      overallStatus = 'degraded';
      statusReason.push('Python backend unavailable (using fallback data)');
    }
    
    if (businessServiceStatus === 'fallback_only') {
      overallStatus = 'degraded';
      statusReason.push('Business service using fallback data only');
    }
    
    if (dataFetchStatus === 'error') {
      overallStatus = 'unhealthy';
      statusReason.push('Data fetch endpoint failing');
    }

    const totalResponseTime = Date.now() - startTime;

    return NextResponse.json({
      status: overallStatus,
      service: 'unified-business-data-service',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      response_time_ms: totalResponseTime,
      
      dependencies: {
        python_backend: {
          status: pythonBackendStatus,
          response_time_ms: pythonBackendResponseTime,
          url: process.env.PYTHON_BACKEND_URL || 'http://localhost:8001'
        },
        business_service: {
          status: businessServiceStatus,
          cache_status: cacheStatus
        },
        data_endpoint: {
          status: dataFetchStatus,
          response_time_ms: dataFetchTime
        }
      },
      
      health_details: {
        can_serve_data: dataFetchStatus === 'healthy',
        has_live_data: pythonBackendStatus === 'healthy',
        has_cached_data: cacheStatus?.cache_entries > 0,
        fallback_available: true,
        data_consistency: businessServiceStatus !== 'error',
      },
      
      status_reasons: statusReason.length > 0 ? statusReason : ['All systems operational'],
      
      recommendations: overallStatus === 'unhealthy' ? [
        'Check Python backend connectivity',
        'Verify environment configuration',
        'Review service logs for errors'
      ] : overallStatus === 'degraded' ? [
        'Python backend should be restored for live data',
        'Cache refresh may be needed'
      ] : ['System operating normally'],
      
      metrics: {
        total_checks: 3,
        healthy_checks: [pythonBackendStatus, businessServiceStatus, dataFetchStatus].filter(s => s === 'healthy').length,
        degraded_checks: [pythonBackendStatus, businessServiceStatus, dataFetchStatus].filter(s => s === 'degraded' || s === 'fallback_only').length,
        failed_checks: [pythonBackendStatus, businessServiceStatus, dataFetchStatus].filter(s => s === 'error' || s === 'unavailable').length
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      service: 'unified-business-data-service',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * POST endpoint for triggering health check refresh
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { deep_check } = body;

    if (deep_check) {
      // Perform deep health checks
      const deepChecks = {
        data_validation: false,
        cache_refresh: false,
        endpoint_connectivity: false
      };

      try {
        // Test data validation
        const dataResponse = await fetch(`${request.nextUrl.origin}/api/business-data/metrics?force_refresh=true`, {
          method: 'GET',
          timeout: 15000,
        });
        
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          deepChecks.data_validation = data.success === true;
        }
      } catch (e) {
        deepChecks.data_validation = false;
      }

      try {
        // Test cache refresh
        const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
        const refreshResponse = await fetch(`${pythonServiceUrl}/business-data/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_cache: true }),
          timeout: 15000,
        });
        
        deepChecks.cache_refresh = refreshResponse.ok;
      } catch (e) {
        deepChecks.cache_refresh = false;
      }

      try {
        // Test endpoint connectivity
        const connectivityResponse = await fetch(`${request.nextUrl.origin}/api/health`, {
          method: 'GET',
          timeout: 5000,
        });
        
        deepChecks.endpoint_connectivity = connectivityResponse.ok;
      } catch (e) {
        deepChecks.endpoint_connectivity = false;
      }

      return NextResponse.json({
        success: true,
        message: 'Deep health check completed',
        deep_checks: deepChecks,
        overall_health: Object.values(deepChecks).every(check => check) ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Health check refresh completed',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Health check refresh error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Health check refresh failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}