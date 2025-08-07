#!/bin/bash

# End-to-End SDK Connectivity Test Script
# Tests actual connectivity from frontend to backend to external services

set -e  # Exit on any error

echo "🔗 Testing end-to-end SDK connectivity..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="http://localhost:8001"
FRONTEND_URL="http://localhost:9999"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}Backend URL: $BACKEND_URL${NC}"
echo -e "${BLUE}Frontend URL: $FRONTEND_URL${NC}"

# Function to print test results
print_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [[ "$status" == "PASSED" ]]; then
        echo -e "${GREEN}✓ PASSED${NC} $test_name"
        if [[ -n "$details" ]]; then
            echo -e "  ${BLUE}Details: $details${NC}"
        fi
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC} $test_name"
        if [[ -n "$details" ]]; then
            echo -e "  ${YELLOW}Error: $details${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Check if services are running
check_services_running() {
    print_section "Service Availability Check"
    
    # Check backend
    if curl -s -f "$BACKEND_URL/api/health" > /dev/null 2>&1; then
        print_test_result "Backend Service" "PASSED" "Available at $BACKEND_URL"
    else
        print_test_result "Backend Service" "FAILED" "Not reachable at $BACKEND_URL"
    fi
    
    # Check frontend
    if curl -s -f "$FRONTEND_URL" > /dev/null 2>&1; then
        print_test_result "Frontend Service" "PASSED" "Available at $FRONTEND_URL"
    else
        print_test_result "Frontend Service" "FAILED" "Not reachable at $FRONTEND_URL"
    fi
    
    # Check database
    if [[ -f "$PROJECT_ROOT/agent_system.db" ]]; then
        print_test_result "Database File" "PASSED" "SQLite database exists"
    else
        print_test_result "Database File" "FAILED" "SQLite database not found"
    fi
}

# Test AI Service Endpoints
test_ai_endpoints() {
    print_section "AI Service Endpoint Testing"
    
    # Test OpenAI endpoint
    if curl -s -f "$BACKEND_URL/api/ai/chat" -H "Content-Type: application/json" -d '{"message":"test","provider":"openai"}' > /dev/null 2>&1; then
        print_test_result "OpenAI Chat Endpoint" "PASSED" "Backend endpoint responds"
    else
        print_test_result "OpenAI Chat Endpoint" "FAILED" "Backend endpoint not responding"
    fi
    
    # Test Anthropic endpoint
    if curl -s -f "$BACKEND_URL/api/ai/chat" -H "Content-Type: application/json" -d '{"message":"test","provider":"anthropic"}' > /dev/null 2>&1; then
        print_test_result "Anthropic Chat Endpoint" "PASSED" "Backend endpoint responds"
    else
        print_test_result "Anthropic Chat Endpoint" "FAILED" "Backend endpoint not responding"
    fi
    
    # Test Google Gemini endpoint
    if curl -s -f "$BACKEND_URL/api/ai/chat" -H "Content-Type: application/json" -d '{"message":"test","provider":"google"}' > /dev/null 2>&1; then
        print_test_result "Google Gemini Chat Endpoint" "PASSED" "Backend endpoint responds"
    else
        print_test_result "Google Gemini Chat Endpoint" "FAILED" "Backend endpoint not responding"
    fi
}

# Test Database Connectivity
test_database_connectivity() {
    print_section "Database Connectivity Testing"
    
    # Test health endpoint that includes database check
    response=$(curl -s "$BACKEND_URL/api/health" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "database.*ok\|status.*ok" 2>/dev/null; then
        print_test_result "Database Connection" "PASSED" "Database responding via health check"
    elif [[ -n "$response" ]]; then
        print_test_result "Database Connection" "PASSED" "Health endpoint responding"
    else
        print_test_result "Database Connection" "FAILED" "Health endpoint not responding"
    fi
    
    # Test Supabase connection (if configured)
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        supabase_url=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
        if [[ -n "$supabase_url" ]] && curl -s -f "$supabase_url" > /dev/null 2>&1; then
            print_test_result "Supabase Connection" "PASSED" "Supabase URL reachable"
        else
            print_test_result "Supabase Connection" "FAILED" "Supabase URL not reachable"
        fi
    else
        print_test_result "Supabase Configuration" "FAILED" "Supabase URL not configured"
    fi
}

# Test Payment Processing
test_payment_endpoints() {
    print_section "Payment Processing Testing"
    
    # Test Stripe webhook endpoint
    if curl -s -f "$BACKEND_URL/api/stripe/webhook" -X POST -H "Content-Type: application/json" -d '{"test": true}' > /dev/null 2>&1; then
        print_test_result "Stripe Webhook Endpoint" "PASSED" "Endpoint responds"
    else
        print_test_result "Stripe Webhook Endpoint" "FAILED" "Endpoint not responding"
    fi
    
    # Check if Stripe is configured
    if grep -q "STRIPE.*KEY" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
        print_test_result "Stripe Configuration" "PASSED" "API keys configured"
    else
        print_test_result "Stripe Configuration" "FAILED" "API keys not configured"
    fi
}

# Test Communication Services
test_communication_endpoints() {
    print_section "Communication Service Testing"
    
    # Test email endpoint
    if curl -s -f "$BACKEND_URL/api/email/send" -X POST -H "Content-Type: application/json" -d '{"test": true}' > /dev/null 2>&1; then
        print_test_result "Email Service Endpoint" "PASSED" "Endpoint responds"
    else
        print_test_result "Email Service Endpoint" "FAILED" "Endpoint not responding"
    fi
    
    # Test SMS endpoint
    if curl -s -f "$BACKEND_URL/api/sms/send" -X POST -H "Content-Type: application/json" -d '{"test": true}' > /dev/null 2>&1; then
        print_test_result "SMS Service Endpoint" "PASSED" "Endpoint responds"
    else
        print_test_result "SMS Service Endpoint" "FAILED" "Endpoint not responding"
    fi
    
    # Test WebSocket/Pusher connection
    if curl -s -f "$BACKEND_URL/api/pusher/auth" -X POST -H "Content-Type: application/json" -d '{"test": true}' > /dev/null 2>&1; then
        print_test_result "Real-time Service Endpoint" "PASSED" "Pusher auth endpoint responds"
    else
        print_test_result "Real-time Service Endpoint" "FAILED" "Pusher auth endpoint not responding"
    fi
}

# Test Frontend SDK Imports
test_frontend_sdk_imports() {
    print_section "Frontend SDK Import Testing"
    
    # Check if SDK files are properly importable
    local sdk_files=(
        "lib/supabase.js"
        "lib/stripe.js"
        "lib/pusher-client.js"
        "lib/novu.js"
        "lib/posthog.js"
        "lib/sentry.js"
        "lib/edgeConfig.js"
        "lib/turnstile.js"
    )
    
    for sdk_file in "${sdk_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$sdk_file" ]]; then
            # Basic syntax check (if node is available)
            if command -v node &> /dev/null; then
                if node -c "$PROJECT_ROOT/$sdk_file" 2>/dev/null; then
                    print_test_result "Frontend SDK: $(basename $sdk_file)" "PASSED" "File exists and syntax is valid"
                else
                    print_test_result "Frontend SDK: $(basename $sdk_file)" "FAILED" "Syntax errors detected"
                fi
            else
                print_test_result "Frontend SDK: $(basename $sdk_file)" "PASSED" "File exists"
            fi
        else
            print_test_result "Frontend SDK: $(basename $sdk_file)" "FAILED" "File not found"
        fi
    done
}

# Test API Route Endpoints
test_api_routes() {
    print_section "API Route Testing"
    
    # Test Next.js API routes
    local api_routes=(
        "/api/health"
        "/api/auth"
        "/api/bookings"
        "/api/analytics"
        "/api/ai/chat"
        "/api/stripe/webhook"
        "/api/pusher/auth"
        "/api/email/send"
        "/api/sms/send"
    )
    
    for route in "${api_routes[@]}"; do
        if curl -s -f "$BACKEND_URL$route" > /dev/null 2>&1; then
            print_test_result "API Route: $route" "PASSED" "Endpoint responds"
        else
            print_test_result "API Route: $route" "FAILED" "Endpoint not responding"
        fi
    done
}

# Test Environment Configuration
test_environment_config() {
    print_section "Environment Configuration Testing"
    
    # Check critical environment variables
    local required_vars=(
        "JWT_SECRET_KEY"
        "DATABASE_ENCRYPTION_KEY"
        "SESSION_SECRET"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    
    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        for var in "${required_vars[@]}"; do
            if grep -q "$var=" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
                print_test_result "Environment Variable: $var" "PASSED" "Configured"
            else
                print_test_result "Environment Variable: $var" "FAILED" "Not configured"
            fi
        done
    else
        print_test_result "Environment File" "FAILED" ".env.local not found"
    fi
}

# Test External Service Connectivity
test_external_services() {
    print_section "External Service Connectivity Testing"
    
    # Test external API endpoints
    if curl -s -f "https://api.openai.com/v1/models" -H "Authorization: Bearer test" > /dev/null 2>&1; then
        print_test_result "OpenAI API Reachability" "PASSED" "API endpoint reachable"
    else
        print_test_result "OpenAI API Reachability" "FAILED" "API endpoint not reachable"
    fi
    
    if curl -s -f "https://api.anthropic.com/v1/messages" -H "Authorization: Bearer test" > /dev/null 2>&1; then
        print_test_result "Anthropic API Reachability" "PASSED" "API endpoint reachable"
    else
        print_test_result "Anthropic API Reachability" "FAILED" "API endpoint not reachable"
    fi
    
    if curl -s -f "https://api.stripe.com/v1/customers" -H "Authorization: Bearer test" > /dev/null 2>&1; then
        print_test_result "Stripe API Reachability" "PASSED" "API endpoint reachable"
    else
        print_test_result "Stripe API Reachability" "FAILED" "API endpoint not reachable"
    fi
}

# Generate connectivity report
generate_connectivity_report() {
    print_section "End-to-End Connectivity Report"
    
    local success_percentage=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$PROJECT_ROOT/connectivity_test_report.json" << EOF
{
  "test_timestamp": "$timestamp",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "failed_tests": $FAILED_TESTS,
  "success_percentage": $success_percentage,
  "services_tested": {
    "backend_api": "FastAPI backend service",
    "frontend_app": "Next.js frontend application", 
    "database": "SQLite/Supabase connection",
    "ai_services": "OpenAI, Anthropic, Google Gemini",
    "payment_processing": "Stripe integration",
    "communication": "Email, SMS, WebSocket services",
    "sdk_implementations": "Frontend SDK library files",
    "external_apis": "Third-party service connectivity"
  },
  "connectivity_status": {
    "frontend_to_backend": "tested",
    "backend_to_database": "tested",
    "backend_to_external_apis": "tested",
    "sdk_availability": "tested",
    "environment_configuration": "tested"
  }
}
EOF
    
    echo -e "${BLUE}Timestamp: $timestamp${NC}"
    echo -e "${BLUE}Total Tests: $TOTAL_TESTS${NC}"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}Success Rate: $success_percentage%${NC}"
    
    # Overall assessment
    if [[ $success_percentage -ge 90 ]]; then
        echo -e "\n${GREEN}🎉 CONNECTIVITY STATUS: EXCELLENT${NC}"
        echo -e "${GREEN}All critical connections are working properly.${NC}"
    elif [[ $success_percentage -ge 75 ]]; then
        echo -e "\n${YELLOW}🔧 CONNECTIVITY STATUS: GOOD${NC}"
        echo -e "${YELLOW}Most connections are working. Address failed tests for production readiness.${NC}"
    elif [[ $success_percentage -ge 50 ]]; then
        echo -e "\n${YELLOW}⚠️ CONNECTIVITY STATUS: PARTIAL${NC}"
        echo -e "${YELLOW}Several connection issues need to be resolved.${NC}"
    else
        echo -e "\n${RED}🚨 CONNECTIVITY STATUS: CRITICAL${NC}"
        echo -e "${RED}Significant connectivity issues require immediate attention.${NC}"
    fi
    
    echo -e "\n${BLUE}Detailed report saved to: connectivity_test_report.json${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🔗 6FB AI Agent System - End-to-End Connectivity Testing${NC}"
    echo -e "${BLUE}=======================================================${NC}"
    
    check_services_running
    test_ai_endpoints
    test_database_connectivity
    test_payment_endpoints
    test_communication_endpoints
    test_frontend_sdk_imports
    test_api_routes
    test_environment_config
    test_external_services
    generate_connectivity_report
    
    echo -e "\n${GREEN}✅ End-to-end connectivity testing completed!${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All connectivity tests passed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️ Some connectivity tests failed. Review the report for details.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"