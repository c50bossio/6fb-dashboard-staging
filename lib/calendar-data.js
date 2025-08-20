
// Demo placeholder resources when no real barbers are configured
export const DEFAULT_RESOURCES = [
  {
    id: 'demo-barber-1',
    title: 'Add Your First Barber',
    eventColor: '#9ca3af',
    extendedProps: {
      isPlaceholder: true,
      message: 'Click to add your first barber'
    }
  }
]

export const DEFAULT_SERVICES = [
  { id: '1', name: 'Haircut', price: 35, duration_minutes: 30, description: 'Professional haircut' },
  { id: '2', name: 'Beard Trim', price: 20, duration_minutes: 20, description: 'Beard shaping and trim' },
  { id: '3', name: 'Hair & Beard', price: 50, duration_minutes: 45, description: 'Complete grooming package' },
  { id: '4', name: 'Kids Cut', price: 25, duration_minutes: 25, description: "Children's haircut" },
  { id: '5', name: 'Shave', price: 30, duration_minutes: 30, description: 'Traditional hot towel shave' },
  { id: '6', name: 'Hair Color', price: 85, duration_minutes: 90, description: 'Professional hair coloring' },
  { id: '7', name: 'Fade Cut', price: 45, duration_minutes: 45, description: 'Precision fade haircut' }
]

export async function fetchRealEvents(startDateParam = null, endDateParam = null, resources = DEFAULT_RESOURCES, services = DEFAULT_SERVICES) {
  const events = []
  
  // If no dates provided, fetch current week
  let startDate, endDate
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam).toISOString()
    endDate = new Date(endDateParam).toISOString()
  } else {
    // Default to fetching current month for better coverage
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1) // First day of month
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) // Last day of month
    startDate = start.toISOString()
    endDate = end.toISOString()
  }
  
  // Include the required shop_id parameter
  const shopId = 'demo-shop-001' // This should eventually come from user context
  
  try {
    const response = await fetch(`/api/calendar/appointments?shop_id=${shopId}&start_date=${startDate}&end_date=${endDate}`)
    
    if (response.ok) {
      const data = await response.json()
      const appointments = data.appointments || []
      
      appointments.forEach(appointment => {
        const resource = resources.find(r => r.id === appointment.barber_id) || resources[0]
        
        events.push({
          id: appointment.id,
          title: appointment.title || `${appointment.customer_name || 'Customer'} - ${appointment.service_name || 'Appointment'}`,
          start: appointment.start || appointment.scheduled_at,
          end: appointment.end || appointment.end_time,
          resourceId: appointment.resourceId || appointment.barber_id || resource.id,
          backgroundColor: appointment.backgroundColor || resource.eventColor || '#546355',
          borderColor: appointment.borderColor || resource.eventColor || '#546355',
          extendedProps: appointment.extendedProps || {
            customer: appointment.customer_name,
            service: appointment.service_name,
            duration: appointment.duration_minutes,
            price: appointment.service_price,
            status: appointment.status,
            phone: appointment.customer_phone,
            email: appointment.customer_email,
            notes: appointment.notes,
            isRealData: true // Clear indicator this is real data
          }
        })
      })
      
    } else {
      console.error('Failed to fetch appointments from database')
    }
  } catch (error) {
    console.error('Error fetching real events:', error)
  }
  
  return events
}

export async function fetchRecurringEvents(date = new Date()) {
  const recurringEvents = []
  
  // Include the required shop_id parameter
  const shopId = 'demo-shop-001' // This should eventually come from user context
  
  try {
    const response = await fetch(`/api/calendar/recurring?shop_id=${shopId}`)
    
    if (response.ok) {
      const data = await response.json()
      const recurringAppointments = data.appointments || []
      
      recurringAppointments.forEach(appointment => {
        if (appointment.recurring_pattern && appointment.recurring_pattern.rrule) {
          recurringEvents.push({
            id: appointment.id,
            title: appointment.title || `${appointment.customer_name || 'Customer'} - ${appointment.service_name || 'Recurring'}`,
            rrule: appointment.recurring_pattern.rrule,
            duration: appointment.recurring_pattern.duration || '00:30',
            resourceId: appointment.barber_id,
            backgroundColor: appointment.barber_color || '#059669',
            extendedProps: {
              customer: appointment.customer_name,
              service: appointment.service_name,
              duration: appointment.duration_minutes,
              price: appointment.service_price,
              status: 'recurring',
              isRecurring: true,
              frequency: appointment.recurring_pattern.frequency || 'Weekly',
              notes: appointment.notes,
              isRealData: true // Clear indicator this is real data
            }
          })
        }
      })
      
    } else {
      console.error('Failed to fetch recurring appointments from database')
    }
  } catch (error) {
    console.error('Error fetching recurring events:', error)
  }
  
  return recurringEvents
}

export function formatAppointment(appointment, barber) {
  return {
    id: appointment.id,
    title: `${appointment.client_name || 'Client'} - ${appointment.service?.name || "Unknown Service"}`,
    start: appointment.scheduled_at,
    end: new Date(
      new Date(appointment.scheduled_at).getTime() + 
      (appointment.duration_minutes || 30) * 60000
    ).toISOString(),
    resourceId: appointment.barber_id || barber?.id || appointment.resourceId,
    backgroundColor: barber?.eventColor || '#546355',
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

export function exportToCSV(events, resources) {
  const headers = ['Date', 'Start Time', 'End Time', 'Customer', "Unknown Service", 'Barber', 'Duration (min)', 'Price', 'Status']
  
  const rows = events.map(event => {
    const start = new Date(event.start)
    const end = new Date(event.end || event.start)
    const barber = resources.find(r => r.id === event.resourceId)
    
    return [
      start.toLocaleDateString('en-US'),
      start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      event.extendedProps?.customer || event.title?.split(' - ')[0] || 'N/A',
      event.extendedProps?.service || event.title?.split(' - ')[1] || 'N/A',
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