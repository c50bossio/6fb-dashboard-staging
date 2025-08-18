import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Create service client for bypassing RLS - check if key exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.warn('⚠️ Service client not available, using regular client')
    }
    
    const serviceClient = (supabaseUrl && serviceKey) 
      ? createServiceClient(supabaseUrl, serviceKey)
      : supabase
    
    // Handle authentication with fallback for SSR cookie issues
    let user = null
    let authError = null
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (authUser && !error) {
        user = authUser
      } else {
        authError = error
      }
    } catch (error) {
      authError = error
    }
    
    // Fallback for demo/testing
    if (!user && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      user = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: authError?.message || 'No valid session found'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { step, stepData } = body
    
    // Special handling for staff step - save staff data immediately if present
    if (step === 'staff' && stepData?.staff && stepData.staff.length > 0) {
      // Get the user's barbershop
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (barbershop) {
        // Clear existing staff and insert new ones
        await supabase
          .from('barbers')
          .delete()
          .eq('shop_id', barbershop.id)
        
        const staffData = stepData.staff.map(member => ({
          shop_id: barbershop.id,
          name: member.name || `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone,
          bio: member.bio || '',
          specialties: member.specialty ? [member.specialty] : [],
          experience_years: member.experience || 0,
          is_active: true,
          avatar_url: member.profileImage || null,
          chair_number: member.chairNumber || null,
          instagram_handle: member.instagram || null,
          languages: member.languages || ['English'],
          availability: member.availability || 'full_time'
        }))
        
        const { error: staffError } = await supabase
          .from('barbers')
          .insert(staffData)
        
        if (staffError) {
          console.error('Error saving staff during progress save:', staffError)
        }
      }
    }
    
    // Save to onboarding_progress table using service client (bypasses RLS)
    const { data: progressData, error: progressError } = await serviceClient
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        step_name: step,
        step_data: stepData,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,step_name'
      })
      .select()
      .single()
    
    if (progressError) {
      console.error('Error saving onboarding progress:', progressError)
      // Continue even if this fails - we'll still update the profile
    }
    
    // Also save analytics event for tracking using service client
    const { error: analyticsError } = await serviceClient
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_name: 'onboarding_progress_saved',
        event_properties: {
          step_name: step,
          timestamp: new Date().toISOString(),
          data_keys: Object.keys(stepData || {})
        },
        user_properties: {
          user_id: user.id
        },
        session_id: request.headers.get('x-session-id') || null
      })
    
    if (analyticsError) {
      console.error('Error saving analytics:', analyticsError)
      // Continue even if analytics fails
    }
    
    // Update profile with current progress - try with all fields first
    let profileUpdateSuccess = false
    
    try {
      // Try full update with all columns using service client
      const { error: fullUpdateError } = await serviceClient
        .from('profiles')
        .update({
          onboarding_step: getStepNumber(step),
          onboarding_last_step: step,
          onboarding_data: stepData,
          onboarding_progress_percentage: calculateProgressPercentage(step),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (!fullUpdateError) {
        profileUpdateSuccess = true
      } else if (fullUpdateError.code === 'PGRST204') {
        // Column doesn't exist, try minimal update
        const { error: minimalError } = await serviceClient
          .from('profiles')
          .update({
            onboarding_step: getStepNumber(step),
            onboarding_data: stepData,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
        
        if (!minimalError) {
          profileUpdateSuccess = true
        } else {
          // Try even more minimal
          const { error: basicError } = await serviceClient
            .from('profiles')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
          
          if (!basicError) {
            profileUpdateSuccess = true
          }
        }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      // Continue even if profile update fails
    }
    
    return NextResponse.json({ 
      success: true, 
      data: progressData,
      message: 'Progress saved successfully',
      step: step,
      progress: calculateProgressPercentage(step)
    })
    
  } catch (error) {
    console.error('Error in save-progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Create service client for bypassing RLS - check if key exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.warn('⚠️ Service client not available, using regular client')
    }
    
    const serviceClient = (supabaseUrl && serviceKey) 
      ? createServiceClient(supabaseUrl, serviceKey)
      : supabase
    
    // Handle authentication with fallback for SSR cookie issues
    let user = null
    let authError = null
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (authUser && !error) {
        user = authUser
      } else {
        authError = error
      }
    } catch (error) {
      authError = error
    }
    
    // Fallback for demo/testing
    if (!user && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      user = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: authError?.message || 'No valid session found'
      }, { status: 401 })
    }
    
    const { data: progress, error } = await serviceClient
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching progress:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('onboarding_completed, onboarding_step, user_goals, business_size')
      .eq('id', user.id)
      .single()
    
    // Calculate the next step based on completed steps
    const completedStepNames = new Set((progress || []).map(p => p.step_name))
    const stepOrder = ['business', 'schedule', 'services', 'staff', 'financial', 'booking', 'branding']
    
    let calculatedCurrentStep = 0
    for (let i = 0; i < stepOrder.length; i++) {
      if (!completedStepNames.has(stepOrder[i])) {
        calculatedCurrentStep = i
        break
      }
      calculatedCurrentStep = i + 1
    }
    
    // Use calculated step if it's more advanced than stored step, otherwise use stored step
    const currentStep = Math.max(profile?.onboarding_step || 0, calculatedCurrentStep)
    
    const combinedData = {
      completed: profile?.onboarding_completed || false,
      currentStep: currentStep,
      calculatedStep: calculatedCurrentStep,
      storedStep: profile?.onboarding_step || 0,
      userGoals: profile?.user_goals || [],
      businessSize: profile?.business_size || '',
      steps: progress || []
    }
    
    return NextResponse.json(combinedData)
    
  } catch (error) {
    console.error('Error in get progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStepNumber(stepName) {
  // SHOP_OWNER/ENTERPRISE_OWNER steps
  const shopOwnerSteps = {
    'business': 0,
    'schedule': 1,
    'services': 2,
    'staff': 3,
    'financial': 4,
    'booking': 5,
    'branding': 6
  }
  
  // BARBER steps
  const barberSteps = {
    'profile': 0,
    'services': 1,
    'schedule': 2,
    'financial': 3,
    'booking': 4,
    'branding': 5
  }
  
  // Default to shop owner mapping, could be enhanced to check user role
  return shopOwnerSteps[stepName] ?? barberSteps[stepName] ?? 0
}

function calculateProgressPercentage(stepName) {
  const stepNumber = getStepNumber(stepName)
  const totalSteps = 8 // Adjust based on role
  return Math.round(((stepNumber + 1) / totalSteps) * 100)
}