import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function POST() {
  try {
    const supabase = await createServiceRoleClient()
    
    // The remaining test barbershop IDs that couldn't be deleted
    const problematicbarbershopIds = [
      '9d235d60-4e34-4f85-9aa7-e50556f18eec', // Mike's Professional Barbershop
      '6ae0a322-c656-43aa-9ab2-dc9c93237fcf', // Dev Test Barbershop
      '892d24f0-3c33-4cdf-988b-e3766982b0ce'  // E2E Test Barbershop
    ]
    
    const tombbarbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
    
    const results = {
      usersFixed: [],
      barbershopsRemoved: [],
      errors: []
    }

    // Step 1: Find and fix any remaining users linked to problematic barbershops
    for (const barbershopId of problematicbarbershopIds) {
      // Find users with this barbershop_id
      const { data: usersWithShop, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('barbershop_id', barbershopId)
        
      if (error) {
        results.errors.push(`Failed to query users for shop ${barbershopId}: ${error.message}`)
        continue
      }
      
      // Update each user to point to Tomb45
      for (const user of usersWithShop || []) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            barbershop_id: tombbarbershopId,
            barbershop_id: tombbarbershopId 
          })
          .eq('id', user.id)
          
        if (updateError) {
          results.errors.push(`Failed to update user ${user.email}: ${updateError.message}`)
        } else {
          results.usersFixed.push({
            id: user.id,
            email: user.email,
            role: user.role,
            movedFrom: barbershopId
          })
        }
      }
      
      // Also check barbershop_id field
      const { data: usersWithbarbershopId } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('barbershop_id', barbershopId)
        
      for (const user of usersWithbarbershopId || []) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            barbershop_id: tombbarbershopId,
            barbershop_id: tombbarbershopId 
          })
          .eq('id', user.id)
          
        if (updateError) {
          results.errors.push(`Failed to update user ${user.email} barbershop_id: ${updateError.message}`)
        } else {
          results.usersFixed.push({
            id: user.id,
            email: user.email,
            role: user.role,
            movedFrom: barbershopId,
            field: 'barbershop_id'
          })
        }
      }
    }
    
    // Step 2: Now try to delete the problematic barbershops again
    for (const barbershopId of problematicbarbershopIds) {
      try {
        // Clean up related data first
        await supabase.from('appointments').delete().eq('barbershop_id', barbershopId)
        await supabase.from('barbershop_staff').delete().eq('barbershop_id', barbershopId)
        await supabase.from('services').delete().eq('barbershop_id', barbershopId)
        
        // Try to delete the barbershop
        const { error } = await supabase
          .from('barbershops')
          .delete()
          .eq('id', barbershopId)
          
        if (error) {
          results.errors.push(`Still can't remove barbershop ${barbershopId}: ${error.message}`)
        } else {
          results.barbershopsRemoved.push(barbershopId)
        }
      } catch (error) {
        results.errors.push(`Error removing barbershop ${barbershopId}: ${error.message}`)
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