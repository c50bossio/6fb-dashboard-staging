import { NextResponse } from 'next/server'

/**
 * GET /api/calendar/sync/status
 * Get sync status for a barbershop
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId')
    
    if (!barbershopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 })
    }
    
    // Mock sync status
    const syncStatus = {
      status: 'completed',
      progress: 100,
      lastSync: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      nextSync: new Date(Date.now() + 1800000).toISOString(), // in 30 minutes
      appointmentsSynced: 12,
      errors: []
    }
    
    return NextResponse.json(syncStatus)
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}