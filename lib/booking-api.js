/**
 * Centralized Booking API Client
 * Handles all booking-related API calls with proper error handling, retries, and timeouts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

class BookingAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.retryCount = {};
  }

  /**
   * Sleep helper for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create an AbortController with timeout
   */
  createTimeoutController(timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    return { controller, timeoutId };
  }

  /**
   * Generic fetch wrapper with error handling, retries, and timeout
   */
  async fetchAPI(endpoint, options = {}, retryCount = 0) {
    const { controller, timeoutId } = this.createTimeoutController(options.timeout || DEFAULT_TIMEOUT);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.detail || error.message || `API Error: ${response.status}`;
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(errorMessage);
        }
        
        // Retry on 5xx errors (server errors)
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          console.warn(`API Error [${endpoint}]: ${errorMessage}. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await this.sleep(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
          return this.fetchAPI(endpoint, options, retryCount + 1);
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        if (retryCount < MAX_RETRIES) {
          console.warn(`API Timeout [${endpoint}]. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await this.sleep(RETRY_DELAY * Math.pow(2, retryCount));
          return this.fetchAPI(endpoint, options, retryCount + 1);
        }
        throw new Error(`Request timeout after ${MAX_RETRIES} retries`);
      }
      
      // Handle network errors
      if (error.message === 'Failed to fetch' && retryCount < MAX_RETRIES) {
        console.warn(`Network Error [${endpoint}]. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        await this.sleep(RETRY_DELAY * Math.pow(2, retryCount));
        return this.fetchAPI(endpoint, options, retryCount + 1);
      }
      
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get all barbershop locations
   */
  async getBarbershops() {
    const data = await this.fetchAPI('/booking/barbershops');
    return data.barbershops || [];
  }

  /**
   * Get barbers for a specific barbershop
   */
  async getBarbers(barbershopId) {
    if (!barbershopId) {
      throw new Error('Barbershop ID is required');
    }
    const data = await this.fetchAPI(`/booking/barbershops/${barbershopId}/barbers`);
    return data.barbers || [];
  }

  /**
   * Get services for a specific barber at a barbershop
   */
  async getServices(barbershopId, barberId = null) {
    if (!barbershopId) {
      throw new Error('Barbershop ID is required');
    }
    
    const params = new URLSearchParams();
    if (barberId) {
      params.append('barber_id', barberId);
    }
    
    const endpoint = `/booking/barbershops/${barbershopId}/services${params.toString() ? `?${params}` : ''}`;
    const data = await this.fetchAPI(endpoint);
    return data.services || [];
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots({ barbershopId, barberId, serviceId, date }) {
    if (!barbershopId || !date) {
      throw new Error('Barbershop ID and date are required');
    }

    const data = await this.fetchAPI('/booking/available-slots', {
      method: 'POST',
      body: JSON.stringify({
        barbershop_id: barbershopId,
        barber_id: barberId,
        service_id: serviceId,
        date: date,
      }),
    });
    
    return data.slots || [];
  }

  /**
   * Get barbershop settings (payment options, policies, etc.)
   */
  async getBarbershopSettings(barbershopId) {
    if (!barbershopId) {
      throw new Error('Barbershop ID is required');
    }
    
    const data = await this.fetchAPI(`/booking/barbershops/${barbershopId}/settings`);
    return data.settings || {
      acceptOnlinePayment: true,
      acceptInPersonPayment: true,
      requireOnlinePayment: false,
      depositRequired: false,
      depositAmount: 0,
      depositPercentage: 0,
      cancellationWindow: 24,
      businessHours: {},
    };
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData) {
    const requiredFields = ['barbershop_id', 'service_id', 'scheduled_at', 'customer_name'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const data = await this.fetchAPI('/booking/create', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
    
    return data.booking || data;
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId) {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }
    
    const data = await this.fetchAPI(`/booking/${bookingId}`);
    return data.booking || data;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId, reason = '') {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }
    
    const data = await this.fetchAPI(`/booking/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    
    return data;
  }

  /**
   * Check if a customer exists
   */
  async checkCustomer(email, phone) {
    if (!email && !phone) {
      throw new Error('Email or phone is required');
    }
    
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (phone) params.append('phone', phone);
    
    const data = await this.fetchAPI(`/booking/customer/check?${params}`);
    return data.exists || false;
  }

  /**
   * Create payment intent for deposit/prepayment
   */
  async createPaymentIntent(bookingId, amount) {
    if (!bookingId || !amount) {
      throw new Error('Booking ID and amount are required');
    }
    
    const data = await this.fetchAPI('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        booking_id: bookingId,
        amount: amount,
      }),
    });
    
    return data.clientSecret || data.client_secret;
  }
}

// Export singleton instance
const bookingAPI = new BookingAPI();
export default bookingAPI;