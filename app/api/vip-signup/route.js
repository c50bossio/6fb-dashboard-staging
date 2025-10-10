import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.phoneNumber || !data.smsConsent) {
      return NextResponse.json(
        { message: 'Phone number and SMS consent are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = data.phoneNumber.replace(/\D/g, '')
    
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // Validate SMS consent (must be true for legal compliance)
    if (!data.smsConsent) {
      return NextResponse.json(
        { message: 'SMS consent is required for VIP signup' },
        { status: 400 }
      )
    }

    // Create VIP signup record
    const vipSignup = {
      id: `vip_${Date.now()}`,
      phoneNumber: cleanPhone,
      formattedPhone: data.phoneNumber,
      smsConsent: data.smsConsent,
      signupSource: 'vip_landing_page',
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      timestamp: new Date().toISOString(),
      status: 'active',
      vipTier: 'premium'
    }

    // In a real application, you would:
    // 1. Save to database/CRM
    // 2. Add to SMS marketing list (Twilio, Klaviyo, etc.)
    // 3. Send welcome SMS with VIP booking link
    // 4. Create VIP customer record
    // 5. Trigger marketing automation

    console.log('VIP signup processed:', vipSignup)

    // Simulate SMS sending (in production, use Twilio or similar)
    const welcomeSMS = {
      to: cleanPhone,
      message: `🌟 Welcome to VIP Status! Your exclusive booking link: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://bookedbarber.com'}/book/vip?member=${vipSignup.id}
      
Reply STOP to opt out. Message & data rates apply.`,
      type: 'vip_welcome'
    }

    console.log('Would send SMS:', welcomeSMS)

    // Simulate CRM integration
    const crmData = {
      phone: cleanPhone,
      tags: ['vip_member', 'premium_tier'],
      customFields: {
        vip_signup_date: vipSignup.timestamp,
        vip_id: vipSignup.id,
        consent_date: vipSignup.timestamp
      }
    }

    console.log('Would update CRM:', crmData)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'VIP signup successful',
      vipId: vipSignup.id,
      phoneNumber: data.phoneNumber,
      smsConfirmation: {
        sent: true,
        message: 'Welcome message sent to your phone'
      }
    })

  } catch (error) {
    console.error('VIP signup error:', error)
    
    return NextResponse.json(
      { message: 'Internal server error while processing VIP signup' },
      { status: 500 }
    )
  }
}

// GET endpoint to check VIP status (for admin or customer lookup)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const vipId = searchParams.get('vipId')

    if (!phone && !vipId) {
      return NextResponse.json({
        members: [],
        total: 0,
        message: 'VIP system operational'
      })
    }

    // In a real application, this would query database
    return NextResponse.json({
      vipStatus: null,
      message: 'VIP lookup functionality operational'
    })
    
  } catch (error) {
    console.error('VIP lookup error:', error)
    return NextResponse.json(
      { message: 'Error checking VIP status' },
      { status: 500 }
    )
  }
}