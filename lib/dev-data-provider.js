/**
 * Centralized Development Data Provider
 * Provides consistent mock data for development mode to prevent Supabase 400 errors
 */

export const DEV_USER = {
  id: 'dev-user-123',
  email: 'dev@bookedbarber.com',
  full_name: 'Dev User',
  role: 'SHOP_OWNER',
  created_at: new Date().toISOString()
}

export const DEV_BARBERSHOP = {
  id: 'dev-barbershop-123',
  name: 'Dev Barbershop',
  slug: 'dev-barbershop',
  owner_id: DEV_USER.id,
  address: '123 Dev Street',
  phone: '555-0123',
  email: 'shop@dev.com',
  business_hours: {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '10:00', close: '16:00' },
    sunday: { closed: true }
  }
}

export const DEV_PROFILE = {
  id: DEV_USER.id,
  email: DEV_USER.email,
  full_name: DEV_USER.full_name,
  barbershop_id: DEV_BARBERSHOP.id,
  barbershop_id: DEV_BARBERSHOP.id,
  role: 'SHOP_OWNER',
  shop_name: DEV_BARBERSHOP.name,
  subscription_tier: 'premium',
  onboarding_completed: true
}

export const DEV_ANALYTICS = {
  revenue: {
    today: 540,
    week: 3850,
    month: 15420,
    growth: 12.5
  },
  customers: {
    total: 127,
    new: 23,
    returning: 104,
    growth: 8.3
  },
  appointments: {
    today: 8,
    week: 45,
    month: 186,
    upcoming: 12
  },
  services: {
    popular: ['Haircut', 'Beard Trim', 'Hair + Beard'],
    averagePrice: 45,
    averageDuration: 35
  }
}

export const DEV_BOOKINGS = [
  {
    id: 'booking-1',
    barbershop_id: DEV_BARBERSHOP.id,
    customer_name: 'John Doe',
    service_name: 'Haircut',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    price: 30,
    status: 'confirmed'
  },
  {
    id: 'booking-2',
    barbershop_id: DEV_BARBERSHOP.id,
    customer_name: 'Jane Smith',
    service_name: 'Beard Trim',
    start_time: new Date(Date.now() + 7200000).toISOString(),
    price: 20,
    status: 'confirmed'
  }
]

export const DEV_SERVICES = [
  {
    id: 'service-1',
    barbershop_id: DEV_BARBERSHOP.id,
    name: 'Haircut',
    price: 30,
    duration_minutes: 30,
    description: 'Professional haircut'
  },
  {
    id: 'service-2',
    barbershop_id: DEV_BARBERSHOP.id,
    name: 'Beard Trim',
    price: 20,
    duration_minutes: 20,
    description: 'Beard shaping and trim'
  },
  {
    id: 'service-3',
    barbershop_id: DEV_BARBERSHOP.id,
    name: 'Hair + Beard',
    price: 45,
    duration_minutes: 45,
    description: 'Complete grooming package'
  }
]

/**
 * Check if we're in development mode with mock auth
 */
export function isDevMode() {
  return process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
}

/**
 * Get mock data for a specific table
 */
export function getDevData(table, userId = null) {
  if (!isDevMode()) return null
  
  switch (table) {
    case 'profiles':
      return userId === DEV_USER.id ? DEV_PROFILE : null
    case 'barbershops':
      return DEV_BARBERSHOP
    case 'bookings':
      return DEV_BOOKINGS
    case 'services':
      return DEV_SERVICES
    case 'analytics':
      return DEV_ANALYTICS
    default:
      return null
  }
}

/**
 * Mock Supabase query response
 */
export function mockSupabaseResponse(table, options = {}) {
  const data = getDevData(table, options.userId)
  
  if (!data) {
    return {
      data: null,
      error: { message: 'No dev data available for ' + table }
    }
  }
  
  return {
    data: Array.isArray(data) ? data : [data],
    error: null
  }
}

/**
 * Wrap Supabase client to handle dev mode
 */
export function wrapSupabaseClient(supabaseClient) {
  if (!isDevMode()) return supabaseClient
  
  // Create a proxy that intercepts queries in dev mode
  return new Proxy(supabaseClient, {
    get(target, prop) {
      if (prop === 'from') {
        return function(table) {
          // Return mock query builder for dev mode
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve(mockSupabaseResponse(table)),
                maybeSingle: () => Promise.resolve(mockSupabaseResponse(table))
              }),
              limit: () => Promise.resolve(mockSupabaseResponse(table))
            })
          }
        }
      }
      return target[prop]
    }
  })
}