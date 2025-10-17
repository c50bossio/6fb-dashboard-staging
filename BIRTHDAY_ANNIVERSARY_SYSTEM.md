# Birthday & Anniversary Reminder System

A complete customer birthday and anniversary reminder system for the 6FB Barbershop platform. This system provides automated SMS/email campaigns, message template management, and customer engagement tracking.

## 🎯 Features

### ✅ Core Functionality
- **Upcoming Birthday/Anniversary Tracking** - Automatic detection of customers with upcoming events
- **Automated SMS Campaigns** - Send birthday wishes and promotional offers via SMS
- **Message Template System** - Customizable message templates with variable substitution
- **Discount Configuration** - Flexible discount settings (percentage, fixed amount)
- **Customer Segmentation** - VIP status awareness, visit history, and engagement metrics
- **Campaign Tracking** - Monitor campaign effectiveness and customer responses
- **Real-time Dashboard** - Complete UI for managing birthday campaigns

### 🔧 Technical Implementation
- **Production-Ready APIs** - RESTful endpoints with comprehensive error handling
- **Database Integration** - Supabase PostgreSQL with optimized schema
- **SMS Service Integration** - Twilio SMS with bulk sending capabilities
- **React Component** - Complete UI component ready for dashboard integration
- **Template Variables** - Dynamic message personalization
- **Migration Scripts** - Database setup with automated migration

## 📁 File Structure

```
/Users/bossio/6FB AI Agent System/
├── components/customers/
│   └── BirthdayReminder.js              # Main React component
├── app/api/customers/birthdays/
│   ├── route.js                         # Main birthday/anniversary API
│   ├── send/route.js                    # Campaign sending endpoint
│   └── templates/route.js               # Template management API
├── lib/notifications/
│   └── sms-service.js                   # Extended SMS service with birthday functions
├── database/migrations/
│   └── 003_add_birthday_anniversary_fields.sql  # Database migration
├── scripts/
│   ├── run-birthday-migration.js       # Migration runner (RPC method)
│   └── run-birthday-migration-direct.js # Direct migration runner
├── test-birthday-system.js             # Comprehensive test suite
└── BIRTHDAY_ANNIVERSARY_SYSTEM.md      # This documentation
```

## 🚀 Quick Start

### 1. Database Setup

**Option A: Run Migration Script**
```bash
node scripts/run-birthday-migration-direct.js
```

**Option B: Manual SQL Execution**
1. Open your Supabase SQL Editor
2. Copy contents of `database/migrations/003_add_birthday_anniversary_fields.sql`
3. Execute the SQL

### 2. Environment Configuration

Ensure these environment variables are set in `.env.local`:
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twilio SMS (Optional - for SMS functionality)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

### 3. Component Integration

Add the birthday reminder component to your dashboard:

```jsx
import BirthdayReminder from '@/components/customers/BirthdayReminder';

// In your dashboard page
export default function Dashboard() {
  return (
    <div>
      {/* Your existing dashboard content */}
      <BirthdayReminder barbershopId={your_barbershop_id} />
    </div>
  );
}
```

### 4. Test the System

Run the comprehensive test suite:
```bash
node test-birthday-system.js
```

## 🗄️ Database Schema

### New Tables

#### `customers` (Extended)
```sql
ALTER TABLE customers ADD COLUMN:
- birthday DATE
- anniversary_date DATE  
- birthday_reminders_enabled BOOLEAN DEFAULT TRUE
- anniversary_reminders_enabled BOOLEAN DEFAULT TRUE
- last_birthday_campaign_sent DATE
- last_anniversary_campaign_sent DATE
```

#### `birthday_campaigns`
Tracks all birthday/anniversary campaigns sent to customers:
```sql
- id UUID PRIMARY KEY
- barbershop_id VARCHAR(255)
- customer_id UUID REFERENCES customers(id)
- campaign_type VARCHAR(50) ('birthday', 'anniversary')
- message_type VARCHAR(20) ('sms', 'email', 'both')
- message_content TEXT
- discount_percentage INTEGER
- discount_amount DECIMAL(10,2)
- scheduled_for DATE
- sent_at TIMESTAMP
- delivery_status VARCHAR(20) ('pending', 'sent', 'delivered', 'failed')
- opened_at TIMESTAMP
- clicked_at TIMESTAMP  
- redeemed_at TIMESTAMP
- booking_made BOOLEAN
```

#### `birthday_templates`
Reusable message templates for campaigns:
```sql
- id UUID PRIMARY KEY
- barbershop_id VARCHAR(255)
- template_name VARCHAR(100)
- template_type VARCHAR(50) ('birthday', 'anniversary')
- message_type VARCHAR(20) ('sms', 'email', 'both')
- subject_line VARCHAR(200)
- message_content TEXT
- includes_discount BOOLEAN
- discount_type VARCHAR(20) ('percentage', 'fixed_amount')
- discount_value DECIMAL(10,2)
- discount_description VARCHAR(200)
- discount_expiry_days INTEGER
- is_active BOOLEAN
- is_default BOOLEAN
- times_used INTEGER
```

## 🔗 API Endpoints

### GET `/api/customers/birthdays`
Fetch customers with upcoming birthdays/anniversaries.

**Parameters:**
- `barbershop_id` (required) - Barbershop identifier
- `type` (optional) - 'birthday' or 'anniversary' (default: 'birthday')
- `days_ahead` (optional) - Days to look ahead (default: 30)
- `include_all` (optional) - Include all customers regardless of date

**Response:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "event_type": "birthday",
      "event_date": "1990-08-25",
      "days_until_event": 5,
      "event_date_display": "August 25",
      "years_as_customer": 2,
      "total_visits": 12,
      "vip_status": false
    }
  ],
  "total": 1,
  "event_type": "birthday"
}
```

### POST `/api/customers/birthdays`
Schedule birthday/anniversary campaigns.

**Request Body:**
```json
{
  "barbershop_id": "shop123",
  "customer_ids": ["uuid1", "uuid2"],
  "campaign_type": "birthday",
  "message_type": "sms",
  "template_id": "uuid", // optional
  "custom_message": "Happy Birthday!", // optional
  "discount_percentage": 15,
  "scheduled_for": "2024-08-25"
}
```

### POST `/api/customers/birthdays/send`
Send birthday/anniversary campaigns immediately.

**Request Body:**
```json
{
  "barbershop_id": "shop123",
  "customer_ids": ["uuid1", "uuid2"],
  "campaign_type": "birthday",
  "message_content": "Happy Birthday {{customer_name}}!",
  "discount_percentage": 15,
  "shop_name": "My Barbershop",
  "booking_link": "https://book.mybarbershop.com"
}
```

### GET `/api/customers/birthdays/templates`
Fetch message templates.

**Parameters:**
- `barbershop_id` (required) - Barbershop identifier
- `type` (optional) - 'birthday' or 'anniversary'
- `message_type` (optional) - 'sms' or 'email'

### POST `/api/customers/birthdays/templates`
Create new message template.

**Request Body:**
```json
{
  "barbershop_id": "shop123",
  "template_name": "Birthday SMS Special",
  "template_type": "birthday",
  "message_type": "sms",
  "message_content": "Happy Birthday {{customer_name}}! Get {{discount_description}}!",
  "includes_discount": true,
  "discount_type": "percentage",
  "discount_value": 20,
  "discount_description": "20% off your next cut"
}
```

## 📱 SMS Integration

### Template Variables
The system supports dynamic message personalization:

- `{{customer_name}}` - Customer's name
- `{{shop_name}}` - Barbershop name
- `{{discount_percentage}}` - Discount percentage (e.g., "15")
- `{{discount_amount}}` - Fixed discount amount (e.g., "10")
- `{{discount_description}}` - Formatted discount text
- `{{years_as_customer}}` - Years since first visit
- `{{booking_link}}` - Link to online booking
- `{{discount_expiry_days}}` - Days until discount expires

### Example SMS Messages

**Birthday SMS:**
```
Happy Birthday John! 🎉 Celebrate with us and get 15% off your next service. Book your special day appointment today! Valid for 30 days.
```

**Anniversary SMS:**
```
Happy Anniversary John! 🎊 It's been 2 years since your first visit. Celebrate with 20% off! Book today!
```

## 🎨 UI Component Features

### BirthdayReminder Component

**Props:**
- `barbershopId` (required) - String identifier for the barbershop

**Features:**
- **Tab Navigation** - Switch between upcoming events and settings
- **Event Type Toggle** - View birthdays or anniversaries
- **Customer Selection** - Multi-select customers for campaigns
- **Campaign Settings** - Configure message type, discounts, auto-sending
- **Real-time Updates** - Automatic refresh of customer data
- **Error Handling** - Graceful degradation when database not migrated
- **Migration Notice** - Clear instructions for setup requirements

**Usage:**
```jsx
<BirthdayReminder barbershopId="your-shop-id" />
```

## 🧪 Testing

### Comprehensive Test Suite
Run the full test suite to verify system functionality:

```bash
node test-birthday-system.js
```

**Tests Include:**
1. **API Health Check** - Verify server is running
2. **Birthday Data Fetch** - Test upcoming birthday retrieval
3. **Anniversary Data Fetch** - Test upcoming anniversary retrieval  
4. **Message Templates** - Test template management system
5. **Campaign Scheduling** - Test campaign creation
6. **SMS Sending** - Test bulk SMS functionality
7. **Campaign History** - Test campaign tracking
8. **Database Migration** - Verify schema setup

### Expected Test Output:
```
🏁 TEST SUMMARY
============================================================
✅ Passed: 8/8
❌ Failed: 0/8
⚠️  Warnings: 0/8
📊 Success Rate: 100%

🎉 ALL TESTS PASSED! Birthday/Anniversary system is ready for production.
```

## 🚨 Troubleshooting

### Migration Issues

**Problem:** Database columns don't exist
```
❌ Birthday/anniversary columns missing from customers table
```

**Solution:** Run the migration script or apply SQL manually:
```bash
node scripts/run-birthday-migration-direct.js
```

### SMS Issues

**Problem:** SMS not sending
```
❌ SMS service not configured
```

**Solution:** Configure Twilio credentials in `.env.local`:
```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_phone
```

### API Errors

**Problem:** Template variables not working
```
❌ Message shows {{customer_name}} instead of actual name
```

**Solution:** Check message template format and variable spelling. Use exact variable names from documentation.

## 🔒 Security Considerations

### Data Protection
- **Customer Data** - Birthday/anniversary data is protected by Supabase RLS policies
- **Phone Numbers** - SMS sending validates phone number format
- **Rate Limiting** - Built-in delays between SMS sends to prevent abuse
- **Input Validation** - All API endpoints validate input parameters
- **Error Handling** - Graceful error responses without exposing sensitive data

### Authentication
- **Barbershop Isolation** - All data is scoped to specific barbershop IDs
- **API Security** - Uses existing Supabase authentication patterns
- **Component Security** - Requires valid barbershop ID for all operations

## 📊 Production Deployment

### Pre-Deployment Checklist
- [ ] Database migration completed successfully
- [ ] Twilio SMS credentials configured (if using SMS)
- [ ] Test suite passes with 100% success rate
- [ ] Component integrated into dashboard
- [ ] Template messages customized for your brand
- [ ] Customer data includes birthday/anniversary dates

### Performance Considerations
- **Database Indexes** - Optimized queries with proper indexing
- **Bulk Operations** - Efficient bulk SMS sending with rate limiting
- **Caching** - Template caching for improved performance
- **Error Recovery** - Graceful handling of SMS failures
- **Memory Management** - Efficient customer data processing

### Monitoring & Analytics
- **Campaign Tracking** - Track sent, delivered, and failed campaigns
- **Customer Engagement** - Monitor click-through and redemption rates
- **SMS Costs** - Track SMS usage for cost management
- **Error Logging** - Comprehensive error tracking and reporting

## 🤝 Support & Maintenance

### Regular Maintenance Tasks
1. **Review Templates** - Update message content seasonally
2. **Monitor SMS Costs** - Track Twilio usage and costs
3. **Customer Data Quality** - Ensure birthday/anniversary dates are accurate
4. **Campaign Performance** - Analyze engagement metrics and optimize
5. **Database Cleanup** - Archive old campaign data periodically

### System Updates
- **Template Updates** - Easily modify message templates through API
- **Feature Extensions** - Add email campaigns, scheduling improvements
- **Integration Enhancements** - Connect with calendar systems, CRM tools
- **Analytics Expansion** - Enhanced reporting and customer insights

---

## 🎉 Success! 

Your Birthday & Anniversary Reminder System is now fully implemented and ready for production use. The system provides:

✅ **Complete Database Schema** - With optimized tables and indexes  
✅ **Production-Ready APIs** - RESTful endpoints with comprehensive error handling  
✅ **SMS Integration** - Twilio-powered automated messaging  
✅ **React UI Component** - Beautiful, responsive dashboard interface  
✅ **Message Templates** - Flexible, customizable campaign content  
✅ **Campaign Tracking** - Monitor effectiveness and customer engagement  
✅ **Test Suite** - Comprehensive testing for reliable operation  

Start engaging your customers with personalized birthday and anniversary campaigns to boost loyalty and drive repeat business!

---

**Created by:** Claude Code  
**Date:** August 21, 2025  
**Version:** 1.0.0 - Production Ready