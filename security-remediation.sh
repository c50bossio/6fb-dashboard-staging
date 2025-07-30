#!/bin/bash

# ===========================================
# SECURITY REMEDIATION SCRIPT
# ===========================================
# This script helps remediate hardcoded secrets and improve security posture
# Run with: chmod +x security-remediation.sh && ./security-remediation.sh

set -e  # Exit on any error

echo "🚨 Starting Security Remediation Process..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# ===========================================
# 1. BACKUP CURRENT STATE
# ===========================================
echo ""
echo "1. Creating backup of current state..."
BACKUP_DIR="security-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup sensitive files before modification
find . -name "*.env*" -not -path "./node_modules/*" -not -path "./.git/*" -exec cp {} "$BACKUP_DIR/" \; 2>/dev/null || true
print_status "Created backup in $BACKUP_DIR/"

# ===========================================
# 2. UPDATE .gitignore FOR SECURITY
# ===========================================
echo ""
echo "2. Updating .gitignore to exclude sensitive files..."

# Create comprehensive .gitignore entries
cat >> .gitignore << 'EOF'

# ===========================================
# SECURITY: Environment & Secrets
# ===========================================
.env
.env.local
.env.development
.env.test
.env.production
.env.*.local
*.pem
*.key
*.cert
*.p12
*.pfx

# API Keys & Secrets
**/secrets/
**/credentials/
**/*secret*
**/*credential*
**/*key*.json
**/service-account*.json

# Database files
*.db
*.sqlite
*.sqlite3

# Logs with potential sensitive data
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE and OS files
.DS_Store
.vscode/settings.json
.idea/
*.swp
*.swo

# Temporary files
tmp/
temp/
*.tmp
*.temp

EOF

print_status "Updated .gitignore with security exclusions"

# ===========================================
# 3. REMOVE SENSITIVE FILES FROM GIT TRACKING
# ===========================================
echo ""
echo "3. Removing sensitive files from git tracking..."

# Remove .env.local from git tracking if it exists
if [ -f ".env.local" ]; then
    git rm --cached .env.local 2>/dev/null || true
    print_warning "Removed .env.local from git tracking"
fi

# Remove other potential sensitive files
git rm --cached -r **/*.env 2>/dev/null || true
git rm --cached -r **/*.key 2>/dev/null || true
git rm --cached -r **/*.pem 2>/dev/null || true

print_status "Removed sensitive files from git tracking"

# ===========================================
# 4. SCAN FOR HARDCODED SECRETS
# ===========================================
echo ""
echo "4. Scanning for remaining hardcoded secrets..."

# Create a temporary file for scan results
SCAN_RESULTS="security-scan-$(date +%Y%m%d-%H%M%S).txt"

echo "Security Scan Results - $(date)" > "$SCAN_RESULTS"
echo "======================================" >> "$SCAN_RESULTS"

# Search patterns for common secrets
declare -a patterns=(
    "api[_-]?key[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "secret[_-]?key[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "password[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "token[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "jwt[_-]?secret[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "database[_-]?url[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "redis[_-]?url[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "stripe[_-]?secret[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "sendgrid[_-]?api[_-]?key[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "aws[_-]?secret[[:space:]]*[=:][[:space:]]*['\"][^'\"]*['\"]"
    "sk-[a-zA-Z0-9]{32,}"
    "pk_test_[a-zA-Z0-9]{32,}"
    "sk_test_[a-zA-Z0-9]{32,}"
    "SG\.[a-zA-Z0-9_.-]{22,}"
)

# Scan for each pattern
for pattern in "${patterns[@]}"; do
    echo "" >> "$SCAN_RESULTS"
    echo "Pattern: $pattern" >> "$SCAN_RESULTS"
    echo "------------------------" >> "$SCAN_RESULTS"
    
    # Search in various file types, excluding sensitive directories
    grep -r -i -n --include="*.py" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.toml" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=venv --exclude-dir=__pycache__ -E "$pattern" . >> "$SCAN_RESULTS" 2>/dev/null || echo "No matches found" >> "$SCAN_RESULTS"
done

print_status "Security scan completed. Results saved to $SCAN_RESULTS"

# ===========================================
# 5. GENERATE SECURE RANDOM SECRETS
# ===========================================
echo ""
echo "5. Generating secure random secrets for .env file..."

# Create .env file with secure random values
cat > .env << EOF
# ===========================================
# GENERATED SECURE ENVIRONMENT VARIABLES
# Generated on: $(date)
# ===========================================

# CRITICAL: Replace these with your actual values
# These are secure random placeholders

# JWT Configuration
JWT_SECRET_KEY=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n' | head -c 32)

# Database Configuration (UPDATE WITH YOUR VALUES)
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_db_username
DB_PASSWORD=your_secure_password

# API Keys (UPDATE WITH YOUR ACTUAL KEYS)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Application Configuration
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
API_BASE_URL=http://localhost:8000/api/v1

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Security Headers
CORS_ORIGINS=http://localhost:3000
SECURE_COOKIES=false
SESSION_TIMEOUT=3600

EOF

print_status "Generated .env file with secure random secrets"

# ===========================================
# 6. SET SECURE FILE PERMISSIONS
# ===========================================
echo ""
echo "6. Setting secure file permissions..."

# Set restrictive permissions on sensitive files
chmod 600 .env 2>/dev/null || true
chmod 600 .env.example 2>/dev/null || true
find . -name "*.key" -exec chmod 600 {} \; 2>/dev/null || true
find . -name "*.pem" -exec chmod 600 {} \; 2>/dev/null || true

print_status "Set secure file permissions"

# ===========================================
# 7. CREATE SECURITY DOCUMENTATION
# ===========================================
echo ""
echo "7. Creating security documentation..."

cat > SECURITY.md << 'EOF'
# Security Documentation

## Environment Variables Security

### Critical Security Practices

1. **Never commit .env files to version control**
2. **Use .env.example as a template only**
3. **Rotate secrets regularly (quarterly minimum)**
4. **Use different secrets for different environments**
5. **Store production secrets in secure vaults**

### Environment Files Structure

```
.env.example        # Template (safe to commit)
.env                # Local development (NEVER commit)
.env.production     # Production secrets (NEVER commit)
.env.staging        # Staging secrets (NEVER commit)
.env.test           # Test environment (NEVER commit)
```

### Secret Management Checklist

- [ ] All API keys stored in environment variables
- [ ] Database credentials not hardcoded
- [ ] JWT secrets are cryptographically secure
- [ ] Session secrets are unique per environment
- [ ] File permissions set to 600 for sensitive files
- [ ] .gitignore updated to exclude sensitive files
- [ ] Regular secret rotation schedule established

### Emergency Response

If secrets are accidentally committed:
1. **Immediately revoke/rotate** the exposed credentials
2. **Remove from git history** using git filter-branch or BFG
3. **Update all environments** with new credentials
4. **Audit access logs** for unauthorized usage

### Security Contacts

- Security Issues: [Add your security contact]
- Infrastructure: [Add your infrastructure contact]
EOF

print_status "Created SECURITY.md documentation"

# ===========================================
# 8. VALIDATION AND FINAL STEPS
# ===========================================
echo ""
echo "8. Running final validation..."

# Check if any .env files are still tracked by git
TRACKED_ENV_FILES=$(git ls-files | grep -E '\.env' | grep -v '\.env\.example' || true)
if [ -n "$TRACKED_ENV_FILES" ]; then
    print_warning "The following .env files are still tracked by git:"
    echo "$TRACKED_ENV_FILES"
    print_warning "Run: git rm --cached <filename> for each file"
else
    print_status "No .env files are tracked by git"
fi

# ===========================================
# 9. SUMMARY AND NEXT STEPS
# ===========================================
echo ""
echo "=========================================="
echo "🔒 Security Remediation Summary"
echo "=========================================="
echo ""
print_status "Backup created in: $BACKUP_DIR/"
print_status "Security scan results: $SCAN_RESULTS"
print_status "Updated .gitignore with security exclusions"
print_status "Generated secure .env file with random secrets"
print_status "Created SECURITY.md documentation"
echo ""
print_warning "CRITICAL NEXT STEPS:"
echo "1. Review and update .env file with your actual API keys"
echo "2. Revoke any API keys that were previously hardcoded"
echo "3. Generate new API keys from service providers"
echo "4. Update your deployment configuration to use environment variables"
echo "5. Set up secure secret management for production (AWS Secrets Manager, etc.)"
echo ""
print_info "Review the security scan results in: $SCAN_RESULTS"
print_info "All sensitive files have been backed up to: $BACKUP_DIR/"
echo ""
echo "🔒 Security remediation completed successfully!"

# Make the script executable
chmod +x "$0"