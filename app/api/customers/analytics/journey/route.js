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

    const customer_id = searchParams.get('customer_id');
    
    if (!customer_id) {
      return NextResponse.json(
        { error: 'customer_id parameter is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();
    
    // Optional parameters
    if (searchParams.get('include_events')) {
      params.append('include_events', searchParams.get('include_events'));
    }
    if (searchParams.get('include_touchpoints')) {
      params.append('include_touchpoints', searchParams.get('include_touchpoints'));
    }
    if (searchParams.get('include_milestones')) {
      params.append('include_milestones', searchParams.get('include_milestones'));
    }
    if (searchParams.get('days_back')) {
      params.append('days_back', searchParams.get('days_back'));
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-journey/${customer_id}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch customer journey' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching customer journey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}