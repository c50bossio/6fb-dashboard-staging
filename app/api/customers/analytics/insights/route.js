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
    
    // Optional parameters
    if (searchParams.get('insight_type')) {
      params.append('insight_type', searchParams.get('insight_type'));
    }
    if (searchParams.get('time_period')) {
      params.append('time_period', searchParams.get('time_period'));
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-analytics/insights?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch analytics insights' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching analytics insights:', error);
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

    // Validate required fields for analytics refresh
    if (!body.refresh_type) {
      return NextResponse.json(
        { 
          error: 'Missing required field: refresh_type is required' 
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-analytics/refresh`,
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
      const errorData = await response.json().catch(() => ({ error: 'Failed to refresh analytics' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error refreshing analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}