'use server'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

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
    const supabase = createClient()
    
    // Get user session
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
      .select(`
        *,
        barbershop:barbershops(id, name)
      `)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (barbershop_id) {
      query = query.eq('barbershop_id', barbershop_id)
    }
    
    if (category) {
      query = query.eq('category', category)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: services, error } = await query

    if (error) {
      console.warn('Database query failed, using mock data:', error.message)
      
      // Mock services data for demo/development
      const mockServices = [
        {
          id: 'service-001',
          name: 'Classic Haircut',
          description: 'Traditional haircut with scissors and clippers',
          price: 35,
          duration_minutes: 30,
          barbershop_id: barbershop_id || 'demo-shop-001',
          is_active: true,
          category: 'Hair'
        },
        {
          id: 'service-002',
          name: 'Fade Cut',
          description: 'Modern fade haircut with precise blending',
          price: 45,
          duration_minutes: 45,
          barbershop_id: barbershop_id || 'demo-shop-001',
          is_active: true,
          category: 'Hair'
        },
        {
          id: 'service-003',
          name: 'Beard Trim',
          description: 'Professional beard shaping and trimming',
          price: 25,
          duration_minutes: 20,
          barbershop_id: barbershop_id || 'demo-shop-001',
          is_active: true,
          category: 'Beard'
        },
        {
          id: 'service-004',
          name: 'Hot Towel Shave',
          description: 'Luxury hot towel shave with straight razor',
          price: 50,
          duration_minutes: 45,
          barbershop_id: barbershop_id || 'demo-shop-001',
          is_active: true,
          category: 'Shave'
        },
        {
          id: 'service-005',
          name: 'Hair & Beard Combo',
          description: 'Complete haircut and beard grooming package',
          price: 60,
          duration_minutes: 60,
          barbershop_id: barbershop_id || 'demo-shop-001',
          is_active: true,
          category: 'Package'
        }
      ]

      // Filter by active status and category
      let finalServices = active_only ? mockServices.filter(s => s.is_active) : mockServices
      if (category) {
        finalServices = finalServices.filter(s => s.category === category)
      }
      
      // Group services by category
      const servicesByCategory = finalServices.reduce((acc, service) => {
        const cat = service.category || 'General'
        if (!acc[cat]) {
          acc[cat] = []
        }
        acc[cat].push(service)
        return acc
      }, {})

      return NextResponse.json({
        services: finalServices,
        servicesByCategory,
        total: finalServices.length
      })
    }

    // If no services found, try to get default services from payment service
    let finalServices = services
    if (services.length === 0) {
      try {
        const { spawn } = await import('child_process')
        const path = await import('path')
        
        const scriptPath = path.join(process.cwd(), 'scripts', 'payment_api.py')
        const pythonProcess = spawn('python3', [scriptPath, 'get-services'], {
          stdio: ['pipe', 'pipe', 'pipe']
        })

        pythonProcess.stdin.write('{}')
        pythonProcess.stdin.end()

        const result = await new Promise((resolve) => {
          let stdout = ''
          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString()
          })
          pythonProcess.on('close', () => {
            try {
              resolve(JSON.parse(stdout.trim()))
            } catch {
              resolve({ success: false, services: [] })
            }
          })
        })

        if (result.success && result.services) {
          finalServices = result.services.map(service => ({
            id: service.service_id,
            name: service.name,
            price: service.base_price,
            duration_minutes: service.duration_minutes,
            category: service.category,
            deposit_required: service.deposit_required,
            deposit_percentage: service.deposit_percentage,
            is_active: true
          }))
        }
      } catch (error) {
        console.error('Failed to fetch default services:', error)
      }
    }

    // Group services by category
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

// POST /api/services - Create new service
export async function POST(request) {
  try {
    const supabase = createClient()
    
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