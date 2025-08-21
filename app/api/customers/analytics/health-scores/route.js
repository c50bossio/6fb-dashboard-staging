import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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
    if (searchParams.get('customer_id')) {
      params.append('customer_id', searchParams.get('customer_id'));
    }
    if (searchParams.get('risk_level')) {
      params.append('risk_level', searchParams.get('risk_level'));
    }
    if (searchParams.get('limit')) {
      params.append('limit', searchParams.get('limit'));
    }
    if (searchParams.get('offset')) {
      params.append('offset', searchParams.get('offset'));
    }
    if (searchParams.get('include_trends')) {
      params.append('include_trends', searchParams.get('include_trends'));
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-health-scores?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch health scores' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching customer health scores:', error);
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

    const response = await fetch(
      `${FASTAPI_URL}/customer-health-scores/calculate`,
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
      const errorData = await response.json().catch(() => ({ error: 'Failed to calculate health scores' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error calculating customer health scores:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}