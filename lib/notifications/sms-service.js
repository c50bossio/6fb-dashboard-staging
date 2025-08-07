/**
 * SMS Service for 6FB Barbershop Notifications
 * Simple SMS notifications using Twilio
 */

// Import twilio only if available
let twilio = null;
try {
  const twilioModule = require('twilio');
  twilio = twilioModule.default || twilioModule;
} catch (error) {
  console.log('⚠️  Twilio not installed - SMS notifications disabled');
}

class SMSService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize SMS service with Twilio
   */
  async initialize() {
    if (this.initialized) return;

    if (!twilio) {
      console.log('⚠️  SMS service disabled - twilio not available');
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !this.fromNumber) {
      console.log('⚠️  SMS service not configured (missing Twilio credentials)');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log('✅ SMS service initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('❌ SMS service initialization failed:', error);
    }
  }

  /**
   * Send appointment confirmation SMS
   */
  async sendAppointmentConfirmation(data) {
    const message = `Hi ${data.customerName}! Your ${data.serviceName} appointment is confirmed for ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName} at ${data.shopName}. Confirmation: ${data.confirmationNumber}`;
    
    return this.sendSMS(data.customerPhone, message);
  }

  /**
   * Send booking reminder SMS
   */
  async sendBookingReminder(data) {
    const message = `Reminder: Your ${data.serviceName} appointment is tomorrow (${data.appointmentDate} at ${data.appointmentTime}) with ${data.barberName} at ${data.shopName}. See you soon!`;
    
    return this.sendSMS(data.customerPhone, message);
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(data) {
    const message = `Payment confirmed! Your ${data.paymentAmount} payment for ${data.serviceName} on ${data.appointmentDate} has been processed. Transaction: ${data.transactionId}`;
    
    return this.sendSMS(data.customerPhone, message);
  }

  /**
   * Generic SMS sender
   */
  async sendSMS(to, message) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      console.log('⚠️  SMS not sent - service not configured');
      return { success: false, reason: 'SMS service not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      console.log('✅ SMS sent successfully:', result.sid);
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new SMSService();