/**
 * Batch Notifications API Route
 * Handles sending multiple notifications in a single request
 */

import { NextResponse } from 'next/server';
import novuService from '../../../../lib/novu/novu-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { notifications } = body;

    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json(
        { error: 'notifications array is required' },
        { status: 400 }
      );
    }

    if (notifications.length === 0) {
      return NextResponse.json(
        { error: 'At least one notification is required' },
        { status: 400 }
      );
    }

    // Validate each notification
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      if (!notification.type) {
        return NextResponse.json(
          { error: `Notification at index ${i} is missing type` },
          { status: 400 }
        );
      }
      if (!notification.data) {
        return NextResponse.json(
          { error: `Notification at index ${i} is missing data` },
          { status: 400 }
        );
      }
    }

    const responses = await novuService.sendBatch(notifications);
    
    const results = responses.map((response, index) => ({
      index,
      type: notifications[index].type,
      success: !!response?.transactionId,
      transactionId: response?.transactionId,
      error: response?.error || null
    }));

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      total: notifications.length,
      successful: successCount,
      failed: failureCount,
      results
    });

  } catch (error) {
    console.error('❌ Error in batch notifications API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send batch notifications',
        details: error.message 
      },
      { status: 500 }
    );
  }
}