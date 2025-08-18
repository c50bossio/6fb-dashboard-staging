import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Handle authentication with fallback for SSR cookie issues
    let user = null
    let authError = null
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (authUser && !error) {
        user = authUser
      } else {
        authError = error
      }
    } catch (error) {
      authError = error
    }
    
    // Fallback for demo/testing
    if (!user && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      user = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: authError?.message || 'No valid session found'
      }, { status: 401 })
    }
    
    // Get user's bank accounts
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
    
    if (error) {
      console.error('Error fetching bank accounts:', error)
      return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 })
    }
    
    return NextResponse.json({
      accounts: accounts || []
    })
    
  } catch (error) {
    console.error('Error getting bank accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}