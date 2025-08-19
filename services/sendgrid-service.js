#!/usr/bin/env node
/**
 * SendGrid Email Service - Fixed & Enhanced Version
 * 
 * Comprehensive email marketing service with:
 * - Robust error handling and retry logic
 * - API key validation and verification
 * - Domain verification status checking
 * - Fallback mechanisms for development
 * - Real email testing capabilities
 * - White-label campaign functionality
 * 
 * @version 3.0.0
 * @author 6FB AI Agent System
 */

const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const crypto = require('crypto');

class EnhancedSendGridService {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com';
        this.fromName = process.env.SENDGRID_FROM_NAME || 'BookedBarber';
        this.platformDomain = process.env.PLATFORM_DOMAIN || 'bookedbarber.com';
        
        this.sendGridApiBase = 'https://api.sendgrid.com/v3';
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second base delay
        
        this.initializeService();
    }

    /**
     * Initialize service with validation
     */
    async initializeService() {
        if (process.env.NODE_ENV === 'development') {
        }
        
        if (!this.apiKey || this.apiKey.includes('placeholder')) {
            console.warn('⚠️  SendGrid API key not configured or is placeholder');
            this.testMode = true;
            this.validationStatus = 'API_KEY_MISSING';
            return;
        }

        sgMail.setApiKey(this.apiKey);
        
        try {
            await this.validateApiKey();
            this.testMode = false;
            this.validationStatus = 'VALIDATED';
            if (process.env.NODE_ENV === 'development') {
            }
        } catch (error) {
            console.warn('⚠️  SendGrid API key validation failed:', error.message);
            this.testMode = true;
            this.validationStatus = 'VALIDATION_FAILED';
            this.validationError = error.message;
        }
    }

    /**
     * Validate API key with retry logic
     */
    async validateApiKey() {
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await axios.get(`${this.sendGridApiBase}/user/account`, { headers });
                
                this.accountInfo = {
                    type: response.data.type,
                    company: response.data.company,
                    website: response.data.website
                };
                
                return true;
                
            } catch (error) {
                
                if (attempt === this.retryAttempts) {
                    if (error.response?.status === 401) {
                        throw new Error('Invalid or expired API key. Please check your SendGrid API key.');
                    } else if (error.response?.status === 403) {
                        throw new Error('API key does not have required permissions.');
                    } else {
                        throw new Error(`API validation failed: ${error.message}`);
                    }
                }
                
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    /**
     * Check domain verification status
     */
    async checkDomainVerification() {
        if (this.testMode) {
            return { verified: false, testMode: true };
        }

        try {
            const headers = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            };

            const domainsResponse = await axios.get(`${this.sendGridApiBase}/whitelabel/domains`, { headers });
            
            const ourDomain = 'em3014.6fbmentorship.com';
            const domainFound = domainsResponse.data.find(d => 
                d.domain === ourDomain || d.subdomain === ourDomain
            );

            if (domainFound) {
                return {
                    verified: domainFound.valid,
                    domain: ourDomain,
                    subdomain: domainFound.subdomain,
                    dnsValid: domainFound.dns?.valid
                };
            }

            const sendersResponse = await axios.get(`${this.sendGridApiBase}/verified_senders`, { headers });
            const senderFound = sendersResponse.data.results.find(s => s.from_email === this.fromEmail);

            return {
                verified: senderFound?.verified || false,
                domain: null,
                senderVerified: senderFound?.verified,
                fallbackMethod: 'verified_senders'
            };

        } catch (error) {
            console.error('Domain verification check failed:', error.message);
            return { verified: false, error: error.message };
        }
    }

    /**
     * Send enhanced test email with comprehensive error handling
     */
    async sendTestEmail(testRecipient) {
        if (!testRecipient) {
            throw new Error('Test recipient email is required');
        }

        if (this.testMode) {
            return this.simulateEmailSend(testRecipient);
        }

        const msg = {
            to: testRecipient,
            from: {
                email: this.fromEmail,
                name: this.fromName
            },
            subject: `SendGrid Test - ${new Date().toISOString()}`,
            text: 'Enhanced SendGrid integration test email.',
            html: this.buildTestEmailHtml(),
            customArgs: {
                test_type: 'enhanced_test',
                timestamp: Date.now().toString(),
                version: '3.0.0'
            }
        };

        return await this.sendEmailWithRetry(msg);
    }

    /**
     * Send email with retry logic and enhanced error handling
     */
    async sendEmailWithRetry(msg) {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                
                const response = await sgMail.send(msg);
                
                
                return {
                    success: true,
                    messageId: response[0].headers['x-message-id'],
                    statusCode: response[0].statusCode,
                    attempt: attempt
                };
                
            } catch (error) {
                
                const errorDetails = this.parseEmailError(error);
                
                if (attempt === this.retryAttempts || !this.shouldRetryError(error)) {
                    return {
                        success: false,
                        error: errorDetails,
                        finalAttempt: attempt,
                        totalAttempts: this.retryAttempts
                    };
                }
                
                await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
            }
        }
    }

    /**
     * Parse email sending errors
     */
    parseEmailError(error) {
        const errorDetails = {
            code: error.code,
            message: error.message,
            type: 'UNKNOWN_ERROR'
        };

        if (error.response) {
            errorDetails.httpStatus = error.response.status;
            errorDetails.httpBody = error.response.body;

            if (error.response.body && error.response.body.errors) {
                errorDetails.sendgridErrors = error.response.body.errors;
                errorDetails.type = this.categorizeError(error.response.body.errors[0]);
            }

            switch (error.response.status) {
                case 400:
                    errorDetails.type = 'BAD_REQUEST';
                    break;
                case 401:
                    errorDetails.type = 'UNAUTHORIZED';
                    break;
                case 403:
                    errorDetails.type = 'FORBIDDEN';
                    break;
                case 413:
                    errorDetails.type = 'PAYLOAD_TOO_LARGE';
                    break;
                case 429:
                    errorDetails.type = 'RATE_LIMITED';
                    break;
                case 500:
                    errorDetails.type = 'SERVER_ERROR';
                    break;
            }
        }

        return errorDetails;
    }

    /**
     * Categorize SendGrid error for better handling
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('domain')) return 'DOMAIN_ERROR';
        if (message.includes('sender')) return 'SENDER_ERROR';
        if (message.includes('authorization')) return 'AUTH_ERROR';
        if (message.includes('permission')) return 'PERMISSION_ERROR';
        if (message.includes('rate limit')) return 'RATE_LIMIT';
        if (message.includes('email')) return 'EMAIL_FORMAT_ERROR';
        
        return 'GENERAL_ERROR';
    }

    /**
     * Determine if error should trigger retry
     */
    shouldRetryError(error) {
        if (!error.response) return true; // Network errors should retry
        
        const status = error.response.status;
        
        if (status >= 400 && status < 500 && status !== 429) {
            return false;
        }
        
        return status >= 500 || status === 429;
    }

    /**
     * Send white-label campaign with enhanced error handling
     */
    async sendWhiteLabelCampaign(campaign, barbershop, recipients) {

        if (this.testMode) {
            return this.simulateWhiteLabelCampaign(campaign, barbershop, recipients);
        }

        try {
            const emailContent = this.buildWhiteLabelEmailContent(campaign, barbershop);
            
            const msg = {
                from: {
                    email: this.fromEmail,
                    name: barbershop.name
                },
                replyTo: barbershop.email || this.fromEmail,
                subject: campaign.subject,
                html: emailContent,
                personalizations: recipients.map(recipient => ({
                    to: [{
                        email: recipient.email,
                        name: recipient.name || 'Customer'
                    }],
                    customArgs: {
                        campaign_id: campaign.id,
                        barbershop_id: barbershop.id,
                        recipient_id: recipient.id || crypto.randomUUID()
                    }
                })),
                trackingSettings: {
                    clickTracking: { enable: true },
                    openTracking: { enable: true },
                    subscriptionTracking: { enable: false }
                }
            };

            const result = await this.sendEmailWithRetry(msg);
            
            if (result.success) {
                return {
                    success: true,
                    campaignId: campaign.id,
                    messageId: result.messageId,
                    recipientCount: recipients.length,
                    barbershop: barbershop.name
                };
            } else {
                throw new Error(`Campaign send failed: ${result.error.message}`);
            }

        } catch (error) {
            console.error('White-label campaign failed:', error.message);
            return {
                success: false,
                error: error.message,
                campaignId: campaign.id,
                recipientCount: recipients.length
            };
        }
    }

    /**
     * Build white-label email content
     */
    buildWhiteLabelEmailContent(campaign, barbershop) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${campaign.subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
                <!-- Barbershop Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c3e50; margin: 0;">${barbershop.name}</h1>
                    <p style="color: #666; margin: 5px 0;">${barbershop.email} | ${barbershop.phone || ''}</p>
                </div>
                
                <!-- Campaign Content -->
                <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div>${campaign.message}</div>
                    
                    <!-- Call to Action -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${barbershop.booking_url || '#'}" 
                           style="background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Book Now
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
                    <p><strong>${barbershop.name}</strong></p>
                    <p>${barbershop.address || ''}</p>
                    <p>
                        <a href="{{unsubscribe}}" style="color: #666;">Unsubscribe</a> | 
                        <a href="mailto:${barbershop.email}" style="color: #666;">Contact Us</a>
                    </p>
                    <p style="font-size: 10px; color: #999;">Powered by 6FB Marketing Platform</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Build test email HTML
     */
    buildTestEmailHtml() {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">SendGrid Integration Test</h2>
            <p>This is an enhanced test email to validate the SendGrid integration.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Service Information</h3>
                <p><strong>Service Version:</strong> 3.0.0</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>From Email:</strong> ${this.fromEmail}</p>
                <p><strong>Validation Status:</strong> ${this.validationStatus}</p>
                <p><strong>Test Mode:</strong> ${this.testMode ? 'Yes' : 'No'}</p>
            </div>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                <h4 style="margin: 0; color: #155724;">Test Results</h4>
                <p style="margin: 10px 0; color: #155724;">If you received this email, the SendGrid integration is working correctly!</p>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This email was sent as part of SendGrid integration testing for the 6FB AI Agent System.
            </p>
        </div>
        `;
    }

    /**
     * Simulate email send for test mode
     */
    simulateEmailSend(recipient) {
        
        return {
            success: true,
            testMode: true,
            messageId: 'test-' + Date.now(),
            recipient: recipient,
            validationStatus: this.validationStatus,
            reason: this.validationError || 'Test mode active'
        };
    }

    /**
     * Simulate white-label campaign for test mode
     */
    simulateWhiteLabelCampaign(campaign, barbershop, recipients) {
        
        return {
            success: true,
            testMode: true,
            campaignId: campaign.id,
            messageId: 'test-campaign-' + Date.now(),
            recipientCount: recipients.length,
            barbershop: barbershop.name,
            validationStatus: this.validationStatus
        };
    }

    /**
     * Get service status and diagnostics
     */
    getServiceStatus() {
        return {
            initialized: true,
            testMode: this.testMode,
            validationStatus: this.validationStatus,
            validationError: this.validationError,
            apiKeyConfigured: !!this.apiKey && !this.apiKey.includes('placeholder'),
            fromEmail: this.fromEmail,
            fromName: this.fromName,
            accountInfo: this.accountInfo || null,
            retryAttempts: this.retryAttempts,
            version: '3.0.0'
        };
    }

    /**
     * Utility: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique campaign ID
     */
    generateCampaignId(campaignName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '');
        const hash = crypto.createHash('md5').update(campaignName + timestamp).digest('hex').substring(0, 8);
        return `campaign_${timestamp}_${hash}`;
    }
}

module.exports = EnhancedSendGridService;

const enhancedSendGridService = new EnhancedSendGridService();
module.exports.enhancedSendGridService = enhancedSendGridService;
module.exports.sendGridEmailService = enhancedSendGridService;

if (require.main === module) {
    
    const runTests = async () => {
        const service = new EnhancedSendGridService();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        
        const domainStatus = await service.checkDomainVerification();
        
        const emailResult = await service.sendTestEmail();
        
        const campaign = {
            id: 'test-campaign-001',
            name: 'Welcome Campaign',
            subject: 'Welcome to Elite Cuts!',
            message: '<p>Welcome to our barbershop! We look forward to serving you.</p>'
        };
        
        const barbershop = {
            id: 'shop-001',
            name: 'Elite Cuts Barbershop',
            email: 'owner@elitecuts.com',
            phone: '(555) 123-4567',
            address: '123 Main St, Anytown, USA'
        };
        
        const recipients = [
            { id: 'cust-001', email: 'customer@example.com', name: 'Test Customer' }
        ];
        
        const campaignResult = await service.sendWhiteLabelCampaign(campaign, barbershop, recipients);
        
    };
    
    runTests().catch(console.error);
}