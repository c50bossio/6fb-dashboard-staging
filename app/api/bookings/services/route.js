import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')

    const supabase = createClient()

    // Get services for the barber (or general barbershop services)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price,
        category,
        is_active,
        requires_deposit,
        deposit_amount
      `)
      .eq('is_active', true)
      .order('category, name')

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json({
        error: 'Failed to fetch services'
      }, { status: 500 })
    }

    // Group services by category
    const servicesByCategory = services.reduce((acc, service) => {
      const category = service.category || 'General'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration_minutes,
        price: service.price,
        category: service.category,
        requiresDeposit: service.requires_deposit,
        depositAmount: service.deposit_amount
      })
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      services: services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration_minutes,
        price: service.price,
        category: service.category,
        requiresDeposit: service.requires_deposit,
        depositAmount: service.deposit_amount
      })),
      servicesByCategory
    })

  } catch (error) {
    console.error('Error in services API:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}