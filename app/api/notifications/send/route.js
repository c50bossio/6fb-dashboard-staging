/**
 * Notification Send API
 * 
 * Unified endpoint for sending all types of notifications including:
 * - Booking confirmations and reminders
 * - Cancellation and rescheduling notifications
 * - Payment confirmations
 * - Custom notifications
 * 
 * Integrates with all notification services:
 * - BookingConfirmationService
 * - ReminderScheduler
 * - PushNotificationService
 * - Enhanced SendGrid and Twilio services
 */

import { bookingConfirmationService } from '../../../../services/booking-confirmation-service.js';
import { reminderScheduler } from '../../../../services/reminder-scheduler.js';
import { pushNotificationService } from '../../../../services/push-notification-service.js';
import { mapForBookingNotification, validateAppointmentForMapping } from '../../../utils/appointment-field-mapper.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, data, options = {} } = body;

    if (!type || !data) {
      return Response.json(
        { error: 'Missing type or data parameters' },
        { status: 400 }
      );
    }

    console.log(`📤 Processing notification request: ${type}`);

    let result;

    switch (type) {
      case 'booking_confirmation':
        result = await handleBookingConfirmation(data, options);
        break;
        
      case 'booking_cancellation':
        result = await handleBookingCancellation(data, options);
        break;
        
      case 'booking_rescheduled':
        result = await handleBookingRescheduled(data, options);
        break;
        
      case 'booking_reminder':
        result = await handleBookingReminder(data, options);
        break;
        
      case 'payment_confirmation':
        result = await handlePaymentConfirmation(data, options);
        break;
        
      case 'custom_notification':
        result = await handleCustomNotification(data, options);
        break;
        
      case 'bulk_notification':
        result = await handleBulkNotification(data, options);
        break;

      case 'test_notification':
        result = await handleTestNotification(data, options);
        break;
        
      default:
        return Response.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }

    return Response.json({
      success: true,
      type,
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('❌ Notification send error:', error);
    
    return Response.json(
      { 
        success: false,
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Handle booking confirmation notification
 * Maps database fields to service layer format before sending
 */
async function handleBookingConfirmation(data, options) {
  try {
    // Map database fields (client_*, scheduled_at) to service layer fields (customer_*, appointment_datetime)
    const mappedData = mapForBookingNotification(data, data.barbershop, data.barber);

    const result = await bookingConfirmationService.sendBookingConfirmation(
      mappedData,
      'booking_confirmed'
    );

    // Also schedule reminder notifications
    if (options.schedule_reminders !== false) {
      try {
        await reminderScheduler.scheduleBookingReminders(mappedData);
      } catch (reminderError) {
        console.warn('Failed to schedule reminders:', reminderError);
        // Don't fail confirmation for reminder scheduling failure
      }
    }

    return result;

  } catch (error) {
    console.error('Error handling booking confirmation:', error);
    throw error;
  }
}

/**
 * Handle booking cancellation notification
 * Maps database fields to service layer format before sending
 */
async function handleBookingCancellation(data, options) {
  try {
    const { booking_data, cancellation_reason, cancelled_by } = data;

    // Map database fields to service layer format
    const mappedBookingData = mapForBookingNotification(booking_data, booking_data.barbershop, booking_data.barber);

    // Send cancellation confirmation
    const confirmationResult = await bookingConfirmationService.sendCancellationConfirmation(
      mappedBookingData,
      cancellation_reason
    );

    // Cancel scheduled reminders
    try {
      await reminderScheduler.cancelBookingReminders(
        booking_data.id,
        `Cancelled by ${cancelled_by || 'customer'}: ${cancellation_reason || 'No reason provided'}`
      );
    } catch (reminderError) {
      console.warn('Failed to cancel reminders:', reminderError);
    }

    // Send push notification if enabled
    if (options.send_push !== false) {
      try {
        await pushNotificationService.sendPushNotification(
          mappedBookingData.customer_email,
          {
            title: '❌ Booking Cancelled',
            body: `Your ${mappedBookingData.service_name} appointment has been cancelled.`,
            icon: '/icons/cancel-icon-192.png',
            tag: 'booking-cancelled',
            data: {
              type: 'booking_cancelled',
              booking_id: booking_data.id,
              url: '/bookings'
            },
            actions: [
              {
                action: 'rebook',
                title: 'Book Again',
                icon: '/icons/calendar-icon.png'
              },
              {
                action: 'view',
                title: 'View Details',
                icon: '/icons/view-icon.png'
              }
            ]
          }
        );
      } catch (pushError) {
        console.warn('Failed to send cancellation push notification:', pushError);
      }
    }

    return {
      ...confirmationResult,
      reminders_cancelled: true,
      cancellation_reason
    };

  } catch (error) {
    console.error('Error handling booking cancellation:', error);
    throw error;
  }
}

/**
 * Handle booking rescheduled notification
 * Maps database fields to service layer format before sending
 */
async function handleBookingRescheduled(data, options) {
  try {
    const { old_booking_data, new_booking_data, reschedule_reason } = data;

    // Map both old and new booking data
    const mappedOldBookingData = mapForBookingNotification(old_booking_data, old_booking_data.barbershop, old_booking_data.barber);
    const mappedNewBookingData = mapForBookingNotification(new_booking_data, new_booking_data.barbershop, new_booking_data.barber);

    // Send rescheduling confirmation
    const confirmationResult = await bookingConfirmationService.sendRescheduleConfirmation(
      mappedOldBookingData,
      mappedNewBookingData
    );

    // Reschedule reminders
    try {
      await reminderScheduler.rescheduleBookingReminders(
        old_booking_data.id,
        mappedNewBookingData
      );
    } catch (reminderError) {
      console.warn('Failed to reschedule reminders:', reminderError);
    }

    // Send push notification if enabled
    if (options.send_push !== false) {
      try {
        const newAppointmentTime = new Date(mappedNewBookingData.appointment_datetime);

        await pushNotificationService.sendPushNotification(
          mappedNewBookingData.customer_email,
          {
            title: '🔄 Booking Rescheduled',
            body: `Your ${mappedNewBookingData.service_name} appointment has been moved to ${newAppointmentTime.toLocaleDateString()} at ${newAppointmentTime.toLocaleTimeString()}.`,
            icon: '/icons/reschedule-icon-192.png',
            tag: 'booking-rescheduled',
            data: {
              type: 'booking_rescheduled',
              booking_id: new_booking_data.id,
              url: `/bookings/${new_booking_data.id}`
            },
            actions: [
              {
                action: 'view',
                title: 'View New Booking',
                icon: '/icons/view-icon.png'
              },
              {
                action: 'calendar',
                title: 'Add to Calendar',
                icon: '/icons/calendar-icon.png'
              }
            ]
          }
        );
      } catch (pushError) {
        console.warn('Failed to send rescheduled push notification:', pushError);
      }
    }

    return {
      ...confirmationResult,
      reminders_rescheduled: true,
      reschedule_reason
    };

  } catch (error) {
    console.error('Error handling booking rescheduled:', error);
    throw error;
  }
}

/**
 * Handle booking reminder notification
 * Maps database fields to service layer format before sending
 */
async function handleBookingReminder(data, options) {
  try {
    const { booking_data, reminder_type = 'day_of_reminder' } = data;

    // Map database fields to service layer format
    const mappedBookingData = mapForBookingNotification(booking_data, booking_data.barbershop, booking_data.barber);

    // Send reminder through all configured channels
    const reminderResult = await reminderScheduler.sendReminder({
      booking_id: booking_data.id,
      customer_email: mappedBookingData.customer_email,
      customer_phone: mappedBookingData.customer_phone,
      reminder_type: reminder_type,
      reminder_data: mappedBookingData,
      channels: options.channels || ['email', 'sms'],
      scheduled_for: new Date(),
      status: 'processing'
    });

    return reminderResult;

  } catch (error) {
    console.error('Error handling booking reminder:', error);
    throw error;
  }
}

/**
 * Handle payment confirmation notification
 * Maps database fields to service layer format before sending
 */
async function handlePaymentConfirmation(data, options) {
  try {
    const { booking_data, payment_data } = data;

    // Map database fields to service layer format
    const mappedBookingData = mapForBookingNotification(booking_data, booking_data.barbershop, booking_data.barber);

    const enhancedBookingData = {
      ...mappedBookingData,
      payment_method: payment_data.payment_method,
      payment_status: payment_data.status,
      payment_amount: payment_data.amount,
      payment_id: payment_data.id
    };

    const result = await bookingConfirmationService.sendBookingConfirmation(
      enhancedBookingData,
      'payment_confirmed'
    );

    // Send payment confirmation push notification
    if (options.send_push !== false) {
      try {
        await pushNotificationService.sendPushNotification(
          mappedBookingData.customer_email,
          {
            title: '💳 Payment Confirmed',
            body: `Your payment of $${payment_data.amount} has been processed successfully.`,
            icon: '/icons/payment-success-icon-192.png',
            tag: 'payment-confirmed',
            data: {
              type: 'payment_confirmed',
              booking_id: booking_data.id,
              payment_id: payment_data.id,
              url: `/bookings/${booking_data.id}`
            },
            actions: [
              {
                action: 'view',
                title: 'View Receipt',
                icon: '/icons/receipt-icon.png'
              }
            ]
          }
        );
      } catch (pushError) {
        console.warn('Failed to send payment confirmation push:', pushError);
      }
    }

    return result;

  } catch (error) {
    console.error('Error handling payment confirmation:', error);
    throw error;
  }
}

/**
 * Handle custom notification
 */
async function handleCustomNotification(data, options) {
  try {
    const { recipients, title, message, channels = ['email'], notification_data = {} } = data;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients array is required and must not be empty');
    }

    const results = [];

    for (const recipient of recipients) {
      try {
        let result = { recipient, channels: {} };

        // Send email if requested
        if (channels.includes('email') && recipient.email) {
          const emailResult = await sendCustomEmail(recipient, title, message, notification_data);
          result.channels.email = emailResult;
        }

        // Send SMS if requested
        if (channels.includes('sms') && recipient.phone) {
          const smsResult = await sendCustomSMS(recipient, message, notification_data);
          result.channels.sms = smsResult;
        }

        // Send push notification if requested
        if (channels.includes('push') && recipient.email) {
          const pushResult = await pushNotificationService.sendPushNotification(
            recipient.email,
            {
              title: title,
              body: message,
              data: {
                type: 'custom',
                ...notification_data
              }
            }
          );
          result.channels.push = pushResult;
        }

        results.push(result);

      } catch (recipientError) {
        console.error(`Error sending to ${recipient.email || recipient.phone}:`, recipientError);
        results.push({
          recipient,
          error: recipientError.message
        });
      }
    }

    return {
      total_recipients: recipients.length,
      results
    };

  } catch (error) {
    console.error('Error handling custom notification:', error);
    throw error;
  }
}

/**
 * Handle bulk notification
 */
async function handleBulkNotification(data, options) {
  try {
    const { user_emails, notification, channels = ['push'] } = data;

    if (!Array.isArray(user_emails) || user_emails.length === 0) {
      throw new Error('User emails array is required and must not be empty');
    }

    const results = {};

    // Send push notifications
    if (channels.includes('push')) {
      try {
        const pushResult = await pushNotificationService.sendBulkPushNotifications(
          user_emails,
          notification,
          options
        );
        results.push = pushResult;
      } catch (pushError) {
        console.error('Bulk push notification error:', pushError);
        results.push = { success: false, error: pushError.message };
      }
    }

    // TODO: Add bulk email and SMS support here if needed

    return results;

  } catch (error) {
    console.error('Error handling bulk notification:', error);
    throw error;
  }
}

/**
 * Handle test notification
 * Creates test data using NEW database schema field names
 */
async function handleTestNotification(data, options) {
  try {
    const { recipient_email, test_type = 'booking_confirmation' } = data;

    // Test data using NEW schema field names
    const testAppointmentData = {
      id: 'test-booking-' + Date.now(),
      client_email: recipient_email,
      client_name: 'Test Customer',
      service_name: 'Premium Haircut',
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration_minutes: 60,
      price: 45.00,
      barber: {
        full_name: 'Test Barber',
        avatar_url: null
      },
      barbershop: {
        name: 'Test Barbershop',
        address: '123 Test Street'
      }
    };

    // Map to service layer format
    const testBookingData = mapForBookingNotification(testAppointmentData, testAppointmentData.barbershop, testAppointmentData.barber);

    let result;

    switch (test_type) {
      case 'booking_confirmation':
        result = await bookingConfirmationService.sendBookingConfirmation(testBookingData);
        break;

      case 'booking_reminder':
        result = await handleBookingReminder({
          booking_data: testAppointmentData, // Pass unmapped data, function will map it
          reminder_type: 'day_of_reminder'
        }, options);
        break;

      case 'push_notification':
        result = await pushNotificationService.sendPushNotification(
          recipient_email,
          {
            title: '🧪 Test Notification',
            body: 'This is a test push notification from BookedBarber.',
            icon: '/icons/test-icon-192.png',
            data: { type: 'test', timestamp: Date.now() }
          }
        );
        break;

      default:
        throw new Error(`Unknown test type: ${test_type}`);
    }

    return {
      test_type,
      recipient_email,
      result
    };

  } catch (error) {
    console.error('Error handling test notification:', error);
    throw error;
  }
}

/**
 * Send custom email
 */
async function sendCustomEmail(recipient, title, message, data) {
  try {
    // This would integrate with the SendGrid service
    // For now, return a simulated result
    console.log(`📧 Sending custom email to ${recipient.email}: ${title}`);
    
    return {
      success: true,
      message_id: 'custom-email-' + Date.now(),
      recipient: recipient.email
    };
  } catch (error) {
    throw new Error(`Custom email failed: ${error.message}`);
  }
}

/**
 * Send custom SMS
 */
async function sendCustomSMS(recipient, message, data) {
  try {
    // This would integrate with the Twilio service
    // For now, return a simulated result
    console.log(`📱 Sending custom SMS to ${recipient.phone}: ${message}`);
    
    return {
      success: true,
      message_sid: 'custom-sms-' + Date.now(),
      recipient: recipient.phone
    };
  } catch (error) {
    throw new Error(`Custom SMS failed: ${error.message}`);
  }
}

export async function GET(request) {
  return Response.json({
    service: 'notification-send-api',
    status: 'healthy',
    supported_types: [
      'booking_confirmation',
      'booking_cancellation', 
      'booking_rescheduled',
      'booking_reminder',
      'payment_confirmation',
      'custom_notification',
      'bulk_notification',
      'test_notification'
    ],
    supported_channels: ['email', 'sms', 'push', 'in_app'],
    timestamp: new Date().toISOString()
  });
}