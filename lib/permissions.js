// Permission system for barber service management
// Handles role-based access control and permission validation

import { createClient } from '@/lib/supabase/client'

// Permission cache to reduce database calls
const permissionCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get barber permissions for a specific shop
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @returns {Object} Permission object or null
 */
export async function getBarberPermissions(barberId, barbershopId) {
  const cacheKey = `${barberId}-${barbershopId}`
  
  // Check cache first
  const cached = permissionCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions
  }
  
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('barber_permissions')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching barber permissions:', error)
      return null
    }
    
    const permissions = data || getDefaultPermissions()
    
    // Cache the result
    permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    })
    
    return permissions
  } catch (error) {
    console.error('Error in getBarberPermissions:', error)
    return getDefaultPermissions()
  }
}

/**
 * Check if barber has a specific permission
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {string} permissionName - Name of the permission to check
 * @returns {boolean} Whether the barber has the permission
 */
export async function hasPermission(barberId, barbershopId, permissionName) {
  const permissions = await getBarberPermissions(barberId, barbershopId)
  
  if (!permissions) {
    return false
  }
  
  return permissions[permissionName] === true
}

/**
 * Check multiple permissions at once
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {string[]} permissionNames - Array of permission names to check
 * @returns {Object} Object with permission names as keys and boolean values
 */
export async function hasPermissions(barberId, barbershopId, permissionNames) {
  const permissions = await getBarberPermissions(barberId, barbershopId)
  
  if (!permissions) {
    return permissionNames.reduce((acc, name) => {
      acc[name] = false
      return acc
    }, {})
  }
  
  return permissionNames.reduce((acc, name) => {
    acc[name] = permissions[name] === true
    return acc
  }, {})
}

/**
 * Validate service pricing within allowed variance
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {number} basePrice - Base shop price
 * @param {number} proposedPrice - Barber's proposed price
 * @returns {Object} Validation result with isValid and details
 */
export async function validateServicePricing(barberId, barbershopId, basePrice, proposedPrice) {
  const permissions = await getBarberPermissions(barberId, barbershopId)
  
  if (!permissions || !permissions.can_set_pricing) {
    return {
      isValid: false,
      reason: 'No pricing permission',
      allowedVariance: 0
    }
  }
  
  const allowedVariance = permissions.pricing_variance_percent || 0
  const maxPrice = basePrice * (1 + allowedVariance / 100)
  const minPrice = basePrice * (1 - allowedVariance / 100)
  
  const isValid = proposedPrice >= minPrice && proposedPrice <= maxPrice
  
  return {
    isValid,
    allowedVariance,
    minPrice,
    maxPrice,
    reason: isValid ? 'Valid' : `Price must be between $${minPrice.toFixed(2)} and $${maxPrice.toFixed(2)}`
  }
}

/**
 * Validate service duration within allowed variance
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {number} baseDuration - Base shop duration in minutes
 * @param {number} proposedDuration - Barber's proposed duration
 * @returns {Object} Validation result
 */
export async function validateServiceDuration(barberId, barbershopId, baseDuration, proposedDuration) {
  const permissions = await getBarberPermissions(barberId, barbershopId)
  
  if (!permissions || !permissions.can_set_service_duration) {
    return {
      isValid: false,
      reason: 'No duration modification permission',
      allowedVariance: 0
    }
  }
  
  const allowedVariance = permissions.duration_variance_percent || 0
  const maxDuration = baseDuration * (1 + allowedVariance / 100)
  const minDuration = baseDuration * (1 - allowedVariance / 100)
  
  const isValid = proposedDuration >= minDuration && proposedDuration <= maxDuration
  
  return {
    isValid,
    allowedVariance,
    minDuration: Math.round(minDuration),
    maxDuration: Math.round(maxDuration),
    reason: isValid ? 'Valid' : `Duration must be between ${Math.round(minDuration)} and ${Math.round(maxDuration)} minutes`
  }
}

/**
 * Get permission level description
 * @param {Object} permissions - Permissions object
 * @returns {Object} Permission level info
 */
export function getPermissionLevel(permissions) {
  if (!permissions) {
    return { level: 'none', description: 'No permissions', color: 'gray' }
  }
  
  const level = permissions.permission_level || 'basic'
  
  const levels = {
    basic: {
      level: 'basic',
      description: 'Basic permissions',
      color: 'blue',
      capabilities: ['View own schedule', 'Basic client management']
    },
    intermediate: {
      level: 'intermediate', 
      description: 'Standard permissions',
      color: 'green',
      capabilities: ['Modify services', 'Limited pricing control', 'Schedule management']
    },
    advanced: {
      level: 'advanced',
      description: 'Advanced permissions', 
      color: 'purple',
      capabilities: ['Full service control', 'Advanced pricing', 'Client analytics']
    },
    full: {
      level: 'full',
      description: 'Full autonomy',
      color: 'indigo',
      capabilities: ['Complete control', 'Business management', 'Financial access']
    }
  }
  
  return levels[level] || levels.basic
}

/**
 * Apply permission template to barber
 * @param {string} barberId - UUID of the barber
 * @param {string} barbershopId - UUID of the barbershop
 * @param {string} templateId - UUID of the permission template
 * @param {string} grantedBy - UUID of the user granting permissions
 * @returns {Object} Result of permission application
 */
export async function applyPermissionTemplate(barberId, barbershopId, templateId, grantedBy) {
  const supabase = createClient()
  
  try {
    // Get template permissions
    const { data: template, error: templateError } = await supabase
      .from('permission_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    
    if (templateError) {
      throw new Error('Template not found')
    }
    
    // Prepare permission data (exclude non-permission fields)
    const { id, name, description, created_at, is_system_template, ...permissionData } = template
    
    // Check if permissions already exist
    const { data: existing } = await supabase
      .from('barber_permissions')
      .select('id')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single()
    
    let result
    if (existing) {
      // Update existing permissions
      result = await supabase
        .from('barber_permissions')
        .update({
          ...permissionData,
          granted_by: grantedBy,
          granted_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new permissions
      result = await supabase
        .from('barber_permissions')
        .insert({
          barber_id: barberId,
          barbershop_id: barbershopId,
          granted_by: grantedBy,
          ...permissionData,
          is_active: true
        })
        .select()
        .single()
    }
    
    if (result.error) {
      throw result.error
    }
    
    // Clear cache
    const cacheKey = `${barberId}-${barbershopId}`
    permissionCache.delete(cacheKey)
    
    // Log the permission change
    await logPermissionChange(result.data.id, grantedBy, 'template_applied', 'template_id', null, templateId)
    
    return { success: true, permissions: result.data }
  } catch (error) {
    console.error('Error applying permission template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Log permission changes for audit trail
 * @param {string} permissionId - UUID of the permission record
 * @param {string} changedBy - UUID of user making the change
 * @param {string} action - Type of action
 * @param {string} field - Field that changed
 * @param {*} oldValue - Previous value
 * @param {*} newValue - New value
 */
export async function logPermissionChange(permissionId, changedBy, action, field = null, oldValue = null, newValue = null) {
  const supabase = createClient()
  
  try {
    await supabase
      .from('permission_audit_log')
      .insert({
        barber_permission_id: permissionId,
        changed_by: changedBy,
        action,
        permission_field: field,
        old_value: oldValue ? String(oldValue) : null,
        new_value: newValue ? String(newValue) : null
      })
  } catch (error) {
    console.error('Error logging permission change:', error)
  }
}

/**
 * Get default permissions for barbers without explicit permissions
 * @returns {Object} Default permission set
 */
function getDefaultPermissions() {
  return {
    can_create_services: false,
    can_modify_services: false,
    can_delete_services: false,
    can_set_pricing: false,
    pricing_variance_percent: 0,
    can_set_service_duration: false,
    duration_variance_percent: 0,
    can_set_hours: false,
    can_set_availability: true, // Basic: can set their availability
    can_manage_breaks: false,
    can_set_time_off: false,
    can_view_all_clients: false,
    can_manage_client_notes: false,
    can_view_client_history: false,
    can_view_personal_analytics: true, // Basic: can see their own stats
    can_view_shop_analytics: false,
    can_view_financial_reports: false,
    can_modify_booking_rules: false,
    can_set_deposit_requirements: false,
    can_manage_cancellation_policy: false,
    can_create_promotions: false,
    can_modify_service_descriptions: false,
    can_upload_portfolio_images: false,
    can_process_payments: false,
    can_issue_refunds: false,
    can_view_commission_details: true, // Basic: can see their commission
    permission_level: 'basic',
    is_active: false
  }
}

/**
 * Clear permission cache (useful for testing or when permissions change)
 */
export function clearPermissionCache() {
  permissionCache.clear()
}

/**
 * Get permission templates
 * @param {boolean} systemOnly - Whether to get only system templates
 * @returns {Array} Array of permission templates
 */
export async function getPermissionTemplates(systemOnly = false) {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('permission_templates')
      .select('*')
      .order('template_level')
    
    if (systemOnly) {
      query = query.eq('is_system_template', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching permission templates:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getPermissionTemplates:', error)
    return []
  }
}

/**
 * Check if user is shop owner or higher for the given barbershop
 * @param {string} userId - UUID of the user
 * @param {string} barbershopId - UUID of the barbershop
 * @returns {boolean} Whether user can manage permissions
 */
export async function canManagePermissions(userId, barbershopId) {
  const supabase = createClient()
  
  try {
    // Check if user owns the shop
    const { data: shop } = await supabase
      .from('barbershops')
      .select('owner_id, organization_id')
      .eq('id', barbershopId)
      .single()
    
    if (shop?.owner_id === userId) {
      return true
    }
    
    // Check if user owns the organization
    if (shop?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', shop.organization_id)
        .single()
      
      if (org?.owner_id === userId) {
        return true
      }
    }
    
    // Check if user is super admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    return user?.role === 'SUPER_ADMIN'
  } catch (error) {
    console.error('Error checking permission management rights:', error)
    return false
  }
}