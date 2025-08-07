/**
 * Novu Workflow Exports for 6FB Barbershop System
 * Central module for all notification workflows
 */

export { 
  appointmentConfirmationWorkflow,
  triggerAppointmentConfirmation 
} from './appointment-confirmation';

export { 
  bookingReminderWorkflow,
  triggerBookingReminder 
} from './booking-reminder';

export { 
  paymentConfirmationWorkflow,
  triggerPaymentConfirmation 
} from './payment-confirmation';

// Helper function to initialize all workflows
export function getAllWorkflows() {
  return [
    appointmentConfirmationWorkflow,
    bookingReminderWorkflow,
    paymentConfirmationWorkflow
  ];
}

// Helper function to get all trigger functions
export function getAllTriggers() {
  return {
    triggerAppointmentConfirmation,
    triggerBookingReminder,
    triggerPaymentConfirmation
  };
}