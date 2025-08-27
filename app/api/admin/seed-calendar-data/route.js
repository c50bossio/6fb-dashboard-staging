import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // // Debug log removed for production
// Get or create profile for current user
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Test User',
          role: 'SHOP_OWNER'
        })
        .select()
        .single()

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
      
      profile = newProfile
    }

    // Check if user already has a barbershop
    let barbershop
    if (profile.shop_id) {
      const { data: existingShop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', profile.shop_id)
        .single()
      
      if (existingShop) {
        barbershop = existingShop
        // // Debug log removed for production
}
    }

    // Create barbershop if none exists
    if (!barbershop) {
      const { data: newShop, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: 'Dev Test Barbershop',
          description: 'A test barbershop for development and demo purposes',
          address: '123 Main Street, Los Angeles, CA 90001',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          country: 'US',
          phone: '555-0123',
          email: user.email,
          business_hours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '17:00', closed: false },
            sunday: { open: '10:00', close: '16:00', closed: false }
          },
          owner_id: user.id
        })
        .select()
        .single()

      if (shopError) {
        console.error('Error creating barbershop:', shopError)
        return NextResponse.json({ error: 'Failed to create barbershop' }, { status: 500 })
      }

      barbershop = newShop
      // // Debug log removed for production
// Update profile to link to barbershop
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          shop_id: barbershop.id,
          barbershop_id: barbershop.id,
          role: 'SHOP_OWNER'
        })
        .eq('id', user.id)

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError)
      }
    }

    // Create sample services
    const sampleServices = [
      {
        barbershop_id: barbershop.id,
        name: 'Classic Haircut',
        description: 'Traditional haircut with scissors and clippers',
        duration_minutes: 30,
        price: 25.00,
        category: 'haircut'
      },
      {
        barbershop_id: barbershop.id,
        name: 'Beard Trim',
        description: 'Professional beard trimming and shaping',
        duration_minutes: 20,
        price: 15.00,
        category: 'beard'
      },
      {
        barbershop_id: barbershop.id,
        name: 'Hair & Beard Combo',
        description: 'Full haircut and beard trim combo',
        duration_minutes: 45,
        price: 35.00,
        category: 'combo'
      },
      {
        barbershop_id: barbershop.id,
        name: 'Hot Towel Shave',
        description: 'Traditional hot towel straight razor shave',
        duration_minutes: 40,
        price: 40.00,
        category: 'shave'
      }
    ]

    // Check if services already exist
    const { data: existingServices } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershop.id)

    let services = existingServices || []
    
    if (!existingServices || existingServices.length === 0) {
      const { data: newServices, error: servicesError } = await supabase
        .from('services')
        .insert(sampleServices)
        .select()

      if (servicesError) {
        console.error('Error creating services:', servicesError)
        return NextResponse.json({ error: 'Failed to create services' }, { status: 500 })
      }

      services = newServices
      // // Debug log removed for production
}

    // Create sample client profiles
    const sampleClients = [
      {
        email: 'client1@example.com',
        full_name: 'John Smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '555-0101',
        role: 'CLIENT'
      },
      {
        email: 'client2@example.com',
        full_name: 'Mike Johnson',
        first_name: 'Mike',
        last_name: 'Johnson',
        phone: '555-0102',
        role: 'CLIENT'
      },
      {
        email: 'client3@example.com',
        full_name: 'David Brown',
        first_name: 'David',
        last_name: 'Brown',
        phone: '555-0103',
        role: 'CLIENT'
      }
    ]

    // Check if client profiles exist
    const { data: existingClients } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'CLIENT')
      .in('email', sampleClients.map(c => c.email))

    let clients = existingClients || []

    if (!existingClients || existingClients.length < sampleClients.length) {
      const clientsToCreate = sampleClients.filter(
        sc => !existingClients?.some(ec => ec.email === sc.email)
      )

      if (clientsToCreate.length > 0) {
        const { data: newClients, error: clientsError } = await supabase
          .from('profiles')
          .insert(clientsToCreate)
          .select()

        if (clientsError) {
          console.error('Error creating clients:', clientsError)
        } else {
          clients = [...clients, ...newClients]
          // // Debug log removed for production
}
      }
    }

    // Create sample appointments for the next few days
    const now = new Date()
    const sampleAppointments = []

    // Generate appointments for the next 7 days
    for (let day = 0; day < 7; day++) {
      const appointmentDate = new Date(now)
      appointmentDate.setDate(appointmentDate.getDate() + day)
      
      // Skip Sundays for some appointments
      if (appointmentDate.getDay() === 0 && day % 2 === 0) continue

      // Generate 2-4 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 3) + 2

      for (let i = 0; i < appointmentsPerDay; i++) {
        const service = services[Math.floor(Math.random() * services.length)]
        const client = clients[Math.floor(Math.random() * clients.length)]
        
        if (service && client) {
          const hour = 9 + Math.floor(Math.random() * 8) // 9 AM to 5 PM
          const minute = Math.random() > 0.5 ? 0 : 30 // On the hour or half hour
          
          const scheduledAt = new Date(appointmentDate)
          scheduledAt.setHours(hour, minute, 0, 0)
          
          const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED']
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          
          // Calculate end time
          const endTime = new Date(scheduledAt.getTime() + (service.duration_minutes * 60000))
          
          sampleAppointments.push({
            shop_id: barbershop.id,
            customer_id: client.id,
            service_id: service.id,
            barber_id: user.id, // User is the barber
            appointment_date: scheduledAt.toISOString().split('T')[0], // Date only
            start_time: scheduledAt.toTimeString().slice(0, 5), // HH:mm format
            end_time: endTime.toTimeString().slice(0, 5), // HH:mm format
            status: status,
            total_price: service.price + (Math.random() > 0.7 ? Math.floor(service.price * 0.2 * 100) / 100 : 0),
            notes: ''
          })
        }
      }
    }

    // Check if appointments already exist
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('shop_id', barbershop.id)

    if (!existingAppointments || existingAppointments.length === 0) {
      if (sampleAppointments.length > 0) {
        const { data: newAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .insert(sampleAppointments)
          .select()

        if (appointmentsError) {
          console.error('Error creating appointments:', appointmentsError)
        } else {
          // // Debug log removed for production
}
      }
    } else {
      // // Debug log removed for production
}

    return NextResponse.json({
      success: true,
      message: 'Calendar data created successfully',
      data: {
        barbershop: {
          id: barbershop.id,
          name: barbershop.name
        },
        services: services.length,
        clients: clients.length,
        appointments: sampleAppointments.length
      }
    })

  } catch (error) {
    console.error('Seed calendar data error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  // Support GET method to show current data status
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.shop_id || profile?.barbershop_id

    if (!barbershopId) {
      return NextResponse.json({
        message: 'No barbershop found for user',
        user_email: user.email,
        profile_exists: !!profile
      })
    }

    const [barbershopResult, servicesResult, appointmentsResult] = await Promise.all([
      supabase.from('barbershops').select('*').eq('id', barbershopId).single(),
      supabase.from('services').select('*').eq('barbershop_id', barbershopId),
      supabase.from('appointments').select('*').eq('shop_id', barbershopId)
    ])

    return NextResponse.json({
      user_email: user.email,
      barbershop: barbershopResult.data,
      services_count: servicesResult.data?.length || 0,
      appointments_count: appointmentsResult.data?.length || 0
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}