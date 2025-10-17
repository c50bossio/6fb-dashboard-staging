import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Using Node.js runtime for better debugging
// export const runtime = 'edge'

export async function GET(request, { params }) {
  try {
    console.log('🔍 Organizations shops endpoint hit')

    // Use service role key for this query to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get organization_id from route params
    const { organizationId } = params
    console.log('🏢 Organization ID from params:', organizationId)

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // Query barbershops for this organization
    console.log('🔎 Querying barbershops for organization:', organizationId)
    const { data: shops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, city, state, address, phone, organization_id')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    console.log('📊 Query result - shops:', shops?.length, 'error:', shopsError?.message)
    if (shops) {
      console.log('🏪 Shops found:', JSON.stringify(shops, null, 2))
    }

    if (shopsError) {
      console.error('❌ Error fetching barbershops:', shopsError)
      return NextResponse.json(
        { error: 'Failed to fetch barbershops' },
        { status: 500 }
      )
    }

    // Return actual database results (no mock data fallback)
    console.log('✅ Returning shops:', shops?.length || 0)
    return NextResponse.json({ shops: shops || [] })

  } catch (error) {
    console.error('Error in /api/organizations/[organizationId]/shops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
