// Soft delete implementation for appointments
// Use UPDATE with status change instead of DELETE

export async function softDeleteAppointment(supabase, appointmentId) {
  // Instead of DELETE, update status to 'cancelled' or 'deleted'
  const { data, error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      notes: (prev) => `${prev || ''} [Cancelled at ${new Date().toLocaleString()}]`
    })
    .eq('id', appointmentId)
    .select()
    .single()
  
  if (error) throw error
  
  // This will trigger an UPDATE event which works perfectly with real-time
  console.log('📝 Soft deleted appointment:', appointmentId)
  return data
}

// In your components, filter out cancelled appointments
export function filterActiveAppointments(appointments) {
  return appointments.filter(apt => 
    apt.extendedProps?.status !== 'cancelled' && 
    apt.extendedProps?.status !== 'deleted'
  )
}

// Usage in your calendar component:
// const activeAppointments = filterActiveAppointments(events)