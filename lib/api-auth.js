/**
 * API Authorization helpers for subscription-aware access control
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Check if user has business access based on role and subscription
 * @param {Object} user - The authenticated user
 * @param {Object} profile - User profile from database
 * @returns {Promise<{hasAccess: boolean, reason?: string, subscriptionTier?: string}>}
 */
export async function checkBusinessAccess(user, profile) {
  if (!user || !profile) {
    return { hasAccess: false, reason: 'User or profile not found' }
  }

  const userRole = profile.role || 'CLIENT'

  // Super Admin always has access
  if (userRole === 'SUPER_ADMIN') {
    return { hasAccess: true }
  }

  // Shop Owner and Enterprise Owner always have access (legacy roles)
  if (['SHOP_OWNER', 'ENTERPRISE_OWNER'].includes(userRole)) {
    return { hasAccess: true }
  }

  // For Barbers, check if they have an active subscription
  if (userRole === 'BARBER') {
    try {
      // Check subscription status via internal API call
      const subscriptionCheck = await checkUserSubscription(user.id)
      
      if (subscriptionCheck.isActive) {
        return { 
          hasAccess: true, 
          subscriptionTier: subscriptionCheck.tier,
          reason: 'Individual barber with active subscription'
        }
      } else {
        // Check if they're staff at a barbershop (employee barber)
        const supabase = await createClient()
        const { data: staffRecord } = await supabase
          .from('barbershop_staff')
          .select('barberbarbershop_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (staffRecord?.barberbarbershop_id) {
          return { 
            hasAccess: true, 
            reason: 'Employee barber with staff access',
            isEmployee: true,
            barberbarbershopId: staffRecord.barberbarbershop_id
          }
        }
      }
    } catch (error) {
      console.error('Error checking barber subscription:', error)
    }

    return { 
      hasAccess: false, 
      reason: 'Barber role without active subscription or staff access'
    }
  }

  // Clients and other roles don't have business access
  return { 
    hasAccess: false, 
    reason: `Role ${userRole} does not have business access`
  }
}

/**
 * Check user's subscription status
 * @param {string} userId - The user ID
 * @returns {Promise<{isActive: boolean, tier?: string}>}
 */
async function checkUserSubscription(userId) {
  try {
    const supabase = await createClient()
    
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (userData && userData.subscription_status === 'active') {
      return {
        isActive: true,
        tier: userData.subscription_tier
      }
    }

    return { isActive: false }
  } catch (error) {
    console.error('Error checking subscription:', error)
    return { isActive: false }
  }
}

/**
 * Middleware function for API endpoints that require business access
 * @param {Request} request - The API request
 * @returns {Promise<{user: Object, profile: Object, businessAccess: Object} | NextResponse>}
 */
export async function requireBusinessAccess(request) {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's profile (unified schema uses barberbarbershop_id)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, barberbarbershop_id, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Check business access
  const businessAccess = await checkBusinessAccess(user, profile)
  
  if (!businessAccess.hasAccess) {
    return NextResponse.json(
      { 
        error: 'Insufficient permissions', 
        reason: businessAccess.reason 
      }, 
      { status: 403 }
    )
  }

  return { user, profile, businessAccess }
}

/**
 * Get user's accessible shop/barbershop IDs
 * @param {Object} user - The authenticated user
 * @param {Object} profile - User profile
 * @param {Object} businessAccess - Business access info from checkBusinessAccess
 * @returns {Promise<string[]>} Array of shop IDs the user can access
 */
export async function getUserAccessibleShopIds(user, profile, businessAccess) {
  const supabase = await createClient()
  const barbershopIds = []

  // Super Admin can access all shops (if needed)
  if (profile.role === 'SUPER_ADMIN') {
    // Could return all shop IDs, but for now just return empty array
    // to avoid accidental access to all data
    return barbershopIds
  }

  // Enterprise Owner - get all shops in their organization
  if (profile.role === 'ENTERPRISE_OWNER' && profile.organization_id) {
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id')
      .eq('organization_id', profile.organization_id)

    if (barbershops) {
      barbershopIds.push(...barbershops.map(shop => shop.id))
    }
  }

  // Shop Owner or Individual Barber - get their specific shop
  else if (profile.role === 'SHOP_OWNER' || (profile.role === 'BARBER' && businessAccess.subscriptionTier)) {
    // FIXED: Single source of truth - unified schema uses only barberbarbershop_id
    let barbershopId = profile.barbershop_id

    // If no direct shop association, check if they own a shop
    if (!barbershopId) {
      const { data: ownedShop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      barbershopId = ownedShop?.id
    }

    if (barbershopId) {
      barbershopIds.push(barbershopId)
    }
  }

  // Employee Barber - get their workplace shop
  else if (profile.role === 'BARBER' && businessAccess.isEmployee) {
    if (businessAccess.barberbarbershopId) {
      barbershopIds.push(businessAccess.barberbarbershopId)
    }
  }

  return barbershopIds
}