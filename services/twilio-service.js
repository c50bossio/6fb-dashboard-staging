/**
 * Twilio SMS Service for Marketing Campaigns
 * 
 * Provides comprehensive SMS marketing capabilities including:
 * - Bulk SMS sending with carrier-compliant throttling
 * - SMS personalization and link shortening
 * - Real-time delivery tracking and metrics
 * - TCPA compliance and opt-out handling
 * - Platform markup calculation and billing
 * - Support for both SMS and MMS
 */

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class TwilioSMSService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.platformPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        this.client = null;
        
        this.markupRates = {
            barber: 2.5,      // 250% markup for individual barbers
            shop: 2.0,        // 200% markup for shop owners  
            enterprise: 1.5   // 150% markup for enterprise accounts
        };
        
        this.rateLimitDelay = 1000; // 1 second between messages per carrier requirements
        this.maxRetries = 3;
        this.isInitialized = false;
        
        this.smsCosts = {
            'US': 0.0075,    // $0.0075 per SMS
            'CA': 0.0075,    // $0.0075 per SMS
            'GB': 0.04,      // $0.04 per SMS
            'DEFAULT': 0.015  // $0.015 per SMS
        };
        
        this.mmsCosts = {
            'US': 2.0,     // $0.02 per MMS
            'CA': 2.0,     // $0.02 per MMS
            'GB': 8.0,     // $0.08 per MMS
            'DEFAULT': 4.0  // $0.04 per MMS
        };
        
        this.init();
    }

    /**
     * Initialize Twilio client
     */
    async init() {
        try {
            if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
                console.warn('Twilio credentials not configured');
                return false;
            }

            this.client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );

            if (!this.platformPhoneNumber) {
                console.warn('Twilio phone number not configured');
                return false;
            }

            this.isInitialized = true;
            if (process.env.NODE_ENV === 'development') {
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize Twilio SMS service:', error);
            return false;
        }
    }

    /**
     * Send white-label marketing SMS campaign using platform master account
     * @param {Object} campaign - Campaign from database
     * @param {Object} barbershop - Barbershop details for branding
     * @param {Array} recipients - SMS recipients
     * @returns {Object} Campaign results and analytics
     */
    async sendWhiteLabelSMSCampaign(campaign, barbershop, recipients) {
        if (!this.accountSid || !this.authToken) {
            return this.simulateSMSCampaign(campaign, recipients);
        }

        if (!this.isInitialized) {
            await this.init();
        }

        const startTime = Date.now();
        
        try {
            const billing = this.calculateSMSBilling(
                recipients.length, 
                barbershop.account_type || 'shop',
                barbershop.country || 'US'
            );
            
            const smsMessage = this.buildWhiteLabelSMSMessage(campaign, barbershop);
            
            const sendResults = await this.sendBatchedSMS({
                recipients,
                message: smsMessage,
                fromNumber: this.platformPhoneNumber,
                mediaUrls: campaign.media_urls || []
            });
            
            const analytics = {
                campaignId: campaign.id,
                totalRecipients: recipients.length,
                totalSent: sendResults.sent,
                totalFailed: sendResults.failed,
                billing: billing,
                duration: Date.now() - startTime
            };
            
            await this.storeSMSCampaignAnalytics(analytics);
            
            return {
                success: true,
                campaignId: campaign.id,
                metrics: analytics,
                message: `SMS campaign sent to ${sendResults.sent} recipients via platform infrastructure`
            };
            
        } catch (error) {
            console.error('White-label SMS campaign error:', error);
            throw new Error(`SMS campaign failed: ${error.message}`);
        }
    }

    /**
     * Calculate SMS billing with platform markup
     */
    calculateSMSBilling(recipientCount, accountType, country = 'US') {
        const baseCost = this.smsCosts[country] || this.smsCosts.DEFAULT;
        const serviceCost = recipientCount * baseCost;
        const markupRate = this.markupRates[accountType] || this.markupRates.shop;
        const platformFee = serviceCost * markupRate;
        const totalCharge = serviceCost + platformFee;
        
        return {
            recipientCount,
            serviceCost: Number(serviceCost.toFixed(4)),
            platformFee: Number(platformFee.toFixed(4)), 
            totalCharge: Number(totalCharge.toFixed(4)),
            markupRate: markupRate,
            profitMargin: Number(((platformFee / totalCharge) * 100).toFixed(2)),
            costPerSMS: Number(baseCost.toFixed(4))
        };
    }

    /**
     * Build white-label SMS message with barbershop branding
     */
    buildWhiteLabelSMSMessage(campaign, barbershop) {
        const baseMessage = campaign.message;
        
        return `${baseMessage}

- ${barbershop.name}
${barbershop.phone || ''}
Reply STOP to opt out`;
    }

    /**
     * Send batched SMS with carrier-compliant throttling
     */
    async sendBatchedSMS({ recipients, message, fromNumber, mediaUrls = [] }) {
        const results = { sent: 0, failed: 0, errors: [] };
        
        for (const recipient of recipients) {
            try {
                const messageData = {
                    body: this.personalizeMessage(message, recipient),
                    from: fromNumber,
                    to: recipient.phone
                };
                
                if (mediaUrls.length > 0) {
                    messageData.mediaUrl = mediaUrls;
                }
                
                const result = await this.client.messages.create(messageData);
                
                if (result.sid) {
                    results.sent++;
                    
                    await this.storeSMSDeliveryTracking({
                        recipient: recipient,
                        messageSid: result.sid,
                        status: 'sent'
                    });
                } else {
                    results.failed++;
                    results.errors.push(`Failed to send to ${recipient.phone}`);
                }
                
            } catch (error) {
                results.failed++;
                results.errors.push(`Error sending to ${recipient.phone}: ${error.message}`);
                
                await this.storeSMSDeliveryTracking({
                    recipient: recipient,
                    status: 'failed',
                    error: error.message
                });
            }
            
            if (recipients.indexOf(recipient) < recipients.length - 1) {
                await this.delay(this.rateLimitDelay);
            }
        }
        
        return results;
    }

    /**
     * Personalize SMS message with recipient data
     */
    personalizeMessage(message, recipient) {
        return message
            .replace(/\{first_name\}/g, recipient.first_name || recipient.name || 'Customer')
            .replace(/\{last_name\}/g, recipient.last_name || '')
            .replace(/\{name\}/g, recipient.name || recipient.first_name || 'Customer');
    }

    /**
     * Simulate SMS campaign for testing
     */
    simulateSMSCampaign(campaign, recipients) {
        
        const sent = Math.floor(recipients.length * 0.99); // 99% delivery rate
        const failed = recipients.length - sent;
        
        return {
            success: true,
            campaignId: campaign.id,
            metrics: {
                totalRecipients: recipients.length,
                totalSent: sent,
                totalFailed: failed,
                billing: this.calculateSMSBilling(recipients.length, 'shop'),
                testMode: true
            },
            message: `TEST: SMS campaign simulated for ${sent} recipients`
        };
    }

    /**
     * Send marketing SMS to customer segments (legacy method)
     */
    async sendMarketingCampaign({
        campaignId,
        segmentId,
        message,
        mediaUrls = [],
        personalizeMessage = true,
        linkTracking = true,
        scheduledAt = null
    }) {
        if (!this.isInitialized) {
            throw new Error('Twilio SMS service not initialized');
        }

        try {
            const { data: customers, error: segmentError } = await supabase
                .from('customer_segments')
                .select(`
                    customer_id,
                    customers:customer_id (
                        id, phone, first_name, last_name, 
                        sms_opt_in, timezone, country_code
                    )
                `)
                .eq('segment_id', segmentId)
                .eq('customers.sms_opt_in', true);

            if (segmentError) {
                throw new Error(`Failed to fetch segment customers: ${segmentError.message}`);
            }

            if (!customers || customers.length === 0) {
                return {
                    success: true,
                    message: 'No opted-in customers found in segment',
                    sent: 0,
                    failed: 0,
                    estimatedCost: 0
                };
            }

            const results = await this.sendBulkSMS({
                campaignId,
                recipients: customers.map(c => c.customers),
                message,
                mediaUrls,
                personalizeMessage,
                linkTracking
            });

            await this.updateCampaignAnalytics(campaignId, results);

            return results;

        } catch (error) {
            console.error('Marketing campaign send failed:', error);
            throw error;
        }
    }

    /**
     * Send bulk SMS with proper throttling
     */
    async sendBulkSMS({
        campaignId,
        recipients,
        message,
        mediaUrls = [],
        personalizeMessage = true,
        linkTracking = true
    }) {
        const results = {
            sent: 0,
            failed: 0,
            delivered: 0,
            estimatedCost: 0,
            platformRevenue: 0,
            messageIds: [],
            errors: []
        };

        for (let i = 0; i < recipients.length; i++) {
            const customer = recipients[i];
            
            try {
                if (!customer.sms_opt_in) {
                    results.failed++;
                    results.errors.push({
                        phone: customer.phone,
                        error: 'Customer opted out of SMS'
                    });
                    continue;
                }

                let personalizedMessage = message;
                if (personalizeMessage && customer.first_name) {
                    personalizedMessage = message.replace(
                        /\{first_name\}/g, 
                        customer.first_name
                    );
                    personalizedMessage = personalizedMessage.replace(
                        /\{last_name\}/g, 
                        customer.last_name || ''
                    );
                }

                if (linkTracking) {
                    personalizedMessage = await this.addLinkTracking(
                        personalizedMessage, 
                        campaignId, 
                        customer.id
                    );
                }

                const isMediaMessage = mediaUrls && mediaUrls.length > 0;
                const countryCode = customer.country_code || 'US';
                const baseCost = isMediaMessage 
                    ? (this.mmsCosts[countryCode] || this.mmsCosts.DEFAULT)
                    : (this.smsCosts[countryCode] || this.smsCosts.DEFAULT);
                
                const platformCost = baseCost * (this.platformMarkupPercent / 100);
                
                const messageOptions = {
                    body: personalizedMessage,
                    from: this.platformPhoneNumber,
                    to: customer.phone,
                    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
                    statusCallbackMethod: 'POST'
                };

                if (isMediaMessage) {
                    messageOptions.mediaUrl = mediaUrls;
                }

                const twilioMessage = await this.client.messages.create(messageOptions);

                results.sent++;
                results.estimatedCost += baseCost;
                results.platformRevenue += platformCost;
                results.messageIds.push(twilioMessage.sid);

                await this.storeSMSRecord({
                    campaignId,
                    customerId: customer.id,
                    phone: customer.phone,
                    messageSid: twilioMessage.sid,
                    messageBody: personalizedMessage,
                    mediaUrls,
                    baseCost,
                    platformCost,
                    status: 'queued'
                });

                if (i < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                }

            } catch (error) {
                results.failed++;
                results.errors.push({
                    phone: customer.phone,
                    error: error.message
                });
                
                console.error(`Failed to send SMS to ${customer.phone}:`, error);
            }
        }

        return results;
    }

    /**
     * Send individual SMS with retry logic
     */
    async sendSMS({
        to,
        message,
        mediaUrls = [],
        customerId = null,
        campaignId = null,
        retryCount = 0
    }) {
        if (!this.isInitialized) {
            throw new Error('Twilio SMS service not initialized');
        }

        try {
            const messageOptions = {
                body: message,
                from: this.phoneNumber,
                to: to,
                statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
                statusCallbackMethod: 'POST'
            };

            if (mediaUrls && mediaUrls.length > 0) {
                messageOptions.mediaUrl = mediaUrls;
            }

            const twilioMessage = await this.client.messages.create(messageOptions);

            const isMediaMessage = mediaUrls && mediaUrls.length > 0;
            const baseCost = isMediaMessage 
                ? (this.mmsCosts.DEFAULT)
                : (this.smsCosts.DEFAULT);
            const platformCost = baseCost * (this.platformMarkupPercent / 100);

            if (campaignId && customerId) {
                await this.storeSMSRecord({
                    campaignId,
                    customerId,
                    phone: to,
                    messageSid: twilioMessage.sid,
                    messageBody: message,
                    mediaUrls,
                    baseCost,
                    platformCost,
                    status: 'queued'
                });
            }

            return {
                success: true,
                messageSid: twilioMessage.sid,
                cost: baseCost,
                platformRevenue: platformCost
            };

        } catch (error) {
            if (retryCount < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.sendSMS({
                    to,
                    message,
                    mediaUrls,
                    customerId,
                    campaignId,
                    retryCount: retryCount + 1
                });
            }

            throw error;
        }
    }

    /**
     * Handle incoming SMS for opt-out/STOP keywords
     */
    async handleIncomingSMS(twilioWebhook) {
        try {
            const { From: phone, Body: message, MessageSid: messageSid } = twilioWebhook;
            const messageBody = message.trim().toLowerCase();

            const optOutKeywords = [
                'stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'
            ];

            const isOptOut = optOutKeywords.some(keyword => 
                messageBody.includes(keyword)
            );

            if (isOptOut) {
                await this.processOptOut(phone);
                
                await this.sendSMS({
                    to: phone,
                    message: 'You have been unsubscribed from SMS notifications. Reply START to opt back in.'
                });

                return { action: 'opt_out', phone };
            }

            const optInKeywords = ['start', 'yes', 'subscribe'];
            const isOptIn = optInKeywords.some(keyword => 
                messageBody.includes(keyword)
            );

            if (isOptIn) {
                await this.processOptIn(phone);
                
                await this.sendSMS({
                    to: phone,
                    message: 'You have been subscribed to SMS notifications. Reply STOP to unsubscribe.'
                });

                return { action: 'opt_in', phone };
            }

            await this.storeIncomingMessage({
                phone,
                messageBody: message,
                messageSid,
                processedAt: new Date()
            });

            return { action: 'stored', phone };

        } catch (error) {
            console.error('Failed to handle incoming SMS:', error);
            throw error;
        }
    }

    /**
     * Process SMS delivery status updates
     */
    async handleDeliveryStatus(statusWebhook) {
        try {
            const {
                MessageSid: messageSid,
                MessageStatus: status,
                ErrorCode: errorCode,
                ErrorMessage: errorMessage
            } = statusWebhook;

            const { error } = await supabase
                .from('sms_records')
                .update({
                    status,
                    error_code: errorCode,
                    error_message: errorMessage,
                    updated_at: new Date()
                })
                .eq('message_sid', messageSid);

            if (error) {
                console.error('Failed to update SMS status:', error);
                return;
            }

            if (status === 'delivered') {
                const { data: smsRecord } = await supabase
                    .from('sms_records')
                    .select('campaign_id')
                    .eq('message_sid', messageSid)
                    .single();

                if (smsRecord?.campaign_id) {
                    await this.incrementDeliveryCount(smsRecord.campaign_id);
                }
            }

            return { success: true, messageSid, status };

        } catch (error) {
            console.error('Failed to handle delivery status:', error);
            throw error;
        }
    }

    /**
     * Add link tracking to message content
     */
    async addLinkTracking(message, campaignId, customerId) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        return message.replace(urlRegex, (url) => {
            const trackingParams = new URLSearchParams({
                utm_source: 'sms',
                utm_medium: 'marketing',
                utm_campaign: campaignId,
                customer_id: customerId
            });
            
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}${trackingParams.toString()}`;
        });
    }

    /**
     * Process customer opt-out
     */
    async processOptOut(phone) {
        const { error } = await supabase
            .from('customers')
            .update({
                sms_opt_in: false,
                sms_opt_out_date: new Date()
            })
            .eq('phone', phone);

        if (error) {
            console.error('Failed to process opt-out:', error);
            throw error;
        }

        await supabase
            .from('customer_activity')
            .insert({
                phone,
                activity_type: 'sms_opt_out',
                activity_data: { method: 'sms_reply' },
                created_at: new Date()
            });
    }

    /**
     * Process customer opt-in
     */
    async processOptIn(phone) {
        const { error } = await supabase
            .from('customers')
            .update({
                sms_opt_in: true,
                sms_opt_in_date: new Date(),
                sms_opt_out_date: null
            })
            .eq('phone', phone);

        if (error) {
            console.error('Failed to process opt-in:', error);
            throw error;
        }

        await supabase
            .from('customer_activity')
            .insert({
                phone,
                activity_type: 'sms_opt_in',
                activity_data: { method: 'sms_reply' },
                created_at: new Date()
            });
    }

    /**
     * Store SMS record for tracking and billing
     */
    async storeSMSRecord({
        campaignId,
        customerId,
        phone,
        messageSid,
        messageBody,
        mediaUrls,
        baseCost,
        platformCost,
        status
    }) {
        const { error } = await supabase
            .from('sms_records')
            .insert({
                campaign_id: campaignId,
                customer_id: customerId,
                phone,
                message_sid: messageSid,
                message_body: messageBody,
                media_urls: mediaUrls,
                base_cost: baseCost,
                platform_cost: platformCost,
                status,
                sent_at: new Date()
            });

        if (error) {
            console.error('Failed to store SMS record:', error);
            throw error;
        }
    }

    /**
     * Store incoming message
     */
    async storeIncomingMessage({ phone, messageBody, messageSid, processedAt }) {
        const { error } = await supabase
            .from('incoming_sms')
            .insert({
                phone,
                message_body: messageBody,
                message_sid: messageSid,
                processed_at: processedAt,
                created_at: new Date()
            });

        if (error) {
            console.error('Failed to store incoming message:', error);
        }
    }

    /**
     * Update campaign analytics
     */
    async updateCampaignAnalytics(campaignId, results) {
        const { error } = await supabase
            .from('campaign_analytics')
            .upsert({
                campaign_id: campaignId,
                channel: 'sms',
                messages_sent: results.sent,
                messages_failed: results.failed,
                estimated_cost: results.estimatedCost,
                platform_revenue: results.platformRevenue,
                updated_at: new Date()
            }, {
                onConflict: 'campaign_id,channel'
            });

        if (error) {
            console.error('Failed to update campaign analytics:', error);
        }
    }

    /**
     * Increment delivery count for campaign
     */
    async incrementDeliveryCount(campaignId) {
        const { error } = await supabase.rpc('increment_sms_delivered', {
            campaign_id: campaignId
        });

        if (error) {
            console.error('Failed to increment delivery count:', error);
        }
    }

    /**
     * Get SMS metrics for campaign
     */
    async getCampaignSMSMetrics(campaignId) {
        const { data: metrics, error } = await supabase
            .from('sms_records')
            .select(`
                status,
                base_cost,
                platform_cost,
                sent_at,
                customer_id
            `)
            .eq('campaign_id', campaignId);

        if (error) {
            console.error('Failed to get SMS metrics:', error);
            return null;
        }

        const summary = {
            total_sent: metrics.length,
            delivered: metrics.filter(m => m.status === 'delivered').length,
            failed: metrics.filter(m => m.status === 'failed').length,
            pending: metrics.filter(m => m.status === 'queued' || m.status === 'sent').length,
            total_cost: metrics.reduce((sum, m) => sum + (m.base_cost || 0), 0),
            total_revenue: metrics.reduce((sum, m) => sum + (m.platform_cost || 0), 0),
            delivery_rate: metrics.length > 0 
                ? (metrics.filter(m => m.status === 'delivered').length / metrics.length * 100).toFixed(2)
                : 0
        };

        return {
            summary,
            details: metrics
        };
    }

    /**
     * Get service health and configuration
     */
    async getServiceHealth() {
        return {
            service: 'twilio-sms',
            status: this.isInitialized ? 'healthy' : 'unhealthy',
            configuration: {
                phone_number: this.platformPhoneNumber ? 'configured' : 'missing',
                credentials: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) 
                    ? 'configured' : 'missing',
                rate_limit_delay: this.rateLimitDelay,
                platform_markup: `${this.platformMarkupPercent}%`,
                max_retries: this.maxRetries
            },
            features: {
                bulk_sms: true,
                mms_support: true,
                link_tracking: true,
                opt_out_handling: true,
                delivery_tracking: true,
                cost_calculation: true
            }
        };
    }

    /**
     * Store SMS campaign analytics
     */
    async storeSMSCampaignAnalytics(analytics) {
        try {
        } catch (error) {
            console.error('Failed to store SMS analytics:', error);
        }
    }

    /**
     * Store SMS delivery tracking  
     */
    async storeSMSDeliveryTracking(trackingData) {
        try {
        } catch (error) {
            console.error('Failed to store SMS delivery tracking:', error);
        }
    }

    /**
     * Delay utility for rate limiting
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const twilioSMSService = new TwilioSMSService();

module.exports = {
    twilioSMSService,
    TwilioSMSService
};