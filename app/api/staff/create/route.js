import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generate secure random password
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // Ensure it has at least one uppercase, lowercase, number, and special char
  return `${password}A1!`
}

// Send welcome email with credentials
async function sendWelcomeEmail({ to, fullName, tempPassword, barbershopName }) {
  if (!process.env.SENDGRID_API_KEY) {
    
    return { success: false, error: 'Email service not configured' }
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
          name: 'BookedBarber'
        },
        subject: `Welcome to ${barbershopName} - Your Account Details`,
        content: [{
          type: 'text/html',
          value: `
            <h2>Welcome to ${barbershopName}!</h2>
            <p>Hi ${fullName || 'there'},</p>
            <p>Your account has been created. Here are your login credentials:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${to}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>
            <p><strong>Important:</strong> You'll be prompted to change this password on your first login.</p>
            <p>Login at: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/login">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/login</a></p>
            <br>
            <p>Best regards,<br>The BookedBarber Team</p>
          `
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid error:', errorText)
      return { success: false, error: 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    
    // Parse request body first
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, barberbarbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userRole = profile.role || 'CLIENT'
    
    // Check if user has permission to create staff
    if (!['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions to create staff' }, { status: 403 })
    }

    // Validate required fields
    const { email, fullName, phone, role = 'BARBER', locationId, barberbarbershopId } = body
    const finalBarberbarbershopId = barberbarbershopId || locationId
    
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!finalBarberbarbershopId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
    }

    // Get barbershop details
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', finalBarberbarbershopId)
      .single()

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingUser) {
      // User already exists - add them to staff instead
      const { data: staffMember, error: staffError } = await supabase
        .from('barbershop_staff')
        .insert({
          barberbarbershop_id: finalBarberbarbershopId,
          user_id: existingUser.id,
          role: role,
          is_active: true
        })
        .select()
        .single()

      if (staffError) {
        if (staffError.code === '23505') {
          return NextResponse.json({ error: 'This user is already a staff member' }, { status: 409 })
        }
        throw staffError
      }

      return NextResponse.json({
        success: true,
        message: `${email} has been added to your team`,
        data: {
          id: existingUser.id,
          email: existingUser.email,
          fullName: fullName || 'Existing User',
          role: role,
          existingUser: true
        },
        staff: staffMember
      })
    }

    // Generate temporary password
    const tempPassword = generateSecurePassword()

    // Create admin client for auth operations
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {},
          remove: (name, options) => {}
        }
      }
    )

    // Create new auth user
    const { data: newAuthUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName || '',
        phone: phone || '',
        role: role,
        created_by: user.id,
        barberbarbershop_id: finalBarberbarbershopId,
        temp_password: true // Flag to force password change
      }
    })

    if (createUserError) {
      console.error('Error creating auth user:', createUserError)
      return NextResponse.json({ 
        error: 'Failed to create user account',
        details: createUserError.message 
      }, { status: 500 })
    }

    // Create profile record
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newAuthUser.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName || '',
        first_name: fullName ? fullName.split(' ')[0] : '',
        last_name: fullName ? fullName.split(' ').slice(1).join(' ') : '',
        phone: phone || '',
        role: role,
        barbershop_id: finalBarberbarbershopId,
        barberbarbershop_id: finalBarberbarbershopId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Try to delete the auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({ 
        error: 'Failed to create user profile',
        details: profileError.message 
      }, { status: 500 })
    }

    // Add to barbershop_staff
    const { data: staffMember, error: staffError } = await supabase
      .from('barbershop_staff')
      .insert({
        barberbarbershop_id: finalBarberbarbershopId,
        user_id: newAuthUser.user.id,
        role: role,
        is_active: true,
        metadata: {
          created_by: user.id,
          created_at: new Date().toISOString(),
          temp_password: true
        }
      })
      .select()
      .single()

    if (staffError) {
      console.error('Error adding to staff:', staffError)
      // Don't fail the whole operation if staff record fails
    }

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      to: email,
      fullName: fullName || email.split('@')[0],
      tempPassword: tempPassword,
      barbershopName: barbershop.name
    })

    // In development, include temp password in response
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

    return NextResponse.json({
      success: true,
      message: emailResult.success 
        ? `Account created and welcome email sent to ${email}`
        : `Account created for ${email} (email delivery failed)`,
      data: {
        id: newAuthUser.user.id,
        email: email.toLowerCase().trim(),
        fullName: fullName || '',
        phone: phone || '',
        role: role,
        locationId: finalBarberbarbershopId,
        tempPassword: isDevelopment ? tempPassword : undefined, // Only show in dev
        emailSent: emailResult.success,
        emailError: emailResult.error
      },
      staff: staffMember,
      instructions: emailResult.success ? [
        '✅ Account created successfully',
        `✅ Welcome email sent to ${email}`,
        '✅ Added to your team roster',
        'They can now login with their temporary password',
        'They will be prompted to change password on first login'
      ] : [
        '✅ Account created successfully',
        '⚠️ Email delivery failed - share credentials manually',
        isDevelopment ? `Temporary password: ${tempPassword}` : 'Contact support for password reset',
        '✅ Added to your team roster',
        'They will be prompted to change password on first login'
      ]
    })

  } catch (error) {
    console.error('Error in staff create API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}