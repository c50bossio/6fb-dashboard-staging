/**
 * Profile Ensure Endpoint
 * Safety net to ensure authenticated users always have a profile
 * Can be called after OAuth login to guarantee profile exists
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Create Supabase client
function createSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.error('Cookie setting error:', error)
          }
        },
      },
    }
  )
}

export async function GET(request) {
  try {
    const supabase = createSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        profile: null 
      }, { status: 401 })
    }
    
    console.log('📋 Ensuring profile for user:', user.id, user.email)
    
    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Profile select error:', selectError)
    }
    
    if (existingProfile) {
      console.log('✅ Profile exists:', existingProfile.id)
      return NextResponse.json({ 
        success: true,
        profile: existingProfile,
        created: false 
      })
    }
    
    // Profile doesn't exist - create it
    console.log('📝 Profile not found, creating...')
    
    // Extract metadata
    const metadata = user.user_metadata || {}
    const appMetadata = user.app_metadata || {}
    
    // Determine full name
    const fullName = metadata.full_name || 
                    metadata.name ||
                    `${metadata.given_name || ''} ${metadata.family_name || ''}`.trim() ||
                    user.email?.split('@')[0] ||
                    'User'
    
    // Create profile data
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: metadata.avatar_url || metadata.picture || null,
      phone: metadata.phone || null,
      role: metadata.role || 'CLIENT',
      
      // Subscription defaults
      subscription_tier: 'individual',
      subscription_status: 'active',
      trial_end_date: null,
      
      // Shop fields (set during onboarding)
      shop_id: null,
      barbershop_id: null,
      
      // Onboarding
      onboarding_completed: false,
      onboarding_step: 'welcome',
      
      // Metadata
      oauth_provider: appMetadata.provider || 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sign_in_at: user.last_sign_in_at || new Date().toISOString()
    }
    
    console.log('Creating profile with data:', {
      id: profileData.id,
      email: profileData.email,
      full_name: profileData.full_name,
      oauth_provider: profileData.oauth_provider
    })
    
    // Create the profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Profile creation error:', createError)
      
      // Try simpler fallback
      const { data: fallback, error: fallbackError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: 'CLIENT'
        })
        .select()
        .single()
      
      if (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        return NextResponse.json({ 
          error: 'Failed to create profile',
          details: fallbackError.message,
          profile: null
        }, { status: 500 })
      }
      
      console.log('✅ Profile created via fallback')
      return NextResponse.json({ 
        success: true,
        profile: fallback,
        created: true,
        method: 'fallback'
      })
    }
    
    console.log('✅ Profile created successfully')
    return NextResponse.json({ 
      success: true,
      profile: newProfile,
      created: true,
      method: 'upsert'
    })
    
  } catch (error) {
    console.error('Ensure profile error:', error)
    return NextResponse.json({ 
      error: 'Failed to ensure profile',
      details: error.message 
    }, { status: 500 })
  }
}

// POST endpoint for manual profile creation/update
export async function POST(request) {
  try {
    const supabase = createSupabaseClient()
    const body = await request.json()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }
    
    // Merge provided data with defaults
    const profileData = {
      id: user.id,
      email: user.email,
      ...body,
      updated_at: new Date().toISOString()
    }
    
    // Upsert profile
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: upsertError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      profile 
    })
    
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error.message 
    }, { status: 500 })
  }
}