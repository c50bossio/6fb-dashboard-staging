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
    
    // Get user preferences from settings table
    // This allows storing preferences without modifying the profiles table
    const { data: settings, error: settingsError } = await supabase
      .from('settings_hierarchy')
      .select('settings')
      .eq('context_type', 'user')
      .eq('context_id', user.id)
      .eq('category', 'preferences')
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching preferences from settings:', settingsError)
    }
    
    // Return preferences from settings or empty object
    return NextResponse.json({ 
      preferences: settings?.settings || {},
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
    const { data: currentSettings } = await supabase
      .from('settings_hierarchy')
      .select('settings')
      .eq('context_type', 'user')
      .eq('context_id', user.id)
      .eq('category', 'preferences')
      .single()
    
    const currentPreferences = currentSettings?.settings || {}
    
    // Merge new preferences with existing ones
    const mergedPreferences = {
      ...currentPreferences,
      ...preferences,
      updated_at: new Date().toISOString()
    }
    
    // Upsert preferences in settings_hierarchy table
    const { data: updatedSettings, error: updateError } = await supabase
      .from('settings_hierarchy')
      .upsert({
        context_type: 'user',
        context_id: user.id,
        category: 'preferences',
        settings: mergedPreferences,
        updated_at: new Date().toISOString()
      })
      .select('settings')
      .single()
    
    if (updateError) {
      console.error('Error updating preferences:', updateError)
      throw updateError
    }
    
    return NextResponse.json({
      success: true,
      preferences: updatedSettings?.settings || mergedPreferences
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