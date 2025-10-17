import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { barbershopId, compensationModel } = body

    if (!barbershopId || !compensationModel) {
      return NextResponse.json({ 
        error: 'Missing required fields: barbershopId and compensationModel' 
      }, { status: 400 })
    }

    // Validate that user has access to this barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id')
      .eq('id', barbershopId)
      .single()

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    // Check if user is owner or staff with permission
    const { data: staffRecord } = await supabase
      .from('barbershop_staff')
      .select('role')
      .eq('barbershop_id', barbershopId)
      .eq('user_id', user.id)
      .single()

    const isOwner = barbershop.owner_id === user.id
    const isManager = staffRecord?.role === 'SHOP_OWNER' || staffRecord?.role === 'MANAGER'

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create or update payment configuration
    const { data: existingConfig } = await supabase
      .from('payment_configurations')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .single()

    const configData = {
      barbershop_id: barbershopId,
      default_compensation_model: compensationModel.type,
      commission_percentage: compensationModel.type === 'commission' 
        ? compensationModel.commissionRate 
        : null,
      booth_rent_amount: compensationModel.type === 'booth_rent' 
        ? compensationModel.boothRentAmount 
        : null,
      hybrid_base_rent: compensationModel.type === 'hybrid' 
        ? compensationModel.hybridBaseRent 
        : null,
      hybrid_commission_rate: compensationModel.type === 'hybrid' 
        ? compensationModel.hybridCommissionRate 
        : null,
      billing_cycle: 'monthly',
      payment_method_priority: ['balance', 'ach', 'card'],
      updated_at: new Date().toISOString()
    }

    if (existingConfig) {
      // Update existing configuration
      const { error } = await supabase
        .from('payment_configurations')
        .update(configData)
        .eq('id', existingConfig.id)

      if (error) throw error
    } else {
      // Create new configuration
      configData.created_at = new Date().toISOString()
      
      const { error } = await supabase
        .from('payment_configurations')
        .insert(configData)

      if (error) throw error
    }

    // Apply to all existing staff members if they don't have individual arrangements
    const { data: staff } = await supabase
      .from('barbershop_staff')
      .select('user_id')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (staff && staff.length > 0) {
      const staffArrangements = staff.map(member => ({
        barbershop_id: barbershopId,
        barber_id: member.user_id,
        arrangement_type: compensationModel.type,
        commission_percentage: compensationModel.commissionRate,
        booth_rent_amount: compensationModel.boothRentAmount,
        hybrid_base_rent: compensationModel.hybridBaseRent,
        hybrid_commission_rate: compensationModel.hybridCommissionRate,
        created_at: new Date().toISOString()
      }))

      // Use upsert to handle existing arrangements
      const { error: arrangementsError } = await supabase
        .from('financial_arrangements')
        .upsert(staffArrangements, { 
          onConflict: 'barbershop_id,barber_id',
          ignoreDuplicates: false 
        })

      if (arrangementsError) {
        console.error('Error updating staff arrangements:', arrangementsError)
        // Don't fail the whole request for this
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Compensation model configured successfully',
      compensationModel: compensationModel.type
    })

  } catch (error) {
    console.error('Compensation setup error:', error)
    return NextResponse.json(
      { error: 'Failed to configure compensation model' }, 
      { status: 500 }
    )
  }
}