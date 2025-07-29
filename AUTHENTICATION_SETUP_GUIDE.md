# NextAuth.js Authentication System Setup Guide

This guide will help you set up the complete NextAuth.js authentication system for the 6FB booking platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Social Provider Setup](#social-provider-setup)
5. [Email Configuration](#email-configuration)
6. [Security Features](#security-features)
7. [Integration with FastAPI Backend](#integration-with-fastapi-backend)
8. [Testing the System](#testing-the-system)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- FastAPI backend running on port 8000
- Gmail account or SMTP server for emails
- Google Cloud Console account (for Google OAuth)
- Facebook Developer account (for Facebook OAuth)

## Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Generate secure secrets:**
   ```bash
   # Generate NextAuth secret
   openssl rand -base64 32

   # Generate JWT secret
   openssl rand -base64 32

   # Generate CSRF secret
   openssl rand -base64 32
   ```

3. **Update `.env.local` with your values:**
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-generated-nextauth-secret
   JWT_SECRET=your-generated-jwt-secret
   CSRF_SECRET=your-generated-csrf-secret
   FASTAPI_URL=http://localhost:8000
   ```

## Database Setup

The authentication system integrates with your existing PostgreSQL database. Ensure the following tables exist in your FastAPI backend:

```sql
-- Users table (should already exist)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    hashed_password VARCHAR,
    phone VARCHAR,
    unified_role VARCHAR DEFAULT 'client',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR,
    verification_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Add other existing fields
);

-- Add indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_unified_role ON users(unified_role);
```

## Social Provider Setup

### Google OAuth Setup

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com
   - Create a new project or select existing one

2. **Enable Google+ API:**
   - Go to APIs & Services > Library
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials:**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "BookedBarber Authentication"
   
4. **Configure redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google (development)
   https://yourdomain.com/api/auth/callback/google (production)
   ```

5. **Add credentials to `.env.local`:**
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

### Facebook OAuth Setup

1. **Go to Facebook Developers:**
   - Visit https://developers.facebook.com
   - Create a new app or select existing one

2. **Add Facebook Login Product:**
   - Go to Products > Add Product
   - Select "Facebook Login"

3. **Configure OAuth Settings:**
   - Valid OAuth Redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/facebook (development)
   https://yourdomain.com/api/auth/callback/facebook (production)
   ```

4. **Add credentials to `.env.local`:**
   ```env
   FACEBOOK_CLIENT_ID=your-facebook-app-id
   FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
   ```

## Email Configuration

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication on your Gmail account**

2. **Generate an App Password:**
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"

3. **Update `.env.local`:**
   ```env
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-email@gmail.com
   EMAIL_SERVER_PASSWORD=your-16-character-app-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Production Email Setup

For production, consider using:
- **SendGrid**: Professional email service
- **AWS SES**: Amazon Simple Email Service
- **Mailgun**: Transactional email service

Example SendGrid configuration:
```env
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

## Security Features

### Rate Limiting Configuration

```env
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

### Two-Factor Authentication

```env
ENABLE_2FA=true
TOTP_ISSUER=BookedBarber
TOTP_DIGITS=6
TOTP_PERIOD=30
```

### Suspicious Activity Detection

```env
ENABLE_SUSPICIOUS_ACTIVITY_DETECTION=true
ENABLE_DEVICE_TRACKING=true
```

## Integration with FastAPI Backend

### Required FastAPI Endpoints

Your FastAPI backend should have these endpoints for full integration:

1. **User Authentication:**
   ```python
   POST /api/v2/auth/login
   POST /api/v2/auth/logout
   POST /api/v2/auth/refresh
   GET /api/v2/auth/me
   ```

2. **User Management:**
   ```python
   POST /api/v2/auth/create-user
   POST /api/v2/auth/create-social-user
   GET /api/v2/auth/user-by-email/{email}
   ```

3. **Email Verification:**
   ```python
   POST /api/v2/auth/send-verification-email
   POST /api/v2/auth/verify-email
   ```

### FastAPI Integration Code

Add this to your FastAPI backend:

```python
# In your FastAPI app
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import bcrypt
import jwt

class SocialUserCreate(BaseModel):
    email: str
    name: str
    provider: str
    provider_id: str
    profile_image: str = None
    email_verified: bool = True
    unified_role: str = "client"

@app.post("/api/v2/auth/create-social-user")
async def create_social_user(user_data: SocialUserCreate):
    # Check if user already exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        return existing_user
    
    # Create new social user
    new_user = create_user_in_database(user_data)
    return new_user

@app.get("/api/v2/auth/user-by-email/{email}")
async def get_user_by_email(email: str):
    user = find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

## Testing the System

### 1. Start Development Servers

```bash
# Start FastAPI backend
cd backend-v2
uvicorn main:app --reload --port 8000

# Start Next.js frontend
cd frontend-v2
npm run dev
```

### 2. Test Authentication Flows

1. **Email/Password Registration:**
   - Go to http://localhost:3000/auth/signup
   - Fill out the form and submit
   - Check email for verification link

2. **Google OAuth:**
   - Go to http://localhost:3000/auth/signin
   - Click "Continue with Google"
   - Complete OAuth flow

3. **Facebook OAuth:**
   - Go to http://localhost:3000/auth/signin
   - Click "Continue with Facebook"
   - Complete OAuth flow

4. **Magic Link:**
   - Go to http://localhost:3000/auth/signin
   - Enter email and click "Send magic link"
   - Check email and click link

### 3. Test Protected Routes

```bash
# Visit protected routes to test middleware
http://localhost:3000/dashboard
http://localhost:3000/admin
http://localhost:3000/profile
```

### 4. Test Role-Based Access

Create test users with different roles and verify access:

```sql
-- Create test users with different roles
INSERT INTO users (email, name, unified_role, email_verified, is_active)
VALUES 
  ('admin@test.com', 'Admin User', 'super_admin', true, true),
  ('owner@test.com', 'Shop Owner', 'shop_owner', true, true),
  ('barber@test.com', 'Barber User', 'barber', true, true),
  ('client@test.com', 'Client User', 'client', true, true);
```

## Production Deployment

### 1. Environment Variables

Set these environment variables in your production environment:

```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secure-production-secret
JWT_SECRET=your-super-secure-jwt-secret
FASTAPI_URL=https://api.yourdomain.com
```

### 2. Database Security

- Use connection pooling
- Enable SSL connections
- Set up read replicas if needed
- Regular backups

### 3. Redis Setup (Recommended)

For production rate limiting and session management:

```env
REDIS_URL=redis://your-redis-server:6379
```

### 4. Monitoring and Logging

```env
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### 5. SSL Configuration

Ensure HTTPS is enabled:
- Use proper SSL certificates
- Enable HSTS headers
- Configure secure cookies

## Troubleshooting

### Common Issues

1. **"Invalid provider" error:**
   - Check provider configuration in `auth-config.js`
   - Verify environment variables are set

2. **OAuth redirect errors:**
   - Check redirect URIs in provider console
   - Verify NEXTAUTH_URL is correct

3. **Email not sending:**
   - Verify SMTP credentials
   - Check email server configuration
   - Test with a different email provider

4. **Database connection errors:**
   - Verify FastAPI backend is running
   - Check database connection strings
   - Ensure database tables exist

5. **CSRF token errors:**
   - Check middleware configuration
   - Verify CSRF secret is set
   - Clear browser cookies and try again

### Debug Mode

Enable debug mode in development:

```env
NODE_ENV=development
DEBUG=true
```

This will show detailed logs in the console.

### Logging

Check application logs for detailed error information:

```bash
# View Next.js logs
npm run dev

# View FastAPI logs
uvicorn main:app --reload --log-level debug
```

## Advanced Configuration

### Custom Session Storage

For production, consider using Redis for session storage:

```javascript
// In next-auth configuration
import { RedisAdapter } from "@next-auth/redis-adapter"
import { createClient } from "redis"

const client = createClient({ url: process.env.REDIS_URL })

export const authOptions = {
  adapter: RedisAdapter(client),
  // ... other options
}
```

### Custom JWT Configuration

```javascript
// Custom JWT handling
jwt: {
  maxAge: 15 * 60, // 15 minutes
  encode: async ({ secret, token }) => {
    return jwt.sign(token, secret, { 
      algorithm: 'HS256',
      expiresIn: '15m'
    })
  },
  decode: async ({ secret, token }) => {
    return jwt.verify(token, secret)
  }
}
```

### Webhook Configuration

Set up webhooks for real-time user updates:

```javascript
// In your API routes
export async function POST(request) {
  const webhook = await request.json()
  
  // Handle user events
  switch (webhook.event) {
    case 'user.created':
      // Sync with external systems
      break
    case 'user.updated':
      // Update user data
      break
  }
}
```

## Support

If you encounter issues:

1. Check this documentation first
2. Review the logs for error messages
3. Test with minimal configuration
4. Create a GitHub issue with detailed information

## Security Checklist

- [ ] All secrets are randomly generated and secure
- [ ] HTTPS is enabled in production
- [ ] Rate limiting is configured
- [ ] CSRF protection is enabled
- [ ] Input validation is implemented
- [ ] SQL injection protection is in place
- [ ] XSS protection is enabled
- [ ] Security headers are configured
- [ ] Regular security updates are applied
- [ ] Monitoring and logging are configured

This completes the setup guide for the NextAuth.js authentication system. The system provides enterprise-grade security while maintaining ease of use for both developers and end users.