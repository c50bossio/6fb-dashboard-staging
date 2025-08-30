import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function POST() {
  try {
    const supabase = await createServiceRoleClient()
    
    // The remaining test barbershop IDs that couldn't be deleted
    const problematicBarberbarbershopIds = [
      '9d235d60-4e34-4f85-9aa7-e50556f18eec', // Mike's Professional Barbershop
      '6ae0a322-c656-43aa-9ab2-dc9c93237fcf', // Dev Test Barbershop
      '892d24f0-3c33-4cdf-988b-e3766982b0ce'  // E2E Test Barbershop
    ]
    
    const tombBarberbarbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
    
    const results = {
      usersFixed: [],
      barbershopsRemoved: [],
      errors: []
    }

    // Step 1: Find and fix any remaining users linked to problematic barbershops
    for (const barberbarbershopId of problematicBarberbarbershopIds) {
      // Find users with this barbershop_id
      const { data: usersWithShop, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('barbershop_id', barberbarbershopId)
        
      if (error) {
        results.errors.push(`Failed to query users for shop ${barberbarbershopId}: ${error.message}`)
        continue
      }
      
      // Update each user to point to Tomb45
      for (const user of usersWithShop || []) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            barbershop_id: tombBarberbarbershopId,
            barberbarbershop_id: tombBarberbarbershopId 
          })
          .eq('id', user.id)
          
        if (updateError) {
          results.errors.push(`Failed to update user ${user.email}: ${updateError.message}`)
        } else {
          results.usersFixed.push({
            id: user.id,
            email: user.email,
            role: user.role,
            movedFrom: barberbarbershopId
          })
        }
      }
      
      // Also check barberbarbershop_id field
      const { data: usersWithBarberbarbershopId } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('barberbarbershop_id', barberbarbershopId)
        
      for (const user of usersWithBarberbarbershopId || []) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            barbershop_id: tombBarberbarbershopId,
            barberbarbershop_id: tombBarberbarbershopId 
          })
          .eq('id', user.id)
          
        if (updateError) {
          results.errors.push(`Failed to update user ${user.email} barberbarbershop_id: ${updateError.message}`)
        } else {
          results.usersFixed.push({
            id: user.id,
            email: user.email,
            role: user.role,
            movedFrom: barberbarbershopId,
            field: 'barberbarbershop_id'
          })
        }
      }
    }
    
    // Step 2: Now try to delete the problematic barbershops again
    for (const barberbarbershopId of problematicBarberbarbershopIds) {
      try {
        // Clean up related data first
        await supabase.from('appointments').delete().eq('barberbarbershop_id', barberbarbershopId)
        await supabase.from('barbershop_staff').delete().eq('barberbarbershop_id', barberbarbershopId)
        await supabase.from('services').delete().eq('barberbarbershop_id', barberbarbershopId)
        
        // Try to delete the barbershop
        const { error } = await supabase
          .from('barbershops')
          .delete()
          .eq('id', barberbarbershopId)
          
        if (error) {
          results.errors.push(`Still can't remove barbershop ${barberbarbershopId}: ${error.message}`)
        } else {
          results.barbershopsRemoved.push(barberbarbershopId)
        }
      } catch (error) {
        results.errors.push(`Error removing barbershop ${barberbarbershopId}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Remaining user fixes completed',
      results: results
    })

  } catch (error) {
    console.error('Fix remaining users error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}