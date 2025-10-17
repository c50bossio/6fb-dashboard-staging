import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenant } from '@/lib/tenant-resolver'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const barbershopId = params.id
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and barbershop access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has access to this barbershop
    const { barbershopId: userBarbershopId } = await getTenant(profile.id, { supabase })
    if (!userBarbershopId || userBarbershopId !== barbershopId) {
      return NextResponse.json({ error: 'Access denied to this barbershop' }, { status: 403 })
    }

    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershopId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Barbershop not found', details: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ barbershop })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient()
    const barbershopId = params.id
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and barbershop access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify user has access to this barbershop
    const { barbershopId: userBarbershopId } = await getTenant(profile.id, { supabase })
    if (!userBarbershopId || userBarbershopId !== barbershopId) {
      return NextResponse.json({ error: 'Access denied to this barbershop' }, { status: 403 })
    }

    const updateData = await request.json()

    // Remove fields that shouldn't be updated directly
    delete updateData.id
    delete updateData.created_at
    delete updateData.updated_at
    delete updateData.owner_id

    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .update(updateData)
      .eq('id', barbershopId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update barbershop', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      barbershop,
      message: 'Barbershop updated successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}