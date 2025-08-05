#!/bin/bash
# Generate Secure Credentials for 6FB AI Agent System
# Run this script to generate secure environment variables

set -e

echo "🔐 6FB AI Agent System - Secure Credential Generator"
echo "=================================================="
echo ""

# Create secure credentials directory
mkdir -p secure-credentials

# Generate JWT Secret Key (256-bit)
echo "Generating JWT Secret Key..."
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET_KEY=$JWT_SECRET" > secure-credentials/jwt-secret.env

# Generate Admin Password (128-bit)
echo "Generating Admin Password..."
ADMIN_PASSWORD=$(openssl rand -base64 16)
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" > secure-credentials/admin-credentials.env

# Generate Database Encryption Key
echo "Generating Database Encryption Key..."
DB_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "DATABASE_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY" > secure-credentials/database-encryption.env

# Generate Session Secret
echo "Generating Session Secret..."
SESSION_SECRET=$(openssl rand -base64 32)
echo "SESSION_SECRET=$SESSION_SECRET" > secure-credentials/session-secret.env

# Create complete secure environment file
echo "Creating complete secure environment configuration..."
cat > secure-credentials/secure-environment-variables.env << EOF
# 6FB AI Agent System - Secure Environment Variables
# Generated on: $(date)
# IMPORTANT: Keep these credentials secure and never commit to version control!

# =============================================================================
# SECURITY CONFIGURATION (CRITICAL)
# =============================================================================
JWT_SECRET_KEY=$JWT_SECRET
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_EMAIL=admin@6fb-ai.com
DATABASE_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY
SESSION_SECRET=$SESSION_SECRET

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
NODE_ENV=production
NEXT_PUBLIC_DEV_MODE=false
FASTAPI_BASE_URL=\${NEXT_PUBLIC_APP_URL:-http://localhost:8001}
NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_APP_URL:-http://localhost:8001}

# =============================================================================
# AI SERVICES (REPLACE WITH YOUR ACTUAL KEYS)
# =============================================================================
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE
GOOGLE_GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY_HERE

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=\${DATABASE_URL:-sqlite:///./data/agent_system.db}

# =============================================================================
# THIRD-PARTY SERVICES (REPLACE WITH YOUR ACTUAL KEYS)
# =============================================================================
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

# Stripe Payment Processing
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY_HERE

# SendGrid Email Service
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY_HERE
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=6FB AI Agent System

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=YOUR_POSTHOG_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Sentry Error Tracking
SENTRY_DSN=YOUR_SENTRY_DSN_HERE
NEXT_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN_HERE

# =============================================================================
# AGENT SYSTEM CONFIGURATION
# =============================================================================
NEXT_PUBLIC_ENABLE_RAG=true
NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false
EOF

# Create .gitignore entries for security
echo "Adding security entries to .gitignore..."
cat >> .gitignore << EOF

# Security credentials (added by generate-secure-credentials.sh)
secure-credentials/
*.env.production
*.env.staging
.env.local.secure
admin-credentials.txt
jwt-secret.txt
EOF

# Set secure permissions
chmod 600 secure-credentials/*.env
chmod 700 secure-credentials/

echo ""
echo "✅ Secure credentials generated successfully!"
echo ""
echo "📁 Generated files:"
echo "   • secure-credentials/jwt-secret.env"
echo "   • secure-credentials/admin-credentials.env"  
echo "   • secure-credentials/database-encryption.env"
echo "   • secure-credentials/session-secret.env"
echo "   • secure-credentials/secure-environment-variables.env"
echo ""
echo "🔐 Admin Credentials:"
echo "   Email: admin@6fb-ai.com"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   • These credentials are stored in secure-credentials/ directory"
echo "   • The directory has been added to .gitignore"
echo "   • Files have restricted permissions (600)"
echo "   • NEVER commit these files to version control"
echo "   • Store production credentials in secure environment variables"
echo ""
echo "📋 Next Steps:"
echo "   1. Copy secure-credentials/secure-environment-variables.env to .env.local"
echo "   2. Replace placeholder values with your actual API keys"
echo "   3. Test the application with secure credentials"
echo "   4. For production, set these as environment variables in your deployment platform"
echo ""
echo "🚀 To start the application:"
echo "   cp secure-credentials/secure-environment-variables.env .env.local"
echo "   # Edit .env.local to add your actual API keys"
echo "   docker-compose up"
echo ""