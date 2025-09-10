import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'subject', 'message']
    const missingFields = requiredFields.filter(field => !data[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Process the contact form submission
    const contactSubmission = {
      id: `contact_${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      subject: data.subject,
      message: data.message,
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      timestamp: new Date().toISOString(),
      status: 'new'
    }

    // In a real application, you would:
    // 1. Save to database
    // 2. Send notification email to support team
    // 3. Send confirmation email to user
    // 4. Log to analytics/tracking system

    console.log('Contact form submission:', contactSubmission)

    // Simulate sending emails (in production, use actual email service)
    const supportEmail = {
      to: 'support@bookedbarber.com',
      subject: `New Contact Form: ${data.subject}`,
      template: 'contact-support-notification',
      data: {
        submissionId: contactSubmission.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        timestamp: contactSubmission.timestamp
      }
    }

    const confirmationEmail = {
      to: data.email,
      subject: 'We received your message - BookedBarber Support',
      template: 'contact-confirmation',
      data: {
        name: data.name,
        subject: data.subject,
        submissionId: contactSubmission.id
      }
    }

    console.log('Would send support notification:', supportEmail)
    console.log('Would send user confirmation:', confirmationEmail)

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 500))

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully',
      submissionId: contactSubmission.id,
      estimatedResponseTime: '24-48 hours'
    })

  } catch (error) {
    console.error('Contact form submission error:', error)
    
    return NextResponse.json(
      { message: 'Internal server error while processing your message' },
      { status: 500 }
    )
  }
}

// GET endpoint for admin to retrieve contact submissions
export async function GET() {
  try {
    // In a real application, this would fetch from database with authentication
    return NextResponse.json({
      submissions: [],
      total: 0,
      message: 'Contact form system operational'
    })
  } catch (error) {
    console.error('Error fetching contact submissions:', error)
    return NextResponse.json(
      { message: 'Error fetching contact submissions' },
      { status: 500 }
    )
  }
}