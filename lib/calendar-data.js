// Centralized calendar data management

// Default barber resources with proper configuration
export const DEFAULT_RESOURCES = [
  {
    id: 'barber-1',
    title: 'John Smith',
    eventColor: '#10b981',
    group: 'Senior Barbers',
    businessHours: [
      { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00' },
      { daysOfWeek: [6], startTime: '08:00', endTime: '16:00' }
    ],
    extendedProps: {
      location: 'Downtown',
      specialization: 'Classic Cuts & Fades',
      experience: 15,
      rate: 85,
      rating: 4.9,
      skills: ['Classic Cuts', 'Fade Cuts', 'Beard Grooming', 'Hot Towel Shaves']
    }
  },
  {
    id: 'barber-2',
    title: 'Sarah Johnson',
    eventColor: '#3b82f6',
    group: 'Style Specialists',
    businessHours: [
      { daysOfWeek: [2, 3, 4, 5, 6], startTime: '10:00', endTime: '20:00' },
      { daysOfWeek: [0], startTime: '11:00', endTime: '18:00' }
    ],
    extendedProps: {
      location: 'Uptown',
      specialization: 'Modern Styles & Color',
      experience: 8,
      rate: 75,
      rating: 4.7,
      skills: ['Modern Styles', 'Hair Color', 'Texture Treatments', 'Creative Cuts']
    }
  },
  {
    id: 'barber-3',
    title: 'Mike Brown',
    eventColor: '#f59e0b',
    group: 'Senior Barbers',
    extendedProps: {
      location: 'Downtown',
      specialization: 'Traditional Styles',
      experience: 12,
      rate: 80,
      rating: 4.8,
      skills: ['Traditional Cuts', 'Pompadours', 'Business Cuts', 'Straight Razor Shaves']
    }
  },
  {
    id: 'barber-4',
    title: 'Lisa Davis',
    eventColor: '#8b5cf6',
    group: 'Family Services',
    extendedProps: {
      location: 'Uptown',
      specialization: 'Kids & Family Cuts',
      experience: 6,
      rate: 65,
      rating: 4.9,
      skills: ['Kids Cuts', 'Family Services', 'Gentle Cuts', 'First Haircuts']
    }
  }
]

// Default services
export const DEFAULT_SERVICES = [
  { id: '1', name: 'Haircut', price: 35, duration_minutes: 30, description: 'Professional haircut' },
  { id: '2', name: 'Beard Trim', price: 20, duration_minutes: 20, description: 'Beard shaping and trim' },
  { id: '3', name: 'Hair & Beard', price: 50, duration_minutes: 45, description: 'Complete grooming package' },
  { id: '4', name: 'Kids Cut', price: 25, duration_minutes: 25, description: "Children's haircut" },
  { id: '5', name: 'Shave', price: 30, duration_minutes: 30, description: 'Traditional hot towel shave' },
  { id: '6', name: 'Hair Color', price: 85, duration_minutes: 90, description: 'Professional hair coloring' },
  { id: '7', name: 'Fade Cut', price: 45, duration_minutes: 45, description: 'Precision fade haircut' }
]

// Generate mock events for testing
export function generateMockEvents(date = new Date(), resources = DEFAULT_RESOURCES, services = DEFAULT_SERVICES) {
  const events = []
  const customers = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown', 'Charlie Davis', 'Emma Johnson']
  
  // Make sure we're using today's date
  const today = new Date()
  today.setSeconds(0, 0)
  
  console.log('Generating mock events for date:', today.toISOString())
  
  resources.forEach((resource, resourceIdx) => {
    // Generate 3-4 appointments per barber
    const appointmentCount = 3 + Math.floor(Math.random() * 2)
    
    for (let i = 0; i < appointmentCount; i++) {
      const hour = 9 + i * 2 // Start from 9 AM
      if (hour >= 17) break
      
      const service = services[Math.floor(Math.random() * services.length)]
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const start = new Date(today)
      start.setHours(hour, Math.random() > 0.5 ? 0 : 30, 0, 0)
      const end = new Date(start.getTime() + service.duration_minutes * 60000)
      
      const status = Math.random() > 0.2 ? 'confirmed' : 'pending'
      events.push({
        id: `event-${resource.id}-${i}`,
        title: `${customer} - ${service.name}`,
        start: start.toISOString(),
        end: end.toISOString(),
        resourceId: resource.id,
        backgroundColor: resource.eventColor || '#3b82f6',
        borderColor: resource.eventColor || '#3b82f6',
        extendedProps: {
          customer,
          service: service.name,
          duration: service.duration_minutes,
          price: service.price,
          status: status,
          phone: '(555) 123-4567',
          email: `${customer.toLowerCase().replace(' ', '.')}@email.com`,
          notes: 'Regular customer'
        }
      })
    }
  })
  
  return events
}

// Generate recurring appointments
export function generateRecurringEvents(date = new Date()) {
  const recurringEvents = [
    {
      id: 'recurring-1',
      title: 'Mr. Thompson - Weekly Trim',
      rrule: {
        freq: 'weekly',
        byweekday: ['tu'],
        dtstart: new Date(date.setHours(10, 0, 0, 0)).toISOString()
      },
      duration: '00:30',
      resourceId: 'barber-1',
      backgroundColor: '#059669',
      extendedProps: {
        customer: 'Mr. Thompson',
        service: 'Weekly Trim',
        duration: 30,
        price: 25,
        status: 'recurring',
        isRecurring: true,
        frequency: 'Weekly',
        notes: 'Regular customer - Every Tuesday'
      }
    },
    {
      id: 'recurring-2',
      title: 'Joe Martinez - Beard Maintenance',
      rrule: {
        freq: 'weekly',
        byweekday: ['th'],
        dtstart: new Date(date.setHours(14, 0, 0, 0)).toISOString()
      },
      duration: '00:45',
      resourceId: 'barber-2',
      backgroundColor: '#7c3aed',
      extendedProps: {
        customer: 'Joe Martinez',
        service: 'Beard Maintenance',
        duration: 45,
        price: 35,
        status: 'recurring',
        isRecurring: true,
        frequency: 'Weekly',
        notes: 'Beard trim and shape - Every Thursday'
      }
    }
  ]
  
  return recurringEvents
}

// Format appointment for calendar event
export function formatAppointment(appointment, barber) {
  return {
    id: appointment.id,
    title: `${appointment.client_name || 'Client'} - ${appointment.service?.name || 'Service'}`,
    start: appointment.scheduled_at,
    end: new Date(
      new Date(appointment.scheduled_at).getTime() + 
      (appointment.duration_minutes || 30) * 60000
    ).toISOString(),
    resourceId: appointment.barber_id || barber?.id,
    backgroundColor: barber?.eventColor || '#3b82f6',
    extendedProps: {
      customer: appointment.client_name,
      service: appointment.service?.name,
      duration: appointment.duration_minutes,
      price: appointment.service_price,
      status: appointment.status,
      phone: appointment.client_phone,
      email: appointment.client_email,
      notes: appointment.notes
    }
  }
}

// Export appointments to CSV
export function exportToCSV(events, resources) {
  const headers = ['Date', 'Start Time', 'End Time', 'Customer', 'Service', 'Barber', 'Duration (min)', 'Price', 'Status']
  
  const rows = events.map(event => {
    const start = new Date(event.start)
    const end = new Date(event.end || event.start)
    const barber = resources.find(r => r.id === event.resourceId)
    
    return [
      start.toLocaleDateString('en-US'),
      start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      event.extendedProps?.customer || event.title.split(' - ')[0] || 'N/A',
      event.extendedProps?.service || event.title.split(' - ')[1] || 'N/A',
      barber?.title || 'N/A',
      event.extendedProps?.duration || Math.round((end - start) / 60000),
      event.extendedProps?.price ? `$${event.extendedProps.price}` : 'N/A',
      event.extendedProps?.status || 'confirmed'
    ]
  })
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => 
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(','))
    .join('\n')
  
  return csv
}