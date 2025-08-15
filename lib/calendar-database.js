
import { createClient } from './supabase/server'

// ==========================================
// ==========================================

export async function getCalendarEvents(barbershopId = 'demo-shop-001', startDate, endDate) {
  const supabase = createClient()
  
  try {
    const { data: appointments, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        service_name,
        service_price,
        service_duration,
        customer_name,
        customer_phone,
        customer_email,
        notes,
        barber_id,
        barbershops!appointments_barbershop_id_fkey(name),
        barber:users!appointments_barber_id_fkey(
          id,
          name,
          email
        )
      `)
      .eq('barbershop_id', barbershopId)
      .gte('start_time', startDate || new Date().toISOString())
      .lte('start_time', endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true })
    
    if (error) throw error
    
    const events = (appointments || []).map(appointment => ({
      id: appointment.id,
      title: `${appointment.customer_name} - ${appointment.service_name}`,
      start: appointment.start_time,
      end: appointment.end_time,
      resourceId: appointment.barber_id,
      backgroundColor: getStatusColor(appointment.status),
      borderColor: getStatusColor(appointment.status),
      extendedProps: {
        customer: appointment.customer_name,
        service: appointment.service_name,
        duration: appointment.service_duration,
        price: appointment.service_price,
        status: appointment.status,
        phone: appointment.customer_phone,
        email: appointment.customer_email,
        notes: appointment.notes,
        barber: appointment.barber?.name,
        isRealData: true // Clearly indicate this is real data
      }
    }))
    
    console.log(`📅 Loaded ${events.length} real appointments from database`)
    return events
    
  } catch (error) {
    console.error('Failed to get calendar events:', error)
    return []
  }
}

// ==========================================
// ==========================================

export async function getBarberResources(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data: barbers, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        profiles:user_profiles(
          specialization,
          experience_years,
          hourly_rate,
          rating,
          skills,
          availability_schedule
        )
      `)
      .in('role', ['BARBER', 'SHOP_OWNER'])
      .eq('barbershop_id', barbershopId)
      .order('name', { ascending: true })
    
    if (error) throw error
    
    if (!barbers || barbers.length === 0) {
      console.log('📝 No barbers found in database')
      return []
    }
    
    const resources = barbers.map((barber, index) => ({
      id: barber.id,
      title: barber.name,
      eventColor: getBarberColor(index),
      group: getBarberGroup(barber.profiles?.experience_years || 0),
      businessHours: parseAvailabilitySchedule(barber.profiles?.availability_schedule),
      extendedProps: {
        email: barber.email,
        phone: barber.phone,
        specialization: barber.profiles?.specialization || 'General Services',
        experience: barber.profiles?.experience_years || 0,
        rate: barber.profiles?.hourly_rate || 50,
        rating: barber.profiles?.rating || 4.0,
        skills: barber.profiles?.skills || ['Haircuts', 'Styling'],
        isRealData: true
      }
    }))
    
    console.log(`👥 Loaded ${resources.length} real barber resources from database`)
    return resources
    
  } catch (error) {
    console.error('Failed to get barber resources:', error)
    return []
  }
}

// ==========================================
// ==========================================

export async function getServices(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) throw error
    
    if (!services || services.length === 0) {
      console.log('📝 No services found in database')
      return []
    }
    
    const transformedServices = services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category,
      isRealData: true
    }))
    
    console.log(`🔧 Loaded ${transformedServices.length} real services from database`)
    return transformedServices
    
  } catch (error) {
    console.error('Failed to get services:', error)
    return []
  }
}

// ==========================================
// ==========================================

export async function createAppointment(appointmentData) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([appointmentData])
      .select()
    
    if (error) throw error
    
    console.log('✅ Created new appointment:', data[0]?.id)
    return data[0]
    
  } catch (error) {
    console.error('Failed to create appointment:', error)
    throw error
  }
}

export async function updateAppointment(appointmentId, updates) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', appointmentId)
      .select()
    
    if (error) throw error
    
    console.log('✅ Updated appointment:', appointmentId)
    return data[0]
    
  } catch (error) {
    console.error('Failed to update appointment:', error)
    throw error
  }
}

export async function deleteAppointment(appointmentId) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', appointmentId)
    
    if (error) throw error
    
    console.log('✅ Deleted appointment:', appointmentId)
    
  } catch (error) {
    console.error('Failed to delete appointment:', error)
    throw error
  }
}

// ==========================================
// ==========================================

export async function getRecurringAppointments(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    const { data: recurring, error } = await supabase
      .from('recurring_appointments')
      .select(`
        *,
        barber:users!recurring_appointments_barber_id_fkey(name),
        service:services!recurring_appointments_service_id_fkey(name, duration_minutes, price)
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
    
    if (error) throw error
    
    if (!recurring || recurring.length === 0) {
      return []
    }
    
    const recurringEvents = recurring.map(template => ({
      id: template.id,
      title: `${template.customer_name} - ${template.service?.name}`,
      rrule: {
        freq: template.frequency.toLowerCase(),
        byweekday: template.days_of_week,
        dtstart: new Date(template.start_date + 'T' + template.start_time)
      },
      duration: formatDuration(template.service?.duration_minutes || 60),
      resourceId: template.barber_id,
      backgroundColor: '#059669',
      extendedProps: {
        customer: template.customer_name,
        service: template.service?.name,
        duration: template.service?.duration_minutes,
        price: template.service?.price,
        status: 'recurring',
        phone: template.customer_phone,
        email: template.customer_email,
        isRecurring: true,
        frequency: template.frequency,
        notes: template.notes,
        isRealData: true
      }
    }))
    
    console.log(`🔄 Loaded ${recurringEvents.length} recurring appointments from database`)
    return recurringEvents
    
  } catch (error) {
    console.error('Failed to get recurring appointments:', error)
    return []
  }
}

// ==========================================
// ==========================================

function getStatusColor(status) {
  const colors = {
    'PENDING': '#f59e0b',
    'CONFIRMED': '#10b981', 
    'COMPLETED': '#059669',
    'CANCELLED': '#ef4444',
    'NO_SHOW': '#6b7280'
  }
  return colors[status] || '#546355'
}

function getBarberColor(index) {
  const colors = ['#10b981', '#546355', '#f59e0b', '#D4B878', '#ef4444', '#06b6d4']
  return colors[index % colors.length]
}

function getBarberGroup(experienceYears) {
  if (experienceYears >= 10) return 'Senior Barbers'
  if (experienceYears >= 5) return 'Experienced Barbers'
  return 'Junior Barbers'
}

function parseAvailabilitySchedule(schedule) {
  if (!schedule) {
    return [
      { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00' },
      { daysOfWeek: [6], startTime: '08:00', endTime: '16:00' }
    ]
  }
  
  try {
    const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule
    return parsed.businessHours || []
  } catch (error) {
    console.warn('Failed to parse availability schedule:', error)
    return []
  }
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// ==========================================
// ==========================================

export async function checkCalendarTablesExist() {
  const supabase = createClient()
  
  try {
    const checks = await Promise.allSettled([
      supabase.from('bookings').select('id').limit(1),
      supabase.from('services').select('id').limit(1),
      supabase.from('recurring_appointments').select('id').limit(1)
    ])
    
    const results = checks.map((check, index) => ({
      table: ['appointments', 'services', 'recurring_appointments'][index],
      exists: check.status === 'fulfilled',
      error: check.status === 'rejected' ? check.reason?.message : null
    }))
    
    return {
      allTablesExist: results.every(r => r.exists),
      tableStatus: results
    }
    
  } catch (error) {
    console.error('Failed to check calendar tables:', error)
    return {
      allTablesExist: false,
      error: error.message
    }
  }
}

// ==========================================
// ==========================================

export async function seedCalendarData(barbershopId = 'demo-shop-001') {
  const supabase = createClient()
  
  try {
    console.log('🌱 Seeding calendar with real test data...')
    
    const { data: existingAppointments } = await supabase
      .from('bookings')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .limit(1)
    
    if (existingAppointments && existingAppointments.length > 0) {
      console.log('📅 Calendar data already exists')
      return
    }
    
    const today = new Date()
    const appointments = []
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const appointmentDate = new Date(today)
      appointmentDate.setDate(today.getDate() + dayOffset)
      
      if (appointmentDate.getDay() === 0) continue
      
      const dailyAppointments = 3 + Math.floor(Math.random() * 2)
      
      for (let i = 0; i < dailyAppointments; i++) {
        const hour = 9 + (i * 2) // 9 AM, 11 AM, 1 PM, 3 PM
        if (hour >= 17) break
        
        const startTime = new Date(appointmentDate)
        startTime.setHours(hour, Math.random() > 0.5 ? 0 : 30, 0, 0)
        
        const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)) // 1 hour duration
        
        appointments.push({
          barbershop_id: barbershopId,
          barber_id: 'demo-barber-' + (1 + (i % 3)), // Rotate between 3 barbers
          customer_name: ['John Smith', 'Sarah Wilson', 'Mike Johnson', 'Emma Davis'][Math.floor(Math.random() * 4)],
          customer_phone: '(555) 123-4567',
          customer_email: 'customer@example.com',
          service_name: ['Classic Haircut', 'Beard Trim', 'Full Service', 'Styling'][Math.floor(Math.random() * 4)],
          service_duration: 60,
          service_price: 35 + Math.floor(Math.random() * 30),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'CONFIRMED',
          notes: 'Seeded test appointment'
        })
      }
    }
    
    const { error } = await supabase
      .from('bookings')
      .insert(appointments)
    
    if (error) throw error
    
    console.log(`✅ Seeded ${appointments.length} test appointments`)
    
  } catch (error) {
    console.error('Failed to seed calendar data:', error)
    throw error
  }
}