/**
 * SMS Service for 6FB Barbershop Notifications
 * Simple SMS notifications using Twilio with customer-focused messaging
 */

import { CustomerMessaging } from '../utils/customer-messaging.js'

// Twilio will be imported dynamically in initialize()

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

    // Dynamic import of Twilio
    let twilio;
    try {
      twilio = (await import('twilio')).default;
    } catch (error) {
      console.log('❌ Twilio module not available:', error.message);
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !this.fromNumber) {
      console.log('❌ Twilio credentials missing');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.initialized = true;
      console.log('✅ SMS service initialized successfully');
    } catch (error) {
      console.error('❌ SMS service initialization failed:', error);
    }
  }

  /**
   * Send appointment confirmation SMS
   */
  async sendAppointmentConfirmation(data) {
    const message = CustomerMessaging.generateCustomerFriendlySMS('appointment_confirmation', data);
    
    return this.sendSMS(data.customerPhone, message);
  }

  /**
   * Send booking reminder SMS
   */
  async sendBookingReminder(data) {
    const message = CustomerMessaging.generateCustomerFriendlySMS('booking_reminder', data);
    
    return this.sendSMS(data.customerPhone, message);
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(data) {
    const message = CustomerMessaging.generateCustomerFriendlySMS('payment_confirmation', data);
    
    return this.sendSMS(data.customerPhone, message);
  }

  /**
   * Send birthday SMS
   */
  async sendBirthdayMessage(data) {
    const message = data.customMessage || CustomerMessaging.generateCustomerFriendlySMS('birthday_special', data);
    
    return this.sendSMS(data.customerPhone, this.replaceMessageTemplateVariables(message, data));
  }

  /**
   * Send anniversary SMS
   */
  async sendAnniversaryMessage(data) {
    const message = data.customMessage || CustomerMessaging.generateCustomerFriendlySMS('anniversary_special', data);
    
    return this.sendSMS(data.customerPhone, this.replaceMessageTemplateVariables(message, data));
  }

  /**
   * Send bulk birthday/anniversary campaigns
   */
  async sendBulkCampaign(customers, campaignData) {
    const results = [];
    
    for (const customer of customers) {
      try {
        const messageData = {
          customerName: customer.name,
          customerPhone: customer.phone,
          customMessage: campaignData.message_content,
          discountPercentage: campaignData.discount_percentage,
          discountAmount: campaignData.discount_amount,
          shopName: campaignData.shop_name,
          yearsAsCustomer: customer.years_as_customer,
          bookingLink: campaignData.booking_link
        };

        let result;
        if (campaignData.campaign_type === 'birthday') {
          result = await this.sendBirthdayMessage(messageData);
        } else {
          result = await this.sendAnniversaryMessage(messageData);
        }

        results.push({
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          success: result.success,
          message_id: result.messageId,
          error: result.error
        });

        // Add small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          success: false,
          error: error.message
        });
      }
    }

    return {
      total_sent: results.filter(r => r.success).length,
      total_failed: results.filter(r => !r.success).length,
      results: results
    };
  }

  /**
   * Replace template variables in message content
   */
  replaceMessageTemplateVariables(message, data) {
    let processedMessage = message;
    
    // Replace common variables
    const replacements = {
      '{{customer_name}}': data.customerName || '[Customer]',
      '{{shop_name}}': data.shopName || '[Shop Name]',
      '{{discount_percentage}}': data.discountPercentage || '15',
      '{{discount_amount}}': data.discountAmount || '0',
      '{{years_as_customer}}': data.yearsAsCustomer || '1',
      '{{booking_link}}': data.bookingLink || '#',
      '{{discount_description}}': data.discountPercentage 
        ? `${data.discountPercentage}% off your next service`
        : data.discountAmount 
        ? `$${data.discountAmount} off your next service`
        : '15% off your next service',
      '{{discount_expiry_days}}': '30'
    };

    for (const [variable, value] of Object.entries(replacements)) {
      processedMessage = processedMessage.replace(new RegExp(variable, 'g'), value);
    }

    return processedMessage;
  }

  /**
   * Generic SMS sender
   */
  async sendSMS(to, message) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      return { success: false, reason: 'SMS service not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

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