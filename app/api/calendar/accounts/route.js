import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    
    const Accounts = [
      {
        account_id: 'google_demo_123',
        provider: 'google',
        email: 'barber@gmail.com',
        display_name: 'John Smith',
        is_primary: true,
        sync_enabled: true,
        last_sync: '2024-01-15 10:30:00',
        sync_direction: 'both',
        sync_stats: {
          total_syncs: 47,
          successful_syncs: 45,
          last_attempt: '2024-01-15 10:30:00',
          success_rate: 95.7
        }
      },
      {
        account_id: 'outlook_demo_456',
        provider: 'outlook',
        email: 'barber@outlook.com',
        display_name: 'John Smith Work',
        is_primary: false,
        sync_enabled: true,
        last_sync: '2024-01-14 16:45:00',
        sync_direction: 'both',
        sync_stats: {
          total_syncs: 23,
          successful_syncs: 20,
          last_attempt: '2024-01-14 16:45:00',
          success_rate: 87.0
        }
      }
    ]

    return NextResponse.json({
      success: true,
      accounts: mockAccounts
    })
  } catch (error) {
    console.error('Error getting connected accounts:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const account_id = searchParams.get('account_id')
    
    if (!account_id) {
      return NextResponse.json({ success: false, error: 'Missing account_id' }, { status: 400 })
    }

    
    const success = true

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error disconnecting account:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}