/**
 * Notification Usage Examples for 6FB Barbershop System
 * Practical examples of how to use the notification system in your React components
 */

import React, { useState } from 'react';
import { useSendNotifications, createNotificationData } from '../hooks/useSendNotifications';

// Example 1: Booking Confirmation Component
export function BookingConfirmationExample() {
  const { sendAppointmentConfirmation, loading, error } = useSendNotifications();
  const [sent, setSent] = useState(false);

  const handleBookingConfirmed = async () => {
    // Sample booking data (would come from your booking system)
    const appointment = {
      id: 'apt_12345',
      date: '2025-08-07',
      time: '2:00 PM',
      serviceName: 'Haircut & Style',
      barberName: 'Mike Johnson',
      totalPrice: '$35.00',
      confirmationNumber: 'APT-2025-001'
    };

    const customer = {
      id: 'cust_12345',
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1234567890'
    };

    const shop = {
      name: '6FB Premium Barbershop',
      address: '123 Main Street, City, ST 12345',
      phone: '(555) 123-4567',
      primaryColor: '#3B82F6'
    };

    try {
      // Create notification data
      const notificationData = createNotificationData.appointmentConfirmation(
        appointment,
        customer,
        shop
      );

      // Send confirmation
      const result = await sendAppointmentConfirmation(notificationData);
      console.log('Confirmation sent:', result);
      setSent(true);
    } catch (err) {
      console.error('Failed to send confirmation:', err);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Booking Confirmation</h3>
      
      {sent ? (
        <div className="text-green-600">
          ✅ Appointment confirmation sent successfully!
        </div>
      ) : (
        <button
          onClick={handleBookingConfirmed}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Confirmation'}
        </button>
      )}
      
      {error && (
        <div className="text-red-600 mt-2">
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}

// Example 2: Payment Processing Integration
export function PaymentConfirmationExample() {
  const { sendPaymentConfirmation, loading, error } = useSendNotifications();

  const handlePaymentProcessed = async (paymentResult) => {
    // This would be called after Stripe/payment processing
    const payment = {
      amount: paymentResult.amount_received / 100, // Convert from cents
      method: `${paymentResult.payment_method.card.brand} ****${paymentResult.payment_method.card.last4}`,
      transactionId: paymentResult.id,
      receiptUrl: paymentResult.receipt_url
    };

    const appointment = {
      serviceName: 'Haircut & Style',
      date: '2025-08-07',
      time: '2:00 PM'
    };

    const customer = {
      id: paymentResult.customer,
      name: 'John Smith',
      email: paymentResult.receipt_email,
      phone: '+1234567890'
    };

    const shop = {
      name: '6FB Premium Barbershop',
      primaryColor: '#10B981'
    };

    try {
      const notificationData = createNotificationData.paymentConfirmation(
        payment,
        appointment,
        customer,
        shop
      );

      await sendPaymentConfirmation(notificationData);
    } catch (err) {
      console.error('Failed to send payment confirmation:', err);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Payment Processing Integration</h3>
      <p className="text-sm text-gray-600">
        This would be integrated with your Stripe webhook or payment processing flow.
      </p>
      <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
        handlePaymentProcessed(stripePaymentIntent)
      </code>
    </div>
  );
}

// Example 3: Reminder Scheduling System
export function ReminderSchedulingExample() {
  const { scheduleReminder, loading, error } = useSendNotifications();
  const [scheduled, setScheduled] = useState([]);

  const handleScheduleReminder = async (appointment, customer, hoursBeforeAppointment = 24) => {
    try {
      const reminderData = createNotificationData.bookingReminder(
        appointment,
        customer,
        {
          name: '6FB Premium Barbershop',
          address: '123 Main Street, City, ST 12345',
          phone: '(555) 123-4567',
          primaryColor: '#F59E0B'
        }
      );

      const result = await scheduleReminder(reminderData, hoursBeforeAppointment);
      
      setScheduled(prev => [...prev, {
        appointmentId: appointment.id,
        customerName: customer.name,
        reminderTime: result.reminderTime,
        hoursBeforeAppointment: result.hoursBeforeAppointment
      }]);

    } catch (err) {
      console.error('Failed to schedule reminder:', err);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Automatic Reminder Scheduling</h3>
      
      <div className="space-y-2 mb-4">
        {[24, 4, 1].map(hours => (
          <button
            key={hours}
            onClick={() => handleScheduleReminder(
              { 
                id: 'apt_reminder_test',
                date: '2025-08-10',
                time: '2:00 PM',
                serviceName: 'Haircut',
                barberName: 'Mike Johnson',
                confirmationNumber: 'APT-2025-005'
              },
              {
                id: 'cust_test',
                name: await getUserFromDatabase(),
                email: 'jane@example.com',
                phone: '+1987654321'
              },
              hours
            )}
            disabled={loading}
            className="mr-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Schedule {hours}h Reminder
          </button>
        ))}
      </div>

      {scheduled.length > 0 && (
        <div className="bg-green-50 p-3 rounded">
          <h4 className="font-medium text-green-800 mb-2">Scheduled Reminders:</h4>
          {scheduled.map((reminder, index) => (
            <div key={index} className="text-sm text-green-700">
              • {reminder.customerName} - {reminder.hoursBeforeAppointment}h before ({new Date(reminder.reminderTime).toLocaleString()})
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-600 mt-2 text-sm">
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}

// Example 4: Batch Notifications for Daily Operations
export function BatchNotificationExample() {
  const { sendBatchNotifications, loading, error } = useSendNotifications();
  const [results, setResults] = useState(null);

  const handleSendDailyNotifications = async () => {
    // Example: Send confirmations and reminders for tomorrow's appointments
    const tomorrowAppointments = [
      {
        type: 'appointment-confirmation',
        data: {
          customerName: 'Alice Johnson',
          customerEmail: 'alice@example.com',
          customerPhone: '+1111111111',
          appointmentDate: '2025-08-08',
          appointmentTime: '10:00 AM',
          serviceName: 'Haircut',
          barberName: 'Mike Johnson',
          shopName: '6FB Premium Barbershop',
          shopAddress: '123 Main Street, City, ST 12345',
          shopPhone: '(555) 123-4567',
          totalPrice: '$30.00',
          confirmationNumber: 'APT-2025-010'
        }
      },
      {
        type: 'booking-reminder',
        data: {
          customerName: 'Bob Wilson',
          customerEmail: 'bob@example.com',
          customerPhone: '+2222222222',
          appointmentDate: '2025-08-08',
          appointmentTime: '2:00 PM',
          serviceName: 'Beard Trim',
          barberName: 'Alex Thompson',
          shopName: '6FB Premium Barbershop',
          shopAddress: '123 Main Street, City, ST 12345',
          shopPhone: '(555) 123-4567',
          confirmationNumber: 'APT-2025-011'
        }
      }
    ];

    try {
      const result = await sendBatchNotifications(tomorrowAppointments);
      setResults(result);
    } catch (err) {
      console.error('Batch notification failed:', err);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Daily Batch Notifications</h3>
      <p className="text-sm text-gray-600 mb-4">
        Send multiple notifications at once for daily operations.
      </p>
      
      <button
        onClick={handleSendDailyNotifications}
        disabled={loading}
        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Sending Batch...' : 'Send Daily Notifications'}
      </button>

      {results && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h4 className="font-medium text-blue-800 mb-2">Batch Results:</h4>
          <div className="text-sm text-blue-700">
            • Total: {results.total}
            • Successful: {results.successful}
            • Failed: {results.failed}
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 mt-2 text-sm">
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}

// Example 5: Complete Booking Flow Integration
export function CompleteBookingFlowExample() {
  const { 
    sendAppointmentConfirmation, 
    scheduleReminder,
    sendPaymentConfirmation,
    loading, 
    error 
  } = useSendNotifications();

  const [flowStatus, setFlowStatus] = useState('idle');

  const handleCompleteBookingFlow = async () => {
    setFlowStatus('processing');

    const appointment = {
      id: 'apt_flow_123',
      date: '2025-08-08',
      time: '3:00 PM',
      serviceName: 'Full Service',
      barberName: 'Chris Wilson',
      totalPrice: '$45.00',
      confirmationNumber: 'APT-2025-020'
    };

    const customer = {
      id: 'cust_flow_123',
      name: 'Sarah Davis',
      email: 'sarah@example.com',
      phone: '+1333333333'
    };

    const shop = {
      name: '6FB Premium Barbershop',
      address: '123 Main Street, City, ST 12345',
      phone: '(555) 123-4567'
    };

    try {
      // Step 1: Send appointment confirmation
      setFlowStatus('sending-confirmation');
      const confirmationData = createNotificationData.appointmentConfirmation(
        appointment, customer, shop
      );
      await sendAppointmentConfirmation(confirmationData);

      // Step 2: Schedule 24h reminder
      setFlowStatus('scheduling-reminder');
      const reminderData = createNotificationData.bookingReminder(
        appointment, customer, shop
      );
      await scheduleReminder(reminderData, 24);

      // Step 3: Send payment confirmation (if paid)
      setFlowStatus('sending-payment-confirmation');
      const payment = {
        amount: '$45.00',
        method: 'Visa ****1234',
        transactionId: 'txn_flow_123',
        receiptUrl: 'https://example.com/receipt'
      };
      const paymentData = createNotificationData.paymentConfirmation(
        payment, appointment, customer, shop
      );
      await sendPaymentConfirmation(paymentData);

      setFlowStatus('completed');
    } catch (err) {
      setFlowStatus('error');
      console.error('Booking flow failed:', err);
    }
  };

  const getStatusMessage = () => {
    switch (flowStatus) {
      case 'idle': return 'Ready to start booking flow';
      case 'processing': return 'Starting booking process...';
      case 'sending-confirmation': return 'Sending appointment confirmation...';
      case 'scheduling-reminder': return 'Scheduling reminder notification...';
      case 'sending-payment-confirmation': return 'Sending payment confirmation...';
      case 'completed': return '✅ Complete booking flow finished successfully!';
      case 'error': return '❌ Booking flow failed';
      default: return '';
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Complete Booking Flow</h3>
      <p className="text-sm text-gray-600 mb-4">
        Demonstrates the full notification flow: confirmation → reminder scheduling → payment confirmation
      </p>
      
      <div className="mb-4">
        <div className={`text-sm p-2 rounded ${
          flowStatus === 'completed' ? 'bg-green-100 text-green-700' :
          flowStatus === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {getStatusMessage()}
        </div>
      </div>

      <button
        onClick={handleCompleteBookingFlow}
        disabled={loading || flowStatus === 'processing'}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading || flowStatus === 'processing' ? 'Processing...' : 'Start Complete Flow'}
      </button>

      {error && (
        <div className="text-red-600 mt-2 text-sm">
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}

// Main demo component
export default function NotificationExamplesDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          6FB Notification System Examples
        </h1>
        <p className="text-gray-600">
          Interactive examples showing how to integrate notifications into your barbershop application
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingConfirmationExample />
        <PaymentConfirmationExample />
        <ReminderSchedulingExample />
        <BatchNotificationExample />
      </div>

      <div className="col-span-full">
        <CompleteBookingFlowExample />
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">📋 Integration Checklist</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>✅ Notification workflows created and integrated</li>
          <li>✅ API endpoints configured</li>
          <li>✅ React hooks ready for use</li>
          <li>✅ Email templates designed</li>
          <li>⏳ Deploy workflows to Novu dashboard</li>
          <li>⏳ Test with real email/SMS delivery</li>
          <li>⏳ Integrate with existing booking system</li>
        </ul>
      </div>
    </div>
  );
}