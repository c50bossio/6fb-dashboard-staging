import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        step: 'auth',
        success: false,
        error: 'Unauthorized',
        details: authError?.message 
      }, { status: 401 })
    }

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        step: 'profile',
        success: false,
        error: 'Profile not found',
        details: profileError?.message,
        userId: user.id
      })
    }

    // Test barbershops table access
    const { data: existingShops, error: queryError } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(5)

    // Try a simple insert test (with rollback)
    const testData = {
      name: 'TEST_DELETE_ME',
      owner_id: user.id,
      organization_id: profile.organization_id || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: testInsert, error: insertError } = await supabase
      .from('barbershops')
      .insert([testData])
      .select()

    // Clean up test data if it was created
    if (testInsert && testInsert[0]) {
      await supabase
        .from('barbershops')
        .delete()
        .eq('id', testInsert[0].id)
    }

    return NextResponse.json({
      success: true,
      steps: {
        auth: { success: true, userId: user.id },
        profile: { success: true, role: profile.role, orgId: profile.organization_id },
        query: { success: !queryError, shops: existingShops?.length || 0, error: queryError?.message },
        insert: { success: !insertError, error: insertError?.message, hint: insertError?.hint }
      },
      testData
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}