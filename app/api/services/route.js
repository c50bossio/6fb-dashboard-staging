import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { success, error as apiError, serverError } from '@/lib/api-response'

// Demo barbershop ID constant - matches Supabase UUID
const DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Validation schema for services
const serviceSchema = z.object({
  barbershop_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  duration_minutes: z.number().min(15).max(480),
  price: z.number().min(0),
  category: z.string().max(100).optional(),
  is_active: z.boolean().optional().default(true)
})

// GET /api/services - Fetch services
export async function GET(request) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const category = searchParams.get('category')
    const active_only = searchParams.get('active_only') !== 'false'

    // Build query with filters
    let query = supabase
      .from('services')
      .select(`
        *,
        barbershop:barbershops(id, name)
      `)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    // Filter by barbershop_id (RLS security)
    if (barbershop_id) {
      query = query.eq('barbershop_id', barbershop_id)
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category)
    }

    // Filter by active status
    if (active_only) {
      query = query.eq('is_active', true)
    }

    // Execute database query
    const { data: services, error } = await query

    // Handle database errors
    if (error) {
      console.error('[Services API] Database query failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        barbershop_id,
        category,
        active_only
      })

      return serverError('Failed to fetch services from database', error)
    }

    // Return empty array if no services exist (NO MOCK DATA)
    const finalServices = services || []

    // Group services by category for easier frontend consumption
    const servicesByCategory = finalServices.reduce((acc, service) => {
      const cat = service.category || 'General'
      if (!acc[cat]) {
        acc[cat] = []
      }
      acc[cat].push(service)
      return acc
    }, {})

    // Return successful response with metadata
    return NextResponse.json({
      services: finalServices,
      servicesByCategory,
      total: finalServices.length,
      meta: {
        barbershop_id,
        category: category || 'all',
        active_only,
        has_services: finalServices.length > 0
      }
    })

  } catch (error) {
    console.error('[Services API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

// POST /api/services - Create new service
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = serviceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const serviceData = validationResult.data

    // Create service
    const { data: service, error } = await supabase
      .from('services')
      .insert({
        ...serviceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        barbershop:barbershops(id, name)
      `)
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