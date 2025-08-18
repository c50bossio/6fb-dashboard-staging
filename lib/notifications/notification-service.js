/**
 * Main Notification Service
 * Coordinates email, SMS, and in-app notifications
 */

import EmailService from './email-service.js';
import SMSService from './sms-service.js';

class NotificationService {
  constructor() {
    this.emailService = EmailService;
    this.smsService = SMSService;
  }

  /**
   * Send appointment confirmation notifications
   */
  async sendAppointmentConfirmation(data) {
    
    const results = {
      email: { success: false },
      sms: { success: false }
    };

    if (data.customerEmail) {
      try {
        results.email = await this.emailService.sendAppointmentConfirmation(data);
      } catch (error) {
        console.error('❌ Email failed:', error);
        results.email = { success: false, error: error.message };
      }
    }

    if (data.customerPhone) {
      try {
        results.sms = await this.smsService.sendAppointmentConfirmation(data);
      } catch (error) {
        console.error('❌ SMS failed:', error);
        results.sms = { success: false, error: error.message };
      }
    }

    return {
      success: results.email.success || results.sms.success,
      results
    };
  }

  /**
   * Send booking reminder notifications
   */
  async sendBookingReminder(data) {
    
    const results = {
      email: { success: false },
      sms: { success: false }
    };

    if (data.customerEmail) {
      try {
        results.email = await this.emailService.sendBookingReminder(data);
      } catch (error) {
        console.error('❌ Email failed:', error);
        results.email = { success: false, error: error.message };
      }
    }

    if (data.customerPhone) {
      try {
        results.sms = await this.smsService.sendBookingReminder(data);
      } catch (error) {
        console.error('❌ SMS failed:', error);
        results.sms = { success: false, error: error.message };
      }
    }

    return {
      success: results.email.success || results.sms.success,
      results
    };
  }

  /**
   * Send payment confirmation notifications
   */
  async sendPaymentConfirmation(data) {
    
    const results = {
      email: { success: false },
      sms: { success: false }
    };

    if (data.customerEmail) {
      try {
        results.email = await this.emailService.sendPaymentConfirmation(data);
      } catch (error) {
        console.error('❌ Email failed:', error);
        results.email = { success: false, error: error.message };
      }
    }

    if (data.customerPhone) {
      try {
        results.sms = await this.smsService.sendPaymentConfirmation(data);
      } catch (error) {
        console.error('❌ SMS failed:', error);
        results.sms = { success: false, error: error.message };
      }
    }

    return {
      success: results.email.success || results.sms.success,
      results
    };
  }

  /**
   * Schedule a reminder notification
   */
  async scheduleReminder(data, hoursBeforeAppointment = 24) {
    const appointmentTime = new Date(data.appointmentDateTime);
    const reminderTime = new Date(appointmentTime.getTime() - (hoursBeforeAppointment * 60 * 60 * 1000));
    const now = new Date();

    if (reminderTime <= now) {
      return this.sendBookingReminder(data);
    }

    const delay = reminderTime.getTime() - now.getTime();
    
    
    setTimeout(async () => {
      await this.sendBookingReminder(data);
    }, delay);

    return {
      success: true,
      scheduledFor: reminderTime,
      hoursFromNow: Math.round(delay / 1000 / 60 / 60)
    };
  }

  /**
   * Test notification system (email only to avoid SMS charges)
   */
  async testNotification() {
    const testData = {
      customerName: 'John Smith',
      customerEmail: 'test@example.com',
      appointmentDate: '2025-08-08',
      appointmentTime: '2:00 PM',
      serviceName: 'Haircut & Style',
      barberName: 'Mike Johnson',
      shopName: '6FB Premium Barbershop',
      shopPhone: '(555) 123-4567',
      totalPrice: '$35.00',
      confirmationNumber: 'TEST-001'
    };

    
    const result = await this.sendAppointmentConfirmation(testData);
    
    return {
      success: result.success,
      message: result.success ? 'Test notification sent successfully!' : 'Test notification failed',
      details: result.results
    };
  }
}

export default new NotificationService();