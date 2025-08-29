import { NextResponse } from 'next/server'

/**
 * GET /api/calendar/accounts
 * List connected calendar accounts for a barbershop
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
    }
    
    // Mock data for testing
    const mockAccounts = [
      {
        id: 'acc-1',
        email: 'shop@gmail.com',
        provider: 'google',
        sync_enabled: true,
        last_sync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ]
    
    return NextResponse.json(mockAccounts)
  } catch (error) {
    console.error('Error fetching calendar accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar accounts' },
      { status: 500 }
    )
  }
}