import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'success',
      message: 'Dashboard API is working',
      timestamp: new Date().toISOString(),
      test_data: {
        users: 1,
        revenue: 0,
        tokens: 0
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 })
  }
}