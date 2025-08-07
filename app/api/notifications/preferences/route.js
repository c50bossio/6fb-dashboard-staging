import { NextResponse } from 'next/server'

import { getSubscriberPreferences, updateSubscriberPreferences } from '@/lib/novu'
import { createClient } from '@/lib/supabase/server'

export async function GET(req) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getSubscriberPreferences(user.id)
    
    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}

export async function PUT(req) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await req.json()
    
    const result = await updateSubscriberPreferences(user.id, preferences)
    
    // Store preferences in Supabase for backup
    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        preferences,
        updated_at: new Date().toISOString(),
      })
    
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}