import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function DELETE(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { segmentId } = params

    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 })
    }

    // Delete segment from database
    const { error } = await supabase
      .from('customer_segments')
      .delete()
      .eq('id', segmentId)

    if (error) {
      console.error('Error deleting segment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { segmentId } = params
    const body = await request.json()

    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 })
    }

    // Update segment in database
    const { data: segment, error } = await supabase
      .from('customer_segments')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', segmentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating segment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(segment)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}