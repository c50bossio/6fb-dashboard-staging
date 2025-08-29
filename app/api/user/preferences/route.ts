import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Load user preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user preferences from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Error fetching preferences:', profileError)
      // Return empty preferences if profile doesn't exist yet
      return NextResponse.json({ preferences: {} })
    }
    
    return NextResponse.json({ 
      preferences: profile?.preferences || {},
      userId: user.id 
    })
    
  } catch (error) {
    console.error('Preferences API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Update user preferences
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the preferences to update
    const body = await request.json()
    const { preferences } = body
    
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      )
    }
    
    // Get current preferences first (to merge with new ones)
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()
    
    const currentPreferences = currentProfile?.preferences || {}
    
    // Merge new preferences with existing ones
    const mergedPreferences = {
      ...currentPreferences,
      ...preferences,
      updated_at: new Date().toISOString()
    }
    
    // Update preferences in profiles table
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: mergedPreferences })
      .eq('id', user.id)
      .select('preferences')
      .single()
    
    if (updateError) {
      console.error('Error updating preferences:', updateError)
      
      // If profile doesn't exist, try to create it
      if (updateError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            preferences: mergedPreferences
          })
          .select('preferences')
          .single()
        
        if (insertError) {
          throw insertError
        }
        
        return NextResponse.json({
          success: true,
          preferences: newProfile.preferences
        })
      }
      
      throw updateError
    }
    
    return NextResponse.json({
      success: true,
      preferences: updatedProfile.preferences
    })
    
  } catch (error) {
    console.error('Preferences update error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

// PATCH: Update specific preference keys
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the specific key and value to update
    const body = await request.json()
    const { key, value } = body
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }
    
    // Get current preferences
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()
    
    const currentPreferences = currentProfile?.preferences || {}
    
    // Update specific key
    const updatedPreferences = {
      ...currentPreferences,
      [key]: value,
      updated_at: new Date().toISOString()
    }
    
    // Save updated preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.id)
      .select('preferences')
      .single()
    
    if (updateError) {
      throw updateError
    }
    
    return NextResponse.json({
      success: true,
      key,
      value,
      preferences: updatedProfile.preferences
    })
    
  } catch (error) {
    console.error('Preference patch error:', error)
    return NextResponse.json(
      { error: 'Failed to update preference' },
      { status: 500 }
    )
  }
}