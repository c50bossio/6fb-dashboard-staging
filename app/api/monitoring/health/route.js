import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

/**
 * System Health Monitoring Endpoint
 * Provides comprehensive health and performance metrics
 */
export async function GET(request) {
  try {
    const startTime = Date.now()
    
    const dbHealth = await checkDatabaseHealth()
    
    const fsHealth = await checkFileSystemHealth()
    
    const systemMetrics = await getSystemMetrics()
    
    const serviceMetrics = await getServiceMetrics()
    
    const overallStatus = calculateOverallStatus([
      dbHealth.status,
      fsHealth.status,
      systemMetrics.status,
      serviceMetrics.status
    ])
    
    const responseTime = Date.now() - startTime
    
    const healthData = {
      status: overallStatus,
      timestamp: Date.now(),
      responseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth,
        filesystem: fsHealth,
        ...serviceMetrics.services
      },
      resources: systemMetrics.resources,
      performance: {
        ...systemMetrics.performance,
        healthCheckResponseTime: responseTime
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
    
    return NextResponse.json(healthData, { 
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: error.message,
      services: {
        healthCheck: {
          status: 'unhealthy',
          error: error.message,
          responseTime: null
        }
      }
    }, { status: 503 })
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth() {
  const startTime = Date.now()
  
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: error.message,
        lastCheck: Date.now()
      }
    }
    
    return {
      status: 'healthy',
      responseTime,
      lastCheck: Date.now(),
      queryResult: data ? 'success' : 'empty'
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      lastCheck: Date.now()
    }
  }
}

/**
 * Check file system health
 */
async function checkFileSystemHealth() {
  const startTime = Date.now()
  
  try {
    const packagePath = path.join(process.cwd(), 'package.json')
    const packageExists = fs.existsSync(packagePath)
    
    const tempDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const testFile = path.join(tempDir, 'health-check.txt')
    fs.writeFileSync(testFile, 'health check', 'utf8')
    const canRead = fs.readFileSync(testFile, 'utf8') === 'health check'
    
    fs.unlinkSync(testFile)
    
    const responseTime = Date.now() - startTime
    
    return {
      status: packageExists && canRead ? 'healthy' : 'degraded',
      responseTime,
      checks: {
        packageJsonExists: packageExists,
        canWriteTemp: true,
        canReadTemp: canRead
      },
      lastCheck: Date.now()
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      lastCheck: Date.now()
    }
  }
}

/**
 * Get system resource metrics
 */
async function getSystemMetrics() {
  try {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / process.uptime() * 100
    
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
    
    return {
      status: cpuPercent > 80 || memPercent > 85 ? 'degraded' : 'healthy',
      resources: {
        cpu: {
          usage: Math.min(cpuPercent, 100),
          userTime: cpuUsage.user,
          systemTime: cpuUsage.system
        },
        memory: {
          usage: memPercent,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        },
        process: {
          uptime: process.uptime(),
          pid: process.pid,
          version: process.version,
          platform: process.platform
        }
      },
      performance: {
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      resources: null,
      performance: null
    }
  }
}

/**
 * Get service-specific metrics
 */
async function getServiceMetrics() {
  const services = {}
  
  try {
    services.frontend = {
      status: 'healthy',
      responseTime: 0, // Will be calculated by caller
      uptime: process.uptime(),
      lastCheck: Date.now()
    }
    
    try {
      const backendUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
      const backendStart = Date.now()
      
      const backendResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        timeout: 5000
      })
      
      services.backend = {
        status: backendResponse.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - backendStart,
        httpStatus: backendResponse.status,
        lastCheck: Date.now()
      }
      
    } catch (error) {
      services.backend = {
        status: 'unhealthy',
        error: 'Backend not reachable',
        lastCheck: Date.now()
      }
    }
    
    services.cache = {
      status: 'healthy', // Assume healthy since it's browser-based IndexedDB
      type: 'indexeddb',
      lastCheck: Date.now()
    }
    
    services.websocket = {
      status: 'healthy', // Assume healthy - would need more complex check
      connections: 0, // Would track active connections
      lastCheck: Date.now()
    }
    
    return {
      status: 'healthy',
      services
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      services: {
        error: error.message
      }
    }
  }
}

/**
 * Calculate overall system status based on component statuses
 */
function calculateOverallStatus(statuses) {
  if (statuses.some(status => status === 'unhealthy')) {
    return 'unhealthy'
  }
  
  if (statuses.some(status => status === 'degraded')) {
    return 'degraded'
  }
  
  return 'healthy'
}