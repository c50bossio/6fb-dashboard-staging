import { NextResponse } from 'next/server'
import { syncAllProfiles, getProfileSyncStatus } from '@/lib/profile-sync-service'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Admin endpoint to sync all user profiles for consistency
 * POST /api/admin/users/sync-profiles
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['SUPER_ADMIN', 'ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { dryRun = false, batchSize = 50 } = body

    // Perform the sync
    const result = await syncAllProfiles({ dryRun, batchSize })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        results: result.results,
        dryRun
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Profile sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync profiles',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Get profile sync status and health report
 * GET /api/admin/users/sync-profiles
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Check admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['SUPER_ADMIN', 'ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get sync status
    const statusResult = await getProfileSyncStatus()

    if (statusResult.success) {
      return NextResponse.json({
        success: true,
        status: statusResult.status,
        healthScore: statusResult.healthScore,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: statusResult.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Profile sync status error:', error)
    return NextResponse.json({
      error: 'Failed to get sync status',
      details: error.message
    }, { status: 500 })
  }
}