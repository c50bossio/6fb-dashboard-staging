/**
 * Booking Reminder Workflow for 6FB Barbershop System
 * Sends reminder notifications before appointments
 */

import { renderBookingReminderEmail } from '../templates/booking-reminder-email';

// Novu workflow configuration
export const bookingReminderWorkflow = {
  workflowId: 'booking-reminder',
  name: 'Appointment Reminder',
  
  // Payload schema for validation
  payloadSchema: {
    customerName: { type: 'string', required: true },
    appointmentDate: { type: 'string', required: true },
    appointmentTime: { type: 'string', required: true },
    serviceName: { type: 'string', required: true },
    barberName: { type: 'string', required: true },
    shopName: { type: 'string', required: true },
    shopAddress: { type: 'string', required: true },
    shopPhone: { type: 'string', required: true },
    confirmationNumber: { type: 'string', required: true },
    hoursUntilAppointment: { type: 'number', required: true },
    shopLogo: { type: 'string', required: false },
    primaryColor: { type: 'string', required: false, default: '#F59E0B' },
    manageUrl: { type: 'string', required: false }
  },

  // Email step configuration
  emailStep: {
    stepId: 'send-reminder-email',
    subject: (payload) => {
      const timeContext = payload.hoursUntilAppointment <= 24 ? 'tomorrow' : 
                         payload.hoursUntilAppointment <= 48 ? 'in 2 days' : 
                         'soon';
      return `Reminder: Your ${payload.serviceName} appointment ${timeContext}`;
    },
    body: (payload) => renderBookingReminderEmail(payload)
  },

  // SMS step configuration  
  smsStep: {
    stepId: 'send-reminder-sms',
    message: (payload) => `Reminder: Your ${payload.serviceName} appointment is in ${payload.hoursUntilAppointment} hours (${payload.appointmentDate} at ${payload.appointmentTime}) with ${payload.barberName} at ${payload.shopName}. See you soon!`
  },

  // In-app notification step
  inAppStep: {
    stepId: 'appointment-reminder',
    subject: 'Appointment Reminder ⏰',
    body: (payload) => {
      const timeContext = payload.hoursUntilAppointment <= 24 ? 'tomorrow' : 
                         payload.hoursUntilAppointment <= 48 ? 'in 2 days' : 
                         'soon';
      return `Don't forget: Your ${payload.serviceName} appointment is ${timeContext} at ${payload.appointmentTime}`;
    },
    avatar: (payload) => payload.shopLogo || null
  }
};

// Helper function to trigger the workflow
export async function triggerBookingReminder(novu, payload) {
  try {
    const response = await novu.trigger('booking-reminder', {
      to: {
        subscriberId: payload.userId || payload.customerEmail,
        email: payload.customerEmail,
        phone: payload.customerPhone
      },
      payload: {
        customerName: payload.customerName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        serviceName: payload.serviceName,
        barberName: payload.barberName,
        shopName: payload.shopName,
        shopAddress: payload.shopAddress,
        shopPhone: payload.shopPhone,
        confirmationNumber: payload.confirmationNumber,
        hoursUntilAppointment: payload.hoursUntilAppointment,
        shopLogo: payload.shopLogo,
        primaryColor: payload.primaryColor || '#F59E0B',
        manageUrl: payload.manageUrl
      }
    });
    
    console.log('✅ Booking reminder sent:', response.transactionId);
    return response;
  } catch (error) {
    console.error('❌ Error sending booking reminder:', error);
    throw error;
  }
}