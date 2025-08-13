# Production Monitoring Dashboard Setup Guide

## Overview
Complete guide for setting up production monitoring dashboards for the 6FB AI Agent System paywall and subscription features.

## 1. Key Metrics Dashboard

### Revenue Metrics
Monitor real-time revenue performance:

```javascript
// Available at: /admin/subscriptions
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR) 
- Customer Lifetime Value (CLV)
- Average Revenue Per User (ARPU)
- Churn Rate
- Growth Rate
```

### Access the Dashboard
1. Navigate to: https://yourdomain.com/admin/subscriptions
2. Login with SUPER_ADMIN credentials
3. View real-time metrics updated every 30 seconds

## 2. Conversion Funnel Analytics

### PostHog Setup
1. **Access PostHog Dashboard**:
   - URL: https://app.posthog.com
   - Login with your PostHog account

2. **Create Funnel Dashboard**:
   ```javascript
   // Events tracked automatically:
   - page_view (subscribe page)
   - pricing_tier_viewed
   - billing_toggle_clicked
   - plan_selected
   - checkout_started
   - subscription_created
   - subscription_canceled
   ```

3. **Create Funnel Visualization**:
   - Go to Insights → New Insight → Funnel
   - Add steps:
     1. page_view (subscribe)
     2. plan_selected
     3. checkout_started
     4. subscription_created
   - Save as "Subscription Conversion Funnel"

### Google Analytics Setup
1. **Create Custom Dashboard**:
   - Go to Customization → Custom Reports
   - Create "Paywall Performance" dashboard

2. **Add Widgets**:
   - Conversion Rate by Plan
   - Average Session Duration on Pricing Page
   - Bounce Rate on Subscribe Page
   - Revenue by Traffic Source

## 3. Stripe Dashboard Configuration

### Key Reports to Enable
1. **Revenue Reports**:
   - Go to Stripe Dashboard → Reports
   - Enable "Recurring Revenue"
   - Enable "Customer Lifetime Value"
   - Enable "Churn Analysis"

2. **Custom Webhooks Monitor**:
   - Go to Developers → Webhooks
   - Monitor endpoint health
   - Set up alerts for failures

3. **Subscription Metrics**:
   - Enable "Subscription Analytics"
   - Track upgrades/downgrades
   - Monitor failed payments

## 4. Error Monitoring (Sentry)

### Setup Alerts
1. **Create Alert Rules**:
   ```javascript
   // Critical Alerts:
   - Payment failures > 5 in 1 hour
   - Webhook failures > 3 in 10 minutes
   - Database connection errors
   - Stripe API errors
   ```

2. **Configure Notifications**:
   - Email: team@yourdomain.com
   - Slack: #payments-alerts
   - PagerDuty: critical-issues

## 5. Custom Monitoring Dashboard

### Internal Metrics API
Access real-time metrics via API:

```bash
# Get current metrics
curl https://yourdomain.com/api/admin/subscriptions/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "revenue": {
    "mrr": 12500,
    "arr": 150000,
    "arpu": 45.50,
    "clv": 546.00
  },
  "subscriptions": {
    "total": 275,
    "active": 250,
    "trialing": 15,
    "past_due": 10
  },
  "growth": {
    "new_today": 5,
    "canceled_today": 1,
    "net_growth": 4,
    "churn_rate": 2.5
  }
}
```

### Grafana Dashboard (Optional)
1. **Install Grafana**:
   ```bash
   docker run -d -p 3000:3000 grafana/grafana
   ```

2. **Configure Data Sources**:
   - Add PostgreSQL (Supabase)
   - Add Prometheus (if using)
   - Add API data source

3. **Import Dashboard Template**:
   - Download: /monitoring/grafana-dashboard.json
   - Import via Grafana UI

## 6. Real-time Alerts Setup

### Critical Alerts
Configure immediate notifications for:

1. **Payment Issues**:
   - Failed payment > $100
   - Multiple failures from same customer
   - Webhook delivery failures

2. **System Health**:
   - API response time > 2 seconds
   - Database connection pool exhausted
   - Memory usage > 80%

3. **Business Metrics**:
   - Daily revenue below threshold
   - Churn rate spike (> 5%)
   - Conversion rate drop (> 20%)

### Alert Channels
```javascript
// Configure in /config/monitoring.js
export const alertChannels = {
  email: {
    critical: ['ceo@company.com', 'cto@company.com'],
    warning: ['dev-team@company.com'],
    info: ['metrics@company.com']
  },
  slack: {
    critical: '#payments-critical',
    warning: '#payments-warnings',
    info: '#metrics'
  },
  sms: {
    critical: ['+1234567890'] // CEO phone
  }
}
```

## 7. Daily/Weekly Reports

### Automated Email Reports
Configure SendGrid to send:

1. **Daily Report (9 AM)**:
   - Yesterday's revenue
   - New subscriptions
   - Cancellations
   - Failed payments

2. **Weekly Report (Monday 9 AM)**:
   - Week-over-week growth
   - Top performing plans
   - Churn analysis
   - Revenue forecast

### Report Configuration
```javascript
// In /api/scheduled/reports.js
export const reportSchedule = {
  daily: {
    time: '09:00',
    recipients: ['team@company.com'],
    metrics: ['revenue', 'subscriptions', 'failures']
  },
  weekly: {
    day: 'monday',
    time: '09:00',
    recipients: ['leadership@company.com'],
    metrics: ['growth', 'churn', 'forecast', 'cohort']
  }
}
```

## 8. Mobile Monitoring

### Mobile App Integration
For monitoring on the go:

1. **Stripe Mobile App**:
   - Download Stripe Dashboard app
   - Monitor payments in real-time
   - Get push notifications

2. **PostHog Mobile**:
   - Access via mobile browser
   - Create mobile-friendly dashboards

3. **Custom Slack Bot**:
   ```javascript
   // Commands:
   /metrics mrr - Get current MRR
   /metrics today - Today's signups
   /metrics churn - Current churn rate
   /alert payment-failed - Recent failures
   ```

## 9. Performance Monitoring

### Core Web Vitals
Track via Google Analytics:
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1

### API Performance
Monitor endpoint performance:
```javascript
// Target metrics:
- /api/stripe/create-checkout: < 500ms
- /api/subscription/status: < 200ms
- /api/admin/metrics: < 1000ms
```

## 10. Security Monitoring

### Track Security Events
1. **Failed Admin Logins**:
   - Alert after 3 failed attempts
   - Lock account after 5 attempts

2. **Unusual Activity**:
   - Multiple subscription changes
   - Bulk data exports
   - API rate limit violations

3. **Compliance Monitoring**:
   - GDPR data requests
   - PCI compliance checks
   - SSL certificate expiry

## Quick Setup Checklist

- [ ] Access admin dashboard at /admin/subscriptions
- [ ] Configure PostHog funnel tracking
- [ ] Set up Stripe webhook monitoring
- [ ] Configure Sentry error alerts
- [ ] Create Slack integration for alerts
- [ ] Set up daily/weekly email reports
- [ ] Test all alert channels
- [ ] Configure mobile access
- [ ] Set up performance monitoring
- [ ] Enable security event tracking

## Support

For monitoring setup assistance:
- Technical: dev-team@company.com
- Business metrics: analytics@company.com
- Urgent issues: Slack #payments-critical

## Next Steps

1. Complete monitoring setup using this guide
2. Test all alert channels
3. Train team on dashboard usage
4. Schedule weekly metrics review meetings
5. Create monthly executive reports

---

Last Updated: December 2024
Version: 1.0.0