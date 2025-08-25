import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
// Using SendGrid directly for edge runtime compatibility

// SendGrid email service for edge runtime
async function sendInvitationEmail({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    return { success: false, error: 'SendGrid not configured' }
  }
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { 
          email: process.env.SENDGRID_FROM_EMAIL || 'support@em3014.6fbmentorship.com',
          name: process.env.SENDGRID_FROM_NAME || 'BookedBarber'
        },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    })
    
    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status}`)
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Generate secure invitation token
function generateInvitationToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { email, full_name, role = 'BARBER', barbershopId, sendEmail = true } = body
    
    if (!email || !barbershopId) {
      return NextResponse.json(
        { error: 'Email and barbershop ID are required' },
        { status: 400 }
      )
    }
    
    // Verify user owns or manages this barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .eq('id', barbershopId)
      .single()
    
    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to invite staff to this barbershop' },
        { status: 403 }
      )
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single()
    
    if (existingUser) {
      // Check if already a staff member
      const { data: existingStaff } = await supabase
        .from('barbershop_staff')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('user_id', existingUser.id)
        .single()
      
      if (existingStaff) {
        return NextResponse.json(
          { error: 'This person is already a staff member' },
          { status: 409 }
        )
      }
      
      // User exists but not staff - add them directly
      const { data: staffMember, error: staffError } = await supabase
        .from('barbershop_staff')
        .insert({
          barbershop_id: barbershopId,
          user_id: existingUser.id,
          role: role,
          is_active: true,
          metadata: {
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            full_name: full_name || existingUser.full_name
          }
        })
        .select()
        .single()
      
      if (staffError) {
        throw staffError
      }
      
      return NextResponse.json({
        success: true,
        message: 'Staff member added successfully',
        data: staffMember,
        existingUser: true
      })
    } else {
      // User doesn't exist - create pending invitation
      // Generate invitation token
      const invitationToken = generateInvitationToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry
      
      // Store as pending staff with invitation metadata
      const { data: pendingStaff, error: pendingError } = await supabase
        .from('barbershop_staff')
        .insert({
          barbershop_id: barbershopId,
          user_id: user.id, // Temporarily use inviter's ID
          role: role,
          is_active: false, // Mark as inactive until accepted
          metadata: {
            pending_invitation: true,
            invitation_token: invitationToken,
            invited_email: email,
            invited_name: full_name,
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            invitation_status: 'pending'
          }
        })
        .select()
        .single()
      
      if (pendingError) {
        // Check if already invited
        if (pendingError.code === '23505') {
          return NextResponse.json(
            { error: 'An invitation has already been sent to this person' },
            { status: 409 }
          )
        }
        throw pendingError
      }
      
      // Send invitation email if enabled
      if (sendEmail && process.env.SENDGRID_API_KEY) {
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bookedbarber.com'}/accept-invitation?token=${invitationToken}`
        
        try {
          await sendInvitationEmail({
            to: email,
            subject: `You're invited to join ${barbershop.name} on Booked Barber`,
            html: generateInvitationEmailHTML({
              recipientName: full_name || 'there',
              barbershopName: barbershop.name,
              inviterName: user.email,
              invitationUrl,
              role
            })
          })
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError)
          // Don't fail the whole operation if email fails
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Invitation sent to ${email}`,
        data: {
          id: pendingStaff.id,
          email,
          full_name,
          role,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString()
        },
        requiresSignup: true,
        instructions: sendEmail ? [
          `An invitation email has been sent to ${email}`,
          'They will receive a link to join your barbershop',
          'The invitation expires in 7 days',
          'Once they accept, they will appear in your staff list'
        ] : [
          `Share this invitation link with ${full_name || 'the staff member'}:`,
          `${process.env.NEXT_PUBLIC_APP_URL || 'https://bookedbarber.com'}/accept-invitation?token=${invitationToken}`,
          'The invitation expires in 7 days',
          'Once they accept, they will appear in your staff list'
        ]
      })
    }
    
  } catch (error) {
    console.error('Error inviting staff:', error)
    return NextResponse.json(
      { error: 'Failed to process invitation' },
      { status: 500 }
    )
  }
}

// Generate invitation email HTML with BookedBarber branding
function generateInvitationEmailHTML({ recipientName, barbershopName, inviterName, invitationUrl, role }) {
  // BookedBarber Brand Colors
  const colors = {
    primary: '#3C4A3E',     // Deep Olive
    gold: '#B8913A',        // BookedBarber Gold
    goldLight: '#C5A35B',   // Rich Gold
    goldAccent: '#D4A94A',  // Lighter Gold
    text: '#1F2320',        // Gunmetal
    textLight: '#4a4f4a',   // Medium gray
    background: '#FFFFFF',
    backgroundLight: '#f8f9fa',
    backgroundSand: '#EAE3D2',  // Light Sand
    warning: '#E6B655'      // Amber for warning
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to Join ${barbershopName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${colors.text}; margin: 0; padding: 0; background-color: ${colors.backgroundLight};">
    <div style="max-width: 600px; margin: 40px auto; background: ${colors.background}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
        <div style="background: ${colors.primary}; color: white; padding: 40px 30px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${colors.gold};"></div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">You're Invited!</h1>
            <p style="margin: 10px 0 0; opacity: 0.95; font-size: 16px; color: ${colors.goldLight};">Join ${barbershopName} on BookedBarber</p>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: ${colors.primary}; margin-top: 0; font-size: 20px;">Hi ${recipientName},</h2>
            <p style="color: ${colors.textLight}; font-size: 16px; line-height: 1.6;">
                ${inviterName} has invited you to join <strong style="color: ${colors.primary};">${barbershopName}</strong> as a <strong style="color: ${colors.gold};">${role.toLowerCase()}</strong> on BookedBarber - the modern platform for barbershop management.
            </p>
            
            <div style="background: ${colors.backgroundSand}; border-left: 4px solid ${colors.gold}; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px; color: ${colors.primary}; font-size: 16px;">What you'll get access to:</h3>
                <ul style="margin: 0; padding-left: 20px; color: ${colors.textLight};">
                    <li>Manage your appointments and schedule</li>
                    <li>Track your clients and their preferences</li>
                    <li>View your performance and earnings</li>
                    <li>Access the shop's booking system</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${invitationUrl}" style="display: inline-block; background: ${colors.primary}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: background 0.2s;">Accept Invitation</a>
            </div>
            
            <div style="background: #fff8e1; border: 1px solid #d4a94a; padding: 15px; border-radius: 6px; margin-top: 30px;">
                <p style="margin: 0; color: #6b5d16; font-size: 14px;">
                    <strong>⏰ This invitation expires in 7 days</strong><br>
                    Please accept it before it expires to join the team.
                </p>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                If you're unable to click the button above, copy and paste this link into your browser:<br>
                <span style="color: ${colors.gold}; word-break: break-all;">${invitationUrl}</span>
            </p>
        </div>
    </div>
</body>
</html>`
}