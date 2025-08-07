/**
 * Email Template Exports for 6FB Barbershop System
 * Professional email templates for all notification types
 */

export { renderAppointmentConfirmationEmail } from './appointment-confirmation-email';
export { renderBookingReminderEmail } from './booking-reminder-email';
export { renderPaymentConfirmationEmail } from './payment-confirmation-email';

// Helper function to get all templates
export function getAllTemplates() {
  return {
    'appointment-confirmation': renderAppointmentConfirmationEmail,
    'booking-reminder': renderBookingReminderEmail,
    'payment-confirmation': renderPaymentConfirmationEmail
  };
}