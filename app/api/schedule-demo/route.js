import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'businessName', 'preferredDate', 'preferredTime']
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

    // In a real application, you would:
    // 1. Save to database
    // 2. Send confirmation email
    // 3. Create calendar event
    // 4. Notify sales team

    // For now, we'll simulate the process
    console.log('Demo scheduling request:', {
      name: data.name,
      email: data.email,
      businessName: data.businessName,
      businessType: data.businessType,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      timezone: data.timezone,
      primaryChallenge: data.primaryChallenge,
      phone: data.phone,
      message: data.message,
      timestamp: new Date().toISOString()
    })

    // Simulate async operations (email sending, calendar creation)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create demo record (this would be saved to database)
    const demoRecord = {
      id: `demo_${Date.now()}`,
      name: data.name,
      email: data.email,
      businessName: data.businessName,
      businessType: data.businessType,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      timezone: data.timezone,
      primaryChallenge: data.primaryChallenge,
      phone: data.phone,
      message: data.message,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }

    // In production, send confirmation email
    const confirmationEmail = {
      to: data.email,
      subject: '6FB AI Demo Confirmed',
      template: 'demo-confirmation',
      data: {
        name: data.name,
        businessName: data.businessName,
        date: data.preferredDate,
        time: data.preferredTime,
        timezone: data.timezone
      }
    }

    console.log('Would send confirmation email:', confirmationEmail)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Demo scheduled successfully',
      demo: {
        id: demoRecord.id,
        scheduledDate: data.preferredDate,
        scheduledTime: data.preferredTime,
        confirmationSent: true
      }
    })

  } catch (error) {
    console.error('Demo scheduling error:', error)
    
    return NextResponse.json(
      { message: 'Internal server error while scheduling demo' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve scheduled demos (for admin/sales team)
export async function GET() {
  try {
    // In a real application, this would fetch from database
    // For now, return empty array
    return NextResponse.json({
      demos: [],
      total: 0,
      message: 'Demo scheduling system operational'
    })
  } catch (error) {
    console.error('Error fetching demos:', error)
    return NextResponse.json(
      { message: 'Error fetching scheduled demos' },
      { status: 500 }
    )
  }
}