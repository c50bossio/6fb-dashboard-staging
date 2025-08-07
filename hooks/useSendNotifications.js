/**
 * useSendNotifications Hook
 * React hook for sending notifications through the 6FB notification system
 */

import { useState, useCallback } from 'react';

export function useSendNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send a single notification
   * @param {string} type - Notification type (appointment-confirmation, booking-reminder, payment-confirmation)
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} API response
   */
  const sendNotification = useCallback(async (type, data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/send', {
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
   * @param {Object} appointmentData - Appointment details
   */
  const sendAppointmentConfirmation = useCallback(async (appointmentData) => {
    return sendNotification('appointment-confirmation', appointmentData);
  }, [sendNotification]);

  /**
   * Send booking reminder
   * @param {Object} reminderData - Reminder details
   */
  const sendBookingReminder = useCallback(async (reminderData) => {
    return sendNotification('booking-reminder', reminderData);
  }, [sendNotification]);

  /**
   * Send payment confirmation
   * @param {Object} paymentData - Payment details
   */
  const sendPaymentConfirmation = useCallback(async (paymentData) => {
    return sendNotification('payment-confirmation', paymentData);
  }, [sendNotification]);

  /**
   * Send multiple notifications at once
   * @param {Array} notifications - Array of notification objects
   */
  const sendBatchNotifications = useCallback(async (notifications) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notifications })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send batch notifications');
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
   * Schedule a reminder notification
   * @param {Object} reminderData - Reminder details
   * @param {number} hoursBeforeAppointment - Hours before appointment to send
   */
  const scheduleReminder = useCallback(async (reminderData, hoursBeforeAppointment = 24) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/schedule-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: reminderData, hoursBeforeAppointment })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule reminder');
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
   * Test notification system health
   */
  const testConnection = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/send');
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,

    // Single notification methods
    sendNotification,
    sendAppointmentConfirmation,
    sendBookingReminder,
    sendPaymentConfirmation,

    // Batch and scheduling
    sendBatchNotifications,
    scheduleReminder,

    // Utility
    testConnection
  };
}

// Helper function to create notification data objects
export const createNotificationData = {
  appointmentConfirmation: (appointment, customer, shop = {}) => ({
    userId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    shopName: shop.name || '6FB Premium Barbershop',
    shopAddress: shop.address || '123 Main Street, City, ST 12345',
    shopPhone: shop.phone || '(555) 123-4567',
    totalPrice: appointment.totalPrice,
    confirmationNumber: appointment.confirmationNumber,
    shopLogo: shop.logo,
    primaryColor: shop.primaryColor || '#3B82F6',
    cancelUrl: appointment.cancelUrl
  }),

  bookingReminder: (appointment, customer, shop = {}) => ({
    userId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    shopName: shop.name || '6FB Premium Barbershop',
    shopAddress: shop.address || '123 Main Street, City, ST 12345',
    shopPhone: shop.phone || '(555) 123-4567',
    confirmationNumber: appointment.confirmationNumber,
    shopLogo: shop.logo,
    primaryColor: shop.primaryColor || '#F59E0B',
    manageUrl: appointment.manageUrl
  }),

  paymentConfirmation: (payment, appointment, customer, shop = {}) => ({
    userId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    paymentAmount: payment.amount,
    paymentMethod: payment.method,
    transactionId: payment.transactionId,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.date,
    appointmentTime: appointment.time,
    shopName: shop.name || '6FB Premium Barbershop',
    receiptUrl: payment.receiptUrl,
    shopLogo: shop.logo,
    primaryColor: shop.primaryColor || '#10B981',
    shopAddress: shop.address,
    shopPhone: shop.phone
  })
};