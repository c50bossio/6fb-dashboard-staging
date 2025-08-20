/**
 * Campaign Management API Route
 * GET /api/customers/campaigns - List campaigns
 * POST /api/customers/campaigns - Create campaign (redirects to /create)
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
    
    // Extract query parameters
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const status_filter = searchParams.get('status');
    const type_filter = searchParams.get('type');
    const category_filter = searchParams.get('category');

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    if (status_filter) queryParams.append('status_filter', status_filter);
    if (type_filter) queryParams.append('type_filter', type_filter);
    if (category_filter) queryParams.append('category_filter', category_filter);

    // Forward request to FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/campaigns/list?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Failed to retrieve campaigns', 
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
    console.error('Campaign list error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Redirect POST requests to the /create endpoint
  try {
    const createUrl = new URL('/api/customers/campaigns/create', request.url);
    return Response.redirect(createUrl, 307); // Temporary redirect that preserves method
  } catch (error) {
    console.error('Campaign creation redirect error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}