import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    
    return NextResponse.json(
      { 
        error: 'Franchise overview endpoint not implemented',
        message: 'This feature requires franchise management services to be implemented in JavaScript/TypeScript'
      },
      { status: 501 }
    )
    
  } catch (error) {
    console.error('Franchise overview API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}