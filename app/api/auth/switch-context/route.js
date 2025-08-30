import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { validateShopAccess } from '@/lib/rls-context-manager'
import { createClient } from '@/lib/supabase/server'
// Remove edge runtime to enable dotenv
// export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    const { contextType, contextId } = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (contextType === 'primary') {
      // Clear database session
      const { error } = await supabase
        .from('user_view_sessions')
        .delete()
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Failed to clear view session:', error)
      }
      
      // Clear cookies as backup
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
    
    // 1. Verify the user has access to this specific barber/shop
    const hasAccess = await validateContextAccess(user.id, contextType, contextId, profile.role, supabase)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to view this context' },
        { status: 403 }
      )
    }
    
    // 2. Create a record in user_view_sessions table for audit logging
    await logContextSwitch(user.id, contextType, contextId, supabase)
    
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
    
    return response
    
  } catch (error) {
    console.error('Error in /api/auth/switch-context:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Validate if user has access to switch to the specified context
 */
async function validateContextAccess(userId, contextType, contextId, userRole, supabase) {
  try {
    if (contextType === 'barber') {
      // For barber context, verify user is shop owner and barber works in their shop
      if (userRole === 'SHOP_OWNER') {
        // Get user's owned shops
        const { data: ownedShops } = await supabase
          .from('barbershops')
          .select('id')
          .eq('owner_id', userId)
        
        if (!ownedShops || ownedShops.length === 0) {
          return false
        }
        
        const barbershopIds = ownedShops.map(shop => shop.id)
        
        // Verify the barber works in one of the owned shops
        const { data: barberAccess } = await supabase
          .from('barbershop_staff')
          .select('barberbarbershop_id, role')
          .eq('user_id', contextId)
          .in('barberbarbershop_id', barbershopIds)
          .eq('is_active', true)
          .single()
        
        return !!barberAccess
      }
      
      return false
    }
    
    if (contextType === 'shop') {
      // For shop context, verify user has enterprise access to this shop
      if (userRole === 'ENTERPRISE_OWNER') {
        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()
        
        if (!profile?.organization_id) {
          return false
        }
        
        // Verify shop belongs to user's organization
        const { data: shopAccess } = await supabase
          .from('barbershops')
          .select('id')
          .eq('id', contextId)
          .eq('organization_id', profile.organization_id)
          .single()
        
        return !!shopAccess
      }
      
      // Shop owners can access their own shops
      if (userRole === 'SHOP_OWNER') {
        const { data: ownedShop } = await supabase
          .from('barbershops')
          .select('id')
          .eq('id', contextId)
          .eq('owner_id', userId)
          .single()
        
        return !!ownedShop
      }
      
      return false
    }
    
    // Super admins can access any context
    if (userRole === 'SUPER_ADMIN') {
      return true
    }
    
    return false
    
  } catch (error) {
    console.error('Error validating context access:', error)
    return false
  }
}

/**
 * Log context switch for audit purposes
 */
async function logContextSwitch(userId, contextType, contextId, supabase) {
  try {
    // Insert or update session in user_view_sessions table
    const { error } = await supabase
      .from('user_view_sessions')
      .upsert({
        user_id: userId,
        context_type: contextType,
        context_id: contextId,
        context_data: { switched_at: new Date().toISOString() },
        action: 'context_switch'
      }, { onConflict: 'user_id' })
    
    if (error) {
      console.error('Database logging failed:', error)
      // Fallback to console logging if database insert fails
      console.log('Context switch logged to console:', {
        userId: user.id,
        timestamp: new Date().toISOString(),
        action: 'context_switch'
      })
    } else {
      console.log('Context switch logged to database:', new Date().toISOString())
    }
    
  } catch (error) {
    console.error('Error logging context switch:', error)
    // Fallback to console logging
    console.log('Context switch fallback log:', {
      timestamp: new Date().toISOString(),
      action: 'context_switch'
    })
  }
}

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    // Get user session first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get active context from database
    const { data: session } = await supabase
      .from('user_view_sessions')
      .select('context_type, context_id, context_data')
      .eq('user_id', user.id)
      .single()
    
    if (!session) {
      return NextResponse.json({ 
        context: null,
        message: 'No active context'
      })
    }
    
    const contextId = session.context_id
    const contextType = session.context_type
    
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