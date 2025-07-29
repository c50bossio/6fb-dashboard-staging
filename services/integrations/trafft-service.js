/**
 * Traft.com Integration Service
 * 
 * Provides API connection wrapper for Traft.com booking platform.
 * This service connects to existing Traft accounts and normalizes
 * appointment data for AI agent consumption.
 */

import axios from 'axios'

export class TrafftService {
  constructor(apiKey, apiSecret, baseUrl = 'https://api.traft.com') {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.baseUrl = baseUrl
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '6FB-AI-Agent-System/1.0'
      }
    })
    
    // Set up request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        // Add API authentication headers
        config.headers['X-API-Key'] = this.apiKey
        config.headers['X-API-Secret'] = this.apiSecret
        return config
      },
      (error) => Promise.reject(error)
    )

    // Set up response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error('Invalid Traft API credentials')
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Traft API may be slow.')
        }
        throw error
      }
    )
  }

  /**
   * Test API connection and get account info
   */
  async authenticate() {
    try {
      const response = await this.client.get('/v1/account/info')
      return {
        success: true,
        accountId: response.data.id,
        businessName: response.data.business_name,
        email: response.data.email,
        timezone: response.data.timezone,
        subscription: response.data.subscription_plan
      }
    } catch (error) {
      throw new Error(`Traft authentication failed: ${error.message}`)
    }
  }

  /**
   * Get business locations/shops
   */
  async getLocations() {
    try {
      const response = await this.client.get('/v1/locations')
      return response.data.locations?.map(location => ({
        id: location.id,
        name: location.name,
        address: location.address,
        phone: location.phone,
        timezone: location.timezone,
        isActive: location.is_active
      })) || []
    } catch (error) {
      throw new Error(`Failed to fetch locations: ${error.message}`)
    }
  }

  /**
   * Get services offered
   */
  async getServices(locationId = null) {
    try {
      const params = locationId ? { location_id: locationId } : {}
      const response = await this.client.get('/v1/services', { params })
      
      return response.data.services?.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration_minutes,
        price: parseFloat(service.price || 0),
        category: service.category,
        isActive: service.is_active,
        locationId: service.location_id
      })) || []
    } catch (error) {
      throw new Error(`Failed to fetch services: ${error.message}`)
    }
  }

  /**
   * Get staff members
   */
  async getStaff(locationId = null) {
    try {
      const params = locationId ? { location_id: locationId } : {}
      const response = await this.client.get('/v1/staff', { params })
      
      return response.data.staff?.map(member => ({
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        phone: member.phone,
        specialties: member.specialties || [],
        locationId: member.location_id,
        isActive: member.is_active
      })) || []
    } catch (error) {
      throw new Error(`Failed to fetch staff: ${error.message}`)
    }
  }

  /**
   * Get appointments within date range
   */
  async getAppointments(options = {}) {
    const {
      locationId = null,
      startDate = new Date().toISOString().split('T')[0],
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status = null,
      limit = 100,
      page = 1
    } = options

    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        limit,
        page
      }
      
      if (locationId) params.location_id = locationId
      if (status) params.status = status

      const response = await this.client.get('/v1/appointments', { params })
      
      return {
        appointments: response.data.appointments?.map(appointment => 
          this.normalizeAppointment(appointment)
        ) || [],
        pagination: {
          page: response.data.pagination?.page || 1,
          totalPages: response.data.pagination?.total_pages || 1,
          totalItems: response.data.pagination?.total_items || 0
        }
      }
    } catch (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`)
    }
  }

  /**
   * Get upcoming appointments (next 7 days)
   */
  async getUpcomingAppointments(locationId = null, days = 7) {
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    return this.getAppointments({
      locationId,
      startDate,
      endDate,
      status: 'confirmed'
    })
  }

  /**
   * Get today's appointments
   */
  async getTodaysAppointments(locationId = null) {
    const today = new Date().toISOString().split('T')[0]
    
    return this.getAppointments({
      locationId,
      startDate: today,
      endDate: today
    })
  }

  /**
   * Get customers/clients
   */
  async getCustomers(options = {}) {
    const {
      locationId = null,
      limit = 100,
      page = 1,
      search = null
    } = options

    try {
      const params = { limit, page }
      if (locationId) params.location_id = locationId
      if (search) params.search = search

      const response = await this.client.get('/v1/customers', { params })
      
      return {
        customers: response.data.customers?.map(customer => ({
          id: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          totalAppointments: customer.total_appointments || 0,
          totalSpent: parseFloat(customer.total_spent || 0),
          lastVisit: customer.last_visit_date,
          createdAt: customer.created_at,
          notes: customer.notes || ''
        })) || [],
        pagination: {
          page: response.data.pagination?.page || 1,
          totalPages: response.data.pagination?.total_pages || 1,
          totalItems: response.data.pagination?.total_items || 0
        }
      }
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }
  }

  /**
   * Normalize Traft appointment to standard appointment format
   */
  normalizeAppointment(appointment) {
    // Parse appointment date/time
    const startTime = new Date(`${appointment.date}T${appointment.start_time}`)
    const endTime = new Date(startTime.getTime() + (appointment.duration_minutes * 60 * 1000))

    return {
      // Standard appointment fields
      id: appointment.id,
      title: `${appointment.service_name}${appointment.customer_name ? ` - ${appointment.customer_name}` : ''}`,
      description: appointment.notes || '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isAllDay: false,
      duration: appointment.duration_minutes || 60,
      
      // Location and participants
      location: appointment.location_name || '',
      attendees: [{
        email: appointment.customer_email || '',
        name: appointment.customer_name || 'Unknown Customer',
        status: 'accepted'
      }],
      
      // Service details
      serviceName: appointment.service_name,
      servicePrice: parseFloat(appointment.service_price || 0),
      staffName: appointment.staff_name,
      staffId: appointment.staff_id,
      
      // Customer details
      customerName: appointment.customer_name,
      customerEmail: appointment.customer_email,
      customerPhone: appointment.customer_phone,
      customerId: appointment.customer_id,
      
      // Metadata
      status: appointment.status || 'confirmed',
      locationId: appointment.location_id,
      locationName: appointment.location_name,
      
      // Traft specific
      platform: 'trafft',
      platformEventId: appointment.id,
      
      // Timestamps
      created: appointment.created_at,
      updated: appointment.updated_at,
      
      // Additional metadata for AI context
      metadata: {
        appointmentType: appointment.appointment_type || 'service',
        paymentStatus: appointment.payment_status || 'pending',
        remindersSent: appointment.reminders_sent || 0,
        source: appointment.booking_source || 'direct',
        specialRequests: appointment.special_requests || '',
        recurringId: appointment.recurring_appointment_id || null
      }
    }
  }

  /**
   * Test connection with current credentials
   */
  async testConnection() {
    try {
      const accountInfo = await this.authenticate()
      const locations = await this.getLocations()
      
      return {
        success: true,
        accountInfo,
        locationsCount: locations.length,
        businessName: accountInfo.businessName
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get connection status and basic info
   */
  async getConnectionInfo() {
    try {
      const accountInfo = await this.authenticate()
      const locations = await this.getLocations()
      
      return {
        connected: true,
        accountId: accountInfo.accountId,
        businessName: accountInfo.businessName,
        email: accountInfo.email,
        locationsCount: locations.length,
        subscription: accountInfo.subscription,
        timezone: accountInfo.timezone,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      }
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(options = {}) {
    const {
      locationId = null,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0]
    } = options

    try {
      const params = {
        start_date: startDate,
        end_date: endDate
      }
      if (locationId) params.location_id = locationId

      const response = await this.client.get('/v1/analytics', { params })
      
      return {
        appointments: {
          total: response.data.appointments_total || 0,
          completed: response.data.appointments_completed || 0,
          cancelled: response.data.appointments_cancelled || 0,
          noShow: response.data.appointments_no_show || 0
        },
        revenue: {
          total: parseFloat(response.data.revenue_total || 0),
          avgTicket: parseFloat(response.data.avg_ticket_size || 0)
        },
        customers: {
          total: response.data.customers_total || 0,
          new: response.data.new_customers || 0,
          returning: response.data.returning_customers || 0
        },
        services: {
          popular: response.data.popular_services || [],
          totalOffered: response.data.services_count || 0
        },
        staff: {
          totalActive: response.data.staff_count || 0,
          utilizationRates: response.data.staff_utilization || {}
        }
      }
    } catch (error) {
      // If analytics endpoint doesn't exist, return basic metrics
      console.warn('Analytics endpoint not available, returning basic metrics')
      return {
        appointments: { total: 0, completed: 0, cancelled: 0, noShow: 0 },
        revenue: { total: 0, avgTicket: 0 },
        customers: { total: 0, new: 0, returning: 0 },
        services: { popular: [], totalOffered: 0 },
        staff: { totalActive: 0, utilizationRates: {} }
      }
    }
  }

  /**
   * Search appointments by customer name, service, or staff
   */
  async searchAppointments(query, options = {}) {
    const {
      locationId = null,
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      limit = 50
    } = options

    try {
      const params = {
        search: query,
        start_date: startDate,
        end_date: endDate,
        limit
      }
      if (locationId) params.location_id = locationId

      const response = await this.client.get('/v1/appointments/search', { params })
      
      return response.data.appointments?.map(appointment => 
        this.normalizeAppointment(appointment)
      ) || []
    } catch (error) {
      throw new Error(`Failed to search appointments: ${error.message}`)
    }
  }
}

/**
 * Factory function to create Traft service instance
 */
export function createTrafftClient(apiKey, apiSecret, baseUrl) {
  return new TrafftService(apiKey, apiSecret, baseUrl)
}

export default TrafftService