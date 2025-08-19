/**
 * Helper functions for barbershop associations
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Get the primary barbershop ID for a user based on their role
 * @param {Object} user - The authenticated user
 * @param {Object} profile - The user profile from database
 * @returns {Promise<string|null>} The barbershop ID or null
 */
export async function getUserBarbershopId(user, profile) {
  if (!user || !profile) return null
  
  // Direct barbershop_id in profile (shop owners, solo barbers)
  if (profile.barbershop_id) {
    return profile.barbershop_id
  }
  
  // For employee barbers, fetch from barbershop_staff
  if (profile.role === 'BARBER') {
    const supabase = createClient()
    const { data: staffData } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    
    return staffData?.barbershop_id || null
  }
  
  // For enterprise owners, they may have multiple shops
  // Return the first one or let them select
  if (profile.role === 'ENTERPRISE_OWNER' && profile.organization_id) {
    const supabase = createClient()
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .limit(1)
      .maybeSingle()
    
    return shops?.id || null
  }
  
  return null
}

/**
 * Create a barbershop for a new shop owner
 * @param {Object} user - The authenticated user
 * @param {Object} shopData - Data for the new barbershop
 * @returns {Promise<Object>} The created barbershop
 */
export async function createBarbershopForOwner(user, shopData = {}) {
  const supabase = createClient()
  
  const defaultShopData = {
    owner_id: user.id,
    name: shopData.name || `${user.user_metadata?.full_name || 'My'} Barbershop`,
    email: shopData.email || user.email,
    phone: shopData.phone || user.user_metadata?.phone || '',
    address: shopData.address || '',
    city: shopData.city || '',
    state: shopData.state || '',
    zip_code: shopData.zip_code || '',
    country: shopData.country || 'US',
    booking_enabled: true,
    online_booking_enabled: true,
    website_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { data: barbershop, error } = await supabase
    .from('barbershops')
    .insert(defaultShopData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating barbershop:', error)
    throw error
  }
  
  // Update user with barbershop_id
  await supabase
    .from('users')
    .update({ barbershop_id: barbershop.id })
    .eq('id', user.id)
  
  return barbershop
}

/**
 * Associate an employee barber with a barbershop
 * @param {string} userId - The user ID
 * @param {string} barbershopId - The barbershop ID
 * @param {string} role - The role in the barbershop
 * @returns {Promise<Object>} The staff association
 */
export async function associateBarberWithShop(userId, barbershopId, role = 'BARBER') {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barbershop_staff')
    .upsert({
      user_id: userId,
      barbershop_id: barbershopId,
      role: role,
      is_active: true,
      hire_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,barbershop_id'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error associating barber with shop:', error)
    throw error
  }
  
  return data
}

/**
 * Get all barbershops for an enterprise owner
 * @param {string} organizationId - The organization ID
 * @returns {Promise<Array>} List of barbershops
 */
export async function getOrganizationBarbershops(organizationId) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barbershops')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching organization barbershops:', error)
    throw error
  }
  
  return data || []
}