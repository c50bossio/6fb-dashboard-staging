/**
 * Availability Calculator
 * Feature: 011-holistic-staff-management
 *
 * Calculates available booking time slots for barbers based on:
 * - Weekly recurring availability schedule (staff_availability table)
 * - Existing bookings (bookings table)
 * - Service duration
 *
 * Performance target: < 500ms for 30-day calculation
 */

import { createClient } from '@/lib/supabase/client'
import { addDays, format, parse, startOfDay, isWithinInterval, addMinutes } from 'date-fns'

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  barberId: string
  reason?: string // Why slot is unavailable
}

export interface AvailabilitySchedule {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // HH:mm format
  endTime: string
  isAvailable: boolean
}

export interface ExistingBooking {
  scheduled_at: string
  duration_minutes: number
}

/**
 * Calculate available time slots for a barber
 * @param barberId - Barber's profile ID
 * @param serviceId - Service being booked (determines duration)
 * @param startDate - Start of date range (default: today)
 * @param endDate - End of date range (default: +30 days)
 * @param slotInterval - Slot granularity in minutes (default: 30)
 * @returns Array of available time slots
 */
export async function calculateAvailableSlots(
  barberId: string,
  serviceId: string,
  startDate: Date = new Date(),
  endDate: Date = addDays(new Date(), 30),
  slotInterval: number = 30
): Promise<TimeSlot[]> {
  const supabase = createClient()

  // 1. Fetch barber's weekly availability schedule
  const { data: schedules, error: schedError } = await supabase
    .from('staff_availability')
    .select('day_of_week, start_time, end_time, is_available')
    .eq('barber_id', barberId)
    .eq('is_available', true)

  if (schedError) {
    console.error('Error fetching availability schedule:', schedError)
    throw new Error('Failed to fetch availability schedule')
  }

  if (!schedules || schedules.length === 0) {
    return [] // No availability configured
  }

  // 2. Fetch service duration
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    console.error('Error fetching service:', serviceError)
    throw new Error('Service not found')
  }

  const serviceDuration = service.duration_minutes

  // 3. Fetch existing bookings in date range
  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('scheduled_at, duration_minutes')
    .eq('barber_id', barberId)
    .gte('scheduled_at', startDate.toISOString())
    .lte('scheduled_at', endDate.toISOString())
    .in('status', ['CONFIRMED', 'PENDING']) // Exclude cancelled

  if (bookingError) {
    console.error('Error fetching bookings:', bookingError)
    throw new Error('Failed to fetch existing bookings')
  }

  // 4. Generate all possible slots based on weekly schedule
  const allSlots = generateWeeklySlots(schedules, startDate, endDate, slotInterval, serviceDuration)

  // 5. Filter out slots that conflict with existing bookings
  const availableSlots = filterConflictingSlots(allSlots, bookings || [], serviceDuration)

  return availableSlots
}

/**
 * Generate time slots from weekly recurring schedule
 */
function generateWeeklySlots(
  schedules: AvailabilitySchedule[],
  startDate: Date,
  endDate: Date,
  slotInterval: number,
  serviceDuration: number
): TimeSlot[] {
  const slots: TimeSlot[] = []
  let currentDate = startOfDay(startDate)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // Find schedules for this day of week
    const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek)

    for (const schedule of daySchedules) {
      // Parse time strings
      const dayStart = parse(schedule.startTime, 'HH:mm:ss', currentDate)
      const dayEnd = parse(schedule.endTime, 'HH:mm:ss', currentDate)

      // Generate slots within this availability block
      let slotStart = dayStart

      while (slotStart < dayEnd) {
        const slotEnd = addMinutes(slotStart, serviceDuration)

        // Only include slot if service can complete before schedule end
        if (slotEnd <= dayEnd) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            available: true,
            barberId: '', // Will be set by caller
          })
        }

        slotStart = addMinutes(slotStart, slotInterval)
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  return slots
}

/**
 * Filter out slots that conflict with existing bookings
 */
function filterConflictingSlots(
  slots: TimeSlot[],
  bookings: ExistingBooking[],
  serviceDuration: number
): TimeSlot[] {
  return slots.map(slot => {
    // Check if this slot conflicts with any booking
    for (const booking of bookings) {
      const bookingStart = new Date(booking.scheduled_at)
      const bookingEnd = addMinutes(bookingStart, booking.duration_minutes)

      // Check for overlap
      // Slot conflicts if it starts before booking ends AND ends after booking starts
      if (slot.start < bookingEnd && slot.end > bookingStart) {
        return {
          ...slot,
          available: false,
          reason: 'Already booked'
        }
      }
    }

    return slot
  }).filter(slot => slot.available) // Return only available slots
}

/**
 * Check if a specific time slot is available
 * Optimized for single slot validation (e.g., during booking confirmation)
 */
export async function isSlotAvailable(
  barberId: string,
  startTime: Date,
  durationMinutes: number
): Promise<{ available: boolean; reason?: string }> {
  const supabase = createClient()
  const endTime = addMinutes(startTime, durationMinutes)

  // 1. Check weekly schedule allows this time
  const dayOfWeek = startTime.getDay()
  const timeString = format(startTime, 'HH:mm:ss')

  const { data: schedule } = await supabase
    .from('staff_availability')
    .select('start_time, end_time')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_available', true)
    .gte('end_time', timeString)
    .lte('start_time', timeString)
    .maybeSingle()

  if (!schedule) {
    return { available: false, reason: 'Outside availability schedule' }
  }

  // 2. Check for conflicting bookings
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('scheduled_at, duration_minutes')
    .eq('barber_id', barberId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .gte('scheduled_at', addMinutes(startTime, -120).toISOString()) // Buffer for overlap check
    .lte('scheduled_at', endTime.toISOString())

  if (conflicts && conflicts.length > 0) {
    for (const booking of conflicts) {
      const bookingStart = new Date(booking.scheduled_at)
      const bookingEnd = addMinutes(bookingStart, booking.duration_minutes)

      if (startTime < bookingEnd && endTime > bookingStart) {
        return { available: false, reason: 'Time slot conflict' }
      }
    }
  }

  return { available: true }
}

/**
 * Get next available slot for a barber
 * Useful for "Find next available" feature
 */
export async function getNextAvailableSlot(
  barberId: string,
  serviceId: string,
  afterDate: Date = new Date()
): Promise<TimeSlot | null> {
  const slots = await calculateAvailableSlots(
    barberId,
    serviceId,
    afterDate,
    addDays(afterDate, 14), // Search 2 weeks ahead
    30 // 30-minute intervals
  )

  return slots.length > 0 ? slots[0] : null
}
