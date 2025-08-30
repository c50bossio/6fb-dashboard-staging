import { NextResponse } from 'next/server'
import { createBarbershopForOwner } from '@/lib/barbershop-helper'
import { getDisplayName, splitFullName, combineNames, normalizeNameData, createNameUpdateObject } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { sessionId, plan, billing } = await request.json()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated', 
        details: 'User session not found. Please try signing in again.',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    // Create profile data with proper user information and name structure
    const userDisplayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
    const nameData = normalizeNameData({
      fullName: userDisplayName,
      firstName: user.user_metadata?.first_name,
      lastName: user.user_metadata?.last_name
    })
    
    // Map plan to role
    let role = 'SHOP_OWNER' // Default
    if (plan === 'barber') {
      role = 'BARBER'
    } else if (plan === 'shop') {
      role = 'SHOP_OWNER'
    } else if (plan === 'enterprise') {
      role = 'ENTERPRISE_OWNER'
    }

    const profileData = {
      id: user.id,
      email: user.email,
      ...createNameUpdateObject(nameData),
      role: role,
      subscription_status: 'active',
      subscription_tier: plan || 'shop',
      onboarding_completed: false,
      onboarding_step: 0
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('❌ Profile upsert error:', profileError)
      console.error('   Error code:', profileError.code)
      console.error('   Error details:', profileError.details)
      console.error('   Error hint:', profileError.hint)
      
      let errorMessage = 'Profile creation failed'
      let errorCode = 'PROFILE_ERROR'
      
      if (profileError.code === '23505') {
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            ...createNameUpdateObject(nameData),
            subscription_status: 'active',
            onboarding_completed: false
          })
          .eq('email', user.email)
          .select()
          .single()
        
        if (updateError) {
          console.error('❌ Profile update also failed:', updateError)
          errorMessage = 'Failed to create or update profile'
          errorCode = 'PROFILE_UPDATE_FAILED'
        } else {
          return NextResponse.json({ 
            success: true, 
            message: 'User profile updated successfully',
            profile: updatedProfile
          })
        }
      } else if (profileError.code === '42501') {
        errorMessage = 'Database permission error'
        errorCode = 'PERMISSION_DENIED'
      }
      
      return NextResponse.json({ 
        error: errorMessage, 
        details: profileError.message,
        code: errorCode
      }, { status: 500 })
    }
    
    // Create barbershop for barbers and shop owners
    let barbershop = null
    if (role === 'BARBER' || role === 'SHOP_OWNER') {
      try {

        // For individual barbers, they ARE the barbershop (solo practitioner)
        const shopName = role === 'BARBER' 
          ? `${nameData.first_name || userDisplayName}'s Chair` 
          : `${nameData.first_name || userDisplayName}'s Barbershop`
        
        barbershop = await createBarbershopForOwner(user, {
          name: shopName,
          email: user.email,
          phone: user.user_metadata?.phone || '',
          // Individual barbers get a "single-barber" shop
          type: role === 'BARBER' ? 'individual' : 'multi-barber'
        })

        // Update profile with shop_id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ barbershop_id: barbershop.id })
          .eq('id', user.id)
          
        if (updateError) {
          console.warn('⚠️ Failed to update profile with shop_id:', updateError)
        } else {
          
        }
        
      } catch (barbershopError) {
        console.error('⚠️ Barbershop creation failed:', barbershopError)
        // Don't fail the entire initialization if barbershop creation fails
        // User can create it during onboarding
      }
    }
    
    // For enterprise owners, create organization
    if (role === 'ENTERPRISE_OWNER') {
      try {

        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${nameData.first_name || userDisplayName}'s Organization`,
            owner_id: user.id,
            tier: 'enterprise'
          })
          .select()
          .single()
          
        if (!orgError && organization) {

          // Create first barbershop under the organization
          barbershop = await createBarbershopForOwner(user, {
            name: `${organization.name} - Main Location`,
            organization_id: organization.id
          })

        }
      } catch (orgError) {
        console.error('⚠️ Organization creation failed:', orgError)
      }
    }

    if (sessionId && sessionId.startsWith('cs_')) {
      try {
        // Link Stripe session if needed
      } catch (stripeError) {
        console.warn('⚠️ Stripe session linking failed, continuing anyway:', stripeError.message)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User initialized successfully',
      profile: profile,
      barbershop: barbershop,
      sessionId: sessionId,
      role: role,
      plan: plan
    })
    
  } catch (error) {
    console.error('❌ User initialization error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}