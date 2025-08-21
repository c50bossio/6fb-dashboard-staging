import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get barbershops owned by the user
    const { data: shops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, description, address, city, state, owner_id')
      .eq('owner_id', user.id)

    if (shopsError) {
      console.error('Error fetching user shops:', shopsError)
      return NextResponse.json({ error: 'Failed to fetch barbershops' }, { status: 500 })
    }

    return NextResponse.json({ shops: shops || [] })

  } catch (error) {
    console.error('Error in GET /api/barbershops/user-shops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}