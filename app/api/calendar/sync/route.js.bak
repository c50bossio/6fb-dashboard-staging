import { NextResponse } from 'next/server'

/**
 * POST /api/calendar/sync
 * Manually trigger calendar sync for a specific account
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, accountId } = body
    
    if (!shopId || !accountId) {
      return NextResponse.json(
        { error: 'Shop ID and Account ID required' },
        { status: 400 }
      )
    }
    
    // Mock sync process - in production this would:
    // 1. Fetch events from Google Calendar API
    // 2. Compare with local events
    // 3. Handle conflicts and duplicates
    // 4. Update sync status and last_sync timestamp
    
    const syncResult = {
      status: 'completed',
      accountId,
      shopId,
      syncedAt: new Date().toISOString(),
      summary: {
        eventsFound: Math.floor(Math.random() * 20) + 5,
        eventsSynced: Math.floor(Math.random() * 15) + 3,
        conflictsResolved: Math.floor(Math.random() * 3),
        errors: []
      },
      nextSync: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    }
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('🔄 Calendar sync completed:', syncResult)
    
    return NextResponse.json(syncResult)
    
  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calendar/sync
 * Get sync history for a barbershop
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
    }
    
    // Mock sync history
    const syncHistory = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `sync-${Date.now() - i * 60000}`,
      shopId,
      accountId: `acc-${i + 1}`,
      status: i === 0 ? 'completed' : ['completed', 'failed', 'in_progress'][Math.floor(Math.random() * 3)],
      startedAt: new Date(Date.now() - i * 60000 - 30000).toISOString(),
      completedAt: new Date(Date.now() - i * 60000).toISOString(),
      eventsSynced: Math.floor(Math.random() * 20) + 1,
      errors: i === 1 ? ['Rate limit exceeded'] : []
    }))
    
    return NextResponse.json(syncHistory)
    
  } catch (error) {
    console.error('Error fetching sync history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    )
  }
}