/**
 * Appointment Confirmation Workflow for 6FB Barbershop System
 * Sends multi-channel notifications when appointments are confirmed
 */

import { renderAppointmentConfirmationEmail } from '../templates/appointment-confirmation-email';

// Novu workflow configuration
export const appointmentConfirmationWorkflow = {
  workflowId: 'appointment-confirmation',
  name: 'Appointment Confirmation',
  
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
    totalPrice: { type: 'string', required: true },
    confirmationNumber: { type: 'string', required: true },
    shopLogo: { type: 'string', required: false },
    primaryColor: { type: 'string', required: false, default: '#3B82F6' },
    cancelUrl: { type: 'string', required: false }
  },

  // Email step configuration
  emailStep: {
    stepId: 'send-confirmation-email',
    subject: (payload) => `Appointment Confirmed - ${payload.customerName}`,
    body: (payload) => renderAppointmentConfirmationEmail(payload)
  },

  // SMS step configuration  
  smsStep: {
    stepId: 'send-confirmation-sms',
    message: (payload) => `Hi ${payload.customerName}! Your ${payload.serviceName} appointment is confirmed for ${payload.appointmentDate} at ${payload.appointmentTime} with ${payload.barberName} at ${payload.shopName}. Confirmation: ${payload.confirmationNumber}`
  },

  // In-app notification step
  inAppStep: {
    stepId: 'appointment-confirmed',
    subject: 'Appointment Confirmed! ✅',
    body: (payload) => `Your ${payload.serviceName} appointment is confirmed for ${payload.appointmentDate} at ${payload.appointmentTime}`,
    avatar: (payload) => payload.shopLogo || null
  }
};

// Helper function to trigger the workflow
export async function triggerAppointmentConfirmation(novu, payload) {
  try {
    const response = await novu.trigger('appointment-confirmation', {
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
        totalPrice: payload.totalPrice,
        confirmationNumber: payload.confirmationNumber,
        shopLogo: payload.shopLogo,
        primaryColor: payload.primaryColor || '#3B82F6',
        cancelUrl: payload.cancelUrl
      }
    });
    
    console.log('✅ Appointment confirmation sent:', response.transactionId);
    return response;
  } catch (error) {
    console.error('❌ Error sending appointment confirmation:', error);
    throw error;
  }
}