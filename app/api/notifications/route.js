/**
 * Simple Internal Notifications API
 * POST /api/notifications - Send notifications
 */

import NotificationService from '../../../lib/notifications/notification-service.js';

export async function GET(request) {
  return Response.json({ 
    status: 'OK', 
    service: '6FB Internal Notification System',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  try {
    const { type, data } = await request.json();

    if (!type || !data) {
      return Response.json(
        { error: 'Missing type or data' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'appointment-confirmation':
        result = await NotificationService.sendAppointmentConfirmation(data);
        break;
      
      case 'booking-reminder':
        result = await NotificationService.sendBookingReminder(data);
        break;
      
      case 'payment-confirmation':
        result = await NotificationService.sendPaymentConfirmation(data);
        break;
      
      case 'test':
        result = await NotificationService.testNotification();
        break;
      
      default:
        return Response.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }

    return Response.json({
      success: result.success,
      type,
      timestamp: new Date().toISOString(),
      details: result.results || result.details
    });

  } catch (error) {
    console.error('❌ Notification API error:', error);
    
    return Response.json(
      { 
        error: 'Internal server error', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}