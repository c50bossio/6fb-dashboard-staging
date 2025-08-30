import { NextResponse } from 'next/server'

/**
 * DELETE /api/calendar/disconnect
 * Disconnect a calendar account
 */
export async function DELETE(request) {
  try {
    const body = await request.json()
    const { barbershopId, accountId } = body
    
    if (!barbershopId || !accountId) {
      return NextResponse.json(
        { error: 'Shop ID and Account ID required' },
        { status: 400 }
      )
    }
    
    // Mock disconnect process - in production this would:
    // 1. Revoke OAuth tokens
    // 2. Delete stored credentials
    // 3. Remove calendar integration record
    // 4. Clean up any synced data if requested
    
    const disconnectResult = {
      success: true,
      accountId,
      barbershopId,
      disconnectedAt: new Date().toISOString(),
      message: 'Calendar account disconnected successfully'
    }
    
    console.log('🔌 Calendar account disconnected:', disconnectResult)
    
    return NextResponse.json(disconnectResult)
    
  } catch (error) {
    console.error('Error disconnecting calendar account:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect calendar account' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/calendar/disconnect
 * Alternative endpoint for disconnecting (some clients prefer POST)
 */
export async function POST(request) {
  // Delegate to DELETE method
  return DELETE(request)
}