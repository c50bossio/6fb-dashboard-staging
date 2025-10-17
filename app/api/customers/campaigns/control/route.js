/**
 * Campaign Control API Route
 * POST /api/customers/campaigns/control
 * Handles pause, resume, and delete operations
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
    const body = await request.json();
    
    const { campaign_id, action } = body;

    // Validate required fields
    if (!campaign_id) {
      return NextResponse.json(
        { error: 'Missing campaign_id' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['pause', 'resume', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Map action to backend endpoint
    let endpoint;
    let method = 'POST';
    
    switch (action) {
      case 'pause':
        endpoint = `campaigns/${campaign_id}/pause`;
        break;
      case 'resume':
        endpoint = `campaigns/${campaign_id}/resume`;
        break;
      case 'delete':
        endpoint = `campaigns/${campaign_id}`;
        method = 'DELETE';
        break;
    }

    // Forward request to FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: `Campaign ${action} failed`, 
          details: errorData.detail || 'Unknown error',
          status: response.status 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: `Campaign ${action} completed successfully`,
      data: result.data || {}
    });

  } catch (error) {
    console.error('Campaign control error:', error);
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