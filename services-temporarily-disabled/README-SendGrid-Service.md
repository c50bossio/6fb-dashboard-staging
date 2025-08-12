# SendGrid Email Service Documentation

## Overview

The SendGrid Email Service is a comprehensive email marketing solution designed for barbershop businesses. It provides enterprise-grade email campaign management with built-in analytics, cost tracking, and compliance features.

## Key Features

### ✅ Email Campaign Management
- **Bulk Email Sending**: Process emails in batches of 1000 (SendGrid limit)
- **Rate Limiting**: Conservative 10 emails/second to ensure deliverability
- **Campaign Analytics**: Real-time tracking of opens, clicks, bounces, and unsubscribes
- **Template System**: Pre-built and custom email templates
- **Personalization**: Merge tags and dynamic content personalization

### 💰 Cost Optimization & Billing
- **Platform Markup**: 50-95% markup on SendGrid costs for profit
- **Tiered Pricing**: Starter, Professional, Business, Enterprise plans
- **Cost Tracking**: Real-time cost calculation and profit margin analysis
- **Competitive Pricing**: 50-80% cheaper than Mailchimp/Klaviyo

### 📊 Analytics & Tracking
- **Real-time Metrics**: Open rates, click rates, bounce rates, unsubscribe rates
- **Webhook Integration**: Automatic event processing from SendGrid
- **Campaign ROI**: Revenue tracking and performance analysis
- **Recipient Tracking**: Individual email status and engagement history

### 🔒 Compliance & Security
- **CAN-SPAM Compliance**: Automatic unsubscribe links and sender information
- **GDPR Support**: Data export and deletion capabilities
- **Webhook Verification**: Cryptographic signature verification for security
- **Rate Limiting**: Built-in protection against abuse

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Next.js API    │    │   SendGrid      │
│   Dashboard     │◄──►│   Endpoints      │◄──►│   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐    ┌─────────────────┐
                        │   Supabase       │    │   Webhook       │
                        │   Database       │◄───┤   Events        │
                        └──────────────────┘    └─────────────────┘
```

## Files Structure

```
services/
├── sendgrid-service.js              # Main service implementation
├── README-SendGrid-Service.md       # This documentation

database/
├── campaign-analytics-schema.sql    # Database schema for analytics

app/api/
├── campaigns/route.js               # Campaign CRUD API
└── webhooks/sendgrid/route.js       # SendGrid webhook handler

components/marketing/
└── EmailCampaignDashboard.js        # React dashboard component

scripts/
└── setup-sendgrid-dependencies.js  # Setup and validation script
```

## Installation & Setup

### 1. Install Dependencies

```bash
# Run the setup script
node scripts/setup-sendgrid-dependencies.js

# Or install manually
npm install @sendgrid/mail @supabase/supabase-js
```

### 2. Environment Configuration

Create/update `.env.local`:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_WEBHOOK_VERIFICATION_KEY=your_webhook_verification_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Default email settings
DEFAULT_FROM_EMAIL=noreply@yourbarbershop.com
DEFAULT_FROM_NAME=Your Barbershop
```

### 3. Database Setup

1. Copy contents of `database/campaign-analytics-schema.sql`
2. Paste and execute in Supabase SQL Editor
3. Verify tables are created with RLS policies

### 4. SendGrid Configuration

#### Get API Key:
1. Go to [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
2. Create new API key with "Mail Send" permissions
3. Add to environment variables

#### Configure Webhook:
1. Go to [SendGrid Event Webhook](https://app.sendgrid.com/settings/mail_settings)
2. Set HTTP Post URL: `https://yourdomain.com/api/webhooks/sendgrid`
3. Enable events: Delivered, Bounced, Opened, Clicked, Unsubscribed, Spam Report
4. Get verification key and add to environment variables

### 5. Test Installation

```bash
# Run test script
node test-sendgrid-service.js

# Check webhook endpoint
curl https://yourdomain.com/api/webhooks/sendgrid
```

## Usage Examples

### Basic Campaign Sending

```javascript
import { sendGridService } from './services/sendgrid-service.js';

const campaignConfig = {
    campaignName: 'Welcome Series',
    recipients: [
        { email: 'customer@example.com', name: 'John Doe' }
    ],
    subject: 'Welcome to {{shop_name}}!',
    htmlContent: sendGridService.getEmailTemplates().welcome.html,
    fromEmail: 'noreply@barbershop.com',
    fromName: 'Elite Cuts Barbershop',
    planTier: 'PROFESSIONAL',
    userId: 'user-123',
    personalizationData: {
        shop_name: 'Elite Cuts',
        booking_link: 'https://book.elitecuts.com'
    }
};

const result = await sendGridService.sendEmailCampaign(campaignConfig);
console.log('Campaign Results:', result);
```

### Campaign Analytics

```javascript
// Get campaign analytics
const analytics = await sendGridService.getCampaignAnalytics(
    'campaign_123', 
    'user-123'
);

console.log('Open Rate:', analytics.campaign.performance.openRate + '%');
console.log('Revenue:', analytics.campaign.total_charged);
console.log('Profit:', analytics.campaign.profit_margin);
```

### API Endpoints

```javascript
// List campaigns
const response = await fetch('/api/campaigns?userId=user-123');
const { campaigns, summary } = await response.json();

// Create campaign
const campaignResponse = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaignConfig)
});
```

## Email Templates

The service includes pre-built templates:

### Welcome Email
- **Purpose**: New customer onboarding
- **Merge Tags**: `{{name}}`, `{{shop_name}}`, `{{booking_link}}`
- **CTA**: Book first appointment

### Promotional Offer
- **Purpose**: Discount campaigns and special offers
- **Merge Tags**: `{{discount}}`, `{{expiry_date}}`, `{{promo_code}}`
- **CTA**: Claim offer with booking

### Appointment Reminder
- **Purpose**: Automated appointment reminders
- **Merge Tags**: `{{appointment_date}}`, `{{service_name}}`, `{{barber_name}}`
- **CTA**: Reschedule or cancel options

### Custom Templates
Create custom templates in the database:

```sql
INSERT INTO email_templates (
    user_id, template_name, template_type, 
    subject_line, html_content, merge_tags
) VALUES (
    'user-123', 'Custom Promotion', 'promotion',
    'Special Offer: {{discount}}% Off',
    '<html>Your custom HTML here with {{merge_tags}}</html>',
    '["discount", "shop_name", "booking_link"]'::jsonb
);
```

## Pricing Tiers

| Plan | Monthly Price | Emails Included | Cost/1000 | Markup | Competitor Price | Savings |
|------|---------------|-----------------|-----------|---------|------------------|---------|
| **Starter** | $19 | 5,000 | $3.80 | 95% | $39 (Mailchimp) | $20 |
| **Professional** | $29 | 10,000 | $2.90 | 80% | $59 (Mailchimp) | $30 |
| **Business** | $49 | 25,000 | $1.96 | 65% | $99 (Mailchimp) | $50 |
| **Enterprise** | $89 | 100,000 | $0.89 | 50% | $299 (Mailchimp) | $210 |

## Database Schema

### campaign_analytics
Primary table for campaign tracking:
- Campaign metadata and configuration
- Email metrics (sent, delivered, opened, clicked)
- Cost tracking and profit margins
- Performance calculations

### email_recipients
Individual recipient tracking:
- Delivery status and engagement
- Personalization data
- SendGrid message IDs for correlation

### email_templates
Reusable email templates:
- HTML and text content
- Merge tag definitions
- Usage statistics

### customer_segments
Target audience definitions:
- Segmentation criteria (JSON rules)
- Automatic customer counting
- Campaign targeting

## Webhook Event Processing

The service automatically processes SendGrid webhook events:

1. **Signature Verification**: Cryptographic validation for security
2. **Event Processing**: Updates recipient status and campaign metrics
3. **Analytics Update**: Real-time performance metric calculations
4. **Error Handling**: Graceful handling of malformed or duplicate events

### Supported Events
- `delivered`: Email successfully delivered
- `bounce`: Email bounced (hard or soft)
- `open`: Email opened by recipient
- `click`: Link clicked in email
- `unsubscribe`: Recipient unsubscribed
- `spamreport`: Email marked as spam

## Performance Optimization

### Batching Strategy
- **Batch Size**: 1000 emails per batch (SendGrid limit)
- **Rate Limiting**: 10 emails/second to ensure deliverability
- **Parallel Processing**: Multiple batches processed concurrently
- **Error Isolation**: Failed batches don't affect successful ones

### Database Optimization
- **Indexed Queries**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Efficient database connection management
- **Bulk Operations**: Batch database updates for efficiency
- **Query Optimization**: Optimized SQL for analytics calculations

## Monitoring & Troubleshooting

### Health Checks
```bash
# Check service health
curl https://yourdomain.com/api/webhooks/sendgrid

# Test campaign creation
node test-sendgrid-service.js
```

### Common Issues

#### 1. Webhook Not Receiving Events
- Verify webhook URL is accessible
- Check SendGrid webhook configuration
- Validate signature verification key

#### 2. High Bounce Rates
- Review email content for spam indicators
- Verify sender domain authentication
- Clean recipient lists regularly

#### 3. Low Open Rates
- Test subject lines and content
- Check sender reputation
- Verify email design and formatting

### Logging
The service provides comprehensive logging:
- Campaign creation and sending
- Webhook event processing
- Error tracking and debugging
- Performance metrics

## Security Considerations

### Data Protection
- **Encryption**: Sensitive data encrypted at rest
- **Access Control**: Row-level security policies
- **API Security**: Rate limiting and input validation
- **Webhook Verification**: Cryptographic signature validation

### Compliance
- **CAN-SPAM**: Automatic compliance features
- **GDPR**: Data export and deletion capabilities
- **Unsubscribe Management**: Global unsubscribe list
- **Audit Trail**: Complete activity logging

## Future Enhancements

### Planned Features
- **A/B Testing**: Subject line and content testing
- **Advanced Segmentation**: Machine learning-based segments
- **Automated Sequences**: Drip campaigns and workflows
- **Predictive Analytics**: Customer lifetime value prediction
- **Multi-language Support**: Localization capabilities

### Integration Opportunities
- **CRM Integration**: Customer data synchronization
- **POS Integration**: Purchase-triggered campaigns
- **Calendar Integration**: Appointment-based automation
- **Social Media**: Cross-platform campaign coordination

## Support & Resources

### Documentation
- [SendGrid API Documentation](https://docs.sendgrid.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

### Community
- [SendGrid Community](https://community.sendgrid.com/)
- [Supabase Community](https://github.com/supabase/supabase/discussions)

### Contact
For technical support or questions about the SendGrid Email Service:
- GitHub Issues: Create an issue in the project repository
- Documentation Updates: Submit pull requests for improvements

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-12  
**Compatibility**: Node.js 18+, Next.js 14+, Supabase