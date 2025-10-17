/**
 * Trafft API integration module
 * Minimal implementation for build compatibility
 */

export const TrafftEventTypes = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated'
}

export class TrafftAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.trafft.com'
  }

  async get(endpoint) {
    return { data: null }
  }

  async post(endpoint, data) {
    return { data: null }
  }

  async put(endpoint, data) {
    return { data: null }
  }

  async delete(endpoint) {
    return { data: null }
  }
}

export default TrafftAPI