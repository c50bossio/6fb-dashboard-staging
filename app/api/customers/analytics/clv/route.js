import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

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
    if (searchParams.get('min_clv')) {
      params.append('min_clv', searchParams.get('min_clv'));
    }
    if (searchParams.get('sort_by')) {
      params.append('sort_by', searchParams.get('sort_by'));
    }
    if (searchParams.get('sort_desc')) {
      params.append('sort_desc', searchParams.get('sort_desc'));
    }
    if (searchParams.get('limit')) {
      params.append('limit', searchParams.get('limit'));
    }
    if (searchParams.get('offset')) {
      params.append('offset', searchParams.get('offset'));
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-clv?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch CLV data' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching customer CLV:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const body = await request.json().catch(() => ({}));

    // Build query parameters for calculation method
    const params = new URLSearchParams();
    if (searchParams.get('calculation_method')) {
      params.append('calculation_method', searchParams.get('calculation_method'));
    }

    const response = await fetch(
      `${FASTAPI_URL}/customer-clv/calculate?${params.toString()}`,
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
      const errorData = await response.json().catch(() => ({ error: 'Failed to calculate CLV' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error calculating customer CLV:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}