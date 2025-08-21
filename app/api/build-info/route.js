import { NextResponse } from 'next/server'

/**
 * API endpoint to return current build information
 * Used by the cache manager to detect when a new deployment is available
 */
export async function GET() {
  try {
    const buildInfo = {
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'unknown',
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
      version: '2.0.0',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      // Add deployment-specific metadata
      deployment: {
        platform: 'vercel',
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'localhost'
      }
    }

    return NextResponse.json(buildInfo, {
      headers: {
        // Ensure this endpoint is never cached
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Add CORS headers for client-side access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('Error in build-info endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve build information' },
      { status: 500 }
    )
  }
}