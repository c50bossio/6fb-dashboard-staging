import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase-simple'

// Test endpoint to verify profile updates work
export async function POST(request) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const body = await request.json()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, testData } = body

    // Check if service client exists
    if (!serviceClient) {
      return NextResponse.json({
        error: 'Service client not available',
        details: 'SUPABASE_SERVICE_ROLE_KEY may be missing'
      }, { status: 500 })
    }

    // First, check if the profile exists
    const { data: existingProfile, error: checkError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (checkError) {
      return NextResponse.json({
        error: 'Profile check failed',
        details: checkError
      }, { status: 500 })
    }

    // Try to update the profile
    const { data: updateResult, error: updateError } = await serviceClient
      .from('profiles')
      .update({
        first_name: testData.firstName || 'Test First',
        last_name: testData.lastName || 'Test Last',
        full_name: testData.fullName || 'Test Full Name'
      })
      .eq('id', userId)
      .select()

    if (updateError) {
      return NextResponse.json({
        error: 'Update failed',
        details: updateError,
        existingProfile: existingProfile
      }, { status: 500 })
    }

    // Verify the update by fetching the profile again
    const { data: verifyProfile, error: verifyError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      success: true,
      existingProfile: existingProfile,
      updateResult: updateResult,
      verifyProfile: verifyProfile,
      changed: {
        first_name: existingProfile.first_name !== verifyProfile.first_name,
        last_name: existingProfile.last_name !== verifyProfile.last_name,
        full_name: existingProfile.full_name !== verifyProfile.full_name
      }
    })

  } catch (error) {
    console.error('🚨 [DEBUG] Test profile update error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}