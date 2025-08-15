/**
 * Custom Email Service for 6FB Barbershop Notifications
 * Uses SendGrid Web API for reliable email delivery
 */

let sendGridWeb = null;
let nodemailer = null;

try {
  const nodemailerModule = require('nodemailer');
  nodemailer = nodemailerModule.default || nodemailerModule;
} catch (error) {
  console.log('⚠️  Nodemailer not available');
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email service with SendGrid Web API
   */
  async initialize() {
    if (this.initialized) return;

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
      console.log('⚠️  Email service disabled - SendGrid API key not configured');
      return;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Email service initialized successfully (SendGrid Web API)');
        this.initialized = true;
        this.useWebAPI = true;
      } else {
        console.error('❌ SendGrid API test failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
    }
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(data) {
    await this.initialize();

    const subject = `Appointment Confirmed - ${data.customerName}`;
    const html = this.generateAppointmentConfirmationHTML(data);
    
    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html
    });
  }

  /**
   * Send booking reminder email
   */
  async sendBookingReminder(data) {
    await this.initialize();

    const subject = `Reminder: Your ${data.serviceName} appointment tomorrow`;
    const html = this.generateBookingReminderHTML(data);
    
    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(data) {
    await this.initialize();

    const subject = `Payment Confirmed - ${data.serviceName} (${data.transactionId})`;
    const html = this.generatePaymentConfirmationHTML(data);
    
    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html
    });
  }

  /**
   * Generic email sender using SendGrid Web API
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      console.log('⚠️  Email not sent - service not configured');
      return { success: false, reason: 'Email service not configured' };
    }

    const fromEmail = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'support@em3014.6fbmentorship.com';
    const fromName = process.env.FROM_NAME || process.env.SENDGRID_FROM_NAME || '6FB AI Agent System';

    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: fromEmail,
        name: fromName
      },
      content: [
        {
          type: 'text/plain',
          value: text || this.stripHTML(html)
        },
        {
          type: 'text/html',
          value: html
        }
      ]
    };

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 202) {
        console.log('✅ Email sent successfully via SendGrid Web API');
        return {
          success: true,
          messageId: response.headers.get('x-message-id'),
          status: response.status
        };
      } else {
        const errorText = await response.text();
        console.error('❌ SendGrid API error:', response.status, errorText);
        return {
          success: false,
          error: `SendGrid API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate appointment confirmation HTML
   */
  generateAppointmentConfirmationHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #3B82F6; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">Appointment Confirmed!</h1>
            <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px;">✓ CONFIRMED</span>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${data.customerName},</h2>
            <p>Great news! Your appointment has been successfully confirmed. Here are your appointment details:</p>
            <div style="background: #f8f9fa; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">${data.serviceName}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Date & Time:</span>
                    <span style="color: #333; float: right;">${data.appointmentDate} at ${data.appointmentTime}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">${data.barberName}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Location:</span>
                    <span style="color: #333; float: right;">${data.shopName}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Total Price:</span>
                    <span style="color: #333; float: right;">${data.totalPrice}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Confirmation #:</span>
                    <span style="color: #333; float: right;">${data.confirmationNumber}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:${data.shopPhone}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate booking reminder HTML
   */
  generateBookingReminderHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #F59E0B; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">⏰ Appointment Reminder</h1>
            <span style="background: #F59E0B; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px;">REMINDER</span>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${data.customerName},</h2>
            <p>This is a friendly reminder about your upcoming appointment!</p>
            <div style="text-align: center; background: #F59E0B; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; display: block;">24</span>
                <span style="font-size: 14px; opacity: 0.9;">hours until your appointment</span>
            </div>
            <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05)); border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">${data.serviceName}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Date & Time:</span>
                    <span style="color: #333; float: right;">${data.appointmentDate} at ${data.appointmentTime}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">${data.barberName}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:${data.shopPhone}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate payment confirmation HTML
   */
  generatePaymentConfirmationHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #10B981; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Payment Confirmed!</h1>
            <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px;">PAID</span>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${data.customerName},</h2>
            <p>Great news! Your payment has been successfully processed.</p>
            <div style="text-align: center; background: #10B981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; display: block;">${data.paymentAmount}</span>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Payment Confirmed</div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Transaction Details</h3>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Transaction ID:</span>
                    <span style="color: #333; float: right; font-family: 'Courier New', monospace; background: #f1f5f9; padding: 4px; border-radius: 4px; font-size: 12px;">${data.transactionId}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Payment Method:</span>
                    <span style="color: #333; float: right;">${data.paymentMethod}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">${data.serviceName} on ${data.appointmentDate}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:${data.shopPhone}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Contact Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHTML(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

export default new EmailService();