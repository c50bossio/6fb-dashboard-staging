import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { sessionId } = await request.json()
    const supabase = createClient()
    
    console.log('🚀 User initialization started, session ID:', sessionId)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ Auth error:', authError?.message || 'No user found')
      return NextResponse.json({ 
        error: 'Not authenticated', 
        details: 'User session not found. Please try signing in again.',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }
    
    console.log('👤 Initializing user profile:', user.email)
    console.log('🆔 User ID:', user.id)
    console.log('📦 User metadata:', user.user_metadata)
    
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
      role: 'SHOP_OWNER',
      subscription_status: 'active',
      onboarding_completed: false,
      onboarding_step: 0
    }
    
    console.log('📝 Upserting profile with data:', profileData)
    
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
        console.log('🔄 Duplicate detected, attempting profile update...')
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: profileData.full_name,
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
          console.log('✅ Profile updated successfully:', updatedProfile.email)
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
    
    console.log('✅ User profile upserted successfully:', profile.email)
    
    if (sessionId && sessionId.startsWith('cs_')) {
      console.log('💳 Attempting to link Stripe session data...')
      try {
        console.log('ℹ️ Stripe session linking not implemented yet, skipping')
      } catch (stripeError) {
        console.warn('⚠️ Stripe session linking failed, continuing anyway:', stripeError.message)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User initialized successfully',
      profile: profile,
      sessionId: sessionId
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