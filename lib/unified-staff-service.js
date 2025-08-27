/**
 * Unified Staff Service
 * Handles staff data access with authentication-aware fallback logic
 * Solves the systemic staff visibility problem across all components
 */

import { createClient } from '@/lib/supabase/client'
import { getDisplayName, normalizeNameData } from '@/lib/name-utils'
import { 
  getUnifiedBarbershopId, 
  queryUnifiedStaffData, 
  normalizeStaffRecords 
} from '@/lib/schema-migration-helper'

class UnifiedStaffService {
  constructor() {
    this.supabase = createClient()
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Main method: Get staff data with authentication fallback
   * Tries authenticated endpoint first, falls back to public endpoint if 401
   */
  async getStaff(barbershopId = null, options = {}) {
    const { 
      useCache = true, 
      includeAvailability = false,
      includeServices = false,
      forceRefresh = false 
    } = options

    // // Debug log removed for production
try {
      // Check cache first
      const cacheKey = `staff-${barbershopId}-${includeAvailability}-${includeServices}`
      if (useCache && !forceRefresh && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          
          return cached.data
        }
      }

      let staffData = null
      let isAuthenticated = false

      // Step 1: Try authenticated endpoint first
      try {
        // // Debug log removed for production
const authResponse = await fetch('/api/staff')
        // // Debug log removed for production
if (authResponse.ok) {
          const authData = await authResponse.json()
          // // Debug log removed for production
if (authData.success && authData.staff && authData.staff.length > 0) {
            staffData = {
              staff: authData.staff,
              barbershop_id: authData.barbershop_id,
              source: 'authenticated'
            }
            isAuthenticated = true
            // // Debug log removed for production
}
        } else if (authResponse.status === 401) {
          // // Debug log removed for production
, will try public endpoint')
        }
      } catch (authError) {
        // // Debug log removed for production
}

      // Step 2: If authenticated failed and we have barbershopId, try public endpoint
      if (!staffData && barbershopId) {
        try {
          // // Debug log removed for production
const publicResponse = await fetch(`/api/public/barbershop/${barbershopId}/barbers`)
          // // Debug log removed for production
if (publicResponse.ok) {
            const publicData = await publicResponse.json()
            // // Debug log removed for production
if (publicData.success && publicData.staff && publicData.staff.length > 0) {
              staffData = {
                staff: publicData.staff,
                barbershop_id: publicData.barbershop_id,
                barbershop_name: publicData.barbershop_name,
                source: 'public'
              }
              // // Debug log removed for production
} else {
              // // Debug log removed for production
}
          } else {
            // // Debug log removed for production
}
        } catch (publicError) {
          console.error('❌ UnifiedStaffService: Error calling public endpoint:', publicError)
        }
      }

      // Step 3: If we still don't have barbershopId, try to get it from URL or context
      if (!staffData && !barbershopId) {
        const urlBarbershopId = this.extractBarbershopIdFromContext()
        if (urlBarbershopId) {
          
          return this.getStaff(urlBarbershopId, { ...options, useCache: false })
        }
      }

      // Step 4: If we have staff data, enhance it using unified schema
      if (staffData) {
        // // Debug log removed for production
// Use unified schema normalization
        const normalizedStaff = normalizeStaffRecords(staffData.staff)
        
        // Enhance with additional data if requested
        const enhancedStaff = await this.enhanceStaffData(
          normalizedStaff, 
          staffData.barbershop_id, 
          { includeAvailability, includeServices, isAuthenticated }
        )

        const result = {
          ...staffData,
          staff: enhancedStaff,
          count: enhancedStaff.length,
          timestamp: Date.now(),
          schema_version: 'unified' // Mark as using unified schema
        }

        // Cache the result
        if (useCache) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })
        }

        // // Debug log removed for production
return result
      }

      // Step 5: Return empty result if no staff found
      // // Debug log removed for production
return {
        staff: [],
        barbershop_id: barbershopId,
        count: 0,
        source: 'none',
        message: 'No staff members found'
      }

    } catch (error) {
      console.error('💥 Unified staff service error:', error)
      return {
        staff: [],
        count: 0,
        source: 'error',
        error: error.message
      }
    }
  }

  /**
   * Extract barbershop ID from URL parameters or other context
   * FIXED: Single source of truth - only check barbershop_id
   */
  extractBarbershopIdFromContext() {
    if (typeof window === 'undefined') return null

    const urlParams = new URLSearchParams(window.location.search)
    // CONSOLIDATED: Only use barbershop_id as single field name
    return urlParams.get('barbershop_id') || 
           urlParams.get('location_id') ||
           // Legacy support during migration period
           urlParams.get('shop_id')
  }

  /**
   * Enhance staff data with additional information
   */
  async enhanceStaffData(staff, barbershopId, options = {}) {
    const { includeAvailability, includeServices, isAuthenticated } = options

    try {
      // Normalize staff data structure
      const normalizedStaff = staff.map(member => {
        const nameData = normalizeNameData({
          firstName: member.first_name || member.firstName,
          lastName: member.last_name || member.lastName, 
          fullName: member.full_name || member.fullName
        })

        const displayName = getDisplayName({
          firstName: nameData.firstName,
          lastName: nameData.lastName,
          fullName: nameData.fullName,
          email: member.email,
          defaultName: 'Staff Member'
        })

        return {
          // Standardized ID fields
          id: member.user_id || member.id,
          user_id: member.user_id || member.id,
          staff_id: member.staff_id || member.id,
          barbershop_id: member.barbershop_id || barbershopId,
          
          // Name fields (multiple formats for compatibility)
          first_name: nameData.firstName,
          last_name: nameData.lastName, 
          full_name: nameData.fullName,
          firstName: nameData.firstName,
          lastName: nameData.lastName,
          fullName: nameData.fullName,
          display_name: displayName,
          name: displayName, // Alias for components expecting 'name'
          
          // Role and status
          role: member.role || 'BARBER',
          is_active: member.is_active !== false,
          created_at: member.created_at,
          
          // Contact info
          email: member.email || '',
          phone: member.phone || '',
          avatar_url: null, // Avatar URLs not implemented in database yet
          
          // Booking-friendly fields
          title: member.title || (member.role === 'OWNER' ? 'Owner/Master Barber' : 'Barber'),
          experience: member.experience || '5+ years',
          rating: member.rating || 4.8,
          reviewCount: member.reviewCount || 0,
          specialties: member.specialties || ['Haircuts', 'Styling'],
          availability: member.availability || 'Available',
          bio: member.bio || `Professional ${(member.role || 'barber').toLowerCase()} providing quality service`,
          
          // Additional fields
          services: member.services || [],
          stats: member.stats || {
            completedCuts: 0,
            repeatClients: 85,
            responseTime: '5 min'
          }
        }
      })

      // Add availability data if requested and authenticated
      if (includeAvailability && isAuthenticated && barbershopId) {
        await this.addAvailabilityData(normalizedStaff, barbershopId)
      }

      // Add services data if requested and authenticated  
      if (includeServices && isAuthenticated && barbershopId) {
        await this.addServicesData(normalizedStaff, barbershopId)
      }

      return normalizedStaff

    } catch (error) {
      console.error('Error enhancing staff data:', error)
      return staff // Return original data if enhancement fails
    }
  }

  /**
   * Add availability data to staff members
   */
  async addAvailabilityData(staff, barbershopId) {
    try {
      const staffIds = staff.map(s => s.user_id).filter(Boolean)
      if (staffIds.length === 0) return

      const { data: availability } = await this.supabase
        .from('barber_availability')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .in('barber_id', staffIds)

      if (availability) {
        staff.forEach(staffMember => {
          const memberAvailability = availability.filter(a => a.barber_id === staffMember.user_id)
          staffMember.availability_schedule = memberAvailability
        })
      }
    } catch (error) {
      console.error('Error adding availability data:', error)
    }
  }

  /**
   * Add services data to staff members
   */
  async addServicesData(staff, barbershopId) {
    try {
      const { data: services } = await this.supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      if (services) {
        // For now, assign all services to all staff
        // TODO: Implement staff-service associations
        staff.forEach(staffMember => {
          staffMember.services = services.map(service => ({
            id: service.id,
            name: service.name,
            price: service.price,
            duration: service.duration_minutes || service.duration,
            description: service.description
          }))
        })
      }
    } catch (error) {
      console.error('Error adding services data:', error)
    }
  }

  /**
   * Invalidate cache for specific barbershop
   */
  invalidateCache(barbershopId = null) {
    if (barbershopId) {
      // Remove all cache entries for specific barbershop
      for (const [key] of this.cache.entries()) {
        if (key.includes(`staff-${barbershopId}`)) {
          this.cache.delete(key)
        }
      }
      
    } else {
      // Clear all cache
      this.cache.clear()
      
    }
  }

  /**
   * Convenience method: Get staff for specific barber ID
   */
  async getBarberById(barberId, barbershopId = null) {
    const { staff } = await this.getStaff(barbershopId)
    return staff.find(s => s.user_id === barberId || s.id === barberId)
  }

  /**
   * Convenience method: Get staff with availability
   */
  async getStaffWithAvailability(barbershopId = null) {
    return this.getStaff(barbershopId, { includeAvailability: true })
  }

  /**
   * Convenience method: Get staff with services
   */
  async getStaffWithServices(barbershopId = null) {
    return this.getStaff(barbershopId, { includeServices: true })
  }

  /**
   * UNIFIED SCHEMA METHOD: Get staff using direct unified query
   * This bypasses the fallback logic and uses pure unified schema approach
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Staff data
   */
  async getStaffUnified(barbershopId, options = {}) {
    const { 
      includeInactive = false,
      includeAvailability = false,
      includeServices = false,
      useCache = true 
    } = options

    // // Debug log removed for production
try {
      if (!barbershopId) {
        throw new Error('barbershopId is required for unified staff query')
      }

      const cacheKey = `unified-staff-${barbershopId}-${includeInactive}-${includeAvailability}-${includeServices}`
      
      // Check cache
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          // // Debug log removed for production
return cached.data
        }
      }

      // Use unified query helper
      const staffRecords = await queryUnifiedStaffData(
        this.supabase,
        barbershopId,
        {
          includeInactive,
          includeProfiles: true,
          orderBy: 'created_at',
          ascending: true
        }
      )

      // // Debug log removed for production
// Enhance with additional data if requested
      let enhancedStaff = staffRecords
      if (includeAvailability) {
        await this.addAvailabilityData(enhancedStaff, barbershopId)
      }
      if (includeServices) {
        await this.addServicesData(enhancedStaff, barbershopId)
      }

      const result = {
        staff: enhancedStaff,
        count: enhancedStaff.length,
        barbershop_id: barbershopId,
        source: 'unified_schema',
        schema_version: 'unified',
        timestamp: Date.now()
      }

      // Cache result
      if (useCache) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }

      // // Debug log removed for production
return result

    } catch (error) {
      console.error('UnifiedStaffService.getStaffUnified: Error:', error)
      return {
        staff: [],
        count: 0,
        barbershop_id: barbershopId,
        source: 'error',
        schema_version: 'unified',
        error: error.message
      }
    }
  }
}

// Export singleton instance
const unifiedStaffService = new UnifiedStaffService()
export default unifiedStaffService

// Also export the class for testing
export { UnifiedStaffService }

// Export convenience functions for unified schema
export const getStaffUnified = (barbershopId, options) => 
  unifiedStaffService.getStaffUnified(barbershopId, options)

export const getStaffWithUnifiedSchema = (barbershopId, options = {}) => 
  unifiedStaffService.getStaffUnified(barbershopId, options)