/**
 * Availability Service
 * Handles staff availability and generates bookable slots for appointments
 * Production-ready for real barbershop operations
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

class AvailabilityService {
  constructor() {
    this.supabase = createClient()
  }

  /**
   * Get staff availability configuration
   */
  async getStaffAvailability(staffId) {
    try {
      const { data, error } = await this.supabase
        .from('barbershop_staff')
        .select('metadata')
        .eq('id', staffId)
        .single()

      if (error) throw error
      
      return data?.metadata?.availability || this.getDefaultAvailability()
    } catch (error) {
      console.error('Error fetching staff availability:', error)
      return this.getDefaultAvailability()
    }
  }

  /**
   * Get default availability configuration
   */
  getDefaultAvailability() {
    return {
      regularHours: {
        monday: { isWorking: true, start: '09:00', end: '17:00' },
        tuesday: { isWorking: true, start: '09:00', end: '17:00' },
        wednesday: { isWorking: true, start: '09:00', end: '17:00' },
        thursday: { isWorking: true, start: '09:00', end: '17:00' },
        friday: { isWorking: true, start: '09:00', end: '18:00' },
        saturday: { isWorking: true, start: '10:00', end: '16:00' },
        sunday: { isWorking: false }
      },
      breaks: [
        { start: '12:00', end: '13:00', name: 'Lunch' }
      ],
      bookingBuffer: 15,
      slotDuration: 30
    }
  }

  /**
   * Generate available booking slots for a specific date and barber
   */
  async getAvailableSlots(barberId, date, serviceDuration = null) {
    try {
      // Get staff availability
      const availability = await this.getStaffAvailability(barberId)
      
      // Get day of week
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = dayNames[date.getDay()]
      const daySchedule = availability.regularHours[dayName]
      
      // If not working this day, return empty
      if (!daySchedule || !daySchedule.isWorking) {
        return []
      }

      // Get existing appointments for this date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: existingAppointments, error } = await this.supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('barber_id', barberId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .in('status', ['confirmed', 'in_progress'])

      if (error) {
        console.error('Error fetching appointments:', error)
      }

      // Generate slots
      const slotDuration = serviceDuration || availability.slotDuration || 30
      const buffer = availability.bookingBuffer || 0
      const slots = []

      // Parse start and end times
      const [startHour, startMin] = daySchedule.start.split(':').map(Number)
      const [endHour, endMin] = daySchedule.end.split(':').map(Number)
      
      const currentSlot = new Date(date)
      currentSlot.setHours(startHour, startMin, 0, 0)
      
      const endTime = new Date(date)
      endTime.setHours(endHour, endMin, 0, 0)

      // Generate slots
      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot)
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration + buffer)

        // Check if slot is available
        if (slotEnd <= endTime && 
            !this.isSlotDuringBreak(currentSlot, slotEnd, availability.breaks) &&
            !this.isSlotConflicting(currentSlot, slotEnd, existingAppointments || [])) {
          
          slots.push({
            start: new Date(currentSlot),
            end: new Date(slotEnd),
            available: true,
            barberId: barberId
          })
        }

        // Move to next slot
        currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration + buffer)
      }

      return slots
    } catch (error) {
      console.error('Error generating available slots:', error)
      return []
    }
  }

  /**
   * Check if a time slot conflicts with breaks
   */
  isSlotDuringBreak(slotStart, slotEnd, breaks) {
    for (const breakTime of breaks) {
      const [breakStartHour, breakStartMin] = breakTime.start.split(':').map(Number)
      const [breakEndHour, breakEndMin] = breakTime.end.split(':').map(Number)
      
      const breakStart = new Date(slotStart)
      breakStart.setHours(breakStartHour, breakStartMin, 0, 0)
      
      const breakEnd = new Date(slotStart)
      breakEnd.setHours(breakEndHour, breakEndMin, 0, 0)
      
      // Check for overlap
      if ((slotStart < breakEnd && slotEnd > breakStart)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if a time slot conflicts with existing appointments
   */
  isSlotConflicting(slotStart, slotEnd, appointments) {
    for (const appointment of appointments) {
      const appointmentStart = new Date(appointment.start_time)
      const appointmentEnd = new Date(appointment.end_time)
      
      // Check for overlap
      if ((slotStart < appointmentEnd && slotEnd > appointmentStart)) {
        return true
      }
    }
    return false
  }

  /**
   * Get next available slot for a barber
   */
  async getNextAvailableSlot(barberId, serviceDuration = 30) {
    const checkDate = new Date()
    const maxDays = 30 // Look up to 30 days ahead
    
    for (let i = 0; i < maxDays; i++) {
      const slots = await this.getAvailableSlots(barberId, checkDate, serviceDuration)
      
      // Filter for future slots only (not in the past)
      const now = new Date()
      const futureSlots = slots.filter(slot => slot.start > now)
      
      if (futureSlots.length > 0) {
        return futureSlots[0]
      }
      
      // Move to next day
      checkDate.setDate(checkDate.getDate() + 1)
    }
    
    return null
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(barberId, startTime, endTime) {
    const { data: conflicts, error } = await this.supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .lte('start_time', endTime.toISOString())
      .gte('end_time', startTime.toISOString())
      .in('status', ['confirmed', 'in_progress'])

    if (error) {
      console.error('Error checking slot availability:', error)
      return false
    }

    return conflicts.length === 0
  }

  /**
   * Update staff availability
   */
  async updateStaffAvailability(staffId, availability) {
    try {
      const { data: staffData, error: fetchError } = await this.supabase
        .from('barbershop_staff')
        .select('metadata')
        .eq('id', staffId)
        .single()

      if (fetchError) throw fetchError

      const updatedMetadata = {
        ...(staffData.metadata || {}),
        availability: availability
      }

      const { error: updateError } = await this.supabase
        .from('barbershop_staff')
        .update({ metadata: updatedMetadata })
        .eq('id', staffId)

      if (updateError) throw updateError

      return { success: true }
    } catch (error) {
      console.error('Error updating availability:', error)
      return { success: false, error }
    }
  }
}

// Export singleton instance
const availabilityService = new AvailabilityService()
export default availabilityService