/**
 * useNotifications Hook
 * Simple React hook for internal notification system
 */

import { useState, useCallback } from 'react';

export function useNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send a notification
   */
  const sendNotification = useCallback(async (type, data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, data })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification');
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send appointment confirmation
   */
  const sendAppointmentConfirmation = useCallback(async (appointmentData) => {
    return sendNotification('appointment-confirmation', appointmentData);
  }, [sendNotification]);

  /**
   * Send booking reminder
   */
  const sendBookingReminder = useCallback(async (reminderData) => {
    return sendNotification('booking-reminder', reminderData);
  }, [sendNotification]);

  /**
   * Send payment confirmation
   */
  const sendPaymentConfirmation = useCallback(async (paymentData) => {
    return sendNotification('payment-confirmation', paymentData);
  }, [sendNotification]);

  /**
   * Test notification system
   */
  const testNotifications = useCallback(async () => {
    return sendNotification('test', {});
  }, [sendNotification]);

  return {
    loading,
    error,
    sendNotification,
    sendAppointmentConfirmation,
    sendBookingReminder,
    sendPaymentConfirmation,
    testNotifications
  };
}

export const createNotificationData = {
  appointmentConfirmation: (appointment, customer, shop = {}) => ({
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    shopName: shop.name || '6FB Premium Barbershop',
    shopPhone: shop.phone || '(555) 123-4567',
    totalPrice: appointment.totalPrice,
    confirmationNumber: appointment.confirmationNumber
  }),

  bookingReminder: (appointment, customer, shop = {}) => ({
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    shopName: shop.name || '6FB Premium Barbershop',
    shopPhone: shop.phone || '(555) 123-4567',
    confirmationNumber: appointment.confirmationNumber
  }),

  paymentConfirmation: (payment, appointment, customer) => ({
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    paymentAmount: payment.amount,
    paymentMethod: payment.method,
    transactionId: payment.transactionId,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time
  })
};