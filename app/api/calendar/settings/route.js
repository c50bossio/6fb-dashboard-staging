import { NextResponse } from 'next/server'
export const runtime = 'edge'

// Get sync settings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    // In a real implementation, get settings from database
    // from services.calendar_sync_service import CalendarSyncService
    // service = CalendarSyncService()
    // settings = service.get_sync_settings(barber_id)
    
    // Mock settings data
    const Settings = {
      autoCreateEvents: true,
      syncDirection: 'both',
      eventTitleTemplate: '{customer_name} - {service_name}',
      eventDescriptionTemplate: 'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}',
      bufferTimeMinutes: 5,
      conflictResolution: 'manual',
      syncFrequency: 300,
      syncPrivateEvents: false
    }

    return NextResponse.json({
      success: true,
      settings: mockSettings
    })
  } catch (error) {
    console.error('Error getting sync settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Update sync settings
export async function POST(request) {
  try {
    const data = await request.json()
    const { barber_id, ...settings } = data
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    // In a real implementation, save settings to database
    // from services.calendar_sync_service import CalendarSyncService
    // service = CalendarSyncService()
    // service.update_sync_settings(barber_id, settings)
    
    // Mock successful save
    console.log('Updating sync settings for barber:', barber_id, 'Settings:', settings)

    return NextResponse.json({
      success: true,
      message: 'Sync settings updated successfully',
      settings: settings
    })
  } catch (error) {
    console.error('Error updating sync settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}