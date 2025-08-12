// Service Resolution System
// Handles priority logic between shop-level and barber-level services

import { createClient } from '@/lib/supabase/client'
import { getBarberPermissions } from '@/lib/permissions'

/**
 * Get resolved services for a barber (shop services + barber customizations)
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {Object} options - Additional options
 * @returns {Array} Resolved services with proper priority
 */
export async function getResolvedServices(barberId, barbershopId, options = {}) {
  const {
    includeInactive = false,
    categoryFilter = null,
    forBooking = false // Whether this is for booking system (affects what's returned)
  } = options

  const supabase = createClient()

  try {
    // Get barber permissions to understand what they can customize
    const permissions = await getBarberPermissions(barberId, barbershopId)

    // Load shop services (base services)
    const { data: shopServices, error: shopError } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', includeInactive ? undefined : true)
      .order('display_order', { ascending: true })

    if (shopError) {
      console.error('Error loading shop services:', shopError)
      return []
    }

    // Load barber's customized services
    const { data: barberServices, error: barberError } = await supabase
      .from('barber_services')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', includeInactive ? undefined : true)
      .order('display_order', { ascending: true })

    if (barberError) {
      console.error('Error loading barber services:', barberError)
      // Continue with shop services only
    }

    // Resolve services with barber customizations taking priority
    const resolvedServices = resolveServicePriority(
      shopServices || [],
      barberServices || [],
      permissions,
      { forBooking, categoryFilter }
    )

    return resolvedServices
  } catch (error) {
    console.error('Error in getResolvedServices:', error)
    return []
  }
}

/**
 * Get services for a specific context (booking, management, etc.)
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {string} context - Context: 'booking', 'management', 'analytics'
 * @returns {Array} Context-appropriate services
 */
export async function getServicesForContext(barberId, barbershopId, context) {
  const baseOptions = {
    includeInactive: false
  }

  switch (context) {
    case 'booking':
      // For booking: only active services that allow online booking
      return getResolvedServices(barberId, barbershopId, {
        ...baseOptions,
        forBooking: true
      }).then(services => 
        services.filter(service => service.online_booking_enabled !== false)
      )

    case 'management':
      // For management: all services including inactive
      return getResolvedServices(barberId, barbershopId, {
        includeInactive: true,
        forBooking: false
      })

    case 'analytics':
      // For analytics: active services with performance data
      return getResolvedServices(barberId, barbershopId, baseOptions)
        .then(services => services.filter(service => service.track_analytics !== false))

    default:
      return getResolvedServices(barberId, barbershopId, baseOptions)
  }
}

/**
 * Core service resolution logic with priority system
 * @param {Array} shopServices - Base shop services
 * @param {Array} barberServices - Barber customizations
 * @param {Object} permissions - Barber permissions
 * @param {Object} options - Resolution options
 * @returns {Array} Resolved services
 */
function resolveServicePriority(shopServices, barberServices, permissions, options = {}) {
  const { forBooking = false, categoryFilter = null } = options
  const resolved = []

  // Create lookup map for barber services
  const barberServiceMap = new Map()
  const barberOnlyServices = []

  barberServices.forEach(barberService => {
    if (barberService.base_service_id) {
      // Barber customization of shop service
      barberServiceMap.set(barberService.base_service_id, barberService)
    } else {
      // Barber-only service (no shop equivalent)
      barberOnlyServices.push(barberService)
    }
  })

  // Process shop services with potential barber overrides
  shopServices.forEach(shopService => {
    const barberCustomization = barberServiceMap.get(shopService.id)
    
    if (barberCustomization && canUseBarberCustomization(barberCustomization, permissions)) {
      // Use barber's customized version
      const resolvedService = mergeServiceData(shopService, barberCustomization, permissions)
      resolved.push(resolvedService)
    } else {
      // Use shop default
      const resolvedService = {
        ...shopService,
        source: 'shop',
        isCustomized: false,
        canEdit: hasEditPermission(shopService, permissions),
        constraints: getServiceConstraints(shopService, permissions)
      }
      resolved.push(resolvedService)
    }
  })

  // Add barber-only services (if permitted)
  if (permissions?.can_create_services) {
    barberOnlyServices.forEach(barberService => {
      if (canUseBarberService(barberService, permissions)) {
        const resolvedService = {
          ...barberService,
          source: 'barber',
          isCustomized: true,
          isBarberOnly: true,
          canEdit: true,
          constraints: getServiceConstraints(barberService, permissions)
        }
        resolved.push(resolvedService)
      }
    })
  }

  // Apply filters
  let filtered = resolved

  if (categoryFilter) {
    filtered = filtered.filter(service => service.category === categoryFilter)
  }

  if (forBooking) {
    filtered = filtered.filter(service => {
      // For booking context, ensure service is bookable
      return service.is_active !== false && 
             service.online_booking_enabled !== false &&
             !service.requires_manual_booking
    })
  }

  // Sort by display order, then by name
  filtered.sort((a, b) => {
    const orderA = a.display_order || 999
    const orderB = b.display_order || 999
    if (orderA !== orderB) return orderA - orderB
    return (a.name || '').localeCompare(b.name || '')
  })

  return filtered
}

/**
 * Merge shop service with barber customization
 * @param {Object} shopService - Base shop service
 * @param {Object} barberCustomization - Barber's customized version
 * @param {Object} permissions - Barber permissions
 * @returns {Object} Merged service
 */
function mergeServiceData(shopService, barberCustomization, permissions) {
  const merged = {
    // Start with shop service as base
    ...shopService,
    
    // Apply barber customizations
    id: barberCustomization.id, // Use barber service ID for operations
    base_service_id: shopService.id, // Keep reference to shop service
    
    // Override with barber values where permitted
    name: canCustomizeName(permissions) ? 
      (barberCustomization.name || shopService.name) : shopService.name,
    description: canCustomizeDescription(permissions) ? 
      (barberCustomization.description || shopService.description) : shopService.description,
    price: canCustomizePricing(permissions) ? 
      barberCustomization.price : shopService.price,
    duration_minutes: canCustomizeDuration(permissions) ? 
      barberCustomization.duration_minutes : shopService.duration_minutes,
    
    // Metadata
    source: 'barber',
    isCustomized: true,
    basePrice: shopService.price,
    baseDuration: shopService.duration_minutes,
    customPrice: barberCustomization.price,
    customDuration: barberCustomization.duration_minutes,
    
    // Permission info
    canEdit: hasEditPermission(barberCustomization, permissions),
    constraints: getServiceConstraints(shopService, permissions),
    
    // Barber-specific fields
    barber_id: barberCustomization.barber_id,
    created_with_permission: barberCustomization.created_with_permission,
    last_permission_check: barberCustomization.last_permission_check
  }

  return merged
}

/**
 * Check if barber can use their customization
 * @param {Object} barberService - Barber service
 * @param {Object} permissions - Barber permissions
 * @returns {boolean} Whether customization can be used
 */
function canUseBarberCustomization(barberService, permissions) {
  if (!permissions || !permissions.is_active) return false
  if (!barberService.is_active) return false
  
  // Check if the customization is still valid under current permissions
  return barberService.permission_validated !== false
}

/**
 * Check if barber can use their barber-only service
 * @param {Object} barberService - Barber service
 * @param {Object} permissions - Barber permissions
 * @returns {boolean} Whether service can be used
 */
function canUseBarberService(barberService, permissions) {
  if (!permissions || !permissions.is_active) return false
  if (!permissions.can_create_services) return false
  if (!barberService.is_active) return false
  
  return true
}

/**
 * Check various customization permissions
 */
function canCustomizeName(permissions) {
  return permissions?.can_modify_service_descriptions === true
}

function canCustomizeDescription(permissions) {
  return permissions?.can_modify_service_descriptions === true
}

function canCustomizePricing(permissions) {
  return permissions?.can_set_pricing === true
}

function canCustomizeDuration(permissions) {
  return permissions?.can_set_service_duration === true
}

/**
 * Check if user can edit this service
 * @param {Object} service - Service object
 * @param {Object} permissions - Barber permissions
 * @returns {boolean} Whether service can be edited
 */
function hasEditPermission(service, permissions) {
  if (!permissions || !permissions.is_active) return false
  
  // Can edit if they can modify services
  if (permissions.can_modify_services) return true
  
  // Can edit their own barber-only services if they can create
  if (service.source === 'barber' && service.isBarberOnly && permissions.can_create_services) {
    return true
  }
  
  return false
}

/**
 * Get constraints for service editing
 * @param {Object} service - Service object
 * @param {Object} permissions - Barber permissions
 * @returns {Object} Constraints object
 */
function getServiceConstraints(service, permissions) {
  if (!permissions) {
    return { canEdit: false, canEditPricing: false, canEditDuration: false }
  }

  const constraints = {
    canEdit: hasEditPermission(service, permissions),
    canEditPricing: permissions.can_set_pricing === true,
    canEditDuration: permissions.can_set_service_duration === true,
    canEditDescription: permissions.can_modify_service_descriptions === true,
    canUploadImages: permissions.can_upload_portfolio_images === true
  }

  // Add pricing constraints
  if (constraints.canEditPricing && service.basePrice) {
    const variance = permissions.pricing_variance_percent || 0
    constraints.pricingConstraints = {
      variance,
      minPrice: service.basePrice * (1 - variance / 100),
      maxPrice: service.basePrice * (1 + variance / 100)
    }
  }

  // Add duration constraints
  if (constraints.canEditDuration && service.baseDuration) {
    const variance = permissions.duration_variance_percent || 0
    constraints.durationConstraints = {
      variance,
      minDuration: Math.round(service.baseDuration * (1 - variance / 100)),
      maxDuration: Math.round(service.baseDuration * (1 + variance / 100))
    }
  }

  return constraints
}

/**
 * Get services for shop owner view (all services for all barbers)
 * @param {string} barbershopId - UUID of the barbershop
 * @param {Object} options - Options
 * @returns {Array} Shop services with barber customizations
 */
export async function getShopServicesWithCustomizations(barbershopId, options = {}) {
  const supabase = createClient()

  try {
    // Get all shop services
    const { data: shopServices, error: shopError } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('display_order', { ascending: true })

    if (shopError) {
      console.error('Error loading shop services:', shopError)
      return []
    }

    // Get all barber customizations for this shop
    const { data: barberCustomizations, error: barberError } = await supabase
      .from('barber_services')
      .select(`
        *,
        barber:users(id, name, email)
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (barberError) {
      console.error('Error loading barber customizations:', barberError)
    }

    // Group customizations by service
    const customizationMap = new Map()
    const barberOnlyServices = []

    ;(barberCustomizations || []).forEach(customization => {
      if (customization.base_service_id) {
        if (!customizationMap.has(customization.base_service_id)) {
          customizationMap.set(customization.base_service_id, [])
        }
        customizationMap.get(customization.base_service_id).push(customization)
      } else {
        barberOnlyServices.push(customization)
      }
    })

    // Enhance shop services with customization info
    const enhancedServices = shopServices.map(service => ({
      ...service,
      customizations: customizationMap.get(service.id) || [],
      hasCustomizations: customizationMap.has(service.id),
      customizationCount: (customizationMap.get(service.id) || []).length
    }))

    // Add barber-only services
    const barberOnlyEnhanced = barberOnlyServices.map(service => ({
      ...service,
      isBarberOnly: true,
      barberInfo: service.barber
    }))

    return [...enhancedServices, ...barberOnlyEnhanced]
  } catch (error) {
    console.error('Error in getShopServicesWithCustomizations:', error)
    return []
  }
}

/**
 * Validate service changes against permissions
 * @param {Object} changes - Proposed changes
 * @param {Object} originalService - Original service
 * @param {Object} permissions - Barber permissions
 * @returns {Object} Validation result
 */
export function validateServiceChanges(changes, originalService, permissions) {
  const errors = []
  const warnings = []

  // Validate pricing changes
  if (changes.price !== undefined && changes.price !== originalService.price) {
    if (!permissions?.can_set_pricing) {
      errors.push('No permission to modify pricing')
    } else if (originalService.basePrice) {
      const { isValid, reason } = validatePricingConstraints(
        originalService.basePrice,
        changes.price,
        permissions.pricing_variance_percent || 0
      )
      if (!isValid) {
        errors.push(`Pricing: ${reason}`)
      }
    }
  }

  // Validate duration changes
  if (changes.duration_minutes !== undefined && changes.duration_minutes !== originalService.duration_minutes) {
    if (!permissions?.can_set_service_duration) {
      errors.push('No permission to modify service duration')
    } else if (originalService.baseDuration) {
      const { isValid, reason } = validateDurationConstraints(
        originalService.baseDuration,
        changes.duration_minutes,
        permissions.duration_variance_percent || 0
      )
      if (!isValid) {
        errors.push(`Duration: ${reason}`)
      }
    }
  }

  // Validate description changes
  if ((changes.name !== undefined && changes.name !== originalService.name) ||
      (changes.description !== undefined && changes.description !== originalService.description)) {
    if (!permissions?.can_modify_service_descriptions) {
      errors.push('No permission to modify service descriptions')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Helper validation functions
 */
function validatePricingConstraints(basePrice, proposedPrice, variancePercent) {
  const maxPrice = basePrice * (1 + variancePercent / 100)
  const minPrice = basePrice * (1 - variancePercent / 100)
  
  const isValid = proposedPrice >= minPrice && proposedPrice <= maxPrice
  
  return {
    isValid,
    reason: isValid ? 'Valid' : `Price must be between $${minPrice.toFixed(2)} and $${maxPrice.toFixed(2)}`,
    minPrice,
    maxPrice
  }
}

function validateDurationConstraints(baseDuration, proposedDuration, variancePercent) {
  const maxDuration = Math.round(baseDuration * (1 + variancePercent / 100))
  const minDuration = Math.round(baseDuration * (1 - variancePercent / 100))
  
  const isValid = proposedDuration >= minDuration && proposedDuration <= maxDuration
  
  return {
    isValid,
    reason: isValid ? 'Valid' : `Duration must be between ${minDuration} and ${maxDuration} minutes`,
    minDuration,
    maxDuration
  }
}