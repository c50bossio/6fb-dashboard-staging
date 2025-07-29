/**
 * Data Normalization Service
 * 
 * Provides unified data formats for AI agent consumption across different
 * integration platforms (Google Calendar, Traft, etc.)
 */

/**
 * Standard appointment data structure for AI agents
 */
export const STANDARD_APPOINTMENT_SCHEMA = {
  // Core identification
  id: String,
  platformId: String,
  platform: String, // 'google_calendar', 'trafft', etc.
  
  // Basic appointment info
  title: String,
  description: String,
  
  // Timing
  startTime: String, // ISO 8601 format
  endTime: String,   // ISO 8601 format
  duration: Number,  // minutes
  timezone: String,
  isAllDay: Boolean,
  
  // Participants
  customer: {
    name: String,
    email: String,
    phone: String,
    id: String
  },
  staff: {
    name: String,
    email: String,
    id: String,
    specialties: [String]
  },
  
  // Service details
  service: {
    name: String,
    price: Number,
    category: String,
    duration: Number
  },
  
  // Location
  location: {
    name: String,
    address: String,
    id: String
  },
  
  // Status and metadata
  status: String, // 'confirmed', 'cancelled', 'completed', 'no_show'
  source: String, // 'online', 'phone', 'walk_in', 'recurring'
  
  // Business context
  businessContext: {
    isNewCustomer: Boolean,
    customerLifetimeValue: Number,
    previousAppointments: Number,
    paymentStatus: String,
    specialRequests: String
  },
  
  // Timestamps
  createdAt: String,
  updatedAt: String,
  syncedAt: String
}

export class DataNormalizationService {
  
  /**
   * Normalize appointments from any platform to standard format
   */
  static normalizeAppointments(appointments, platform) {
    if (!Array.isArray(appointments)) {
      appointments = [appointments]
    }
    
    return appointments.map(appointment => {
      switch (platform) {
        case 'google_calendar':
          return this.normalizeGoogleCalendarAppointment(appointment)
        case 'trafft':
          return this.normalizeTrafftAppointment(appointment)
        default:
          return this.normalizeGenericAppointment(appointment, platform)
      }
    })
  }
  
  /**
   * Normalize Google Calendar event to standard appointment format
   */
  static normalizeGoogleCalendarAppointment(event) {
    // Extract customer info from title or attendees
    const customerInfo = this.extractCustomerFromGoogleEvent(event)
    
    return {
      id: `google_${event.id}`,
      platformId: event.id,
      platform: 'google_calendar',
      
      title: event.title || 'Untitled Event',
      description: event.description || '',
      
      startTime: event.startTime,
      endTime: event.endTime,
      duration: event.duration || this.calculateDuration(event.startTime, event.endTime),
      timezone: this.extractTimezone(event.startTime),
      isAllDay: event.isAllDay || false,
      
      customer: {
        name: customerInfo.name || 'Unknown Customer',
        email: customerInfo.email || '',
        phone: customerInfo.phone || '',
        id: customerInfo.id || null
      },
      
      staff: {
        name: event.organizer?.name || 'Staff',
        email: event.organizer?.email || '',
        id: event.organizer?.email || null,
        specialties: []
      },
      
      service: {
        name: this.extractServiceFromTitle(event.title),
        price: 0, // Google Calendar doesn't have pricing
        category: this.categorizeService(event.title),
        duration: event.duration || 60
      },
      
      location: {
        name: event.location || '',
        address: event.location || '',
        id: null
      },
      
      status: this.mapGoogleStatus(event.status),
      source: 'calendar',
      
      businessContext: {
        isNewCustomer: null, // Can't determine from Google Calendar
        customerLifetimeValue: 0,
        previousAppointments: 0,
        paymentStatus: 'unknown',
        specialRequests: event.description || ''
      },
      
      createdAt: event.created,
      updatedAt: event.updated,
      syncedAt: new Date().toISOString()
    }
  }
  
  /**
   * Normalize Traft appointment to standard format
   */
  static normalizeTrafftAppointment(appointment) {    
    return {
      id: `trafft_${appointment.id}`,
      platformId: appointment.id,
      platform: 'trafft',
      
      title: appointment.title,
      description: appointment.description || '',
      
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration || 60,
      timezone: 'UTC', // Traft typically uses UTC
      isAllDay: false,
      
      customer: {
        name: appointment.customerName || 'Unknown Customer',
        email: appointment.customerEmail || '',
        phone: appointment.customerPhone || '',
        id: appointment.customerId
      },
      
      staff: {
        name: appointment.staffName || 'Staff',
        email: '',
        id: appointment.staffId,
        specialties: []
      },
      
      service: {
        name: appointment.serviceName || 'Service',
        price: appointment.servicePrice || 0,
        category: this.categorizeService(appointment.serviceName),
        duration: appointment.duration || 60
      },
      
      location: {
        name: appointment.locationName || '',
        address: appointment.location || '',
        id: appointment.locationId
      },
      
      status: this.mapTrafftStatus(appointment.status),
      source: appointment.metadata?.source || 'online',
      
      businessContext: {
        isNewCustomer: appointment.metadata?.isNewCustomer || false,
        customerLifetimeValue: 0,
        previousAppointments: 0,
        paymentStatus: appointment.metadata?.paymentStatus || 'pending',
        specialRequests: appointment.metadata?.specialRequests || ''
      },
      
      createdAt: appointment.created,
      updatedAt: appointment.updated,
      syncedAt: new Date().toISOString()
    }
  }
  
  /**
   * Normalize generic appointment format
   */
  static normalizeGenericAppointment(appointment, platform) {
    return {
      id: `${platform}_${appointment.id || Date.now()}`,
      platformId: appointment.id,
      platform: platform,
      
      title: appointment.title || appointment.summary || 'Appointment',
      description: appointment.description || appointment.notes || '',
      
      startTime: appointment.startTime || appointment.start || appointment.dateTime,
      endTime: appointment.endTime || appointment.end,
      duration: appointment.duration || 60,
      timezone: appointment.timezone || 'UTC',
      isAllDay: appointment.isAllDay || false,
      
      customer: {
        name: appointment.customerName || appointment.clientName || 'Unknown',
        email: appointment.customerEmail || appointment.clientEmail || '',
        phone: appointment.customerPhone || appointment.clientPhone || '',
        id: appointment.customerId || appointment.clientId
      },
      
      staff: {
        name: appointment.staffName || appointment.providerName || 'Staff',
        email: appointment.staffEmail || '',
        id: appointment.staffId || appointment.providerId,
        specialties: appointment.staffSpecialties || []
      },
      
      service: {
        name: appointment.serviceName || 'Service',
        price: appointment.price || appointment.servicePrice || 0,
        category: this.categorizeService(appointment.serviceName),
        duration: appointment.duration || 60
      },
      
      location: {
        name: appointment.locationName || '',
        address: appointment.location || appointment.address || '',
        id: appointment.locationId
      },
      
      status: appointment.status || 'confirmed',
      source: appointment.source || 'unknown',
      
      businessContext: {
        isNewCustomer: appointment.isNewCustomer || false,
        customerLifetimeValue: appointment.customerLifetimeValue || 0,
        previousAppointments: appointment.previousAppointments || 0,
        paymentStatus: appointment.paymentStatus || 'unknown',
        specialRequests: appointment.specialRequests || appointment.notes || ''
      },
      
      createdAt: appointment.createdAt || appointment.created_at,
      updatedAt: appointment.updatedAt || appointment.updated_at,
      syncedAt: new Date().toISOString()
    }
  }
  
  /**
   * Extract customer information from Google Calendar event
   */
  static extractCustomerFromGoogleEvent(event) {
    // Try to extract from attendees first
    if (event.attendees && event.attendees.length > 0) {
      const customer = event.attendees.find(attendee => 
        attendee.email !== event.organizer?.email
      )
      if (customer) {
        return {
          name: customer.name || customer.email.split('@')[0],
          email: customer.email,
          phone: '',
          id: customer.email
        }
      }
    }
    
    // Try to extract from title (format: "Service - Customer Name")
    const titleMatch = event.title?.match(/^(.+?)\s*-\s*(.+)$/)
    if (titleMatch) {
      return {
        name: titleMatch[2].trim(),
        email: '',
        phone: '',
        id: null
      }
    }
    
    // Try to extract from description
    const descriptionEmailMatch = event.description?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const descriptionPhoneMatch = event.description?.match(/(\+?[\d\s\-\(\)]{10,})/);
    
    return {
      name: 'Unknown Customer',
      email: descriptionEmailMatch ? descriptionEmailMatch[1] : '',
      phone: descriptionPhoneMatch ? descriptionPhoneMatch[1] : '',
      id: null
    }
  }
  
  /**
   * Extract service name from event title
   */
  static extractServiceFromTitle(title) {
    if (!title) return 'Service'
    
    // Common patterns: "Service - Customer", "Customer - Service", "Service"
    const patterns = [
      /^(.+?)\s*-\s*[A-Za-z\s]+$/,  // "Service - Customer"
      /^[A-Za-z\s]+\s*-\s*(.+)$/,   // "Customer - Service"
    ]
    
    for (const pattern of patterns) {
      const match = title.match(pattern)
      if (match) {
        const extracted = match[1].trim()
        if (this.isServiceName(extracted)) {
          return extracted
        }
      }
    }
    
    return title
  }
  
  /**
   * Check if a string looks like a service name
   */
  static isServiceName(str) {
    const serviceKeywords = [
      'haircut', 'trim', 'shave', 'beard', 'styling', 'wash', 'color',
      'massage', 'facial', 'manicure', 'pedicure', 'consultation',
      'cut', 'style', 'treatment'
    ]
    
    return serviceKeywords.some(keyword => 
      str.toLowerCase().includes(keyword)
    )
  }
  
  /**
   * Categorize service based on name
   */
  static categorizeService(serviceName) {
    if (!serviceName) return 'general'
    
    const service = serviceName.toLowerCase()
    
    if (service.includes('hair') || service.includes('cut') || service.includes('trim')) {
      return 'hair'
    } else if (service.includes('beard') || service.includes('shave')) {
      return 'grooming'
    } else if (service.includes('color') || service.includes('dye')) {
      return 'coloring'
    } else if (service.includes('style') || service.includes('styling')) {
      return 'styling'
    } else if (service.includes('massage') || service.includes('treatment')) {
      return 'wellness'
    } else if (service.includes('nail') || service.includes('manicure') || service.includes('pedicure')) {
      return 'nails'
    }
    
    return 'general'
  }
  
  /**
   * Map Google Calendar status to standard status
   */
  static mapGoogleStatus(status) {
    const statusMap = {
      'confirmed': 'confirmed',
      'tentative': 'tentative',
      'cancelled': 'cancelled'
    }
    
    return statusMap[status] || 'confirmed'
  }
  
  /**
   * Map Traft status to standard status
   */
  static mapTrafftStatus(status) {
    const statusMap = {
      'booked': 'confirmed',
      'confirmed': 'confirmed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'no_show': 'no_show',
      'rescheduled': 'rescheduled'
    }
    
    return statusMap[status] || 'confirmed'
  }
  
  /**
   * Calculate duration in minutes between two ISO dates
   */
  static calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 60
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    return Math.round((end - start) / (1000 * 60))
  }
  
  /**
   * Extract timezone from ISO date string
   */
  static extractTimezone(dateString) {
    if (!dateString) return 'UTC'
    
    // Extract timezone from ISO string (e.g. "2024-01-01T10:00:00-05:00")
    const timezoneMatch = dateString.match(/([+-]\d{2}:\d{2}|Z)$/)
    if (timezoneMatch) {
      return timezoneMatch[1] === 'Z' ? 'UTC' : timezoneMatch[1]
    }
    
    return 'UTC'
  }
  
  /**
   * Generate AI-optimized appointment summary for context
   */
  static generateAIContext(appointments) {
    if (!appointments || appointments.length === 0) {
      return {
        summary: 'No appointments found',
        insights: [],
        recommendations: []
      }
    }
    
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Categorize appointments
    const todayAppointments = appointments.filter(apt => 
      apt.startTime.startsWith(today)
    )
    const tomorrowAppointments = appointments.filter(apt => 
      apt.startTime.startsWith(tomorrow)
    )
    const upcomingAppointments = appointments.filter(apt => 
      apt.startTime > now.toISOString()
    )
    
    // Calculate metrics
    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.service.price || 0), 0)
    const averageTicket = totalRevenue / appointments.length || 0
    
    // Service popularity
    const serviceCount = {}
    appointments.forEach(apt => {
      const service = apt.service.name
      serviceCount[service] = (serviceCount[service] || 0) + 1
    })
    const popularServices = Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([service, count]) => ({ service, count }))
    
    // Status distribution
    const statusCount = {}
    appointments.forEach(apt => {
      statusCount[apt.status] = (statusCount[apt.status] || 0) + 1
    })
    
    // Generate insights
    const insights = []
    
    if (todayAppointments.length > 0) {
      insights.push(`${todayAppointments.length} appointments scheduled for today`)
    }
    
    if (tomorrowAppointments.length > 0) {
      insights.push(`${tomorrowAppointments.length} appointments scheduled for tomorrow`)
    }
    
    if (averageTicket > 0) {
      insights.push(`Average ticket value: $${averageTicket.toFixed(2)}`)
    }
    
    if (popularServices.length > 0) {
      insights.push(`Most popular service: ${popularServices[0].service} (${popularServices[0].count} bookings)`)
    }
    
    // Generate recommendations
    const recommendations = []
    
    if (statusCount.cancelled && statusCount.cancelled > appointments.length * 0.1) {
      recommendations.push('High cancellation rate detected - consider implementing deposits or reminder systems')
    }
    
    if (averageTicket < 50) {
      recommendations.push('Consider offering premium services to increase average ticket value')
    }
    
    if (upcomingAppointments.length < 5) {
      recommendations.push('Low upcoming bookings - consider promotional campaigns')
    }
    
    return {
      summary: {
        total: appointments.length,
        today: todayAppointments.length,
        tomorrow: tomorrowAppointments.length,
        upcoming: upcomingAppointments.length,
        totalRevenue,
        averageTicket
      },
      services: {
        popular: popularServices,
        categories: this.categorizeAppointments(appointments)
      },
      status: statusCount,
      insights,
      recommendations,
      lastUpdated: new Date().toISOString()
    }
  }
  
  /**
   * Categorize appointments by service type
   */
  static categorizeAppointments(appointments) {
    const categories = {}
    
    appointments.forEach(apt => {
      const category = apt.service.category || 'general'
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          revenue: 0,
          services: new Set()
        }
      }
      
      categories[category].count++
      categories[category].revenue += apt.service.price || 0
      categories[category].services.add(apt.service.name)
    })
    
    // Convert sets to arrays for JSON serialization
    Object.keys(categories).forEach(category => {
      categories[category].services = Array.from(categories[category].services)
    })
    
    return categories
  }
  
  /**
   * Filter appointments for AI agent queries
   */
  static filterAppointments(appointments, filters = {}) {
    let filtered = [...appointments]
    
    // Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(apt => apt.startTime >= filters.startDate)
    }
    if (filters.endDate) {
      filtered = filtered.filter(apt => apt.startTime <= filters.endDate)
    }
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(apt => apt.status === filters.status)
    }
    
    // Service filter
    if (filters.service) {
      filtered = filtered.filter(apt => 
        apt.service.name.toLowerCase().includes(filters.service.toLowerCase())
      )
    }
    
    // Customer filter
    if (filters.customer) {
      filtered = filtered.filter(apt => 
        apt.customer.name.toLowerCase().includes(filters.customer.toLowerCase()) ||
        apt.customer.email.toLowerCase().includes(filters.customer.toLowerCase())
      )
    }
    
    // Staff filter
    if (filters.staff) {
      filtered = filtered.filter(apt => 
        apt.staff.name.toLowerCase().includes(filters.staff.toLowerCase())
      )
    }
    
    return filtered
  }
}

export default DataNormalizationService