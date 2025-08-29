/**
 * Memory Management API for OAuth Operations
 * CRITICAL: Prevents OAuth callback loops by managing memory pressure and session cleanup
 */

import { NextRequest, NextResponse } from 'next/server'

const oauthSessions = new Map()
const OAUTH_SESSION_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request) {
  try {
    const memoryUsage = process.memoryUsage()
    const memoryStats = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024), // MB
    }
    
    const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal
    
    const currentTime = Date.now()
    let activeOAuthSessions = 0
    const expiredSessions = []
    
    for (const [sessionId, sessionData] of oauthSessions.entries()) {
      if (currentTime - sessionData.createdAt > OAUTH_SESSION_TTL) {
        expiredSessions.push(sessionId)
      } else {
        activeOAuthSessions++
      }
    }
    
    expiredSessions.forEach(sessionId => {
      oauthSessions.delete(sessionId)
    })
    
    return NextResponse.json({
      success: true,
      memory: memoryStats,
      memoryPressure: Math.round(memoryPressure * 1000) / 1000,
      memoryPressurePercent: `${Math.round(memoryPressure * 100)}%`,
      memoryStatus: memoryPressure > 0.9 ? 'critical' : memoryPressure > 0.7 ? 'high' : 'normal',
      oauthSessions: {
        active: activeOAuthSessions,
        expired: expiredSessions.length,
        total: oauthSessions.size
      }
    })
  } catch (error) {
    console.error('❌ Memory stats error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get memory statistics'
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, sessionId, sessionData } = body
    
    switch (action) {
      case 'register':
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID is required'
          }, { status: 400 })
        }
        
        oauthSessions.set(sessionId, {
          createdAt: Date.now(),
          ...sessionData
        })
        
        
        return NextResponse.json({
          success: true,
          message: 'OAuth session registered',
          sessionId,
          totalSessions: oauthSessions.size
        })
        
      case 'cleanup':
        if (sessionId) {
          const deleted = oauthSessions.delete(sessionId)
          
          return NextResponse.json({
            success: true,
            message: `Session ${sessionId} cleaned up`,
            wasFound: deleted,
            totalSessions: oauthSessions.size
          })
        } else {
          const currentTime = Date.now()
          let cleanedCount = 0
          
          for (const [id, data] of oauthSessions.entries()) {
            if (currentTime - data.createdAt > OAUTH_SESSION_TTL) {
              oauthSessions.delete(id)
              cleanedCount++
            }
          }
          
          const memoryUsage = process.memoryUsage()
          const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal
          
          if (memoryPressure > 0.8 && global.gc) {
            global.gc()
          }
          
          return NextResponse.json({
            success: true,
            message: 'Expired OAuth sessions cleaned up',
            cleanedSessions: cleanedCount,
            totalSessions: oauthSessions.size,
            memoryPressure: Math.round(memoryPressure * 100) + '%',
            garbageCollected: memoryPressure > 0.8 && global.gc
          })
        }
        
      case 'force-cleanup':
        const clearedCount = oauthSessions.size
        oauthSessions.clear()
        
        if (global.gc) {
          global.gc()
        }
        
        
        return NextResponse.json({
          success: true,
          message: 'Emergency cleanup completed',
          clearedSessions: clearedCount,
          garbageCollected: !!global.gc
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: register, cleanup, or force-cleanup'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Memory management error:', error)
    return NextResponse.json({
      success: false,
      error: 'Memory management operation failed'
    }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 })
    }
    
    const deleted = oauthSessions.delete(sessionId)
    
    return NextResponse.json({
      success: true,
      message: `OAuth session ${sessionId} ${deleted ? 'removed' : 'not found'}`,
      wasFound: deleted,
      totalSessions: oauthSessions.size
    })
    
  } catch (error) {
    console.error('❌ OAuth session cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup OAuth session'
    }, { status: 500 })
  }
}