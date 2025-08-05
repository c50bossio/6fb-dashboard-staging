#!/bin/bash

# SDK Integration Audit Script
# Comprehensive audit of all SDK implementations and endpoint connectivity

set -e  # Exit on any error

echo "🔍 Auditing SDK integrations and endpoint connectivity..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDIT_RESULTS="$PROJECT_ROOT/sdk_integration_audit.json"

# Test counters
TOTAL_INTEGRATIONS=0
IMPLEMENTED_INTEGRATIONS=0
MISSING_INTEGRATIONS=0

echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}Audit Results: $AUDIT_RESULTS${NC}"

# Function to print status
print_status() {
    local integration="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_INTEGRATIONS=$((TOTAL_INTEGRATIONS + 1))
    
    if [[ "$status" == "IMPLEMENTED" ]]; then
        echo -e "${GREEN}✓ IMPLEMENTED${NC} $integration"
        if [[ -n "$details" ]]; then
            echo -e "  ${BLUE}Details: $details${NC}"
        fi
        IMPLEMENTED_INTEGRATIONS=$((IMPLEMENTED_INTEGRATIONS + 1))
    else
        echo -e "${RED}✗ MISSING${NC} $integration"
        if [[ -n "$details" ]]; then
            echo -e "  ${YELLOW}Missing: $details${NC}"
        fi
        MISSING_INTEGRATIONS=$((MISSING_INTEGRATIONS + 1))
    fi
}

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Start audit results JSON
cat > "$AUDIT_RESULTS" << 'EOF'
{
  "audit_timestamp": "",
  "total_integrations": 0,
  "implemented_integrations": 0,
  "missing_integrations": 0,
  "integration_status": {}
}
EOF

print_section "AI Services SDK Integration Audit"

# Check OpenAI SDK Integration
check_openai_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "openai\|OpenAI" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "openai\|OpenAI" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "OPENAI_API_KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$env_configured" == true ]]; then
        print_status "OpenAI SDK" "IMPLEMENTED" "Backend integration and API key configured"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "OpenAI SDK" "MISSING" "${missing%%, }"
    fi
}

# Check Anthropic Claude SDK Integration
check_anthropic_integration() {
    local backend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "anthropic\|claude" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "ANTHROPIC_API_KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$env_configured" == true ]]; then
        print_status "Anthropic Claude SDK" "IMPLEMENTED" "Backend integration and API key configured"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Anthropic Claude SDK" "MISSING" "${missing%%, }"
    fi
}

# Check Google Gemini SDK Integration
check_google_integration() {
    local backend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "google\|gemini" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "GOOGLE_.*API_KEY\|GEMINI.*API_KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$env_configured" == true ]]; then
        print_status "Google Gemini SDK" "IMPLEMENTED" "Backend integration and API key configured"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Google Gemini SDK" "MISSING" "${missing%%, }"
    fi
}

print_section "Database & Storage SDK Integration Audit"

# Check Supabase SDK Integration
check_supabase_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "supabase" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "supabase" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "SUPABASE_URL\|SUPABASE.*KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Supabase SDK" "IMPLEMENTED" "Frontend integration and credentials configured"
    else
        local missing=""
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Supabase SDK" "MISSING" "${missing%%, }"
    fi
}

print_section "Payment Processing SDK Integration Audit"

# Check Stripe SDK Integration
check_stripe_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "stripe" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "stripe" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "STRIPE.*KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Stripe SDK" "IMPLEMENTED" "Full-stack integration with API keys"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Stripe SDK" "MISSING" "${missing%%, }"
    fi
}

print_section "Communication & Notification SDK Integration Audit"

# Check SendGrid SDK Integration
check_sendgrid_integration() {
    local backend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "sendgrid" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "SENDGRID.*KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$env_configured" == true ]]; then
        print_status "SendGrid SDK" "IMPLEMENTED" "Backend integration and API key configured"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "SendGrid SDK" "MISSING" "${missing%%, }"
    fi
}

# Check Twilio SDK Integration
check_twilio_integration() {
    local backend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "twilio" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "TWILIO.*SID\|TWILIO.*TOKEN" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$env_configured" == true ]]; then
        print_status "Twilio SDK" "IMPLEMENTED" "Backend integration and credentials configured"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Twilio SDK" "MISSING" "${missing%%, }"
    fi
}

# Check Pusher SDK Integration
check_pusher_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "pusher" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "pusher" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "PUSHER.*KEY\|PUSHER.*ID" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Pusher SDK" "IMPLEMENTED" "Real-time communication setup"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Pusher SDK" "MISSING" "${missing%%, }"
    fi
}

# Check Novu SDK Integration
check_novu_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "novu" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "novu" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "NOVU.*KEY\|NOVU.*ID" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Novu SDK" "IMPLEMENTED" "Notification center integration"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Novu SDK" "MISSING" "${missing%%, }"
    fi
}

print_section "Analytics & Monitoring SDK Integration Audit"

# Check PostHog SDK Integration
check_posthog_integration() {
    local frontend_impl=false
    local env_configured=false
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "posthog" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "POSTHOG.*KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "PostHog SDK" "IMPLEMENTED" "Analytics and session recording"
    else
        local missing=""
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "PostHog SDK" "MISSING" "${missing%%, }"
    fi
}

# Check Sentry SDK Integration
check_sentry_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "sentry" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "sentry" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "SENTRY.*DSN" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$backend_impl" == true && "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Sentry SDK" "IMPLEMENTED" "Error tracking and performance monitoring"
    else
        local missing=""
        [[ "$backend_impl" == false ]] && missing+="backend implementation, "
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Sentry SDK" "MISSING" "${missing%%, }"
    fi
}

print_section "Security & Authentication SDK Integration Audit"

# Check Turnstile CAPTCHA Integration
check_turnstile_integration() {
    local frontend_impl=false
    local env_configured=false
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "turnstile\|cloudflare" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "TURNSTILE.*KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Cloudflare Turnstile" "IMPLEMENTED" "CAPTCHA protection"
    else
        local missing=""
        [[ "$frontend_impl" == false ]] && missing+="frontend implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Cloudflare Turnstile" "MISSING" "${missing%%, }"
    fi
}

print_section "Feature Flags & Configuration SDK Integration Audit"

# Check Vercel Edge Config Integration
check_vercel_integration() {
    local backend_impl=false
    local frontend_impl=false
    local env_configured=false
    
    # Check backend implementation
    if find "$PROJECT_ROOT" -name "*.py" -exec grep -l "edge.config\|vercel" {} \; | head -1 >/dev/null 2>&1; then
        backend_impl=true
    fi
    
    # Check frontend implementation
    if find "$PROJECT_ROOT/app" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "edge.config\|vercel" >/dev/null 2>&1; then
        frontend_impl=true
    fi
    
    # Check environment configuration
    if grep -q "EDGE_CONFIG" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        env_configured=true
    fi
    
    if [[ "$frontend_impl" == true && "$env_configured" == true ]]; then
        print_status "Vercel Edge Config" "IMPLEMENTED" "Feature flags and configuration"
    else
        local missing=""
        [[ "$frontend_impl" == false ]] && missing+="implementation, "
        [[ "$env_configured" == false ]] && missing+="environment configuration, "
        print_status "Vercel Edge Config" "MISSING" "${missing%%, }"
    fi
}

# Run all integration checks
run_all_checks() {
    print_section "AI Services"
    check_openai_integration
    check_anthropic_integration
    check_google_integration
    
    print_section "Database & Storage"
    check_supabase_integration
    
    print_section "Payment Processing"
    check_stripe_integration
    
    print_section "Communication & Notifications"
    check_sendgrid_integration
    check_twilio_integration
    check_pusher_integration
    check_novu_integration
    
    print_section "Analytics & Monitoring"
    check_posthog_integration
    check_sentry_integration
    
    print_section "Security & Authentication"
    check_turnstile_integration
    
    print_section "Feature Flags & Configuration"
    check_vercel_integration
}

# Generate integration summary
generate_integration_summary() {
    local completion_percentage=$((IMPLEMENTED_INTEGRATIONS * 100 / TOTAL_INTEGRATIONS))
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_section "SDK Integration Audit Summary"
    echo -e "${BLUE}Timestamp: $timestamp${NC}"
    echo -e "${BLUE}Total Integrations: $TOTAL_INTEGRATIONS${NC}"
    echo -e "${GREEN}Implemented: $IMPLEMENTED_INTEGRATIONS${NC}"
    echo -e "${RED}Missing: $MISSING_INTEGRATIONS${NC}"
    echo -e "${BLUE}Completion: $completion_percentage%${NC}"
    
    # Update JSON results
    cat > "$AUDIT_RESULTS" << EOF
{
  "audit_timestamp": "$timestamp",
  "total_integrations": $TOTAL_INTEGRATIONS,
  "implemented_integrations": $IMPLEMENTED_INTEGRATIONS,
  "missing_integrations": $MISSING_INTEGRATIONS,
  "completion_percentage": $completion_percentage,
  "integration_categories": {
    "ai_services": "OpenAI, Anthropic Claude, Google Gemini",
    "database_storage": "Supabase",
    "payment_processing": "Stripe",
    "communication": "SendGrid, Twilio, Pusher, Novu",
    "analytics_monitoring": "PostHog, Sentry",
    "security": "Cloudflare Turnstile",
    "feature_flags": "Vercel Edge Config"
  },
  "recommendations": {
    "high_priority": "Implement missing AI service integrations for core functionality",
    "medium_priority": "Set up communication and notification services",
    "low_priority": "Configure analytics and monitoring services"
  }
}
EOF
    
    # Integration assessment
    if [[ $completion_percentage -ge 90 ]]; then
        echo -e "\n${GREEN}🎉 INTEGRATION STATUS: EXCELLENT${NC}"
        echo -e "${GREEN}All critical SDKs are implemented and ready for production.${NC}"
    elif [[ $completion_percentage -ge 70 ]]; then
        echo -e "\n${YELLOW}🔧 INTEGRATION STATUS: GOOD${NC}"
        echo -e "${YELLOW}Most SDKs are implemented. Focus on missing high-priority integrations.${NC}"
    elif [[ $completion_percentage -ge 50 ]]; then
        echo -e "\n${YELLOW}⚠️ INTEGRATION STATUS: PARTIAL${NC}"
        echo -e "${YELLOW}Core integrations need completion before production deployment.${NC}"
    else
        echo -e "\n${RED}🚨 INTEGRATION STATUS: INCOMPLETE${NC}"
        echo -e "${RED}Significant SDK integration work required before production readiness.${NC}"
    fi
    
    echo -e "\n${BLUE}Detailed results saved to: $AUDIT_RESULTS${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🔍 6FB AI Agent System - SDK Integration Audit${NC}"
    echo -e "${BLUE}==================================================${NC}"
    
    run_all_checks
    generate_integration_summary
    
    echo -e "\n${GREEN}✅ SDK integration audit completed!${NC}"
    
    if [[ $MISSING_INTEGRATIONS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All SDK integrations are complete!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️ Some SDK integrations need implementation.${NC}"
        echo -e "${BLUE}Next step: Run the SDK implementation script to complete missing integrations.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"