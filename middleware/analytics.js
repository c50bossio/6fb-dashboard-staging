import { NextResponse } from 'next/server'
import { trackServerEvent, EVENTS } from '@/lib/posthog/server'

export async function analyticsMiddleware(request) {
  const { pathname, searchParams } = request.nextUrl
  const userId = request.headers.get('x-user-id')
  
  if (pathname.startsWith('/api/')) {
    const startTime = Date.now()
    
    const requestClone = request.clone()
    let requestBody = {}
    
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        requestBody = await requestClone.json()
      }
    } catch (e) {
    }

    const response = NextResponse.next()
    
    await trackServerEvent(userId || 'anonymous', 'api_request', {
      path: pathname,
      method: request.method,
      query_params: Object.fromEntries(searchParams),
      duration: Date.now() - startTime,
      status: response.status,
      user_agent: request.headers.get('user-agent'),
    })

    if (pathname === '/api/bookings' && request.method === 'POST') {
      await trackServerEvent(userId || 'anonymous', EVENTS.BOOKING_CREATED, {
        ...requestBody,
      })
    }

    if (pathname === '/api/payments' && request.method === 'POST') {
      await trackServerEvent(userId || 'anonymous', EVENTS.PAYMENT_INITIATED, {
        ...requestBody,
      })
    }

    if (pathname.startsWith('/api/ai/chat')) {
      await trackServerEvent(userId || 'anonymous', EVENTS.CHAT_MESSAGE_SENT, {
        endpoint: pathname,
        model: requestBody.model,
      })
    }

    return response
  }

  return NextResponse.next()
}