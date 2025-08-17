import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        console.log('✅ Standard auth successful:', authUser.id)
      } else {
        authError = error
        console.log('⚠️ Standard auth failed:', error?.message)
      }
    } catch (error) {
      console.log('⚠️ Auth check failed:', error.message)
      authError = error
    }
    
    // Fallback for demo/testing
    if (!user && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      console.log('🔓 Using demo user for testing')
      user = {
        id: 'demo-user-id',
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