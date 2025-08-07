/**
 * Payment Confirmation Workflow for 6FB Barbershop System
 * Sends confirmation notifications when payments are processed
 */

import { renderPaymentConfirmationEmail } from '../templates/payment-confirmation-email';

// Novu workflow configuration
export const paymentConfirmationWorkflow = {
  workflowId: 'payment-confirmation',
  name: 'Payment Confirmation',
  
  // Payload schema for validation
  payloadSchema: {
    customerName: { type: 'string', required: true },
    customerEmail: { type: 'string', required: true },
    paymentAmount: { type: 'string', required: true },
    paymentMethod: { type: 'string', required: true },
    transactionId: { type: 'string', required: true },
    serviceName: { type: 'string', required: true },
    appointmentDate: { type: 'string', required: true },
    appointmentTime: { type: 'string', required: true },
    shopName: { type: 'string', required: true },
    receiptUrl: { type: 'string', required: false },
    shopLogo: { type: 'string', required: false },
    primaryColor: { type: 'string', required: false, default: '#10B981' },
    shopAddress: { type: 'string', required: false },
    shopPhone: { type: 'string', required: false }
  },

  // Email step configuration
  emailStep: {
    stepId: 'send-payment-receipt',
    subject: (payload) => `Payment Confirmed - ${payload.serviceName} (${payload.transactionId})`,
    body: (payload) => renderPaymentConfirmationEmail(payload)
  },

  // SMS step configuration  
  smsStep: {
    stepId: 'send-payment-sms',
    message: (payload) => `Payment confirmed! Your ${payload.paymentAmount} payment for ${payload.serviceName} on ${payload.appointmentDate} has been processed. Transaction: ${payload.transactionId}`
  },

  // In-app notification step
  inAppStep: {
    stepId: 'payment-confirmed',
    subject: 'Payment Confirmed! ✅',
    body: (payload) => `Your payment of ${payload.paymentAmount} has been processed successfully for your ${payload.serviceName} appointment`,
    avatar: (payload) => payload.shopLogo || null
  }
};

// Helper function to trigger the workflow
export async function triggerPaymentConfirmation(novu, payload) {
  try {
    const response = await novu.trigger('payment-confirmation', {
      to: {
        subscriberId: payload.userId || payload.customerEmail,
        email: payload.customerEmail,
        phone: payload.customerPhone
      },
      payload: {
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        paymentAmount: payload.paymentAmount,
        paymentMethod: payload.paymentMethod,
        transactionId: payload.transactionId,
        serviceName: payload.serviceName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        shopName: payload.shopName,
        receiptUrl: payload.receiptUrl,
        shopLogo: payload.shopLogo,
        primaryColor: payload.primaryColor || '#10B981',
        shopAddress: payload.shopAddress,
        shopPhone: payload.shopPhone
      }
    });
    
    console.log('✅ Payment confirmation sent:', response.transactionId);
    return response;
  } catch (error) {
    console.error('❌ Error sending payment confirmation:', error);
    throw error;
  }
}