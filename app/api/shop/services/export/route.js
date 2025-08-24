'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request) {
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

    // Get services
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create CSV
    const headers = [
      'name',
      'description',
      'category',
      'price',
      'duration_minutes',
      'is_active',
      'is_featured',
      'online_booking_enabled',
      'requires_consultation',
      'display_order'
    ]

    const csvRows = [headers.join(',')]
    
    services.forEach(service => {
      const row = headers.map(header => {
        const value = service[header]
        // Escape commas and quotes in strings
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      })
      csvRows.push(row.join(','))
    })

    const csv = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="services-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export services' }, { status: 500 })
  }
}