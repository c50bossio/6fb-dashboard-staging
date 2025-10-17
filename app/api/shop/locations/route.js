import { NextResponse } from 'next/server'
import { requireBusinessAccess, getUserAccessibleShopIds } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    // Use subscription-aware authorization
    const authResult = await requireBusinessAccess(request)
    
    // If authResult is a NextResponse (error), return it
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    // Ensure we have valid auth data before proceeding
    if (!authResult || !authResult.user || !authResult.profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { user, profile, businessAccess } = authResult
    const supabase = await createClient()

    // Get all shop IDs this user can access
    const accessibleShopIds = await getUserAccessibleShopIds(user, profile, businessAccess)
    
    let locations = []
    
    if (accessibleShopIds.length > 0) {
      const { data: barbershops, error: barbershopsError } = await supabase
        .from('barbershops')
        .select('*')
        .in('id', accessibleShopIds)

      if (barbershopsError) {
        console.error('Error fetching barbershops:', barbershopsError)
      } else if (barbershops) {
        locations = barbershops.map(shop => ({
          id: shop.id,
          name: shop.name,
          location: `${shop.city || ''}, ${shop.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Location not set',
          address: shop.address,
          city: shop.city,
          state: shop.state,
          phone: shop.phone,
          email: shop.email
        }))
      }
    }

    return NextResponse.json({
      locations,
      success: true,
      accessInfo: {
        role: profile.role,
        hasSubscription: businessAccess.subscriptionTier ? true : false,
        subscriptionTier: businessAccess.subscriptionTier,
        accessReason: businessAccess.reason
      }
    })

  } catch (error) {
    console.error('Error fetching shop locations:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}