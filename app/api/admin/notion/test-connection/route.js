import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { notion_token } = body

    if (!notion_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notion API token is required',
        connection_status: 'missing_token'
      }, { status: 400 })
    }

    // Call the Python backend to test the Notion connection
    try {
      const response = await fetch('http://127.0.0.1:8001/notion/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notion_token
        })
      })

      const result = await response.json()

      if (result.success) {
        return NextResponse.json({
          success: true,
          connection_status: 'connected',
          message: 'Notion API connection successful',
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          success: false,
          connection_status: 'failed',
          error: result.error || 'Unable to connect to Notion API',
          timestamp: new Date().toISOString()
        })
      }

    } catch (backendError) {
      // If backend is not available, return a helpful message
      return NextResponse.json({
        success: false,
        connection_status: 'backend_unavailable',
        error: 'Backend service not available. Please ensure the Python FastAPI server is running on port 8001.',
        details: backendError.message,
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Notion connection test error:', error)
    return NextResponse.json({ 
      success: false, 
      connection_status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method not allowed. Use POST to test Notion connection.' 
  }, { status: 405 })
}