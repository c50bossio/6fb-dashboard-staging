import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function POST() {
  try {
    const supabase = await createServiceRoleClient()
    
    // IDs of test/dev barbershops to remove (from our previous query)
    const testbarbershopIds = [
      '9d235d60-4e34-4f85-9aa7-e50556f18eec', // Mike's Professional Barbershop
      '6ae0a322-c656-43aa-9ab2-dc9c93237fcf', // Dev Test Barbershop
      '944afb4f-c731-4914-bc5a-4b83edb6d0c1', // E2E Test Barbershop 1
      'e2ba8523-2a18-4ae1-baaf-abd1deccf77d', // E2E Test Barbershop 2
      '892d24f0-3c33-4cdf-988b-e3766982b0ce'  // E2E Test Barbershop 3
    ]
    
    // Keep this one - Tomb45 Channelside
    const keepbarbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
    
    const cleanupResults = {
      barbershopsRemoved: [],
      usersUpdated: [],
      errors: []
    }

    // Step 1: Remove test barbershops
    for (const barbershopId of testbarbershopIds) {
      try {
        // First remove any related data (appointments, staff, etc.)
        await supabase.from('appointments').delete().eq('barbershop_id', barbershopId)
        await supabase.from('barbershop_staff').delete().eq('barbershop_id', barbershopId)
        await supabase.from('services').delete().eq('shop_id', barbershopId)
        
        // Then remove the barbershop itself
        const { error } = await supabase
          .from('barbershops')
          .delete()
          .eq('id', barbershopId)
          
        if (error) {
          cleanupResults.errors.push(`Failed to remove barbershop ${barbershopId}: ${error.message}`)
        } else {
          cleanupResults.barbershopsRemoved.push(barbershopId)
        }
      } catch (error) {
        cleanupResults.errors.push(`Error processing barbershop ${barbershopId}: ${error.message}`)
      }
    }

    // Step 2: Find and update user profiles to associate with Tomb45 Channelside
    // First, let's find users who might need to be associated with the correct shop
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, barbershop_id, barbershop_id')
      .neq('role', 'CLIENT') // Don't modify client profiles
      
    if (profilesError) {
      cleanupResults.errors.push(`Failed to query profiles: ${profilesError.message}`)
    } else {
      // Update any shop owners or barbers who don't have proper shop associations
      for (const profile of profiles || []) {
        if (['SHOP_OWNER', 'BARBER', 'ENTERPRISE_OWNER'].includes(profile.role)) {
          // If they don't have a barbershop_id or have a test barbershop_id, update to Tomb45
          const needsUpdate = !profile.barbershop_id || testbarbershopIds.includes(profile.barbershop_id)
          
          if (needsUpdate) {
            const { error } = await supabase
              .from('profiles')
              .update({ 
                barbershop_id: keepbarbershopId,
                barbershop_id: keepbarbershopId 
              })
              .eq('id', profile.id)
              
            if (error) {
              cleanupResults.errors.push(`Failed to update user ${profile.email}: ${error.message}`)
            } else {
              cleanupResults.usersUpdated.push({
                id: profile.id,
                email: profile.email,
                role: profile.role
              })
            }
          }
        }
      }
    }

    // Step 3: Ensure Tomb45 Channelside has proper owner
    const { data: tomb45, error: tomb45Error } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .eq('id', keepbarbershopId)
      .single()
      
    if (tomb45Error) {
      cleanupResults.errors.push(`Failed to verify Tomb45 Channelside: ${tomb45Error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed',
      results: cleanupResults,
      tomb45Status: tomb45 ? `Tomb45 Channelside verified - Owner: ${tomb45.owner_id}` : 'Tomb45 Channelside not found'
    })

  } catch (error) {
    console.error('Database cleanup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Database cleanup failed' 
      },
      { status: 500 }
    )
  }
}