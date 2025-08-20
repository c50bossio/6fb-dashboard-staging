/**
 * Campaign Performance API Route
 * GET /api/customers/campaigns/performance?campaign_id=...&execution_id=...&date_from=...&date_to=...
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { searchParams } = new URL(request.url);
    
    const campaign_id = searchParams.get('campaign_id');
    const execution_id = searchParams.get('execution_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    // Validate required parameters
    if (!campaign_id) {
      return NextResponse.json(
        { error: 'Missing campaign_id parameter' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (execution_id) queryParams.append('execution_id', execution_id);
    if (date_from) queryParams.append('date_from', date_from);
    if (date_to) queryParams.append('date_to', date_to);

    // Forward request to FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001';
    const queryString = queryParams.toString();
    const url = `${backendUrl}/campaigns/${campaign_id}/performance${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Failed to retrieve campaign performance', 
          details: errorData.detail || 'Unknown error',
          status: response.status 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Campaign performance error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}