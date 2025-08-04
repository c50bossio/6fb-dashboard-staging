import { NextResponse } from 'next/server'

// Simple unified chat endpoint
export async function POST(request) {
  try {
    const { message, model = 'gpt-4' } = await request.json()
    
    return NextResponse.json({
      response: `I received your message: "${message}". This is a simplified response while we work on mobile improvements.`,
      model: model,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

export const runtime = 'edge'