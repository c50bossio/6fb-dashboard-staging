import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, barberbarbershop_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check existing shop associations - following CLAUDE.md shop ID resolution pattern
    let barbershopId = profile.shop_id || profile.barbershop_id

    // If no direct barbershop_id, check barbershop_staff table (for employees)
    if (!barbershopId) {
      const { data: staffRecord, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('barberbarbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (!staffError && staffRecord) {
        barbershopId = staffRecord.barberbarbershop_id
        console.log('Found shop ID via staff association:', barbershopId)
      }
    }

    // If still no shop, create a default barbershop for this user
    if (!barbershopId) {
      console.log('Creating default barbershop for user:', user.id)
      
      const { data: newBarbershop, error: createError } = await supabase
        .from('barbershops')
        .insert([{
          owner_id: user.id,
          name: 'My Barbershop',
          address: 'Not specified',
          phone: '',
          email: user.email || '',
          business_hours: {
            monday: { open: '09:00', close: '18:00', is_open: true },
            tuesday: { open: '09:00', close: '18:00', is_open: true },
            wednesday: { open: '09:00', close: '18:00', is_open: true },
            thursday: { open: '09:00', close: '18:00', is_open: true },
            friday: { open: '09:00', close: '18:00', is_open: true },
            saturday: { open: '09:00', close: '17:00', is_open: true },
            sunday: { open: '10:00', close: '16:00', is_open: false }
          }
        }])
        .select('id')
        .single()

      if (createError) {
        console.error('Failed to create default barbershop:', createError)
        return NextResponse.json({ error: 'Unable to create shop' }, { status: 500 })
      }

      barbershopId = newBarbershop.id
      
      // Update user's profile with the new barberbarbershop_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ barberbarbershop_id: barbershopId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update profile with barbershop_id:', updateError)
        // Don't fail the request, the shop was created successfully
      }
      
      console.log('Created and assigned default barbershop:', barbershopId)
    }

    return NextResponse.json({
      success: true,
      barbershop_id: barbershopId,
      created: !profile.shop_id && !profile.barbershop_id
    })

  } catch (error) {
    console.error('Ensure shop API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}