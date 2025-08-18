/**
 * Configuration Service
 * Centralized configuration management for the application
 * Provides dynamic configuration values from environment variables and database
 */

import { createClient } from './supabase/server'

class ConfigurationService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Get application configuration
   */
  getAppConfig() {
    return {
      name: process.env.NEXT_PUBLIC_APP_NAME || process.env.DEFAULT_SHOP_NAME || 'Barbershop',
      url: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001',
      environment: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production',
      debug: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
    }
  }

  /**
   * Get business defaults from environment
   */
  getBusinessDefaults() {
    return {
      timezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
      currency: process.env.DEFAULT_CURRENCY || 'USD',
      language: process.env.DEFAULT_LANGUAGE || 'en',
      openingTime: process.env.DEFAULT_OPENING_TIME || '09:00',
      closingTime: process.env.DEFAULT_CLOSING_TIME || '19:00',
      bookingSlotMinutes: parseInt(process.env.DEFAULT_BOOKING_SLOT_MINUTES || '30'),
      barbersPerShop: parseInt(process.env.DEFAULT_BARBERS_PER_SHOP || '5'),
      appointmentsPerBarberDaily: parseInt(process.env.DEFAULT_APPOINTMENTS_PER_BARBER_DAILY || '16'),
      serviceBufferMinutes: parseInt(process.env.DEFAULT_SERVICE_BUFFER_MINUTES || '5')
    }
  }

  /**
   * Get feature flags
   */
  getFeatureFlags() {
    return {
      aiAgents: process.env.ENABLE_AI_AGENTS !== 'false',
      inventoryManagement: process.env.ENABLE_INVENTORY_MANAGEMENT !== 'false',
      smsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS !== 'false',
      emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
      pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
      multiLocation: process.env.ENABLE_MULTI_LOCATION !== 'false',
      onlineBooking: process.env.ENABLE_ONLINE_BOOKING !== 'false',
      paymentProcessing: process.env.ENABLE_PAYMENT_PROCESSING !== 'false',
      predictiveAnalytics: process.env.ENABLE_PREDICTIVE_ANALYTICS !== 'false',
      customerLoyalty: process.env.ENABLE_CUSTOMER_LOYALTY !== 'false',
      staffManagement: process.env.ENABLE_STAFF_MANAGEMENT !== 'false',
      advancedReporting: process.env.ENABLE_ADVANCED_REPORTING !== 'false'
    }
  }

  /**
   * Get shop-specific configuration from database
   * Falls back to environment defaults if not found
   */
  async getShopConfig(shopId) {
    // Check cache first
    const cacheKey = `shop_config_${shopId}`
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    try {
      const supabase = createClient()
      
      // Fetch shop settings from database
      const { data: shop, error } = await supabase
        .from('barbershops')
        .select(`
          *,
          shop_settings (*)
        `)
        .eq('id', shopId)
        .single()

      if (error || !shop) {
        console.warn(`Shop config not found for ID ${shopId}, using defaults`)
        return this.getDefaultShopConfig()
      }

      const config = {
        // Basic shop info
        id: shop.id,
        name: shop.name || process.env.DEFAULT_SHOP_NAME || 'Barbershop',
        slug: shop.slug,
        description: shop.description,
        
        // Contact info
        email: shop.email,
        phone: shop.phone,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        zipCode: shop.zip_code,
        
        // Business hours (from shop_settings or defaults)
        businessHours: shop.shop_settings?.business_hours || this.getDefaultBusinessHours(),
        timezone: shop.shop_settings?.timezone || process.env.DEFAULT_TIMEZONE || 'America/New_York',
        
        // Booking configuration
        bookingSettings: {
          slotDuration: shop.shop_settings?.booking_slot_minutes || parseInt(process.env.DEFAULT_BOOKING_SLOT_MINUTES || '30'),
          bufferTime: shop.shop_settings?.buffer_minutes || parseInt(process.env.DEFAULT_SERVICE_BUFFER_MINUTES || '5'),
          advanceBookingDays: shop.shop_settings?.advance_booking_days || 30,
          cancellationHours: shop.shop_settings?.cancellation_hours || 24
        },
        
        // Capacity settings
        capacity: {
          barbersCount: shop.barbers_count || parseInt(process.env.DEFAULT_BARBERS_PER_SHOP || '5'),
          dailyAppointmentsPerBarber: shop.shop_settings?.appointments_per_barber || 
            parseInt(process.env.DEFAULT_APPOINTMENTS_PER_BARBER_DAILY || '16')
        },
        
        // Features enabled for this shop
        features: shop.shop_settings?.features || this.getFeatureFlags(),
        
        // Branding
        branding: {
          logo: shop.logo_url,
          primaryColor: shop.shop_settings?.primary_color || '#000000',
          secondaryColor: shop.shop_settings?.secondary_color || '#666666',
          heroImage: shop.hero_image_url,
          heroTitle: shop.hero_title,
          heroSubtitle: shop.hero_subtitle
        },
        
        // Social media
        social: {
          facebook: shop.facebook_url,
          instagram: shop.instagram_url,
          twitter: shop.twitter_url,
          website: shop.website_url
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: config,
        timestamp: Date.now()
      })

      return config
    } catch (error) {
      console.error('Error fetching shop config:', error)
      return this.getDefaultShopConfig()
    }
  }

  /**
   * Get default shop configuration
   */
  getDefaultShopConfig() {
    const defaults = this.getBusinessDefaults()
    
    return {
      name: process.env.DEFAULT_SHOP_NAME || 'Barbershop',
      businessHours: this.getDefaultBusinessHours(),
      timezone: defaults.timezone,
      bookingSettings: {
        slotDuration: defaults.bookingSlotMinutes,
        bufferTime: defaults.serviceBufferMinutes,
        advanceBookingDays: 30,
        cancellationHours: 24
      },
      capacity: {
        barbersCount: defaults.barbersPerShop,
        dailyAppointmentsPerBarber: defaults.appointmentsPerBarberDaily
      },
      features: this.getFeatureFlags()
    }
  }

  /**
   * Get default business hours
   */
  getDefaultBusinessHours() {
    const openTime = process.env.DEFAULT_OPENING_TIME || '09:00'
    const closeTime = process.env.DEFAULT_CLOSING_TIME || '19:00'
    
    return {
      monday: { open: openTime, close: closeTime, isOpen: true },
      tuesday: { open: openTime, close: closeTime, isOpen: true },
      wednesday: { open: openTime, close: closeTime, isOpen: true },
      thursday: { open: openTime, close: closeTime, isOpen: true },
      friday: { open: openTime, close: closeTime, isOpen: true },
      saturday: { open: '10:00', close: '18:00', isOpen: true },
      sunday: { open: '11:00', close: '17:00', isOpen: false }
    }
  }

  /**
   * Get service configuration for a shop
   */
  async getServicesConfig(shopId) {
    try {
      const supabase = createClient()
      
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error || !services || services.length === 0) {
        return this.getDefaultServices()
      }

      return services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration_minutes,
        category: service.category,
        isActive: service.is_active
      }))
    } catch (error) {
      console.error('Error fetching services config:', error)
      return this.getDefaultServices()
    }
  }

  /**
   * Get default services (only used if no services in database)
   */
  getDefaultServices() {
    // These are just fallbacks - real services should come from database
    return [
      {
        name: 'Service 1',
        description: 'Configure your services in the admin panel',
        price: 0,
        duration: 30,
        category: 'general',
        isActive: true
      }
    ]
  }

  /**
   * Clear configuration cache
   */
  clearCache(shopId = null) {
    if (shopId) {
      // Clear specific shop cache
      const keys = Array.from(this.cache.keys()).filter(key => key.includes(shopId))
      keys.forEach(key => this.cache.delete(key))
    } else {
      // Clear all cache
      this.cache.clear()
    }
  }

  /**
   * Get API endpoints configuration
   */
  getApiEndpoints() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
    
    return {
      // Backend APIs
      backend: {
        base: baseUrl,
        auth: `${baseUrl}/auth`,
        ai: `${baseUrl}/ai`,
        dashboard: `${baseUrl}/dashboard`,
        inventory: `${baseUrl}/inventory`,
        notifications: `${baseUrl}/notifications`
      },
      
      // Frontend routes
      frontend: {
        base: frontendUrl,
        login: `${frontendUrl}/login`,
        dashboard: `${frontendUrl}/dashboard`,
        booking: `${frontendUrl}/booking`,
        admin: `${frontendUrl}/admin`
      },
      
      // External APIs
      external: {
        cin7: process.env.CIN7_API_URL || 'https://inventory.dearsystems.com',
        stripe: 'https://api.stripe.com',
        sendgrid: 'https://api.sendgrid.com',
        twilio: 'https://api.twilio.com'
      }
    }
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName) {
    const flags = this.getFeatureFlags()
    return flags[featureName] === true
  }
}

// Export singleton instance
const configService = new ConfigurationService()
export default configService

// Export class for testing
export { ConfigurationService }