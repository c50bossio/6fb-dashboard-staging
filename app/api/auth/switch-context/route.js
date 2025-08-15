import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { contextType, contextId } = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (contextType === 'primary') {
      cookieStore.delete('view_context')
      cookieStore.delete('view_context_type')
      
      return NextResponse.json({ 
        success: true,
        message: 'Switched to primary view'
      })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const response = NextResponse.json({ 
      success: true,
      message: `Switched to ${contextType} view`,
      contextId,
      contextType
    })
    
    response.cookies.set('view_context', contextId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 // 8 hours
    })
    
    response.cookies.set('view_context_type', contextType, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 // 8 hours
    })
    
    // 1. Verify the user has access to this specific barber/shop
    // 2. Create a record in user_view_sessions table
    // 3. Log the context switch for audit purposes
    
    return response
    
  } catch (error) {
    console.error('Error in /api/auth/switch-context:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const cookieStore = cookies()
    
    const contextId = cookieStore.get('view_context')?.value
    const contextType = cookieStore.get('view_context_type')?.value
    
    if (!contextId || !contextType) {
      return NextResponse.json({ 
        context: null,
        message: 'No active context'
      })
    }
    
    return NextResponse.json({ 
      context: {
        id: contextId,
        type: contextType
      }
    })
    
  } catch (error) {
    console.error('Error getting current context:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}