import { NextResponse } from 'next/server'
export const runtime = 'edge'

// Sync appointment to external calendar
export async function POST(request) {
  try {
    const data = await request.json()
    const { booking_id, account_id } = data
    
    if (!booking_id || !account_id) {
      return NextResponse.json(
        { success: false, error: 'Missing booking_id or account_id' },
        { status: 400 }
      )
    }

    // In a real implementation, sync the appointment
    // from services.calendar_sync_service import CalendarSyncService
    // service = CalendarSyncService()
    // result = service.sync_appointment_to_external_calendar(booking_id, account_id)
    
    // Mock sync result - simulate success most of the time
    const success = Math.random() > 0.1 // 90% success rate
    
    if (success) {
      const result = {
        success: true,
        external_event_id: `ext_event_${Date.now()}`,
        event_url: 'https://calendar.google.com/calendar/event?eid=demo',
        sync_time: new Date().toISOString(),
        provider: account_id.startsWith('google') ? 'Google Calendar' : 'Outlook Calendar'
      }

      console.log('Mock sync successful:', result)

      return NextResponse.json(result)
    } else {
      // Mock occasional sync failure
      const errorMessages = [
        'Calendar API rate limit exceeded',
        'Invalid calendar permissions',
        'Network connection timeout',
        'Event conflicts with existing appointment'
      ]
      
      const error = errorMessages[Math.floor(Math.random() * errorMessages.length)]
      
      console.log('Mock sync failed:', error)

      return NextResponse.json({
        success: false,
        error: error,
        retry_after: 300 // Suggest retry after 5 minutes
      })
    }
  } catch (error) {
    console.error('Error syncing appointment:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Get sync status for appointments
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    const account_id = searchParams.get('account_id')
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    // In a real implementation, get sync history from database
    // from services.calendar_sync_service import CalendarSyncService
    // service = CalendarSyncService()
    // sync_history = service.get_sync_history(barber_id, account_id)
    
    // Mock sync history
    const SyncHistory = [
      {
        sync_id: 'sync_1',
        booking_id: 'booking_123',
        account_id: 'google_demo_123',
        external_event_id: 'ext_event_123',
        sync_status: 'synced',
        sync_time: '2024-01-15 10:30:00',
        provider: 'Google Calendar'
      },
      {
        sync_id: 'sync_2',
        booking_id: 'booking_124',
        account_id: 'outlook_demo_456',
        external_event_id: 'ext_event_124',
        sync_status: 'synced',
        sync_time: '2024-01-15 09:15:00',
        provider: 'Outlook Calendar'
      },
      {
        sync_id: 'sync_3',
        booking_id: 'booking_125',
        account_id: 'google_demo_123',
        external_event_id: null,
        sync_status: 'failed',
        sync_time: '2024-01-15 08:45:00',
        sync_error: 'Calendar API rate limit exceeded',
        provider: 'Google Calendar'
      }
    ]

    // Filter by account_id if provided
    const filteredHistory = account_id 
      ? mockSyncHistory.filter(sync => sync.account_id === account_id)
      : mockSyncHistory

    return NextResponse.json({
      success: true,
      sync_history: filteredHistory,
      summary: {
        total_syncs: filteredHistory.length,
        successful_syncs: filteredHistory.filter(s => s.sync_status === 'synced').length,
        failed_syncs: filteredHistory.filter(s => s.sync_status === 'failed').length,
        pending_syncs: filteredHistory.filter(s => s.sync_status === 'pending').length
      }
    })
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}