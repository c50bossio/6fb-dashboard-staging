/**
 * Error Reporting API Route
 * Handles frontend error reporting and forwards to Sentry
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function POST(request) {
  try {
    const errorData = await request.json()
    
    const eventId = Sentry.captureMessage(
      errorData.message || 'Unknown frontend error',
      {
        level: errorData.level || 'error',
        extra: {
          ...errorData.context,
          stack: errorData.stack,
          timestamp: errorData.timestamp,
          url: errorData.context?.url,
          userAgent: errorData.context?.userAgent,
        },
        tags: {
          source: 'frontend',
          type: errorData.type || 'unknown',
          component: errorData.context?.component || 'unknown',
        },
        user: errorData.context?.userId ? {
          id: errorData.context.userId,
          email: errorData.context.email,
        } : undefined,
      }
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Frontend error reported:', {
        message: errorData.message,
        context: errorData.context,
        eventId,
      })
    }
    
    return NextResponse.json({
      success: true,
      eventId,
      message: 'Error reported successfully',
    })
  } catch (error) {
    console.error('Failed to report error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process error report',
    })
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}