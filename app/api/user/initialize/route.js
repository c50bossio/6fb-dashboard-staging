import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { sessionId } = await request.json()
    const supabase = createClient()
    
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated', 
        details: 'User session not found. Please try signing in again.',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }
    
    
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
      role: 'SHOP_OWNER',
      subscription_status: 'active',
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
    
    
    if (sessionId && sessionId.startsWith('cs_')) {
      try {
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