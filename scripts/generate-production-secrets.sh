#!/bin/bash

# Generate Production Secrets Script for 6FB AI Agent System
# This script generates secure random secrets for production deployment

set -e

echo "🔐 Generating production secrets for 6FB AI Agent System..."

# Create secure credentials directory
SECURE_DIR="./secure-credentials"
mkdir -p "$SECURE_DIR"

# Set proper permissions
chmod 700 "$SECURE_DIR"

# Function to generate random secret
generate_secret() {
    local length=${1:-64}
    openssl rand -hex $length
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d '\n'
}

# Function to generate strong password
generate_password() {
    openssl rand -base64 32 | tr -d '\n'
}

# Generate all secrets
echo "📝 Generating database credentials..."
POSTGRES_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)

echo "🔑 Generating application secrets..."
JWT_SECRET=$(generate_jwt_secret)
SESSION_SECRET=$(generate_secret)
NEXTAUTH_SECRET=$(generate_jwt_secret)

echo "🛡️ Generating encryption keys..."
BACKUP_ENCRYPTION_KEY=$(generate_secret)

echo "📊 Generating monitoring credentials..."
GRAFANA_PASSWORD=$(generate_password)

# Create individual secret files
cat > "$SECURE_DIR/database-secrets.env" << EOF
# Database Secrets - Generated $(date)
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
EOF

cat > "$SECURE_DIR/application-secrets.env" << EOF
# Application Secrets - Generated $(date)
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
EOF

cat > "$SECURE_DIR/encryption-secrets.env" << EOF
# Encryption Secrets - Generated $(date)
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY
EOF

cat > "$SECURE_DIR/monitoring-secrets.env" << EOF
# Monitoring Secrets - Generated $(date)
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
EOF

# Create master secrets file
cat > "$SECURE_DIR/all-secrets.env" << EOF
# Master Production Secrets - Generated $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD

# Application Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Encryption
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY

# Monitoring
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
EOF

# Set proper permissions on all secret files
chmod 600 "$SECURE_DIR"/*.env

echo "✅ Production secrets generated successfully!"
echo ""
echo "📁 Secret files created in: $SECURE_DIR/"
echo "   - database-secrets.env"
echo "   - application-secrets.env"
echo "   - encryption-secrets.env"
echo "   - monitoring-secrets.env"
echo "   - all-secrets.env (master file)"
echo ""
echo "🚨 IMPORTANT SECURITY NOTES:"
echo "   1. These files contain sensitive production secrets"
echo "   2. Store them securely and never commit to version control"
echo "   3. Use a password manager or secure vault for distribution"
echo "   4. Rotate these secrets regularly in production"
echo ""
echo "📋 Next Steps:"
echo "   1. Copy .env.production.template to .env.production"
echo "   2. Fill in API keys and external service credentials"
echo "   3. Replace placeholder secrets with generated values"
echo "   4. Configure SSL certificates for HTTPS"
echo ""

# Create .gitignore entry for secrets
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

if ! grep -q "secure-credentials/" .gitignore; then
    echo "secure-credentials/" >> .gitignore
    echo "📝 Added secure-credentials/ to .gitignore"
fi

# Create production environment template with secrets
if [ -f .env.production.template ]; then
    cp .env.production.template .env.production.example
    
    # Replace placeholder values with generated secrets
    sed -i.bak \
        -e "s/<GENERATE_STRONG_PASSWORD>/$POSTGRES_PASSWORD/g" \
        -e "s/<GENERATE_256_BIT_SECRET>/$JWT_SECRET/g" \
        -e "s/<GENERATE_256_BIT_KEY>/$BACKUP_ENCRYPTION_KEY/g" \
        -e "s/<GENERATE_STRONG_PASSWORD>/$GRAFANA_PASSWORD/g" \
        .env.production.example

    rm .env.production.example.bak
    echo "📄 Created .env.production.example with generated secrets"
fi

echo ""
echo "🔐 Secret generation complete!"
echo "   Keep these credentials secure and distribute them safely to your production environment."