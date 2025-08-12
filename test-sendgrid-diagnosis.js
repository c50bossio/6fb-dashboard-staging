#!/usr/bin/env node
/**
 * SendGrid Integration Diagnosis & Testing Script
 * 
 * This script tests all aspects of the SendGrid integration:
 * 1. API Key validation
 * 2. Domain verification status
 * 3. Sender authentication
 * 4. Test email sending
 * 5. Error handling validation
 * 
 * @author 6FB AI Agent System
 * @version 1.0.0
 */

const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

class SendGridDiagnostics {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL;
        this.fromName = process.env.SENDGRID_FROM_NAME;
        
        // Configuration validation
        if (!this.apiKey) {
            throw new Error('SENDGRID_API_KEY environment variable is not set');
        }
        
        if (!this.fromEmail) {
            throw new Error('SENDGRID_FROM_EMAIL environment variable is not set');
        }
        
        // Set API key for SendGrid client
        sgMail.setApiKey(this.apiKey);
        
        // API base URLs
        this.sendGridApiBase = 'https://api.sendgrid.com/v3';
        this.headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
        
        console.log('🔧 SendGrid Diagnostics Initialized');
        console.log(`📧 From Email: ${this.fromEmail}`);
        console.log(`👤 From Name: ${this.fromName}`);
        console.log(`🔑 API Key: ${this.apiKey.substring(0, 15)}...`);
    }

    /**
     * Run complete diagnostics suite
     */
    async runCompleteDiagnostics() {
        console.log('\n🚀 Starting SendGrid Complete Diagnostics...\n');
        
        try {
            // Test 1: API Key Validation
            console.log('📋 Test 1: API Key Validation');
            await this.testApiKeyValidation();
            
            // Test 2: Domain Verification Status
            console.log('\n📋 Test 2: Domain Verification Status');
            await this.checkDomainVerification();
            
            // Test 3: Sender Authentication
            console.log('\n📋 Test 3: Sender Authentication');
            await this.checkSenderAuthentication();
            
            // Test 4: Account Information
            console.log('\n📋 Test 4: Account Information');
            await this.getAccountInfo();
            
            // Test 5: Simple Email Test
            console.log('\n📋 Test 5: Simple Email Test');
            await this.testSimpleEmail();
            
            // Test 6: White-label Campaign Test
            console.log('\n📋 Test 6: White-label Campaign Test');
            await this.testWhiteLabelCampaign();
            
            console.log('\n✅ SendGrid Diagnostics Complete!');
            console.log('\n📊 Summary Report Available Above');
            
        } catch (error) {
            console.error('\n❌ Diagnostics Failed:', error.message);
            console.error('\n🔍 Error Details:', error);
        }
    }

    /**
     * Test 1: Validate API Key with simple API call
     */
    async testApiKeyValidation() {
        try {
            const response = await axios.get(`${this.sendGridApiBase}/user/account`, {
                headers: this.headers
            });
            
            console.log('✅ API Key Valid');
            console.log(`   Account Type: ${response.data.type}`);
            console.log(`   Company: ${response.data.company || 'Not set'}`);
            console.log(`   Website: ${response.data.website || 'Not set'}`);
            
            return true;
        } catch (error) {
            console.log('❌ API Key Invalid or Request Failed');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Message: ${error.response?.data?.errors?.[0]?.message || error.message}`);
            
            // Additional debugging for 401 errors
            if (error.response?.status === 401) {
                console.log('\n🔍 401 Unauthorized - Possible Issues:');
                console.log('   1. API Key is incorrect or expired');
                console.log('   2. API Key doesn\'t have required permissions');
                console.log('   3. API Key format is invalid');
                console.log(`   4. Current API Key: ${this.apiKey}`);
            }
            
            throw error;
        }
    }

    /**
     * Test 2: Check domain verification status
     */
    async checkDomainVerification() {
        try {
            // Get authenticated domains
            const domainsResponse = await axios.get(`${this.sendGridApiBase}/whitelabel/domains`, {
                headers: this.headers
            });
            
            console.log('✅ Domain API Access Successful');
            console.log(`   Total Authenticated Domains: ${domainsResponse.data.length}`);
            
            // Check for our specific domain
            const ourDomain = 'em3014.6fbmentorship.com';
            const domainFound = domainsResponse.data.find(d => 
                d.domain === ourDomain || d.subdomain === ourDomain
            );
            
            if (domainFound) {
                console.log(`✅ Domain Found: ${ourDomain}`);
                console.log(`   Status: ${domainFound.valid ? '✅ Verified' : '❌ Not Verified'}`);
                console.log(`   Subdomain: ${domainFound.subdomain}`);
                console.log(`   DNS Valid: ${domainFound.dns?.valid ? '✅ Valid' : '❌ Invalid'}`);
            } else {
                console.log(`❌ Domain Not Found: ${ourDomain}`);
                console.log('   Available domains:');
                domainsResponse.data.forEach(domain => {
                    console.log(`   - ${domain.domain} (${domain.valid ? 'verified' : 'unverified'})`);
                });
            }
            
            // Get sender authentication status
            const sendersResponse = await axios.get(`${this.sendGridApiBase}/verified_senders`, {
                headers: this.headers
            });
            
            console.log(`\n📨 Verified Senders: ${sendersResponse.data.results.length}`);
            const ourSender = sendersResponse.data.results.find(s => s.from_email === this.fromEmail);
            
            if (ourSender) {
                console.log(`✅ Sender Found: ${this.fromEmail}`);
                console.log(`   Verified: ${ourSender.verified ? '✅ Yes' : '❌ No'}`);
                console.log(`   Locked: ${ourSender.locked ? '🔒 Yes' : '🔓 No'}`);
            } else {
                console.log(`❌ Sender Not Found: ${this.fromEmail}`);
                console.log('   Available verified senders:');
                sendersResponse.data.results.forEach(sender => {
                    console.log(`   - ${sender.from_email} (${sender.verified ? 'verified' : 'unverified'})`);
                });
            }
            
        } catch (error) {
            console.log('❌ Domain/Sender Check Failed');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Message: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }

    /**
     * Test 3: Check sender authentication
     */
    async checkSenderAuthentication() {
        try {
            // Check single sender verification API
            const response = await axios.get(`${this.sendGridApiBase}/verified_senders/verify/${encodeURIComponent(this.fromEmail)}`, {
                headers: this.headers
            });
            
            console.log('✅ Sender Authentication Check Complete');
            console.log(`   Email: ${this.fromEmail}`);
            console.log(`   Status: ${response.data ? '✅ Verified' : '❌ Not Verified'}`);
            
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('❌ Sender Not Found in Verified Senders');
                console.log(`   Email: ${this.fromEmail}`);
                console.log('   This email needs to be added as a verified sender');
            } else {
                console.log('❌ Sender Authentication Check Failed');
                console.log(`   Status: ${error.response?.status}`);
                console.log(`   Message: ${error.response?.data?.errors?.[0]?.message || error.message}`);
            }
        }
    }

    /**
     * Test 4: Get account information and limits
     */
    async getAccountInfo() {
        try {
            // Get account details
            const accountResponse = await axios.get(`${this.sendGridApiBase}/user/account`, {
                headers: this.headers
            });
            
            // Get current usage stats
            const statsResponse = await axios.get(`${this.sendGridApiBase}/user/credits`, {
                headers: this.headers
            });
            
            console.log('✅ Account Information Retrieved');
            console.log(`   Account Type: ${accountResponse.data.type}`);
            console.log(`   Account Status: ${accountResponse.data.reputation}`);
            console.log(`   Credits Remaining: ${statsResponse.data.remain || 'Unlimited'}`);
            console.log(`   Credits Used: ${statsResponse.data.used || 0}`);
            
        } catch (error) {
            console.log('❌ Account Information Failed');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Message: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }

    /**
     * Test 5: Send a simple test email
     */
    async testSimpleEmail() {
        const testEmail = 'test@6fbmentorship.com'; // Safe internal test email
        
        const msg = {
            to: testEmail,
            from: {
                email: this.fromEmail,
                name: this.fromName
            },
            subject: `SendGrid Test - ${new Date().toISOString()}`,
            text: 'This is a test email to validate SendGrid integration.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">SendGrid Integration Test</h2>
                    <p>This is a test email to validate the SendGrid integration for the 6FB AI Agent System.</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Test Details</h3>
                        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                        <p><strong>From Email:</strong> ${this.fromEmail}</p>
                        <p><strong>API Key:</strong> ${this.apiKey.substring(0, 15)}...</p>
                    </div>
                    <p style="color: #666; font-size: 12px;">This email was sent as part of SendGrid integration testing.</p>
                </div>
            `,
            customArgs: {
                test_type: 'simple_test',
                timestamp: Date.now().toString()
            }
        };

        try {
            console.log(`📤 Sending test email to: ${testEmail}`);
            const response = await sgMail.send(msg);
            
            console.log('✅ Test Email Sent Successfully');
            console.log(`   Message ID: ${response[0].headers['x-message-id']}`);
            console.log(`   Status Code: ${response[0].statusCode}`);
            console.log(`   Response Body: ${JSON.stringify(response[0].body || {})}`);
            
            return true;
            
        } catch (error) {
            console.log('❌ Test Email Failed');
            console.log(`   Error Code: ${error.code}`);
            console.log(`   Error Message: ${error.message}`);
            
            if (error.response) {
                console.log(`   HTTP Status: ${error.response.status}`);
                console.log(`   Response Body: ${JSON.stringify(error.response.body)}`);
                
                // Parse SendGrid error details
                if (error.response.body && error.response.body.errors) {
                    console.log('\n🔍 Detailed SendGrid Errors:');
                    error.response.body.errors.forEach((err, index) => {
                        console.log(`   ${index + 1}. ${err.message}`);
                        if (err.field) console.log(`      Field: ${err.field}`);
                        if (err.help) console.log(`      Help: ${err.help}`);
                    });
                }
            }
            
            return false;
        }
    }

    /**
     * Test 6: Test white-label campaign functionality
     */
    async testWhiteLabelCampaign() {
        // Mock barbershop data
        const barbershop = {
            id: 'test-shop-001',
            name: 'Elite Cuts Barbershop',
            email: 'owner@elitecuts.com',
            phone: '(555) 123-4567',
            address: '123 Main St, Anytown, USA 12345',
            account_type: 'shop'
        };

        // Mock campaign data
        const campaign = {
            id: 'test-campaign-' + Date.now(),
            name: 'Welcome Campaign Test',
            subject: `Welcome to ${barbershop.name}!`,
            message: `
                <p>Dear Valued Customer,</p>
                <p>Welcome to ${barbershop.name}! We're excited to serve you with the best barbering services in town.</p>
                <p>Book your next appointment with us and experience the difference!</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://book.elitecuts.com" style="background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Book Now</a>
                </div>
                <p>Best regards,<br>The ${barbershop.name} Team</p>
            `
        };

        // Test recipients
        const recipients = [
            {
                id: 'test-customer-1',
                email: 'test@6fbmentorship.com',
                name: 'Test Customer',
                first_name: 'Test'
            }
        ];

        console.log(`📧 Testing White-label Campaign`);
        console.log(`   Shop: ${barbershop.name}`);
        console.log(`   Campaign: ${campaign.name}`);
        console.log(`   Recipients: ${recipients.length}`);

        try {
            // Build white-label email content
            const emailContent = this.buildWhiteLabelEmailContent(campaign, barbershop);
            
            // Prepare SendGrid message
            const msg = {
                from: {
                    email: this.fromEmail,  // Platform's verified domain
                    name: barbershop.name   // Barbershop's name appears as sender
                },
                replyTo: barbershop.email,
                subject: campaign.subject,
                html: emailContent,
                personalizations: recipients.map(recipient => ({
                    to: [{
                        email: recipient.email,
                        name: recipient.name
                    }],
                    customArgs: {
                        campaign_id: campaign.id,
                        barbershop_id: barbershop.id,
                        recipient_id: recipient.id
                    }
                })),
                trackingSettings: {
                    clickTracking: { enable: true },
                    openTracking: { enable: true },
                    subscriptionTracking: { enable: false }
                }
            };

            console.log('📤 Sending white-label campaign email...');
            const response = await sgMail.send(msg);
            
            console.log('✅ White-label Campaign Sent Successfully');
            console.log(`   Message ID: ${response[0].headers['x-message-id']}`);
            console.log(`   Status Code: ${response[0].statusCode}`);
            console.log(`   From: ${msg.from.name} <${msg.from.email}>`);
            console.log(`   Reply-To: ${msg.replyTo}`);
            
            return true;
            
        } catch (error) {
            console.log('❌ White-label Campaign Failed');
            console.log(`   Error Code: ${error.code}`);
            console.log(`   Error Message: ${error.message}`);
            
            if (error.response) {
                console.log(`   HTTP Status: ${error.response.status}`);
                console.log(`   Response Body: ${JSON.stringify(error.response.body)}`);
            }
            
            return false;
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
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2c3e50; margin-bottom: 20px;">${barbershop.name}</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${campaign.message}
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                        <p style="margin: 5px 0; font-size: 14px; color: #666;">
                            <strong>${barbershop.name}</strong><br>
                            ${barbershop.email}<br>
                            ${barbershop.phone}<br>
                            ${barbershop.address}
                        </p>
                    </div>
                    
                    <div style="font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
                        <p>You received this email because you are a valued customer of ${barbershop.name}.</p>
                        <p><a href="{{unsubscribe}}" style="color: #666;">Unsubscribe</a> | <a href="mailto:${barbershop.email}" style="color: #666;">Contact Us</a></p>
                        <p style="font-size: 10px; color: #ccc;">Sent via 6FB Marketing Platform</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate diagnostic report
     */
    generateDiagnosticReport() {
        console.log('\n📊 SendGrid Integration Diagnostic Report');
        console.log('=' .repeat(50));
        console.log(`Generated: ${new Date().toISOString()}`);
        console.log(`API Key: ${this.apiKey.substring(0, 15)}...`);
        console.log(`From Email: ${this.fromEmail}`);
        console.log(`From Name: ${this.fromName}`);
        console.log('\nRecommendations:');
        console.log('1. Ensure domain verification is complete');
        console.log('2. Add sender email to verified senders list');
        console.log('3. Test with small recipient lists first');
        console.log('4. Monitor deliverability metrics');
        console.log('5. Implement proper error handling and retry logic');
    }
}

// Run diagnostics if script is executed directly
if (require.main === module) {
    const diagnostics = new SendGridDiagnostics();
    
    // Run complete diagnostic suite
    diagnostics.runCompleteDiagnostics()
        .then(() => {
            diagnostics.generateDiagnosticReport();
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Diagnostic Suite Failed:', error.message);
            diagnostics.generateDiagnosticReport();
            process.exit(1);
        });
}

module.exports = SendGridDiagnostics;