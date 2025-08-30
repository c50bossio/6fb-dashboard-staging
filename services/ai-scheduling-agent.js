/**
 * AI Scheduling Agent Service
 * Phase 5-6: Intelligent appointment scheduling with pattern analysis
 */

import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export class AISchedulingAgent {
  constructor() {
    this.initialized = false
  }

  /**
   * Initialize the AI agent with necessary data
   */
  async initialize() {
    if (this.initialized) return
    
    // Ensure supabase service is ready
    if (!createServiceRoleClient().isReady()) {
      await createServiceRoleClient().initialize()
    }
    
    this.initialized = true
  }

  /**
   * Suggest optimal appointment slots based on historical patterns
   */
  async suggestOptimalSlots(barbershopId, date, duration = 30) {
    await this.initialize()
    
    try {
      // Get historical booking patterns
      const patterns = await this.analyzeBookingPatterns(barbershopId)
      
      // Get current availability for the date
      const availability = await this.getAvailability(barbershopId, date)
      
      // Get customer preferences
      const preferences = await this.getCustomerPreferences(barbershopId)
      
      // Generate AI-powered suggestions
      const suggestions = this.generateSuggestions({
        patterns,
        availability,
        preferences,
        duration,
        date
      })
      
      return suggestions
    } catch (error) {
      console.error('Error generating optimal slots:', error)
      return []
    }
  }

  /**
   * Analyze historical booking patterns for the shop
   */
  async analyzeBookingPatterns(barbershopId) {
    try {
      // Get last 90 days of appointments
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      const appointments = await createServiceRoleClient().getAppointments(barbershopId, {
        startDate: ninetyDaysAgo.toISOString(),
        endDate: new Date().toISOString()
      })
      
      // Analyze patterns
      const patterns = {
        peakHours: this.findPeakHours(appointments),
        popularServices: this.findPopularServices(appointments),
        averageDuration: this.calculateAverageDuration(appointments),
        bookingFrequency: this.analyzeFrequency(appointments),
        dayOfWeekTrends: this.analyzeDayTrends(appointments)
      }
      
      return patterns
    } catch (error) {
      console.error('Error analyzing patterns:', error)
      return {
        peakHours: [],
        popularServices: [],
        averageDuration: 30,
        bookingFrequency: 'normal',
        dayOfWeekTrends: {}
      }
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailability(barbershopId, date) {
    try {
      // Get existing appointments for the date
      const appointments = await createServiceRoleClient().getAppointments(barbershopId, {
        startDate: date,
        endDate: date
      })
      
      // Get shop business hours
      const shopInfo = await createServiceRoleClient().getShopInfo(barbershopId)
      const businessHours = shopInfo?.business_hours || {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { closed: true }
      }
      
      // Calculate available slots
      const dayOfWeek = new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' })
      const hours = businessHours[dayOfWeek]
      
      if (hours?.closed) {
        return []
      }
      
      const availableSlots = this.calculateAvailableSlots(
        hours,
        appointments,
        date
      )
      
      return availableSlots
    } catch (error) {
      console.error('Error getting availability:', error)
      return []
    }
  }

  /**
   * Get customer preferences based on historical data
   */
  async getCustomerPreferences(barbershopId) {
    try {
      // This would typically analyze customer booking history
      // For now, return common preferences
      return {
        preferredTimes: ['10:00', '14:00', '16:00'],
        avoidTimes: ['12:00', '13:00'], // Lunch hours
        preferredDays: ['Tuesday', 'Thursday', 'Saturday'],
        averageLeadTime: 3 // Days in advance
      }
    } catch (error) {
      console.error('Error getting preferences:', error)
      return {
        preferredTimes: [],
        avoidTimes: [],
        preferredDays: [],
        averageLeadTime: 3
      }
    }
  }

  /**
   * Generate AI-powered scheduling suggestions
   */
  generateSuggestions({ patterns, availability, preferences, duration, date }) {
    const suggestions = []
    
    // Score each available slot
    for (const slot of availability) {
      let score = 50 // Base score
      const reasons = []
      
      // Check if it's a peak hour
      if (patterns.peakHours.includes(slot.hour)) {
        score += 20
        reasons.push('Popular time')
      }
      
      // Check customer preferences
      if (preferences.preferredTimes.includes(slot.time)) {
        score += 15
        reasons.push('Customer preference')
      }
      
      // Avoid lunch hours
      if (preferences.avoidTimes.includes(slot.time)) {
        score -= 10
        reasons.push('Typically avoided')
      }
      
      // Check day of week trends
      const dayOfWeek = new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' })
      if (patterns.dayOfWeekTrends[dayOfWeek]?.high) {
        score += 10
        reasons.push('Busy day')
      }
      
      // Add buffer time preference
      if (this.hasGoodBuffer(slot, availability)) {
        score += 5
        reasons.push('Good spacing')
      }
      
      suggestions.push({
        time: slot.time,
        endTime: this.addMinutes(slot.time, duration),
        confidence: Math.min(score, 100),
        reasoning: reasons.join(' • ') || 'Available slot',
        score,
        slot
      })
    }
    
    // Sort by score and return top 5
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ slot, ...suggestion }) => suggestion)
  }

  /**
   * Predict no-show risk for an appointment
   */
  async predictNoShowRisk(appointment) {
    await this.initialize()
    
    try {
      const riskFactors = []
      let riskScore = 0
      
      // New customer risk
      if (appointment.is_new_customer) {
        riskScore += 0.15
        riskFactors.push('New customer')
      }
      
      // Last minute booking
      const bookingLead = this.getBookingLeadTime(appointment)
      if (bookingLead < 2) {
        riskScore += 0.1
        riskFactors.push('Last minute booking')
      }
      
      // Time of day risk (early morning or late evening)
      const hour = new Date(appointment.start_time).getHours()
      if (hour < 9 || hour > 18) {
        riskScore += 0.05
        riskFactors.push('Off-peak hours')
      }
      
      // Previous no-show history (would need to be implemented)
      const history = await this.getCustomerHistory(appointment.customer_id)
      if (history?.noShows > 0) {
        riskScore += 0.2 * Math.min(history.noShows, 3)
        riskFactors.push('Previous no-shows')
      }
      
      // Weather impact (would need weather API)
      // const weather = await this.getWeatherForecast(appointment.start_time)
      // if (weather?.severe) {
      //   riskScore += 0.1
      //   riskFactors.push('Severe weather')
      // }
      
      return {
        risk: Math.min(riskScore, 1), // Cap at 100%
        level: riskScore > 0.5 ? 'high' : riskScore > 0.2 ? 'medium' : 'low',
        factors: riskFactors,
        recommendation: this.getNoShowRecommendation(riskScore)
      }
    } catch (error) {
      console.error('Error predicting no-show risk:', error)
      return {
        risk: 0,
        level: 'low',
        factors: [],
        recommendation: 'normal'
      }
    }
  }

  /**
   * Optimize schedule by rearranging appointments
   */
  async optimizeSchedule(barbershopId, date) {
    await this.initialize()
    
    try {
      const appointments = await createServiceRoleClient().getAppointments(barbershopId, {
        startDate: date,
        endDate: date
      })
      
      // Group appointments by barber
      const barberSchedules = {}
      appointments.forEach(apt => {
        const barberId = apt.barber_id || 'unassigned'
        if (!barberSchedules[barberId]) {
          barberSchedules[barberId] = []
        }
        barberSchedules[barberId].push(apt)
      })
      
      // Optimize each barber's schedule
      const optimizations = []
      for (const [barberId, schedule] of Object.entries(barberSchedules)) {
        const optimized = this.optimizeBarberSchedule(schedule)
        if (optimized.improved) {
          optimizations.push({
            barberId,
            original: schedule,
            optimized: optimized.schedule,
            improvement: optimized.improvement
          })
        }
      }
      
      return {
        optimizations,
        totalImprovement: optimizations.reduce((sum, opt) => sum + opt.improvement, 0),
        recommendations: this.generateOptimizationRecommendations(optimizations)
      }
    } catch (error) {
      console.error('Error optimizing schedule:', error)
      return {
        optimizations: [],
        totalImprovement: 0,
        recommendations: []
      }
    }
  }

  // Helper methods
  
  findPeakHours(appointments) {
    const hourCounts = {}
    appointments.forEach(apt => {
      const hour = new Date(apt.start_time).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    
    // Find hours with above average bookings
    const avgCount = Object.values(hourCounts).reduce((a, b) => a + b, 0) / Object.keys(hourCounts).length
    return Object.entries(hourCounts)
      .filter(([hour, count]) => count > avgCount)
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => a - b)
  }

  findPopularServices(appointments) {
    const serviceCounts = {}
    appointments.forEach(apt => {
      if (apt.service_name) {
        serviceCounts[apt.service_name] = (serviceCounts[apt.service_name] || 0) + 1
      }
    })
    
    return Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([service]) => service)
  }

  calculateAverageDuration(appointments) {
    if (appointments.length === 0) return 30
    
    const durations = appointments
      .filter(apt => apt.duration_minutes)
      .map(apt => apt.duration_minutes)
    
    if (durations.length === 0) return 30
    
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  }

  analyzeFrequency(appointments) {
    const daysWithBookings = new Set()
    appointments.forEach(apt => {
      const date = new Date(apt.start_time).toDateString()
      daysWithBookings.add(date)
    })
    
    const avgPerDay = appointments.length / daysWithBookings.size
    
    if (avgPerDay > 10) return 'high'
    if (avgPerDay > 5) return 'normal'
    return 'low'
  }

  analyzeDayTrends(appointments) {
    const dayStats = {}
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    days.forEach(day => {
      dayStats[day] = { count: 0, high: false }
    })
    
    appointments.forEach(apt => {
      const day = new Date(apt.start_time).toLocaleLowerCase('en-US', { weekday: 'long' })
      if (dayStats[day]) {
        dayStats[day].count++
      }
    })
    
    const avgCount = Object.values(dayStats).reduce((sum, stat) => sum + stat.count, 0) / 7
    
    Object.keys(dayStats).forEach(day => {
      dayStats[day].high = dayStats[day].count > avgCount * 1.2
    })
    
    return dayStats
  }

  calculateAvailableSlots(hours, appointments, date) {
    const slots = []
    const slotDuration = 30 // minutes
    
    // Parse business hours
    const [openHour, openMinute] = hours.open.split(':').map(Number)
    const [closeHour, closeMinute] = hours.close.split(':').map(Number)
    
    const openTime = openHour * 60 + openMinute
    const closeTime = closeHour * 60 + closeMinute
    
    // Generate all possible slots
    for (let time = openTime; time < closeTime; time += slotDuration) {
      const hour = Math.floor(time / 60)
      const minute = time % 60
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      // Check if slot conflicts with existing appointments
      const conflicts = appointments.some(apt => {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(apt.end_time)
        const slotStart = new Date(`${date}T${timeStr}:00`)
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)
        
        return (slotStart < aptEnd && slotEnd > aptStart)
      })
      
      if (!conflicts) {
        slots.push({
          time: timeStr,
          hour,
          minute,
          available: true
        })
      }
    }
    
    return slots
  }

  hasGoodBuffer(slot, allSlots) {
    // Check if there's good spacing around this slot
    const slotIndex = allSlots.findIndex(s => s.time === slot.time)
    const hasBefore = slotIndex > 0 && allSlots[slotIndex - 1]?.available
    const hasAfter = slotIndex < allSlots.length - 1 && allSlots[slotIndex + 1]?.available
    
    return hasBefore || hasAfter
  }

  addMinutes(timeStr, minutes) {
    const [hour, minute] = timeStr.split(':').map(Number)
    const totalMinutes = hour * 60 + minute + minutes
    const newHour = Math.floor(totalMinutes / 60)
    const newMinute = totalMinutes % 60
    
    return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`
  }

  getBookingLeadTime(appointment) {
    const bookingTime = new Date(appointment.created_at)
    const appointmentTime = new Date(appointment.start_time)
    const diffHours = (appointmentTime - bookingTime) / (1000 * 60 * 60)
    return Math.floor(diffHours / 24) // Return days
  }

  async getCustomerHistory(customerId) {
    // This would fetch customer history from database
    // For now, return mock data
    return {
      totalAppointments: 10,
      noShows: 0,
      cancellations: 1,
      averageRating: 4.5
    }
  }

  getNoShowRecommendation(riskScore) {
    if (riskScore > 0.5) {
      return 'send_confirmation_24h_and_2h'
    } else if (riskScore > 0.2) {
      return 'send_reminder_2h'
    }
    return 'normal_reminder'
  }

  optimizeBarberSchedule(schedule) {
    // Simple optimization: minimize gaps between appointments
    const sorted = [...schedule].sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    )
    
    let totalGapTime = 0
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = new Date(sorted[i - 1].end_time)
      const currStart = new Date(sorted[i].start_time)
      const gap = (currStart - prevEnd) / (1000 * 60) // Gap in minutes
      
      if (gap > 0) {
        totalGapTime += gap
      }
    }
    
    // Try to compact schedule
    const compacted = this.compactSchedule(sorted)
    let compactedGapTime = 0
    
    for (let i = 1; i < compacted.length; i++) {
      const prevEnd = new Date(compacted[i - 1].end_time)
      const currStart = new Date(compacted[i].start_time)
      const gap = (currStart - prevEnd) / (1000 * 60)
      
      if (gap > 0) {
        compactedGapTime += gap
      }
    }
    
    const improvement = totalGapTime - compactedGapTime
    
    return {
      improved: improvement > 0,
      schedule: compacted,
      improvement: improvement
    }
  }

  compactSchedule(schedule) {
    // Simple compaction: move appointments earlier if possible
    const compacted = []
    let lastEndTime = null
    
    for (const apt of schedule) {
      if (!lastEndTime) {
        compacted.push(apt)
        lastEndTime = new Date(apt.end_time)
      } else {
        const aptStart = new Date(apt.start_time)
        const gap = (aptStart - lastEndTime) / (1000 * 60)
        
        if (gap > 15) {
          // Move appointment earlier
          const newStart = new Date(lastEndTime.getTime() + 15 * 60000)
          const duration = (new Date(apt.end_time) - aptStart) / (1000 * 60)
          const newEnd = new Date(newStart.getTime() + duration * 60000)
          
          compacted.push({
            ...apt,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            optimized: true
          })
          
          lastEndTime = newEnd
        } else {
          compacted.push(apt)
          lastEndTime = new Date(apt.end_time)
        }
      }
    }
    
    return compacted
  }

  generateOptimizationRecommendations(optimizations) {
    const recommendations = []
    
    if (optimizations.length > 0) {
      recommendations.push({
        type: 'schedule_compaction',
        message: `Can save ${optimizations.reduce((sum, opt) => sum + opt.improvement, 0)} minutes by compacting schedule`,
        priority: 'medium'
      })
    }
    
    return recommendations
  }
}

// Export singleton instance
const aiSchedulingAgent = new AISchedulingAgent()
export default aiSchedulingAgent