/**
 * API Method Support Fixes
 * 
 * This script provides fixes for the 405 "Method Not Allowed" errors
 * seen in the browser developer tools after OAuth authentication.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://bookedbarber.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
}

export function handleOptionsRequest() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  })
}

export function addCorsToResponse(response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

// Template for adding missing HTTP methods to API routes
export const API_ROUTE_TEMPLATE = `
// Add this to API routes that are missing method support

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://bookedbarber.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

// For routes that need POST support
export async function POST(request) {
  try {
    // Handle POST logic here
    return NextResponse.json({ 
      message: 'POST method supported',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
`

console.log('🔧 API Fixes Generated - Apply to routes with method issues')