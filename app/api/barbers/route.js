import { authenticateBarberOrOwner } from '@/lib/shop-auth'
import { success, serverError } from '@/lib/api-response'

export const runtime = 'edge'

/**
 * GET /api/barbers - Fetch barbers/staff for a barbershop
 *
 * Query Parameters:
 * - barbershop_id: UUID (optional, filters by shop - defaults to authenticated user's shop)
 * - active_only: boolean (optional, default true - only return active staff)
 *
 * Response:
 * {
 *   barbers: [{ id, name, email, phone, avatar_url, role, commission_rate, is_active, started_at, barbershop_id, barbershop_name, business_hours }],
 *   total: number
 * }
 */
export async function GET(request) {
  try {
    // Authenticate - allows both shop owners and barbers to view staff
    const { shop, supabase } = await authenticateBarberOrOwner(request, {
      allowDevBypass: true
    })

    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id') || shop.id
    const active_only = searchParams.get('active_only') !== 'false'

    // Build query to fetch staff members
    let query = supabase
      .from('barbershop_staff')
      .select(`
        user_id,
        role,
        commission_rate,
        is_active,
        started_at,
        barbershop_id,
        profiles!barbershop_staff_user_id_fkey(id, full_name, email, phone, avatar_url),
        barbershops!inner(id, name, business_hours)
      `)
      .in('role', ['BARBER', 'SHOP_OWNER'])
      .eq('barbershop_id', barbershop_id)
      .order('started_at', { ascending: true })

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: staff, error } = await query

    if (error) {
      console.error('[Barbers API] Database query failed:', error)
      return serverError('Failed to fetch barbers', error)
    }

    // Return empty array if no staff found (NO MOCK DATA)
    if (!staff || staff.length === 0) {
      return success({
        barbers: [],
        total: 0
      })
    }

    // Format the response
    const formattedBarbers = staff.map(staffMember => ({
      id: staffMember.profiles?.id || staffMember.user_id,
      name: staffMember.profiles?.full_name || null,
      email: staffMember.profiles?.email || null,
      phone: staffMember.profiles?.phone || null,
      avatar_url: staffMember.profiles?.avatar_url || null,
      role: staffMember.role,
      commission_rate: staffMember.commission_rate,
      is_active: staffMember.is_active,
      started_at: staffMember.started_at,
      barbershop_id: staffMember.barbershop_id,
      barbershop_name: staffMember.barbershops?.name || null,
      business_hours: staffMember.barbershops?.business_hours || null
    }))

    return success({
      barbers: formattedBarbers,
      total: formattedBarbers.length
    })

  } catch (error) {
    // Errors from authenticateBarberOrOwner are already HTTP responses
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Barbers API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}
