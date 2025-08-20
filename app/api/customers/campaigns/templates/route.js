/**
 * Campaign Templates API Route
 * GET /api/customers/campaigns/templates?category=...&type=...
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
    
    const category = searchParams.get('category');
    const type = searchParams.get('type');

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (category) queryParams.append('category', category);
    if (type) queryParams.append('type_filter', type);

    // Forward request to FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001';
    const queryString = queryParams.toString();
    const url = `${backendUrl}/campaigns/templates${queryString ? `?${queryString}` : ''}`;
    
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
          error: 'Failed to retrieve campaign templates', 
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
    console.error('Campaign templates error:', error);
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