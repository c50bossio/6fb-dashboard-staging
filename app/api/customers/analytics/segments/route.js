import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const headersList = headers();
    const authorization = headersList.get('authorization');

    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();
    
    // Optional filters
    if (searchParams.get('segment_type')) {
      params.append('segment_type', searchParams.get('segment_type'));
    }
    if (searchParams.get('is_active')) {
      params.append('is_active', searchParams.get('is_active'));
    }
    if (searchParams.get('include_metrics')) {
      params.append('include_metrics', searchParams.get('include_metrics'));
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-segments?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch customer segments' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching customer segments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');

    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Validate required fields for segment creation
    if (!body.segment_name || !body.segment_type || !body.segmentation_rules) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: segment_name, segment_type, and segmentation_rules are required' 
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-segments/calculate`,
      {
        method: 'POST',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to calculate customer segments' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error calculating customer segments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}