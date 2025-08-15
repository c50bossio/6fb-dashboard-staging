
export async function softDeleteAppointment(supabase, appointmentId) {
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
  
  console.log('📝 Soft deleted appointment:', appointmentId)
  return data
}

export function filterActiveAppointments(appointments) {
  return appointments.filter(apt => 
    apt.extendedProps?.status !== 'cancelled' && 
    apt.extendedProps?.status !== 'deleted'
  )
}

