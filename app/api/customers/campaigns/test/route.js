/**
 * Campaign Test API Route
 * POST /api/customers/campaigns/test
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const testData = await request.json();

    // Validate required fields
    const requiredFields = ['campaign_definition_id', 'channel'];
    for (const field of requiredFields) {
      if (!testData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate channel-specific requirements
    if (testData.channel === 'email' && !testData.test_email) {
      return NextResponse.json(
        { error: 'test_email is required for email channel' },
        { status: 400 }
      );
    }

    if (testData.channel === 'sms' && !testData.test_phone) {
      return NextResponse.json(
        { error: 'test_phone is required for SMS channel' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (testData.test_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testData.test_email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate phone format if provided
    if (testData.test_phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(testData.test_phone)) {
        return NextResponse.json(
          { error: 'Invalid phone format' },
          { status: 400 }
        );
      }
    }

    // Forward request to FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/campaigns/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Test campaign failed', 
          details: errorData.detail || 'Unknown error',
          status: response.status 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test campaign sent successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Test campaign error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}