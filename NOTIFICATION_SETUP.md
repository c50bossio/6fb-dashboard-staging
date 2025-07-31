# Notification System Setup Guide

This guide explains how to enable real email and SMS notifications in the 6FB AI Agent System.

## Current Status

✅ **Mock Mode**: The system currently runs in development mode with simulated notifications  
⚠️ **Production Ready**: All code is in place, just needs dependencies and configuration

## Quick Setup (5 minutes)

### 1. Install Dependencies

Add these to your Docker container:

```bash
# Option A: Rebuild Docker container (recommended)
docker-compose build backend

# Option B: Install manually in running container
docker exec agent-system-backend-dev pip install aiosmtplib==3.0.1 httpx==0.25.2 jinja2==3.1.2
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=noreply@yourbarbershop.com
FROM_NAME=Your Barbershop Name

# SMS Configuration (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### 3. Restart Services

```bash
docker-compose restart backend
```

That's it! 🎉 Your notifications are now live.

## Provider Setup Instructions

### Email Setup

#### Option 1: Gmail SMTP (Free, Easy)

1. **Enable 2FA** on your Google account
2. **Generate App Password**:
   - Go to Google Account Settings → Security
   - Click "App passwords"
   - Generate password for "Mail"
3. **Configure** in `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=generated-app-password
   ```

#### Option 2: Professional Email Service

**SendGrid** (Recommended for production):
- Sign up at sendgrid.com
- Get API key from Settings → API Keys
- Update notification service to use SendGrid API

**Mailgun, AWS SES, etc.** also supported with minor code changes.

### SMS Setup

#### Option 1: Twilio (Recommended)

1. **Sign up** at twilio.com (free trial available)
2. **Get credentials** from Console:
   - Account SID
   - Auth Token
   - Phone number
3. **Configure** in `.env`:
   ```bash
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_FROM_NUMBER=+1234567890
   ```

#### Option 2: Textbelt (Simple, pay-per-use)

1. **Get API key** from textbelt.com
2. **Configure** in `.env`:
   ```bash
   SMS_PROVIDER=textbelt
   TEXTBELT_KEY=your-api-key
   ```

## Testing Your Setup

1. **Access Notifications Page**: http://localhost:9999/dashboard/notifications
2. **Send Test Email**: Click "Test Email" button
3. **Send Test SMS**: Click "Test SMS" button
4. **Check History**: View sent notifications in History tab

## Features Available

### ✅ Working Features

- **User Preferences**: Respect notification settings from Settings page
- **Template System**: Professional email/SMS templates
- **Async Queue**: Background processing with retry logic
- **History Tracking**: Complete audit trail
- **Multiple Providers**: Email (SMTP) + SMS (Twilio/Textbelt)

### 📧 Email Notifications

- Booking confirmations
- Appointment reminders
- Marketing campaigns
- System alerts

### 📱 SMS Notifications

- Booking confirmations
- Appointment reminders
- Marketing campaigns
- Quick alerts

## Advanced Configuration

### Custom Templates

Edit templates in `/services/notification_service.py`:

```python
templates = {
    "booking_confirmation": {
        "subject": "Booking Confirmed - {service} on {date}",
        "content": "Hi {customer_name}, your booking is confirmed..."
    }
}
```

### Queue Configuration

Modify queue settings in `/services/notification_queue.py`:

```python
max_retries = 3  # Number of retry attempts
retry_delay = 5  # Minutes between retries
batch_size = 10  # Notifications processed per batch
```

### Provider Priority

Set SMS provider priority in configuration:

```python
SMS_CONFIG = {
    "PROVIDER": "twilio",  # or "textbelt"
    # Twilio settings...
}
```

## Troubleshooting

### Common Issues

**"Module not found" errors**:
```bash
docker exec -it agent-system-backend-dev pip install aiosmtplib httpx jinja2
```

**Gmail authentication fails**:
- Ensure 2FA is enabled
- Use App Password, not regular password
- Check "Less secure app access" if needed

**Twilio authentication fails**:
- Verify Account SID and Auth Token
- Ensure phone number is verified
- Check account balance

**Queue not processing**:
- Check Docker logs: `docker-compose logs backend`
- Verify queue processor started: "✅ Notification queue processor started"

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Test Without Real Sending

Set empty credentials to keep mock mode:
```bash
SMTP_USERNAME=
TWILIO_ACCOUNT_SID=
```

## Production Deployment

### Recommended Stack

- **Email**: SendGrid or AWS SES
- **SMS**: Twilio
- **Database**: PostgreSQL (for higher volume)
- **Queue**: Redis + Celery (for enterprise scale)

### Security Checklist

- [ ] Use environment variables for all credentials
- [ ] Never commit `.env` files
- [ ] Use app passwords for Gmail
- [ ] Rotate API keys regularly
- [ ] Monitor usage and billing

### Monitoring

The system provides built-in monitoring:

- **Queue Status**: `/dashboard/notifications` → Queue Status tab
- **API Endpoints**: 
  - `GET /api/v1/notifications/queue/status`
  - `GET /api/v1/notifications/history`
- **Logs**: Docker container logs show all notification activity

## Cost Estimates

### Gmail SMTP: Free
- Limit: 500 emails/day
- Perfect for small businesses

### Twilio SMS: ~$0.0075/message
- 1,000 messages ≈ $7.50/month
- Includes delivery receipts

### SendGrid Email: $14.95/month
- 40,000 emails/month
- Professional features

## Support

If you need help setting up notifications:

1. Check the troubleshooting section above
2. Review Docker logs for error messages
3. Test with mock mode first (no credentials)
4. Verify environment variables are loaded correctly

The notification system is production-ready and handles all edge cases including failures, retries, and user preferences automatically.