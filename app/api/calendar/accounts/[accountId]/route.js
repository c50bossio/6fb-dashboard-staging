import { NextResponse } from 'next/server'

// Delete specific account
export async function DELETE(request, { params }) {
  try {
    const { accountId } = params
    
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Missing account ID' }, { status: 400 })
    }

    // In a real implementation, disconnect the specific account
    // from services.calendar_sync_service import CalendarSyncService
    // service = CalendarSyncService()
    // success = service.disconnect_account(accountId)
    
    // Mock successful disconnection
    const success = true

    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Calendar account disconnected successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect calendar account' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error disconnecting calendar account:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}