import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request) {
  try {
    // Try to fetch from services table
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      console.log('Services table not found, using default services...')
      
      // Return default services if table doesn't exist
      return NextResponse.json({
        services: [
          { id: '1', name: 'Haircut', price: 35, duration: 30, description: 'Professional haircut' },
          { id: '2', name: 'Beard Trim', price: 20, duration: 20, description: 'Beard shaping and trim' },
          { id: '3', name: 'Hair & Beard', price: 50, duration: 45, description: 'Complete grooming package' },
          { id: '4', name: 'Kids Cut', price: 25, duration: 25, description: "Children's haircut" },
          { id: '5', name: 'Hot Towel Shave', price: 30, duration: 30, description: 'Traditional hot towel shave' },
          { id: '6', name: 'Hair Color', price: 85, duration: 90, description: 'Professional hair coloring' },
          { id: '7', name: 'Fade Cut', price: 45, duration: 45, description: 'Precision fade haircut' }
        ],
        source: 'default'
      })
    }
    
    // Format services for the frontend
    const formattedServices = services.map(service => ({
      id: service.id,
      name: service.name,
      price: parseFloat(service.price),
      duration_minutes: service.duration_minutes || 30,
      description: service.description,
      color: service.color || '#546355',
      category: service.category
    }))
    
    return NextResponse.json({ 
      services: formattedServices, 
      source: 'database',
      count: formattedServices.length 
    })
    
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Insert new service
    const { data, error } = await supabase
      .from('services')
      .insert([{
        name: body.name,
        description: body.description,
        duration_minutes: body.duration_minutes || 30,
        price: body.price || 0,
        color: body.color || '#546355',
        is_active: true
      }])
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ service: data })
    
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Failed to create service', details: error.message },
      { status: 500 }
    )
  }
}