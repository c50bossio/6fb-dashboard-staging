import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get the request body
    const { contextType, contextId } = await request.json()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Clear context if switching to primary
    if (contextType === 'primary') {
      // Remove context cookie
      cookieStore.delete('view_context')
      cookieStore.delete('view_context_type')
      
      // In production, you would also end any active view session in the database
      // For now, just return success
      return NextResponse.json({ 
        success: true,
        message: 'Switched to primary view'
      })
    }
    
    // Validate that the user has permission to view as this context
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
    
    // Set context cookies
    const response = NextResponse.json({ 
      success: true,
      message: `Switched to ${contextType} view`,
      contextId,
      contextType
    })
    
    // Set secure, httpOnly cookies for context
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
    
    // In production, you would also:
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
    
    // Get current context from cookies
    const contextId = cookieStore.get('view_context')?.value
    const contextType = cookieStore.get('view_context_type')?.value
    
    if (!contextId || !contextType) {
      return NextResponse.json({ 
        context: null,
        message: 'No active context'
      })
    }
    
    // In production, you would fetch the full context details from the database
    // For now, return the basic context info
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