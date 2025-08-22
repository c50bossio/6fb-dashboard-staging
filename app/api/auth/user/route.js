import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getUserBarbershopId } from '@/lib/barbershop-helper'
import { hasPermission } from '@/lib/permissions'
export const runtime = 'edge'

export async function GET(request) {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Edge runtime cookie limitations
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Edge runtime cookie limitations
          }
        },
      },
    }
  )
  
  try {
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ User API: Session error:', sessionError.message)
      return NextResponse.json({ 
        authenticated: false, 
        error: sessionError.message
      }, { status: 401 })
    }
    
    if (!session?.user) {
      // Development fallback for hardcoded authentication
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [DEV] No session found, using development fallback user...')
        return NextResponse.json({
          authenticated: true,
          user: {
            id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
            email: 'c50bossio@gmail.com',
            barbershop_id: 'c61b33d5-4a96-472b-8f97-d1a3ae5532f9', // Known test barbershop ID
            has_customer_access: true,
            subscription_tier: 'enterprise',
            profile: {
              id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
              email: 'c50bossio@gmail.com',
              role: 'SUPER_ADMIN',
              subscription_tier: 'enterprise',
              subscription_status: 'active',
              full_name: 'Christopher Bossio',
              onboarding_completed: true
            },
            role: 'SUPER_ADMIN',
            full_name: 'Christopher Bossio'
          }
        })
      }
      
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No active session'
      }, { status: 401 })
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ User API: Profile error:', profileError.message)
      return NextResponse.json({ 
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          barbershop_id: null
        },
        error: 'Profile not found'
      })
    }
    
    // Get barbershop ID using helper function
    const barbershopId = await getUserBarbershopId(session.user, profile)
    
    // Determine customer management access based on subscription tier and permissions
    const subscriptionTier = profile?.subscription_tier || 'individual'
    let hasCustomerAccess = false
    
    if (subscriptionTier === 'individual') {
      // Individual barber subscription gets automatic customer access
      hasCustomerAccess = true
    } else if (barbershopId) {
      // Employee barber - check shop owner's permission settings
      try {
        hasCustomerAccess = await hasPermission(session.user.id, barbershopId, 'can_view_all_clients')
      } catch (error) {
        console.warn('Error checking customer permission:', error)
        hasCustomerAccess = false
      }
    }
    
    // Return user data in format expected by customer management page
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        barbershop_id: barbershopId,
        has_customer_access: hasCustomerAccess,
        subscription_tier: subscriptionTier,
        profile: profile,
        role: profile.role,
        full_name: profile.full_name || session.user.user_metadata?.full_name
      }
    })
    
  } catch (error) {
    console.error('💥 User API: Unexpected error:', error)
    return NextResponse.json({ 
      authenticated: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}