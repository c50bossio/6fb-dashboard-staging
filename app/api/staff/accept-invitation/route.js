import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role-workaround'

// Removed edge runtime to support service role client

export async function POST(request) {
  try {
    const body = await request.json()
    const { token, action = 'verify' } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Use service role client for reading invitations (bypasses RLS)
    const supabaseAdmin = createServiceRoleClient()

    // Find the invitation by token
    // We need to get all pending invitations and filter by token in JavaScript
    // because PostgREST doesn't support JSONB queries well
    const { data: pendingInvitations, error: fetchError } = await supabaseAdmin
      .from('barbershop_staff')
      .select('*')
      .eq('is_active', false)
      .not('metadata', 'is', null)

    console.log('Debug - Fetched invitations:', pendingInvitations?.length || 0)
    console.log('Debug - Looking for token:', token)

    if (fetchError) {
      console.error('Error fetching invitations:', fetchError)
      return NextResponse.json({ error: 'Failed to verify invitation' }, { status: 500 })
    }

    // Find the invitation with matching token
    const invitation = pendingInvitations?.find(
      inv => {
        const hasToken = inv.metadata?.invitation_token === token
        if (inv.metadata?.invitation_token) {
          console.log('Debug - Checking token:', inv.metadata.invitation_token.substring(0, 10) + '...', 'Match:', hasToken)
        }
        return hasToken
      }
    )

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.metadata.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
    }

    // If just verifying, return the invitation details
    if (action === 'verify') {
      // Get barbershop name separately
      const { data: barbershop } = await supabaseAdmin
        .from('barbershops')
        .select('name')
        .eq('id', invitation.barbershop_id)
        .single()
      
      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          barbershop_id: invitation.barbershop_id,
          barbershop_name: barbershop?.name || 'Unknown Barbershop',
          role: invitation.role,
          invited_email: invitation.metadata.invited_email,
          invited_name: invitation.metadata.invited_name,
          invited_by: invitation.metadata.invited_by,
          invited_at: invitation.metadata.invited_at,
          expires_at: invitation.metadata.expires_at
        }
      })
    }

    // If accepting the invitation
    if (action === 'accept') {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ 
          error: 'You must be logged in to accept this invitation' 
        }, { status: 401 })
      }

      // Check if the user's email matches the invited email
      if (user.email !== invitation.metadata.invited_email) {
        return NextResponse.json({ 
          error: 'This invitation was sent to a different email address' 
        }, { status: 403 })
      }

      // Check if user is already a staff member at this barbershop
      const { data: existingStaff } = await supabaseAdmin
        .from('barbershop_staff')
        .select('id')
        .eq('barbershop_id', invitation.barbershop_id)
        .eq('user_id', user.id)
        .neq('id', invitation.id) // Exclude the current invitation record
        .single()

      if (existingStaff) {
        // User is already a staff member, just delete the invitation
        await supabaseAdmin
          .from('barbershop_staff')
          .delete()
          .eq('id', invitation.id)

        return NextResponse.json({
          success: true,
          message: 'You are already a member of this barbershop',
          alreadyMember: true
        })
      }

      // Update the invitation record to link it to the actual user
      const { data: updatedStaff, error: updateError } = await supabaseAdmin
        .from('barbershop_staff')
        .update({
          user_id: user.id, // Update to the actual user's ID
          is_active: true,
          metadata: {
            ...invitation.metadata,
            invitation_status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by_user_id: user.id
          }
        })
        .eq('id', invitation.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating staff record:', updateError)
        return NextResponse.json({ 
          error: 'Failed to accept invitation' 
        }, { status: 500 })
      }

      // Update user's profile with barbershop association if they don't have one
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()

      if (profile && !profile.shop_id && !profile.barbershop_id) {
        // User doesn't have a barbershop, set this one
        await supabaseAdmin
          .from('profiles')
          .update({
            shop_id: invitation.barbershop_id,
            barbershop_id: invitation.barbershop_id
          })
          .eq('id', user.id)
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation accepted successfully',
        data: updatedStaff
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error processing invitation:', error)
    return NextResponse.json(
      { error: 'Failed to process invitation' },
      { status: 500 }
    )
  }
}