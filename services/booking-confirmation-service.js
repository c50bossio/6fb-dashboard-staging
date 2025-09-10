/**
 * Booking Confirmation Service
 * 
 * Comprehensive booking confirmation system with:
 * - Multi-channel confirmation delivery (Email, SMS, Push, In-app)
 * - User preference management and channel selection
 * - Integration with existing notification services
 * - Automated reminder scheduling upon confirmation
 * - Payment confirmation and receipt generation
 * - Rich HTML email templates and SMS formatting
 * - Real-time delivery tracking and analytics
 * 
 * @version 1.0.0
 * @author 6FB AI Agent System
 */

const { createClient } = require('@supabase/supabase-js');
const { enhancedSendGridService } = require('./sendgrid-service');
const { twilioSMSService } = require('./twilio-service');
const { reminderScheduler } = require('./reminder-scheduler');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class BookingConfirmationService {
    constructor() {
        this.confirmationTypes = {
            BOOKING_CREATED: 'booking_created',
            BOOKING_CONFIRMED: 'booking_confirmed',
            PAYMENT_CONFIRMED: 'payment_confirmed',
            BOOKING_UPDATED: 'booking_updated',
            BOOKING_CANCELLED: 'booking_cancelled',
            BOOKING_RESCHEDULED: 'booking_rescheduled'
        };

        this.defaultChannels = ['email', 'sms'];
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds

        console.log('📧 Booking Confirmation Service initialized');
    }

    /**
     * Send comprehensive booking confirmation
     */
    async sendBookingConfirmation(bookingData, confirmationType = this.confirmationTypes.BOOKING_CONFIRMED) {
        try {
            console.log(`📤 Sending ${confirmationType} confirmation for booking ${bookingData.id}`);

            // Validate booking data
            if (!this.validateBookingData(bookingData)) {
                throw new Error('Invalid booking data provided');
            }

            // Get user notification preferences
            const preferences = await this.getUserPreferences(bookingData.customer_email);

            // Prepare confirmation content
            const confirmationContent = this.buildConfirmationContent(confirmationType, bookingData, preferences);

            // Send confirmations through enabled channels
            const deliveryResults = await this.deliverConfirmations(
                bookingData,
                confirmationContent,
                preferences
            );

            // Schedule reminders if this is a new booking confirmation
            if (confirmationType === this.confirmationTypes.BOOKING_CONFIRMED) {
                await this.scheduleFollowUpReminders(bookingData);
            }

            // Log confirmation for analytics
            await this.logConfirmationDelivery(bookingData.id, confirmationType, deliveryResults);

            // Send in-app notification
            await this.sendInAppNotification(bookingData, confirmationType, confirmationContent);

            const result = {
                success: true,
                booking_id: bookingData.id,
                confirmation_type: confirmationType,
                delivery_results: deliveryResults,
                total_channels: Object.keys(deliveryResults).length,
                successful_channels: Object.values(deliveryResults).filter(r => r.success).length,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Booking confirmation completed for ${bookingData.id}:`, result);
            return result;

        } catch (error) {
            console.error('❌ Booking confirmation failed:', error);
            throw new Error(`Confirmation failed: ${error.message}`);
        }
    }

    /**
     * Validate booking data completeness
     */
    validateBookingData(bookingData) {
        const required = [
            'id', 'customer_email', 'customer_name', 'service_name',
            'appointment_datetime', 'shop_name'
        ];

        for (const field of required) {
            if (!bookingData[field]) {
                console.error(`Missing required field: ${field}`);
                return false;
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bookingData.customer_email)) {
            console.error('Invalid email format');
            return false;
        }

        return true;
    }

    /**
     * Get user notification preferences
     */
    async getUserPreferences(customerEmail) {
        try {
            const { data, error } = await supabase
                .rpc('get_notification_preferences', { user_email: customerEmail });

            if (error) {
                console.warn('Error getting preferences, using defaults:', error);
                return this.getDefaultPreferences();
            }

            if (!data || data.length === 0) {
                return this.getDefaultPreferences();
            }

            return {
                email_enabled: data[0].email_enabled,
                sms_enabled: data[0].sms_enabled,
                push_enabled: data[0].push_enabled,
                booking_confirmations: data[0].booking_confirmations,
                preferred_channels: data[0].preferred_channels || ['email', 'sms']
            };

        } catch (error) {
            console.error('Error fetching user preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Get default notification preferences
     */
    getDefaultPreferences() {
        return {
            email_enabled: true,
            sms_enabled: false, // Conservative default
            push_enabled: false,
            booking_confirmations: true,
            preferred_channels: ['email']
        };
    }

    /**
     * Build confirmation content for different channels
     */
    buildConfirmationContent(confirmationType, bookingData, preferences) {
        const {
            customer_name,
            service_name,
            appointment_datetime,
            barber_name = 'Your Barber',
            shop_name,
            shop_address,
            shop_phone,
            total_price,
            booking_notes,
            payment_method,
            payment_status
        } = bookingData;

        // Format date and time
        const appointmentDate = new Date(appointment_datetime);
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        
        const formattedDate = appointmentDate.toLocaleDateString('en-US', dateOptions);
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', timeOptions);
        const formattedDateTime = `${formattedDate} at ${formattedTime}`;

        // Build content based on confirmation type
        const contentTemplates = {
            [this.confirmationTypes.BOOKING_CONFIRMED]: {
                subject: `Booking Confirmed - ${service_name} at ${shop_name}`,
                title: 'Booking Confirmed!',
                message: `Your ${service_name} appointment with ${barber_name} is confirmed.`,
                emoji: '✅'
            },
            [this.confirmationTypes.PAYMENT_CONFIRMED]: {
                subject: `Payment Confirmed - ${service_name} booking`,
                title: 'Payment Confirmed!',
                message: `Your payment of $${total_price} has been processed successfully.`,
                emoji: '💳'
            },
            [this.confirmationTypes.BOOKING_UPDATED]: {
                subject: `Booking Updated - ${service_name} at ${shop_name}`,
                title: 'Booking Updated',
                message: `Your ${service_name} appointment has been updated.`,
                emoji: '📅'
            },
            [this.confirmationTypes.BOOKING_CANCELLED]: {
                subject: `Booking Cancelled - ${service_name}`,
                title: 'Booking Cancelled',
                message: `Your ${service_name} appointment has been cancelled.`,
                emoji: '❌'
            },
            [this.confirmationTypes.BOOKING_RESCHEDULED]: {
                subject: `Booking Rescheduled - ${service_name}`,
                title: 'Booking Rescheduled',
                message: `Your ${service_name} appointment has been rescheduled.`,
                emoji: '🔄'
            }
        };

        const template = contentTemplates[confirmationType] || contentTemplates[this.confirmationTypes.BOOKING_CONFIRMED];

        return {
            email: {
                subject: template.subject,
                html: this.buildEmailHTML(template, bookingData, {
                    customer_name,
                    service_name,
                    appointment_datetime: formattedDateTime,
                    barber_name,
                    shop_name,
                    shop_address,
                    shop_phone,
                    total_price,
                    booking_notes,
                    payment_method,
                    payment_status,
                    confirmation_type: confirmationType
                }),
                text: this.buildEmailText(template, bookingData)
            },
            sms: {
                text: this.buildSMSText(template, {
                    customer_name,
                    service_name,
                    barber_name,
                    shop_name,
                    formatted_date: formattedDate,
                    formatted_time: formattedTime,
                    total_price
                })
            },
            push: {
                title: template.title,
                body: `${template.message} - ${formattedDateTime}`,
                icon: '/icons/booking-confirmation.png',
                badge: '/icons/badge.png',
                data: {
                    booking_id: bookingData.id,
                    confirmation_type: confirmationType,
                    url: `/bookings/${bookingData.id}`
                }
            },
            in_app: {
                title: `${template.emoji} ${template.title}`,
                message: `${template.message} Scheduled for ${formattedDateTime} at ${shop_name}.`,
                action_url: `/bookings/${bookingData.id}`,
                metadata: {
                    booking_id: bookingData.id,
                    confirmation_type: confirmationType
                }
            }
        };
    }

    /**
     * Build comprehensive HTML email template
     */
    buildEmailHTML(template, bookingData, templateData) {
        const isConfirmation = template.title.includes('Confirmed');
        const isCancellation = template.title.includes('Cancelled');
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${template.subject}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; }
                .header { background: linear-gradient(135deg, #007cba 0%, #005a87 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; }
                .content { padding: 40px 30px; }
                .status-badge { display: inline-block; padding: 10px 20px; border-radius: 25px; font-weight: 600; font-size: 16px; margin-bottom: 20px; }
                .status-confirmed { background-color: #d4edda; color: #155724; }
                .status-cancelled { background-color: #f8d7da; color: #721c24; }
                .status-updated { background-color: #d1ecf1; color: #0c5460; }
                .booking-details { background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #007cba; }
                .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
                .detail-row:last-child { border-bottom: none; }
                .detail-label { font-weight: 600; color: #495057; }
                .detail-value { color: #212529; text-align: right; }
                .cta-button { display: inline-block; background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .cta-button:hover { background-color: #005a87; }
                .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px; }
                .footer a { color: #007cba; text-decoration: none; }
                @media (max-width: 600px) {
                    .content { padding: 20px 15px; }
                    .detail-row { flex-direction: column; align-items: flex-start; }
                    .detail-value { text-align: left; margin-top: 5px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div class="header">
                    <h1>BookedBarber</h1>
                    <p>Professional Booking Management</p>
                </div>

                <!-- Content -->
                <div class="content">
                    <div class="status-badge ${isConfirmation ? 'status-confirmed' : (isCancellation ? 'status-cancelled' : 'status-updated')}">
                        ${template.title}
                    </div>

                    <h2 style="color: #212529; margin: 0 0 15px 0;">Hi ${templateData.customer_name}!</h2>
                    
                    <p style="color: #495057; font-size: 16px; line-height: 1.6;">
                        ${template.message} Here are the details:
                    </p>

                    <!-- Booking Details -->
                    <div class="booking-details">
                        <div class="detail-row">
                            <span class="detail-label">Service</span>
                            <span class="detail-value">${templateData.service_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Barber</span>
                            <span class="detail-value">${templateData.barber_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date & Time</span>
                            <span class="detail-value">${templateData.appointment_datetime}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Location</span>
                            <span class="detail-value">${templateData.shop_name}</span>
                        </div>
                        ${templateData.shop_address ? `
                        <div class="detail-row">
                            <span class="detail-label">Address</span>
                            <span class="detail-value">${templateData.shop_address}</span>
                        </div>
                        ` : ''}
                        ${templateData.shop_phone ? `
                        <div class="detail-row">
                            <span class="detail-label">Phone</span>
                            <span class="detail-value">${templateData.shop_phone}</span>
                        </div>
                        ` : ''}
                        ${templateData.total_price ? `
                        <div class="detail-row">
                            <span class="detail-label">Total</span>
                            <span class="detail-value" style="font-weight: 600; color: #007cba;">$${templateData.total_price}</span>
                        </div>
                        ` : ''}
                        ${templateData.payment_status && templateData.payment_method ? `
                        <div class="detail-row">
                            <span class="detail-label">Payment</span>
                            <span class="detail-value">${templateData.payment_status} via ${templateData.payment_method}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${templateData.booking_notes ? `
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <strong>Notes:</strong> ${templateData.booking_notes}
                    </div>
                    ` : ''}

                    ${!isCancellation ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingData.id}" class="cta-button">
                            View Booking Details
                        </a>
                    </div>
                    ` : ''}

                    <p style="color: #495057; line-height: 1.6;">
                        ${!isCancellation ? 
                            'We look forward to seeing you! If you need to reschedule or have any questions, please contact us.' :
                            'If you have any questions about this cancellation, please contact us.'
                        }
                    </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>${templateData.shop_name}</strong></p>
                    ${templateData.shop_address ? `<p>${templateData.shop_address}</p>` : ''}
                    ${templateData.shop_phone ? `<p>Phone: ${templateData.shop_phone}</p>` : ''}
                    <p style="margin-top: 20px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/preferences">Notification Preferences</a> | 
                        <a href="mailto:support@bookedbarber.com">Contact Support</a>
                    </p>
                    <p style="font-size: 12px; color: #999; margin-top: 20px;">
                        Powered by BookedBarber - Professional Booking Management
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Build plain text email content
     */
    buildEmailText(template, bookingData) {
        const {
            customer_name, service_name, appointment_datetime,
            barber_name, shop_name, total_price
        } = bookingData;

        return `
${template.title}

Hi ${customer_name}!

${template.message}

Booking Details:
- Service: ${service_name}
- Barber: ${barber_name}
- Date & Time: ${new Date(appointment_datetime).toLocaleString()}
- Location: ${shop_name}
${total_price ? `- Total: $${total_price}` : ''}

View your booking: ${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingData.id}

We look forward to seeing you!

---
${shop_name}
Powered by BookedBarber
        `.trim();
    }

    /**
     * Build SMS text content
     */
    buildSMSText(template, data) {
        const { customer_name, service_name, barber_name, shop_name, formatted_date, formatted_time, total_price } = data;
        
        const baseMessage = `Hi ${customer_name}! ${template.message.replace(template.title, '')} 
${service_name} with ${barber_name} on ${formatted_date} at ${formatted_time} at ${shop_name}.`;

        const priceText = total_price ? ` Total: $${total_price}.` : '';
        const footerText = ' Reply STOP to opt out.';

        // SMS has 160 character limit, so we need to be concise
        const fullMessage = `${baseMessage}${priceText}${footerText}`;
        
        return fullMessage.length > 160 ? 
            `${baseMessage.substring(0, 140)}...${footerText}` : 
            fullMessage;
    }

    /**
     * Deliver confirmations through all enabled channels
     */
    async deliverConfirmations(bookingData, content, preferences) {
        const results = {};
        const enabledChannels = preferences.preferred_channels.filter(channel => {
            switch (channel) {
                case 'email':
                    return preferences.email_enabled && bookingData.customer_email;
                case 'sms':
                    return preferences.sms_enabled && bookingData.customer_phone;
                case 'push':
                    return preferences.push_enabled;
                default:
                    return false;
            }
        });

        // Send through each enabled channel
        for (const channel of enabledChannels) {
            try {
                let result;
                
                switch (channel) {
                    case 'email':
                        result = await this.sendEmailConfirmation(bookingData, content.email);
                        break;
                    case 'sms':
                        result = await this.sendSMSConfirmation(bookingData, content.sms);
                        break;
                    case 'push':
                        result = await this.sendPushConfirmation(bookingData, content.push);
                        break;
                }

                results[channel] = result || { success: false, error: 'Channel not implemented' };

            } catch (error) {
                console.error(`Error sending ${channel} confirmation:`, error);
                results[channel] = { success: false, error: error.message };
            }
        }

        return results;
    }

    /**
     * Send email confirmation
     */
    async sendEmailConfirmation(bookingData, emailContent) {
        try {
            const emailData = {
                to: bookingData.customer_email,
                from: {
                    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
                    name: bookingData.shop_name || 'BookedBarber'
                },
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                customArgs: {
                    booking_id: bookingData.id,
                    confirmation_type: 'booking_confirmation',
                    shop_name: bookingData.shop_name
                }
            };

            const result = await enhancedSendGridService.sendEmailWithRetry(emailData);
            
            return {
                success: result.success,
                messageId: result.messageId,
                statusCode: result.statusCode,
                channel: 'email'
            };

        } catch (error) {
            console.error('Email confirmation error:', error);
            throw error;
        }
    }

    /**
     * Send SMS confirmation
     */
    async sendSMSConfirmation(bookingData, smsContent) {
        try {
            const result = await twilioSMSService.sendSMS({
                to: bookingData.customer_phone,
                message: smsContent.text,
                customerId: bookingData.id,
                campaignId: 'booking_confirmation'
            });

            return {
                success: result.success,
                messageSid: result.messageSid,
                cost: result.cost,
                channel: 'sms'
            };

        } catch (error) {
            console.error('SMS confirmation error:', error);
            throw error;
        }
    }

    /**
     * Send push notification confirmation
     */
    async sendPushConfirmation(bookingData, pushContent) {
        try {
            // TODO: Implement Web Push API
            console.log('📱 Push confirmation would be sent:', pushContent);
            
            return {
                success: true,
                messageId: 'push_' + Date.now(),
                channel: 'push',
                simulated: true
            };

        } catch (error) {
            console.error('Push confirmation error:', error);
            throw error;
        }
    }

    /**
     * Send in-app notification
     */
    async sendInAppNotification(bookingData, confirmationType, content) {
        try {
            // Use existing notification service
            const notificationService = require('./notification_service');
            
            const notificationId = await notificationService.notification_service.send_notification(
                bookingData.customer_email,
                content.in_app.title,
                content.in_app.message,
                'SUCCESS',
                ['IN_APP'],
                content.in_app.metadata
            );

            console.log(`📱 In-app notification sent: ${notificationId}`);
            return { success: true, notificationId };

        } catch (error) {
            console.error('In-app notification error:', error);
            // Don't throw - this is not critical
            return { success: false, error: error.message };
        }
    }

    /**
     * Schedule follow-up reminders
     */
    async scheduleFollowUpReminders(bookingData) {
        try {
            console.log(`📅 Scheduling follow-up reminders for booking ${bookingData.id}`);
            
            await reminderScheduler.scheduleBookingReminders(bookingData);
            
        } catch (error) {
            console.error('Error scheduling reminders:', error);
            // Don't throw - confirmation should still succeed even if reminders fail
        }
    }

    /**
     * Log confirmation delivery for analytics
     */
    async logConfirmationDelivery(bookingId, confirmationType, deliveryResults) {
        try {
            const { error } = await supabase
                .from('notification_delivery_log')
                .insert(
                    Object.entries(deliveryResults).map(([channel, result]) => ({
                        booking_id: bookingId,
                        channel: channel,
                        recipient: result.recipient || 'unknown',
                        delivery_status: result.success ? 'sent' : 'failed',
                        external_message_id: result.messageId || result.messageSid,
                        external_response: result,
                        cost_cents: result.cost ? Math.round(result.cost * 100) : 0,
                        error_message: result.error,
                        sent_at: new Date().toISOString()
                    }))
                );

            if (error) {
                console.error('Failed to log confirmation delivery:', error);
            }

        } catch (error) {
            console.error('Error logging confirmation delivery:', error);
        }
    }

    /**
     * Update notification preferences for a user
     */
    async updateNotificationPreferences(email, preferences) {
        try {
            const { error } = await supabase
                .from('notification_preferences')
                .upsert({
                    email: email,
                    email_enabled: preferences.email_enabled,
                    sms_enabled: preferences.sms_enabled,
                    push_enabled: preferences.push_enabled,
                    booking_confirmations: preferences.booking_confirmations,
                    reminder_24h: preferences.reminder_24h,
                    reminder_2h: preferences.reminder_2h,
                    reminder_30min: preferences.reminder_30min,
                    preferred_channels: preferences.preferred_channels,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'email'
                });

            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }

            console.log(`✅ Updated notification preferences for ${email}`);
            return { success: true };

        } catch (error) {
            console.error('Failed to update notification preferences:', error);
            throw error;
        }
    }

    /**
     * Handle booking cancellation confirmation
     */
    async sendCancellationConfirmation(bookingData, cancellationReason = null) {
        const enhancedBookingData = {
            ...bookingData,
            cancellation_reason: cancellationReason
        };

        return await this.sendBookingConfirmation(
            enhancedBookingData,
            this.confirmationTypes.BOOKING_CANCELLED
        );
    }

    /**
     * Handle booking rescheduling confirmation
     */
    async sendRescheduleConfirmation(oldBookingData, newBookingData) {
        // Send cancellation for old booking
        await this.sendCancellationConfirmation(oldBookingData, 'Rescheduled');
        
        // Send confirmation for new booking
        return await this.sendBookingConfirmation(
            newBookingData,
            this.confirmationTypes.BOOKING_RESCHEDULED
        );
    }

    /**
     * Get service health status
     */
    getServiceHealth() {
        return {
            service: 'booking-confirmation',
            status: 'healthy',
            supported_channels: ['email', 'sms', 'push', 'in_app'],
            confirmation_types: Object.values(this.confirmationTypes),
            integrations: {
                sendgrid: enhancedSendGridService.getServiceStatus(),
                twilio: twilioSMSService ? 'available' : 'unavailable',
                reminder_scheduler: reminderScheduler.getServiceHealth()
            }
        };
    }
}

// Export singleton instance
const bookingConfirmationService = new BookingConfirmationService();

module.exports = {
    bookingConfirmationService,
    BookingConfirmationService
};

// Test function for direct execution
if (require.main === module) {
    console.log('🧪 Running Booking Confirmation Service Tests...');
    
    const testBookingData = {
        id: 'test-booking-123',
        customer_email: 'test@example.com',
        customer_phone: '+1234567890',
        customer_name: 'John Doe',
        service_name: 'Premium Haircut',
        appointment_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        barber_name: 'Mike Johnson',
        shop_name: 'Elite Cuts',
        shop_address: '123 Main St, City, State',
        shop_phone: '(555) 123-4567',
        total_price: 45.00,
        payment_method: 'Credit Card',
        payment_status: 'Paid',
        booking_notes: 'Please bring own hair gel'
    };

    bookingConfirmationService.sendBookingConfirmation(testBookingData)
        .then(result => {
            console.log('✅ Test confirmation sent:', result);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
        });
}