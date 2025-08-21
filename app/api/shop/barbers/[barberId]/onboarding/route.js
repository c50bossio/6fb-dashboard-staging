import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET - Get onboarding status
export async function GET(request, { params }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const barberId = params.barberId
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get onboarding status
    const { data: onboarding, error } = await supabase
      .from('barber_onboarding')
      .select('*')
      .eq('barber_id', barberId)
      .single()
    
    if (error || !onboarding) {
      // Create default onboarding if doesn't exist
      const { data: shop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (!shop) {
        return NextResponse.json({ error: 'No shop found' }, { status: 404 })
      }
      
      const { data: newOnboarding } = await supabase
        .from('barber_onboarding')
        .insert({
          barber_id: barberId,
          barbershop_id: shop.id,
          onboarding_progress: 0
        })
        .select()
        .single()
      
      return NextResponse.json({ onboarding: newOnboarding })
    }
    
    // Calculate progress
    const steps = [
      'profile_completed',
      'license_uploaded',
      'insurance_uploaded',
      'contract_signed',
      'shop_tour_completed',
      'pos_training_completed',
      'booking_system_training',
      'chair_assigned',
      'supplies_provided',
      'keys_provided',
      'payment_setup',
      'tax_forms_completed'
    ]
    
    const completedSteps = steps.filter(step => onboarding[step]).length
    const progress = Math.round((completedSteps / steps.length) * 100)
    
    // Get any pending documents
    const { data: documents } = await supabase
      .from('barber_documents')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })
    
    return NextResponse.json({ 
      onboarding: {
        ...onboarding,
        calculated_progress: progress,
        steps_completed: completedSteps,
        total_steps: steps.length
      },
      documents: documents || [],
      checklist: steps.map(step => ({
        key: step,
        label: step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        completed: onboarding[step],
        completed_at: onboarding[`${step}_at`]
      }))
    })
    
  } catch (error) {
    console.error('Error fetching onboarding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update onboarding status
export async function PATCH(request, { params }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const barberId = params.barberId
    const updates = await request.json()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Add timestamps for completed steps
    const timestampedUpdates = {}
    Object.entries(updates).forEach(([key, value]) => {
      timestampedUpdates[key] = value
      if (value === true && !key.endsWith('_at')) {
        timestampedUpdates[`${key}_at`] = new Date().toISOString()
      }
    })
    
    // Update onboarding record
    const { data, error } = await supabase
      .from('barber_onboarding')
      .update({
        ...timestampedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', barberId)
      .eq('barbershop_id', shop.id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 })
    }
    
    // Check if fully onboarded
    const requiredSteps = [
      'profile_completed',
      'license_uploaded',
      'contract_signed',
      'chair_assigned',
      'payment_setup'
    ]
    
    const allRequiredComplete = requiredSteps.every(step => data[step])
    
    if (allRequiredComplete && !data.fully_onboarded) {
      await supabase
        .from('barber_onboarding')
        .update({
          fully_onboarded: true,
          fully_onboarded_at: new Date().toISOString(),
          onboarding_progress: 100
        })
        .eq('barber_id', barberId)
      
      // Also update staff record
      await supabase
        .from('barbershop_staff')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('user_id', barberId)
        .eq('barbershop_id', shop.id)
    }
    
    return NextResponse.json({ 
      success: true,
      onboarding: data,
      message: 'Onboarding updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating onboarding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}