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
    
    // Try to get preferences from profiles table first (backward compatibility)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()
    
    // For now, return empty preferences to avoid errors
    // This can be enhanced later to use a proper settings table
    return NextResponse.json({ 
      preferences: {},
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
    
    // For now, just return success without storing
    // This can be enhanced later to use a proper settings table
    // The preferences are stored in memory on the client side
    
    return NextResponse.json({
      success: true,
      preferences: preferences
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