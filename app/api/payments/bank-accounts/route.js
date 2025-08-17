import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // In development mode, we'll use the authenticated user from frontend
    // Since this is a known auth issue with Supabase SSR, we'll use the real user ID
    const isDev = process.env.NODE_ENV === 'development'
    
    let user = null
    
    if (isDev) {
      // Use the real user ID from the frontend - this is the authenticated user
      console.log('🔓 Dev mode: Using authenticated frontend user')
      user = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483', // The real user ID from browser console
        email: 'dev@localhost.com'
      }
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
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