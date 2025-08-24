'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    let barbershopId = profile?.shop_id || profile?.barbershop_id

    if (!barbershopId) {
      // Try barbershop_staff table
      const { data: staffData } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!staffData?.barbershop_id) {
        return NextResponse.json({ error: 'No barbershop found' }, { status: 400 })
      }
      barbershopId = staffData.barbershop_id
    }

    // Parse the CSV file
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const services = []
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      const values = lines[i].split(',').map(v => v.trim())
      const service = {}
      
      headers.forEach((header, index) => {
        let value = values[index]
        
        // Convert boolean strings
        if (header.includes('is_') || header.includes('_enabled') || header.includes('requires_')) {
          value = value?.toLowerCase() === 'true'
        }
        // Convert numbers
        else if (header === 'price' || header === 'duration_minutes' || header === 'display_order') {
          value = parseFloat(value) || 0
        }
        
        service[header] = value
      })
      
      // Add shop_id and ensure required fields (services table uses 'shop_id' not 'barbershop_id')
      service.shop_id = barbershopId
      service.is_active = service.is_active ?? true
      service.online_booking_enabled = service.online_booking_enabled ?? true
      service.display_order = service.display_order || services.length
      
      if (service.name && service.price && service.duration_minutes) {
        services.push(service)
      }
    }

    if (services.length === 0) {
      return NextResponse.json({ error: 'No valid services found in file' }, { status: 400 })
    }

    // Insert services
    const { data, error } = await supabase
      .from('services')
      .insert(services)
      .select()

    if (error) {
      console.error('Error importing services:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      count: data.length,
      services: data 
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to import services' }, { status: 500 })
  }
}