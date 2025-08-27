import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to determine barbershop access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Determine barbershop ID based on user role
    let barbershopId = profile.shop_id || profile.barbershop_id

    // If user doesn't have direct shop access, check if they're staff
    if (!barbershopId) {
      const { data: staffRecord, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (staffRecord) {
        barbershopId = staffRecord.barbershop_id
      }
    }

    if (!barbershopId) {
      console.log('No barbershop found for user:', user.id)
      return NextResponse.json({ 
        services: [],
        message: 'No barbershop found for user'
      })
    }

    console.log('Fetching services for barbershop:', barbershopId)

    // Fetch services for the barbershop - try both possible field names
    let services, servicesError
    
    // First try with shop_id (more common in the schema)
    const shopIdResult = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        price,
        duration_minutes,
        category,
        is_active,
        shop_id,
        created_at,
        updated_at
      `)
      .eq('shop_id', barbershopId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    
    if (shopIdResult.error) {
      console.log('Trying barbershop_id field instead...')
      // Fallback to barbershop_id
      const barbershopResult = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          price,
          duration_minutes,
          category,
          is_active,
          barbershop_id,
          created_at,
          updated_at
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      
      services = barbershopResult.data
      servicesError = barbershopResult.error
    } else {
      services = shopIdResult.data
      servicesError = shopIdResult.error
    }

    if (servicesError) {
      console.error('Services fetch error:', servicesError)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    console.log(`Found ${services?.length || 0} services for barbershop ${barbershopId}`)

    return NextResponse.json({
      services: services || [],
      barbershop_id: barbershopId,
      user_role: profile.role
    })

  } catch (error) {
    console.error('Calendar services API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, price, duration_minutes, category } = body

    // Validate required fields
    if (!name || !price || !duration_minutes) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, price, duration_minutes' 
      }, { status: 400 })
    }

    // Get user profile to determine barbershop access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError) {
      console.error('Profile fetch error for POST:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Determine barbershop ID (must be owner or authorized staff)
    let barbershopId = profile.shop_id || profile.barbershop_id

    if (!barbershopId) {
      const { data: staffRecord, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (staffRecord && (staffRecord.role === 'MANAGER' || staffRecord.role === 'ADMIN')) {
        barbershopId = staffRecord.barbershop_id
      }
    }

    if (!barbershopId) {
      return NextResponse.json({ 
        error: 'Not authorized to create services' 
      }, { status: 403 })
    }

    // Create the service - use shop_id (more common field name)
    const { data: newService, error: createError } = await supabase
      .from('services')
      .insert({
        shop_id: barbershopId,
        name: name.trim(),
        description: description?.trim() || '',
        price: parseFloat(price),
        duration_minutes: parseInt(duration_minutes),
        category: category?.trim() || 'general',
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Service creation error:', createError)
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
    }

    console.log('Created new service:', newService.name, 'for barbershop:', barbershopId)

    return NextResponse.json({
      success: true,
      service: newService
    })

  } catch (error) {
    console.error('Create service API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}