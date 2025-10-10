#!/usr/bin/env node

// Create test barbershop data using Supabase service role
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestBarbershopData() {
  // // Debug log removed for production
try {
    // Create or find a test user profile
    const testEmail = 'dev@bookedbarber.com'
    let profileId
    
    // Check for existing profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single()
    
    if (existingProfile) {
      profileId = existingProfile.id
      // // Debug log removed for production
} else {
      // Create a test profile with a static UUID
      profileId = '00000000-0000-0000-0000-000000000001'
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          email: testEmail,
          full_name: 'Dev Test User',
          role: 'SHOP_OWNER'
        })
        .select()
        .single()
      
      if (profileError) {
        console.error('❌ Error creating profile:', profileError)
        // Try to continue if profile already exists
        if (profileError.code !== '23505') return
      } else {
        // // Debug log removed for production
}
    }
    
    // Check if barbershop already exists
    const { data: existingBarbershop } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', profileId)
      .single()
    
    let barbershop = existingBarbershop
    
    if (!barbershop) {
      // Create barbershop
      const { data: newBarbershop, error: barbershopError } = await supabase
        .from('barbershops')
        .insert({
          name: 'Dev Test Barbershop',
          owner_id: profileId,
          address: '123 Main Street, Los Angeles, CA 90001',
          phone: '555-0123',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          country: 'US',
          business_hours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '17:00', closed: false },
            sunday: { open: '10:00', close: '16:00', closed: false }
          }
        })
        .select()
        .single()
      
      if (barbershopError) {
        console.error('❌ Error creating barbershop:', barbershopError)
        return
      }
      
      barbershop = newBarbershop
      // // Debug log removed for production
// Update profile with shop_id
      await supabase
        .from('profiles')
        .update({ barbershop_id: barbershop.id })
        .eq('id', profileId)
      
      // // Debug log removed for production
} else {
      // // Debug log removed for production
}
    
    // Create sample services using shop_id
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
      }
    ]
    
    // Check for existing services
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
        console.error('❌ Error creating services:', servicesError)
      } else {
        services = newServices
        // // Debug log removed for production
}
    } else {
      // // Debug log removed for production
}
    
    // Skip customer creation for now - will create walk-in appointments
    // // Debug log removed for production
// Create sample appointments for the next 7 days
    const now = new Date()
    const sampleAppointments = []
    
    for (let day = 0; day < 7; day++) {
      const appointmentDate = new Date(now)
      appointmentDate.setDate(appointmentDate.getDate() + day)
      
      // Generate 2-3 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 2) + 2
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        const service = services[Math.floor(Math.random() * services.length)]
        const customerNames = ['John Smith', 'Mike Johnson', 'David Brown', 'Sarah Wilson', 'Alex Carter']
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)]
        
        if (service) {
          const hour = 9 + Math.floor(Math.random() * 8) // 9 AM to 5 PM
          const minute = Math.random() > 0.5 ? 0 : 30 // On the hour or half hour
          
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const endHour = hour + Math.floor(service.duration_minutes / 60)
          const endMinute = minute + (service.duration_minutes % 60)
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
          
          const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED']
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          
          sampleAppointments.push({
            barbershop_id: barbershop.id,
            customer_id: null, // Walk-in appointment
            service_id: service.id,
            barber_id: profileId,
            start_time: `${appointmentDate.toISOString().split('T')[0]}T${startTime}:00.000Z`,
            end_time: `${appointmentDate.toISOString().split('T')[0]}T${endTime}:00.000Z`,
            status: status
          })
        }
      }
    }
    
    // Check for existing appointments
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('barbershop_id', barbershop.id)
    
    if (!existingAppointments || existingAppointments.length === 0) {
      if (sampleAppointments.length > 0) {
        const { data: newAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .insert(sampleAppointments)
          .select()
        
        if (appointmentsError) {
          console.error('❌ Error creating appointments:', appointmentsError)
        } else {
          // // Debug log removed for production
}
      }
    } else {
      // // Debug log removed for production
}
    
    // // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
createTestBarbershopData()