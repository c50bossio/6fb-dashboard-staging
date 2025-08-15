import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

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

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        customer_id,
        service_id,
        barber_id,
        barbershop_id,
        services (name, duration_minutes),
        customers (full_name, email)
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found',
        details: bookingError?.message
      }, { status: 404 })
    }

    const { data: calendarAccount, error: accountError } = await supabase
      .from('calendar_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !calendarAccount) {
      return NextResponse.json({
        success: false,
        error: 'Calendar account not found or not authorized',
        details: accountError?.message
      }, { status: 404 })
    }

    const { data: syncRecord, error: syncError } = await supabase
      .from('calendar_syncs')
      .insert({
        booking_id,
        account_id,
        user_id: user.id,
        sync_status: 'pending',
        provider: calendarAccount.provider,
        sync_requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (syncError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create sync record',
        details: syncError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sync_id: syncRecord.id,
      sync_status: 'pending',
      message: 'Calendar sync request received. External calendar integration requires backend service.',
      booking_details: {
        id: booking.id,
        service: booking.services?.name,
        customer: booking.customers?.full_name,
        start_time: booking.start_time,
        end_time: booking.end_time
      },
      instructions: [
        'Implement Google Calendar API integration in backend service',
        'Implement Outlook Calendar API integration in backend service',
        'Process pending sync records with background job'
      ]
    })
  } catch (error) {
    console.error('Error syncing appointment:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    const account_id = searchParams.get('account_id')
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('calendar_syncs')
      .select(`
        id,
        booking_id,
        account_id,
        external_event_id,
        sync_status,
        sync_requested_at,
        sync_completed_at,
        sync_error,
        provider,
        bookings (
          start_time,
          end_time,
          services (name),
          customers (full_name)
        )
      `)
      .order('sync_requested_at', { ascending: false })
      .limit(100)

    if (barber_id) {
      query = query.eq('bookings.barber_id', barber_id)
    }

    if (account_id) {
      query = query.eq('account_id', account_id)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data: syncHistory, error } = await query

    if (error) {
      console.error('Error fetching sync history:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sync history',
        details: error.message
      }, { status: 500 })
    }

    const history = syncHistory || []
    
    return NextResponse.json({
      success: true,
      sync_history: history.map(sync => ({
        sync_id: sync.id,
        booking_id: sync.booking_id,
        account_id: sync.account_id,
        external_event_id: sync.external_event_id,
        sync_status: sync.sync_status,
        sync_time: sync.sync_completed_at || sync.sync_requested_at,
        sync_error: sync.sync_error,
        provider: sync.provider,
        booking_details: sync.bookings ? {
          service: sync.bookings.services?.name,
          customer: sync.bookings.customers?.full_name,
          start_time: sync.bookings.start_time,
          end_time: sync.bookings.end_time
        } : null
      })),
      summary: {
        total_syncs: history.length,
        successful_syncs: history.filter(s => s.sync_status === 'synced').length,
        failed_syncs: history.filter(s => s.sync_status === 'failed').length,
        pending_syncs: history.filter(s => s.sync_status === 'pending').length
      },
      data_available: history.length > 0,
      message: history.length === 0 ? 'No calendar sync history found. Start by connecting your external calendar.' : null
    })
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}