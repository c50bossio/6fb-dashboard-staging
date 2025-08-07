/**
 * Notifications API Route
 * Handles sending notifications through Novu service
 */

import { NextResponse } from 'next/server';
import novuService from '../../../../lib/novu/novu-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Notification type is required' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Notification data is required' },
        { status: 400 }
      );
    }

    let response;

    switch (type) {
      case 'appointment-confirmation':
        response = await novuService.sendAppointmentConfirmation(data);
        break;
      
      case 'booking-reminder':
        response = await novuService.sendBookingReminder(data);
        break;
      
      case 'payment-confirmation':
        response = await novuService.sendPaymentConfirmation(data);
        break;
      
      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      transactionId: response?.transactionId,
      message: `${type} notification sent successfully`
    });

  } catch (error) {
    console.error('❌ Error in notifications API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Test endpoint to check Novu service health
    const status = await novuService.testConnection();
    
    return NextResponse.json({
      service: 'Novu Notifications API',
      status: status.connected ? 'healthy' : 'unhealthy',
      details: status
    });
  } catch (error) {
    return NextResponse.json(
      { 
        service: 'Novu Notifications API',
        status: 'unhealthy',
        error: error.message 
      },
      { status: 500 }
    );
  }
}