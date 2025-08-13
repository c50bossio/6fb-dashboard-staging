# Admin Dashboard Training Guide

## 🎯 Overview
Complete training guide for team members on using the 6FB AI Agent System Admin Dashboard for subscription management, metrics monitoring, and customer support.

## 📋 Table of Contents
1. [Access & Authentication](#access--authentication)
2. [Dashboard Overview](#dashboard-overview)
3. [Revenue Metrics](#revenue-metrics)
4. [Subscription Management](#subscription-management)
5. [Customer Support Actions](#customer-support-actions)
6. [Reports & Analytics](#reports--analytics)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Quick Reference](#quick-reference)

---

## 1. Access & Authentication

### Getting Admin Access
1. **URL**: https://yourdomain.com/admin/subscriptions
2. **Required Role**: SUPER_ADMIN
3. **Login Process**:
   - Use your regular login credentials
   - System automatically checks for admin privileges
   - If not authorized, contact system administrator

### Security Requirements
- Strong password (minimum 12 characters)
- 2FA enabled (recommended)
- Session timeout: 30 minutes of inactivity
- All actions are logged for audit

## 2. Dashboard Overview

### Main Sections
![Dashboard Layout]
```
┌─────────────────────────────────────┐
│         Admin Header                │
├─────────────────────────────────────┤
│     Revenue Metrics Cards           │
├─────────────────────────────────────┤
│     Growth Chart                    │
├─────────────────────────────────────┤
│     Payment Issues Alert            │
├─────────────────────────────────────┤
│     Subscription Table              │
└─────────────────────────────────────┘
```

### Navigation
- **Subscriptions**: Main subscription management
- **Users**: User account management
- **Support**: Support ticket system
- **Analytics**: Detailed analytics
- **Settings**: System configuration

## 3. Revenue Metrics

### Key Performance Indicators (KPIs)

#### Monthly Recurring Revenue (MRR)
- **Definition**: Total predictable revenue per month
- **Formula**: Sum of all active monthly subscriptions
- **Target**: $10,000+ per month
- **Action if Low**: Review pricing strategy, increase marketing

#### Annual Recurring Revenue (ARR)
- **Definition**: MRR × 12
- **Use**: Long-term planning and valuation
- **Target**: $120,000+ per year

#### Churn Rate
- **Definition**: % of customers who cancel per month
- **Formula**: (Cancellations / Total Customers) × 100
- **Healthy Range**: < 5% monthly
- **Action if High**: Survey churned customers, improve onboarding

#### Customer Lifetime Value (CLV)
- **Definition**: Average revenue per customer over their lifetime
- **Formula**: ARPU × (1 / Churn Rate)
- **Use**: Determine customer acquisition cost limits

### Reading the Metrics
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│     MRR      │     ARR      │  Churn Rate  │     CLV      │
│   $12,500    │   $150,000   │     2.5%     │    $546      │
│    ↑ 8.5%    │    ↑ 8.5%    │    ↓ 0.5%    │    ↑ $46     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Color Coding**:
- 🟢 Green: Positive trend
- 🔴 Red: Negative trend
- 🟡 Yellow: Needs attention

## 4. Subscription Management

### Subscription Table Features

#### Filtering Options
- **Search**: Find by email, name, or ID
- **Tier Filter**: All, Barber, Shop, Enterprise
- **Status Filter**: Active, Trialing, Past Due, Cancelled
- **Sort Options**: Date, Amount, Name

#### Table Columns
1. **Customer**: Name and email
2. **Plan**: Subscription tier
3. **Status**: Current subscription state
4. **Amount**: Monthly/yearly price
5. **Created**: Subscription start date
6. **Next Billing**: Upcoming charge date
7. **Actions**: Management options

### Status Meanings
- **Active** ✅: Paid and current
- **Trialing** 🔵: In free trial period
- **Past Due** 🟡: Payment failed, in grace period
- **Cancelled** 🔴: Subscription ended
- **Paused** ⏸️: Temporarily suspended

## 5. Customer Support Actions

### Available Actions per Status

#### For Active Subscriptions
- **Upgrade Plan**: Move to higher tier
- **Downgrade Plan**: Move to lower tier
- **Pause Subscription**: Temporary hold
- **Cancel Subscription**: End at period end
- **Add Credit**: Apply account credit
- **Send Invoice**: Email latest invoice

#### For Past Due Subscriptions
- **Retry Payment**: Attempt charge again
- **Update Card**: Send payment update link
- **Extend Grace**: Add more time
- **Contact Customer**: Send reminder
- **Cancel Immediately**: End access now

#### For Cancelled Subscriptions
- **Reactivate**: Resume subscription
- **Export Data**: Download customer data
- **Delete Account**: Remove all data (GDPR)

### How to Perform Actions

1. **Find the Customer**:
   ```
   Search box: "john@example.com" → Enter
   ```

2. **Select Action**:
   ```
   Click "Actions" dropdown → Select option
   ```

3. **Confirm Action**:
   ```
   Review details → Click "Confirm"
   ```

4. **Verify Success**:
   ```
   Green notification = Success ✅
   Red notification = Failed ❌
   ```

## 6. Reports & Analytics

### Growth Chart Analysis

#### Understanding the Chart
- **X-axis**: Time period (days/weeks/months)
- **Y-axis**: Number of subscriptions
- **Lines**:
  - Green: New signups
  - Red: Cancellations
  - Blue: Net growth

#### Chart Controls
- **Toggle View**: Net Growth | New Signups | Cancellations
- **Time Period**: 7 days | 30 days | 90 days | 1 year
- **Export**: Download as CSV or PNG

### Exporting Data

#### CSV Export
1. Click "Export" button
2. Select date range
3. Choose fields to include
4. Download CSV file

#### Fields Available
- Customer information
- Subscription details
- Payment history
- Usage metrics
- Support tickets

## 7. Common Tasks

### Task 1: Handle Failed Payment
**Scenario**: Customer's payment failed

1. Navigate to Payment Issues section
2. Find customer in list
3. Click "Retry Payment"
4. If fails again:
   - Click "Contact Customer"
   - Send payment update link
   - Set reminder for follow-up

### Task 2: Process Refund
**Scenario**: Customer requests refund

1. Search for customer email
2. Click Actions → "Issue Refund"
3. Enter refund amount
4. Select refund reason
5. Add internal note
6. Confirm refund

### Task 3: Upgrade Customer Plan
**Scenario**: Customer wants to upgrade

1. Find customer in table
2. Actions → "Change Plan"
3. Select new plan
4. Choose immediate or end-of-period
5. Confirm change
6. Customer receives confirmation email

### Task 4: Generate Monthly Report
**Scenario**: Monthly metrics needed

1. Go to Analytics section
2. Set date range (last month)
3. Click "Generate Report"
4. Select recipients
5. Schedule or send immediately

### Task 5: Investigate High Churn
**Scenario**: Churn rate increased

1. Filter cancelled subscriptions
2. Export cancellation reasons
3. Identify patterns:
   - Price sensitivity
   - Feature gaps
   - Competition
4. Create action plan

## 8. Troubleshooting

### Common Issues & Solutions

#### "Access Denied" Error
**Solution**:
- Verify SUPER_ADMIN role
- Clear browser cache
- Try incognito mode
- Contact system admin

#### Metrics Not Updating
**Solution**:
- Click refresh button
- Check time zone settings
- Wait 5 minutes (cache delay)
- Report if persists

#### Export Not Working
**Solution**:
- Check popup blocker
- Try different browser
- Reduce date range
- Use CSV instead of Excel

#### Action Not Completing
**Solution**:
- Check customer status
- Verify permissions
- Check Stripe dashboard
- Review error message

## 9. Best Practices

### Daily Tasks (5 minutes)
- [ ] Check payment issues alert
- [ ] Review new signups
- [ ] Handle urgent support tickets
- [ ] Note any anomalies

### Weekly Tasks (30 minutes)
- [ ] Review churn reasons
- [ ] Analyze growth trends
- [ ] Process pending refunds
- [ ] Update team on metrics

### Monthly Tasks (2 hours)
- [ ] Generate monthly report
- [ ] Analyze cohort retention
- [ ] Review pricing strategy
- [ ] Plan next month's focus

### Customer Communication
**Do's**:
- Respond within 24 hours
- Be empathetic and helpful
- Offer solutions, not excuses
- Document all interactions

**Don'ts**:
- Make promises you can't keep
- Share customer data
- Process refunds without approval
- Delete data without confirmation

## 10. Quick Reference

### Keyboard Shortcuts
- `R` - Refresh data
- `S` - Search focus
- `E` - Export data
- `F` - Toggle filters
- `?` - Show help

### Important URLs
- Admin Dashboard: `/admin/subscriptions`
- Stripe Dashboard: `dashboard.stripe.com`
- Support Tickets: `/admin/support`
- System Health: `/admin/system-health`

### Key Metrics Targets
| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| MRR Growth | >10% | 5-10% | <5% |
| Churn Rate | <3% | 3-5% | >5% |
| Payment Success | >95% | 90-95% | <90% |
| Response Time | <1hr | 1-4hr | >4hr |

### Emergency Contacts
- **Technical Issues**: tech@company.com
- **Billing Questions**: billing@company.com
- **Urgent Support**: (555) 123-4567
- **Slack Channel**: #admin-urgent

### Audit Log
All actions are logged with:
- Timestamp
- Admin user
- Action taken
- Customer affected
- Result status

Access logs at: `/admin/audit-log`

## Training Exercises

### Exercise 1: Basic Navigation
1. Log into admin dashboard
2. Note current MRR
3. Find total active subscriptions
4. Identify any past due accounts
5. Export subscription list

### Exercise 2: Customer Management
1. Search for "test@example.com"
2. View subscription details
3. Generate invoice
4. Add $10 credit
5. Send confirmation email

### Exercise 3: Metrics Analysis
1. Switch to 30-day view
2. Calculate growth rate
3. Identify peak signup day
4. Note churn pattern
5. Export growth data

### Exercise 4: Support Scenario
**Scenario**: Customer reports they were charged but lost access

1. Find customer record
2. Check subscription status
3. Verify payment in Stripe
4. Restore access if needed
5. Send apology with credit

## Certification Checklist

Before going live, ensure you can:

- [ ] Access admin dashboard
- [ ] Interpret all metrics
- [ ] Filter and search subscriptions
- [ ] Process refunds
- [ ] Handle payment failures
- [ ] Export reports
- [ ] Use keyboard shortcuts
- [ ] Follow security protocols
- [ ] Document actions properly
- [ ] Escalate when needed

## Additional Resources

### Video Tutorials
1. [Dashboard Overview](https://youtube.com/...)
2. [Managing Subscriptions](https://youtube.com/...)
3. [Generating Reports](https://youtube.com/...)
4. [Troubleshooting Guide](https://youtube.com/...)

### Documentation
- [API Documentation](/docs/api)
- [Stripe Integration](/docs/stripe)
- [Email Templates](/docs/emails)
- [Security Policies](/docs/security)

### Support
- **Training Questions**: training@company.com
- **Technical Support**: support@company.com
- **Slack Channel**: #admin-dashboard
- **Office Hours**: Mon-Fri 2-3 PM EST

---

## Appendix: Role Permissions

### SUPER_ADMIN Can:
- View all subscriptions
- Modify any subscription
- Issue refunds
- Access financial data
- Export all data
- View audit logs
- Manage other admins

### SUPER_ADMIN Cannot:
- Delete payment history
- Modify audit logs
- Access source code
- Change system settings
- Bypass 2FA

---

**Training Version**: 1.0.0  
**Last Updated**: December 2024  
**Next Review**: January 2025

**Feedback**: Please send training feedback to training@company.com