import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const serviceSchema = z.object({
  shop_id: z.string().uuid(),  // services table uses 'shop_id' not 'barbershop_id'
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  duration_minutes: z.number().min(15).max(480),
  price: z.number().min(0),
  category: z.string().max(100).optional(),
  is_active: z.boolean().optional().default(true)
})

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const category = searchParams.get('category')
    const active_only = searchParams.get('active_only') !== 'false'

    let query = supabase
      .from('services')
      .select('*')  // Simplified - avoid complex joins that may fail
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (barbershop_id) {
      // Note: services table uses 'shop_id' not 'barbershop_id'
      query = query.eq('shop_id', barbershop_id)
    }
    
    if (category) {
      query = query.eq('category', category)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: services, error } = await query

    if (error) {
      console.error('Database query failed:', error.message)
      return NextResponse.json({ 
        error: 'Failed to fetch services',
        details: error.message 
      }, { status: 500 })
    }

    const finalServices = services

    const servicesByCategory = finalServices.reduce((acc, service) => {
      const category = service.category || 'General'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(service)
      return acc
    }, {})

    return NextResponse.json({
      services: finalServices,
      servicesByCategory,
      total: finalServices.length
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/services:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const validationResult = serviceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const serviceData = validationResult.data

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        ...serviceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')  // Simplified - avoid complex joins that may fail
      .single()

    if (error) {
      console.error('Error creating service:', error)
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Service created successfully',
      service
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/services:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}