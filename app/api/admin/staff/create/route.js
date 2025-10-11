import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, getUserProfile } from '@/lib/auth-middleware'

/**
 * POST /api/admin/staff/create
 * Create new staff member (admin only)
 */
export const POST = withAuth(async (request) => {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is admin
    const profile = await getUserProfile(user.id)
    if (!profile || (profile.role !== 'SHOP_OWNER' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()

    // Extract fields
    const firstName = formData.get('first_name')
    const lastName = formData.get('last_name')
    const email = formData.get('email')
    const phone = formData.get('phone') || null
    const bio = formData.get('bio') || null
    const specialtiesJson = formData.get('specialties')
    const serviceIdsJson = formData.get('service_ids')
    const financialModel = formData.get('financial_model')
    const commissionPercentage = formData.get('commission_percentage')
    const boothRentAmount = formData.get('booth_rent_amount')
    const boothRentFrequency = formData.get('booth_rent_frequency')
    const bookingSlug = formData.get('booking_slug')
    const role = formData.get('role') || 'BARBER'
    const photo = formData.get('photo')

    // Validate required fields
    if (!firstName || !lastName || !email || !bookingSlug || !financialModel) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parse JSON fields
    let specialties = []
    if (specialtiesJson) {
      try {
        specialties = JSON.parse(specialtiesJson)
      } catch (err) {
        return NextResponse.json(
          { success: false, error: 'Invalid specialties format' },
          { status: 400 }
        )
      }
    }

    let serviceIds = []
    if (serviceIdsJson) {
      try {
        serviceIds = JSON.parse(serviceIdsJson)
      } catch (err) {
        return NextResponse.json(
          { success: false, error: 'Invalid service IDs format' },
          { status: 400 }
        )
      }
    }

    // Check if booking slug is unique
    const { data: existingSlug } = await supabase
      .from('profiles')
      .select('id')
      .eq('booking_slug', bookingSlug)
      .single()

    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          error: `Booking slug "${bookingSlug}" is already taken. Try "${bookingSlug}-2" or "${bookingSlug}-${firstName.toLowerCase()}".`
        },
        { status: 409 }
      )
    }

    // Handle photo upload (if provided)
    let photoUrl = null
    if (photo && photo.size > 0) {
      try {
        // Generate unique filename
        const fileExt = photo.name.split('.').pop()
        const fileName = `${bookingSlug}-${Date.now()}.${fileExt}`
        const filePath = `staff-photos/${fileName}`

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, photo, {
            contentType: photo.type,
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          // Continue without photo rather than failing entire operation
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath)

          photoUrl = publicUrl
        }
      } catch (err) {
        console.error('Photo processing error:', err)
        // Continue without photo
      }
    }

    // Create profile record
    const profileData = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      bio,
      specialties,
      booking_slug: bookingSlug,
      role,
      image: photoUrl,
      barbershop_id: profile.barbershop_id, // Associate with admin's barbershop
      financial_model: financialModel,
      commission_percentage: financialModel === 'commission' ? parseFloat(commissionPercentage) : null,
      booth_rent_amount: financialModel === 'booth_rent' ? parseFloat(boothRentAmount) : null,
      booth_rent_frequency: financialModel === 'booth_rent' ? boothRentFrequency : null,
    }

    const { data: staff, error: profileError } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { success: false, error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Assign services to staff member
    if (serviceIds.length > 0) {
      const barberServices = serviceIds.map(serviceId => ({
        barber_id: staff.id,
        service_id: serviceId,
      }))

      const { error: servicesError } = await supabase
        .from('barber_services')
        .insert(barberServices)

      if (servicesError) {
        console.error('Service assignment error:', servicesError)
        // Log but don't fail - staff member was created successfully
      }
    }

    // Generate booking URL
    const bookingUrl = `${request.headers.get('origin') || 'https://yourbarbershop.com'}/book/${bookingSlug}`

    // Send welcome email to barber with their booking link
    try {
      await sendBarberWelcomeEmail({
        email: staff.email,
        firstName: staff.first_name,
        lastName: staff.last_name,
        bookingUrl,
        barbershopName: profile.barbershop_name || 'our barbershop',
        financialModel: staff.financial_model,
        commissionPercentage: staff.commission_percentage,
        boothRentAmount: staff.booth_rent_amount,
        boothRentFrequency: staff.booth_rent_frequency,
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the request if email fails - barber was still created
    }

    return NextResponse.json({
      success: true,
      staff: {
        ...staff,
        booking_url: bookingUrl,
      },
    })
  } catch (error) {
    console.error('Staff creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * Send welcome email to newly onboarded barber
 * Contains their booking link and instructions
 */
async function sendBarberWelcomeEmail(data) {
  const {
    email,
    firstName,
    lastName,
    bookingUrl,
    barbershopName,
    financialModel,
    commissionPercentage,
    boothRentAmount,
    boothRentFrequency,
  } = data

  // Financial details string
  let financialDetails = ''
  if (financialModel === 'commission') {
    financialDetails = `You'll receive ${commissionPercentage}% commission on each service you provide.`
  } else if (financialModel === 'booth_rent') {
    financialDetails = `Your booth rent is $${boothRentAmount} ${boothRentFrequency}.`
  }

  // Email HTML content
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6B7C3F 0%, #8B9F5A 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .booking-link { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .booking-url { font-size: 18px; font-weight: bold; color: #6B7C3F; word-break: break-all; }
        .button { display: inline-block; padding: 12px 24px; background: #6B7C3F; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .tips { background: #EEF2E6; padding: 15px; border-left: 4px solid #6B7C3F; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to the Team, ${firstName}!</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>

          <p>Great news! You've been successfully added to ${barbershopName} as a team member. We're excited to have you on board! 🎉</p>

          <h2>Your Personal Booking Link</h2>
          <p>Clients can now book appointments directly with you using your personalized booking page:</p>

          <div class="booking-link">
            <div class="booking-url">${bookingUrl}</div>
            <a href="${bookingUrl}" class="button">View Your Booking Page</a>
          </div>

          <div class="tips">
            <h3>💡 How to Share Your Link</h3>
            <ul>
              <li><strong>Social Media:</strong> Add it to your Instagram bio, Facebook profile, or TikTok</li>
              <li><strong>Business Cards:</strong> Print it on your cards or create a QR code</li>
              <li><strong>Text Messages:</strong> Send it directly to your regular clients</li>
              <li><strong>Email Signature:</strong> Include it in every email you send</li>
            </ul>
          </div>

          <h3>Your Financial Arrangement</h3>
          <p>${financialDetails}</p>

          <h3>What Clients Will See</h3>
          <p>When clients visit your booking link, they'll see:</p>
          <ul>
            <li>Your profile photo and bio</li>
            <li>Services you provide with pricing</li>
            <li>Real-time availability calendar</li>
            <li>Easy online booking (they'll receive automatic confirmations)</li>
          </ul>

          <h3>Need Help?</h3>
          <p>If you have any questions or need assistance, don't hesitate to reach out to the shop manager.</p>

          <p>Welcome aboard!<br>
          <strong>${barbershopName} Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${barbershopName}</p>
        </div>
      </div>
    </body>
    </html>
  `

  // Plain text version (fallback)
  const emailText = `
Welcome to ${barbershopName}, ${firstName}!

You've been successfully added to our team. Here's your personal booking link that clients can use to book appointments directly with you:

${bookingUrl}

FINANCIAL ARRANGEMENT:
${financialDetails}

HOW TO SHARE YOUR LINK:
- Add it to your social media profiles (Instagram, Facebook, TikTok)
- Print it on business cards or create a QR code
- Send it directly to your clients via text
- Include it in your email signature

When clients visit your link, they'll see your profile, services, and can book appointments online with automatic confirmations.

Welcome aboard!
${barbershopName} Team
  `

  // TODO: Integrate with email service (SendGrid, AWS SES, Resend, etc.)
  // For now, we'll log the email content
  console.log('📧 Welcome email prepared for:', email)
  console.log('Subject: Welcome to the Team! Here\'s Your Booking Link')
  console.log('---')
  console.log(emailText)
  console.log('---')

  // Example integration with SendGrid (commented out):
  /*
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  await sgMail.send({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `Welcome to ${barbershopName}! Here's Your Booking Link`,
    text: emailText,
    html: emailHtml,
  })
  */

  // Example integration with Resend (modern alternative):
  /*
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: `${barbershopName} <onboarding@yourbarbershop.com>`,
    to: email,
    subject: `Welcome to ${barbershopName}! Here's Your Booking Link`,
    html: emailHtml,
  })
  */

  return { success: true, email }
}
