import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('calendar_settings')
      .select('*')
      .eq('barber_id', barber_id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching calendar settings:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch settings',
        details: error.message 
      }, { status: 500 })
    }

    const defaultSettings = {
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
      settings: settings || defaultSettings
    })
  } catch (error) {
    console.error('Error getting sync settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    const data = await request.json()
    const { barber_id, ...settings } = data
    
    if (!barber_id) {
      return NextResponse.json({ success: false, error: 'Missing barber_id' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: savedSettings, error } = await supabase
      .from('calendar_settings')
      .upsert({
        barber_id,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving calendar settings:', error)
      return NextResponse.json({ 
        error: 'Failed to save settings',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Sync settings updated successfully',
      settings: savedSettings
    })
  } catch (error) {
    console.error('Error updating sync settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}