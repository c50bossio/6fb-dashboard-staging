import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req) {
  try {
    const { messages, model = 'gpt-4', provider = 'openai' } = await req.json()
    
    return NextResponse.json({
      response: `Multi-chat endpoint received ${messages?.length || 0} messages. Provider: ${provider}, Model: ${model}. This is a simplified response while we work on mobile improvements.`,
      model: model,
      provider: provider,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process multi-chat request' },
      { status: 500 }
    )
  }
}