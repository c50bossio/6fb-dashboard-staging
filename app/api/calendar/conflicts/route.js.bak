import { NextResponse } from 'next/server'

/**
 * GET /api/calendar/conflicts
 * Get calendar conflicts for a date range
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
    }
    
    // Mock conflicts - empty for now
    const conflicts = []
    
    return NextResponse.json(conflicts)
  } catch (error) {
    console.error('Error fetching calendar conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    )
  }
}