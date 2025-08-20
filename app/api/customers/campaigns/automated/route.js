/**
 * Automated Campaign Setup API Route
 * POST /api/customers/campaigns/automated
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
    const setupData = await request.json();

    // Validate required fields
    if (!setupData.campaign_types || !Array.isArray(setupData.campaign_types) || setupData.campaign_types.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid campaign_types array' },
        { status: 400 }
      );
    }

    // Validate campaign types
    const validTypes = ['welcome', 'birthday', 'win_back'];
    const invalidTypes = setupData.campaign_types.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Invalid campaign types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Forward request to FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/campaigns/automated/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(setupData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Automated campaign setup failed', 
          details: errorData.detail || 'Unknown error',
          status: response.status 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Automated campaigns set up successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Automated campaign setup error:', error);
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