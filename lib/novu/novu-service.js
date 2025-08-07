/**
 * Novu Service Integration for 6FB Barbershop System
 * Centralized service for triggering all notification workflows
 */

import { Novu } from '@novu/node';

import { 
  triggerAppointmentConfirmation,
  triggerBookingReminder,
  triggerPaymentConfirmation 
} from './workflows';

class NovuService {
  constructor() {
    // Initialize Novu with API key from environment
    this.novu = new Novu(process.env.NOVU_API_KEY);
    
    if (!process.env.NOVU_API_KEY) {
      console.warn('⚠️ NOVU_API_KEY not found in environment variables');
    }
  }

  /**
   * Send appointment confirmation notification
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>} Novu response
   */
  async sendAppointmentConfirmation(appointmentData) {
    try {
      const payload = {
        userId: appointmentData.userId,
        customerName: appointmentData.customerName,
        customerEmail: appointmentData.customerEmail,
        customerPhone: appointmentData.customerPhone,
        appointmentDate: this.formatDate(appointmentData.appointmentDate),
        appointmentTime: this.formatTime(appointmentData.appointmentTime),
        serviceName: appointmentData.serviceName,
        barberName: appointmentData.barberName,
        shopName: appointmentData.shopName || '6FB Premium Barbershop',
        shopAddress: appointmentData.shopAddress || '123 Main Street, City, ST 12345',
        shopPhone: appointmentData.shopPhone || '(555) 123-4567',
        totalPrice: appointmentData.totalPrice,
        confirmationNumber: appointmentData.confirmationNumber,
        shopLogo: appointmentData.shopLogo,
        primaryColor: appointmentData.primaryColor || '#3B82F6',
        cancelUrl: appointmentData.cancelUrl
      };

      return await triggerAppointmentConfirmation(this.novu, payload);
    } catch (error) {
      console.error('❌ Error sending appointment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send booking reminder notification
   * @param {Object} reminderData - Reminder details
   * @returns {Promise<Object>} Novu response
   */
  async sendBookingReminder(reminderData) {
    try {
      const payload = {
        userId: reminderData.userId,
        customerName: reminderData.customerName,
        customerEmail: reminderData.customerEmail,
        customerPhone: reminderData.customerPhone,
        appointmentDate: this.formatDate(reminderData.appointmentDate),
        appointmentTime: this.formatTime(reminderData.appointmentTime),
        serviceName: reminderData.serviceName,
        barberName: reminderData.barberName,
        shopName: reminderData.shopName || '6FB Premium Barbershop',
        shopAddress: reminderData.shopAddress || '123 Main Street, City, ST 12345',
        shopPhone: reminderData.shopPhone || '(555) 123-4567',
        confirmationNumber: reminderData.confirmationNumber,
        hoursUntilAppointment: this.calculateHoursUntilAppointment(
          reminderData.appointmentDate, 
          reminderData.appointmentTime
        ),
        shopLogo: reminderData.shopLogo,
        primaryColor: reminderData.primaryColor || '#F59E0B',
        manageUrl: reminderData.manageUrl
      };

      return await triggerBookingReminder(this.novu, payload);
    } catch (error) {
      console.error('❌ Error sending booking reminder:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation notification
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Novu response
   */
  async sendPaymentConfirmation(paymentData) {
    try {
      const payload = {
        userId: paymentData.userId,
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        paymentAmount: paymentData.paymentAmount,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        serviceName: paymentData.serviceName,
        appointmentDate: this.formatDate(paymentData.appointmentDate),
        appointmentTime: this.formatTime(paymentData.appointmentTime),
        shopName: paymentData.shopName || '6FB Premium Barbershop',
        receiptUrl: paymentData.receiptUrl,
        shopLogo: paymentData.shopLogo,
        primaryColor: paymentData.primaryColor || '#10B981',
        shopAddress: paymentData.shopAddress,
        shopPhone: paymentData.shopPhone
      };

      return await triggerPaymentConfirmation(this.novu, payload);
    } catch (error) {
      console.error('❌ Error sending payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Batch send multiple notifications
   * @param {Array} notifications - Array of notification objects with type and data
   * @returns {Promise<Array>} Array of responses
   */
  async sendBatch(notifications) {
    try {
      const promises = notifications.map(notification => {
        switch (notification.type) {
          case 'appointment-confirmation':
            return this.sendAppointmentConfirmation(notification.data);
          case 'booking-reminder':
            return this.sendBookingReminder(notification.data);
          case 'payment-confirmation':
            return this.sendPaymentConfirmation(notification.data);
          default:
            throw new Error(`Unknown notification type: ${notification.type}`);
        }
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('❌ Error sending batch notifications:', error);
      throw error;
    }
  }

  /**
   * Schedule a reminder notification
   * @param {Object} reminderData - Reminder details
   * @param {number} hoursBeforeAppointment - Hours before appointment to send
   * @returns {Promise<Object>} Scheduled notification details
   */
  async scheduleReminder(reminderData, hoursBeforeAppointment = 24) {
    try {
      const appointmentDateTime = new Date(`${reminderData.appointmentDate} ${reminderData.appointmentTime}`);
      const reminderDateTime = new Date(appointmentDateTime.getTime() - (hoursBeforeAppointment * 60 * 60 * 1000));
      
      // For now, we'll use a simple delay approach
      // In production, you'd want to use a proper scheduling service like cron or job queue
      const delayMs = reminderDateTime.getTime() - new Date().getTime();
      
      if (delayMs > 0) {
        setTimeout(async () => {
          await this.sendBookingReminder(reminderData);
        }, delayMs);
        
        console.log(`📅 Reminder scheduled for ${reminderDateTime.toLocaleString()}`);
        return { 
          scheduled: true, 
          reminderTime: reminderDateTime,
          hoursBeforeAppointment 
        };
      } else {
        // If the reminder time has passed, send immediately
        return await this.sendBookingReminder(reminderData);
      }
    } catch (error) {
      console.error('❌ Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Test Novu connection and configuration
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      // Simple test by getting subscriber preferences
      await this.novu.subscribers.getPreference('test-subscriber');
      return { 
        connected: true, 
        apiKey: !!process.env.NOVU_API_KEY,
        message: 'Novu service is configured and connected' 
      };
    } catch (error) {
      return { 
        connected: false, 
        apiKey: !!process.env.NOVU_API_KEY,
        error: error.message,
        message: 'Novu service connection failed' 
      };
    }
  }

  // Utility Methods
  formatDate(date) {
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date;
  }

  formatTime(time) {
    if (typeof time === 'string' && time.includes(':')) {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return time;
  }

  calculateHoursUntilAppointment(appointmentDate, appointmentTime) {
    const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
    const now = new Date();
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours
  }
}

// Export singleton instance
const novuService = new NovuService();
export default novuService;

// Export class for testing
export { NovuService };