# Complete Booking Notification System

A comprehensive notification system for the 6FB AI Agent System that handles all booking lifecycle events including confirmations, reminders, payments, and cancellations.

## 🎆 Features

### Notification Types
- **Booking Confirmation** - Immediate notification after successful booking
- **Payment Confirmation** - Notification after successful payment processing
- **Appointment Reminders** - Automated reminders 24 hours and 2 hours before appointment
- **Cancellation Notice** - Immediate notification when booking is cancelled
- **Payment Failed** - Notification when payment processing fails

### Delivery Channels
- **Email** - Rich HTML templates with booking details
- **SMS** - Concise text messages via Twilio
- **In-App** - Real-time notifications in the application
- **Push** - Mobile push notifications (future implementation)

### Integration Points
- **BookingWizard** - Automatic notifications on booking completion
- **Stripe Webhooks** - Payment confirmation from Stripe events
- **Database Triggers** - Automatic notifications on booking status changes
- **FastAPI Endpoints** - Manual notification triggering

## 🚀 Quick Start

### 1. Environment Setup

Add these environment variables to your `.env` file:

```bash
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@bookedbarber.com

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# FastAPI Configuration
FAST_API_BACKEND_URL=http://localhost:8001
FAST_API_API_KEY=your-api-key

# Notification Processing
NOTIFICATION_WORKERS=3
NOTIFICATION_POLL_INTERVAL=10
NOTIFICATION_BATCH_SIZE=10
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_RETENTION_DAYS=90
```

### 2. Database Setup

Apply the notification triggers to your Supabase database:

```sql
-- Run the migration file
\i database/booking-notification-triggers.sql
```

### 3. Start Services

```bash
# Start FastAPI backend
python fastapi_backend.py

# Start Next.js frontend
npm run dev

# Start notification processor (optional - for background processing)
python services/notification_processor.py
```

### 4. Test the System

```bash
# Run comprehensive tests
python scripts/test-notification-system.py
```

## 🛠️ Architecture

### Core Components

1. **Booking Notification Service** (`services/booking_notifications.py`)
   - Main notification orchestrator
   - Template rendering and formatting
   - Multi-channel delivery
   - Error handling and retries

2. **Notification Processor** (`services/notification_processor.py`)
   - Background queue processing
   - Scheduled notification handling
   - Retry logic with exponential backoff
   - Cleanup and maintenance

3. **FastAPI Router** (`routers/booking_notifications.py`)
   - REST API endpoints
   - Webhook handlers
   - Authentication and validation

4. **Database Triggers** (`database/booking-notification-triggers.sql`)
   - Automatic notification queuing
   - Booking lifecycle event detection
   - Scheduled reminder creation

### Data Flow

```
Booking Event → Database Trigger → Notification Queue → Background Processor → Delivery Channels
     ↓                ↓                    ↓                    ↓                   ↓
  User Action    Queue Record      Processing Queue     Email/SMS/InApp     Customer Receives
```

## 📋 API Reference

### Booking Notifications

#### Send Booking Confirmation
```http
POST /api/v1/booking-notifications/booking-confirmed
Content-Type: application/json
Authorization: Bearer {token}

{
  "booking_id": "uuid",
  "user_id": "uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "barbershop_name": "Mike's Barbershop",
  "barber_name": "Mike",
  "service_name": "Haircut",
  "appointment_date": "2024-01-15T14:00:00Z",
  "appointment_duration": 30,
  "total_price": 25.00,
  "booking_status": "confirmed"
}
```

#### Send Payment Confirmation
```http
POST /api/v1/booking-notifications/payment-confirmed
```

#### Send Cancellation Notice
```http
POST /api/v1/booking-notifications/booking-cancelled
```

#### Schedule Appointment Reminders
```http
POST /api/v1/booking-notifications/appointment-reminders/schedule
```

### Webhook Endpoints

#### Stripe Webhook
```http
POST /api/v1/booking-notifications/webhooks/stripe
```

#### BookingWizard Webhook
```http
POST /api/v1/booking-notifications/webhooks/booking-wizard
```

### Management Endpoints

#### Get Notification Status
```http
GET /api/v1/booking-notifications/notifications/{notification_id}/status
```

#### Get Pending Notifications
```http
GET /api/v1/booking-notifications/notifications/pending?limit=50&offset=0
```

#### Retry Failed Notification
```http
POST /api/v1/booking-notifications/notifications/{notification_id}/retry
```

## 📧 Email Templates

The system includes pre-built HTML email templates for all notification types:

- **Booking Confirmation** - Professional booking details with shop information
- **Payment Confirmation** - Payment receipt with booking reference
- **24-Hour Reminder** - Friendly reminder with appointment details
- **2-Hour Reminder** - Urgent reminder to arrive on time
- **Cancellation Notice** - Cancellation confirmation with refund information

### Customizing Templates

Templates are defined in `BookingNotificationService._load_templates()` and can be customized by:

1. Modifying the HTML templates in the service
2. Adding new template variables in `_format_template()`
3. Creating custom template variants for different barbershops

## 📱 SMS Configuration

### Twilio Setup

1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number for sending SMS
4. Add credentials to environment variables

### SMS Templates

SMS messages are kept concise and include:
- Booking confirmation with essential details
- Payment confirmation with amount
- Appointment reminders with time and location
- Cancellation notices

## 📅 Scheduling & Reminders

### Automatic Scheduling

When a booking is confirmed, the system automatically schedules:
- **24-hour reminder** - Sent via email and SMS
- **2-hour reminder** - Sent via SMS only for urgency

### Manual Scheduling

You can schedule custom notifications using the API:

```python
from datetime import datetime, timedelta

# Schedule a custom reminder
result = await booking_notification_service.send_booking_notification(
    notification_type=BookingNotificationType.APPOINTMENT_REMINDER_24H,
    booking_data=booking_data,
    channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
    schedule_at=datetime.now() + timedelta(hours=2)
)
```

## 🔄 Error Handling & Retries

### Retry Logic

- **Max Retries**: 3 attempts
- **Retry Delays**: 1 minute, 5 minutes, 15 minutes
- **Exponential Backoff**: Delays increase with each retry
- **Dead Letter Queue**: Failed notifications are marked for manual review

### Error Types

- **SMTP Errors**: Email delivery failures
- **Twilio Errors**: SMS delivery failures
- **Template Errors**: Missing or invalid template data
- **Database Errors**: Notification queue failures

### Monitoring

Monitor notification health via:

```http
GET /api/v1/booking-notifications/health
```

## 📈 Background Processing

### Notification Processor

The background processor (`notification_processor.py`) handles:

- **Queue Processing**: Picks up pending notifications
- **Scheduled Delivery**: Processes scheduled notifications when due
- **Retry Handling**: Manages failed notification retries
- **Cleanup**: Removes old processed notifications

### Running the Processor

```bash
# Standalone
python services/notification_processor.py

# As a service (recommended for production)
sudo systemctl start notification-processor
```

### Scaling

- **Multiple Workers**: Set `NOTIFICATION_WORKERS=5` for higher throughput
- **Batch Processing**: Adjust `NOTIFICATION_BATCH_SIZE=20` for larger batches
- **Poll Frequency**: Modify `NOTIFICATION_POLL_INTERVAL=5` for faster processing

## 🐛 Troubleshooting

### Common Issues

#### Notifications Not Sending
1. Check FastAPI backend is running on port 8001
2. Verify environment variables are set correctly
3. Check notification processor is running
4. Review logs for specific errors

#### Email Delivery Issues
1. Verify SMTP credentials and server settings
2. Check if emails are in spam folder
3. Test with Gmail App Passwords for Gmail accounts
4. Ensure firewall allows SMTP traffic

#### SMS Delivery Issues
1. Verify Twilio credentials
2. Check phone number format (+1234567890)
3. Ensure Twilio account has sufficient balance
4. Verify phone number is verified in Twilio (for trial accounts)

#### Database Trigger Issues
1. Check if triggers are properly installed
2. Verify notification table exists
3. Check RLS policies allow service access
4. Review Supabase logs for errors

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Health Checks

```bash
# Check notification service health
curl http://localhost:8001/api/v1/booking-notifications/health

# Run comprehensive tests
python scripts/test-notification-system.py

# Check background processor status
curl http://localhost:8001/api/v1/booking-notifications/notifications/pending
```

## 🚀 Production Deployment

### Environment Configuration

1. Use production SMTP provider (SendGrid, AWS SES, etc.)
2. Configure Twilio with production phone number
3. Set up proper monitoring and alerting
4. Use environment-specific API keys

### Security

1. Use HTTPS for all webhook endpoints
2. Implement proper API authentication
3. Validate webhook signatures (Stripe)
4. Rate limit notification endpoints

### Monitoring

1. Set up application monitoring (Sentry)
2. Monitor notification delivery rates
3. Track failed notifications
4. Set up alerts for system failures

### Performance

1. Scale notification workers based on volume
2. Use Redis for caching if needed
3. Monitor database performance
4. Implement notification batching for high volume

## 📄 Files Reference

```
services/
├── booking_notifications.py      # Main notification service
├── notification_processor.py     # Background processor
└── notification_service.py       # Legacy service (still used)

routers/
├── booking_notifications.py      # FastAPI endpoints
└── notifications.py              # Legacy endpoints

database/
├── notification-schema.sql       # Database schema
└── booking-notification-triggers.sql  # Triggers and functions

scripts/
└── test-notification-system.py   # Comprehensive test suite

components/booking/
└── BookingWizard.js              # Integrated with notifications

app/api/webhooks/stripe/
└── route.js                      # Enhanced with notifications
```

## 🎆 Future Enhancements

- **Push Notifications**: Mobile app integration
- **WhatsApp Integration**: Business API for WhatsApp messages
- **Slack/Discord**: Team notifications for shop owners
- **Advanced Templates**: Dynamic content based on barbershop branding
- **A/B Testing**: Template performance optimization
- **Analytics**: Notification open rates and engagement
- **Multi-language**: Internationalization support

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Run the test suite to identify issues
3. Review application logs
4. Create an issue with detailed error information

---

**Note**: This notification system is production-ready with comprehensive error handling, retry logic, and monitoring capabilities. All components are designed to handle high-volume booking scenarios while maintaining reliability and performance.
