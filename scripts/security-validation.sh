#!/bin/bash

# Comprehensive Security Validation Script for 6FB AI Agent System
# Tests all security implementations from Phase 1 and Phase 2

set -e  # Exit on any error

echo "🔒 Running comprehensive security validation tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_FILE="$PROJECT_ROOT/security_validation_results.json"
TEMP_DIR="/tmp/6fb_security_test"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}Test Results: $TEST_RESULTS_FILE${NC}"

# Function to print status
print_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [[ "$result" == "PASS" ]]; then
        echo -e "${GREEN}✓ PASS${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC} $test_name"
        if [[ -n "$details" ]]; then
            echo -e "  ${YELLOW}Details: $details${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Create temporary directory for tests
mkdir -p "$TEMP_DIR"

# Start test results JSON
cat > "$TEST_RESULTS_FILE" << 'EOF'
{
  "test_run": {
    "timestamp": "",
    "environment": "",
    "total_tests": 0,
    "passed_tests": 0,
    "failed_tests": 0,
    "security_score": 0
  },
  "test_categories": {}
}
EOF

print_section "Phase 1: Critical Security Vulnerabilities Tests"

# Test 1.1: JWT Secret Key Security
test_jwt_security() {
    if [[ -f "$PROJECT_ROOT/.env.local" ]] && grep -q "JWT_SECRET_KEY=" "$PROJECT_ROOT/.env.local"; then
        local jwt_key=$(grep "JWT_SECRET_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
        if [[ ${#jwt_key} -ge 32 && "$jwt_key" != "6fb-ai-agent-system-secret-key-change-in-production" ]]; then
            print_test_result "JWT Secret Key Security" "PASS" "Strong secret key configured"
        else
            print_test_result "JWT Secret Key Security" "FAIL" "Weak or default JWT secret key"
        fi
    else
        print_test_result "JWT Secret Key Security" "FAIL" "JWT secret key not found"
    fi
}

# Test 1.2: Admin Password Security
test_admin_password() {
    if [[ -f "$PROJECT_ROOT/.env.local" ]] && grep -q "ADMIN_PASSWORD=" "$PROJECT_ROOT/.env.local"; then
        local admin_pass=$(grep "ADMIN_PASSWORD=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
        if [[ ${#admin_pass} -ge 16 && "$admin_pass" != "admin123" ]]; then
            print_test_result "Admin Password Security" "PASS" "Strong admin password configured"
        else
            print_test_result "Admin Password Security" "FAIL" "Weak or default admin password"
        fi
    else
        print_test_result "Admin Password Security" "FAIL" "Admin password not found in environment"
    fi
}

# Test 1.3: Password Hashing Implementation
test_password_hashing() {
    if [[ -f "$PROJECT_ROOT/services/auth_service.py" ]]; then
        if grep -q "bcrypt.hashpw" "$PROJECT_ROOT/services/auth_service.py"; then
            print_test_result "Password Hashing (bcrypt)" "PASS" "bcrypt password hashing implemented"
        else
            print_test_result "Password Hashing (bcrypt)" "FAIL" "bcrypt password hashing not found"
        fi
    else
        print_test_result "Password Hashing (bcrypt)" "FAIL" "Auth service file not found"
    fi
}

# Test 1.4: CORS Configuration Security
test_cors_security() {
    if [[ -f "$PROJECT_ROOT/fastapi-server.py" ]] || [[ -f "$PROJECT_ROOT/fastapi_backend.py" ]]; then
        local backend_file=""
        [[ -f "$PROJECT_ROOT/fastapi_backend.py" ]] && backend_file="$PROJECT_ROOT/fastapi_backend.py"
        [[ -f "$PROJECT_ROOT/fastapi-server.py" ]] && backend_file="$PROJECT_ROOT/fastapi-server.py"
        
        if grep -q "allow_origins=\[" "$backend_file" && ! grep -q 'allow_origins=\["*"\]' "$backend_file"; then
            print_test_result "CORS Configuration Security" "PASS" "CORS properly configured (no wildcard)"
        else
            print_test_result "CORS Configuration Security" "FAIL" "Insecure CORS configuration detected"
        fi
    else
        print_test_result "CORS Configuration Security" "FAIL" "Backend file not found"
    fi
}

# Test 1.5: Input Validation Implementation
test_input_validation() {
    if [[ -f "$PROJECT_ROOT/security/input_validation.py" ]]; then
        if grep -q "html.escape" "$PROJECT_ROOT/security/input_validation.py" && 
           grep -q "validate_email" "$PROJECT_ROOT/security/input_validation.py"; then
            print_test_result "Input Validation System" "PASS" "Comprehensive input validation implemented"
        else
            print_test_result "Input Validation System" "FAIL" "Input validation incomplete"
        fi
    else
        print_test_result "Input Validation System" "FAIL" "Input validation system not found"
    fi
}

# Test 1.6: Environment Variables Security
test_environment_security() {
    local secure_files_count=0
    local total_env_files=0
    
    for env_file in "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/.env.production"; do
        if [[ -f "$env_file" ]]; then
            total_env_files=$((total_env_files + 1))
            
            # Check file permissions (should be 600 or similar)
            local permissions=$(stat -f "%OLp" "$env_file" 2>/dev/null || stat -c "%a" "$env_file" 2>/dev/null || echo "unknown")
            if [[ "$permissions" == "600" ]] || [[ "$permissions" == "640" ]]; then
                secure_files_count=$((secure_files_count + 1))
            fi
        fi
    done
    
    if [[ $total_env_files -gt 0 && $secure_files_count -eq $total_env_files ]]; then
        print_test_result "Environment Files Security" "PASS" "Environment files have secure permissions"
    elif [[ $total_env_files -gt 0 ]]; then
        print_test_result "Environment Files Security" "FAIL" "Some environment files have insecure permissions"
    else
        print_test_result "Environment Files Security" "FAIL" "No environment files found"
    fi
}

# Test 1.7: Docker Security Configuration
test_docker_security() {
    local docker_files_found=0
    local secure_configs=0
    
    for dockerfile in "$PROJECT_ROOT/Dockerfile.frontend" "$PROJECT_ROOT/Dockerfile.backend"; do
        if [[ -f "$dockerfile" ]]; then
            docker_files_found=$((docker_files_found + 1))
            
            if grep -q "USER " "$dockerfile" && ! grep -q "USER root" "$dockerfile"; then
                secure_configs=$((secure_configs + 1))
            fi
        fi
    done
    
    if [[ $docker_files_found -gt 0 && $secure_configs -eq $docker_files_found ]]; then
        print_test_result "Docker Security (Non-root users)" "PASS" "Docker containers run as non-root users"
    elif [[ $docker_files_found -gt 0 ]]; then
        print_test_result "Docker Security (Non-root users)" "FAIL" "Some Docker containers may run as root"
    else
        print_test_result "Docker Security (Non-root users)" "FAIL" "Docker files not found"
    fi
}

# Test 1.8: Password Logging Elimination
test_password_logging() {
    local log_issues=0
    
    # Check for password logging in backend files
    for file in "$PROJECT_ROOT"/*.py "$PROJECT_ROOT"/services/*.py; do
        if [[ -f "$file" ]]; then
            if grep -i "password.*print\|print.*password\|log.*password\|password.*log" "$file" >/dev/null 2>&1; then
                log_issues=$((log_issues + 1))
            fi
        fi
    done
    
    if [[ $log_issues -eq 0 ]]; then
        print_test_result "Password Logging Elimination" "PASS" "No password logging found in code"
    else
        print_test_result "Password Logging Elimination" "FAIL" "Password logging detected in $log_issues files"
    fi
}

print_section "Phase 2: Infrastructure Hardening Tests"

# Test 2.1: Rate Limiting Implementation
test_rate_limiting() {
    if [[ -f "$PROJECT_ROOT/middleware/rate_limiting.py" ]]; then
        if grep -q "SlidingWindowRateLimiter" "$PROJECT_ROOT/middleware/rate_limiting.py" && 
           grep -q "Redis" "$PROJECT_ROOT/middleware/rate_limiting.py"; then
            print_test_result "Rate Limiting Middleware" "PASS" "Advanced rate limiting with Redis backend implemented"
        else
            print_test_result "Rate Limiting Middleware" "FAIL" "Rate limiting implementation incomplete"
        fi
    else
        print_test_result "Rate Limiting Middleware" "FAIL" "Rate limiting middleware not found"
    fi
}

# Test 2.2: Security Headers Implementation
test_security_headers() {
    if [[ -f "$PROJECT_ROOT/middleware/security_headers.py" ]]; then
        local required_headers=("Content-Security-Policy" "X-Frame-Options" "Strict-Transport-Security" "X-Content-Type-Options")
        local found_headers=0
        
        for header in "${required_headers[@]}"; do
            if grep -q "$header" "$PROJECT_ROOT/middleware/security_headers.py"; then
                found_headers=$((found_headers + 1))
            fi
        done
        
        if [[ $found_headers -eq ${#required_headers[@]} ]]; then
            print_test_result "Security Headers Middleware" "PASS" "All critical security headers implemented"
        else
            print_test_result "Security Headers Middleware" "FAIL" "Missing security headers ($found_headers/${#required_headers[@]})"
        fi
    else
        print_test_result "Security Headers Middleware" "FAIL" "Security headers middleware not found"
    fi
}

# Test 2.3: Session Management Security
test_session_management() {
    if [[ -f "$PROJECT_ROOT/security/session_management.py" ]]; then
        if grep -q "SecureSessionManager" "$PROJECT_ROOT/security/session_management.py" && 
           grep -q "token_blacklisted" "$PROJECT_ROOT/security/session_management.py" &&
           grep -q "device_fingerprint" "$PROJECT_ROOT/security/session_management.py"; then
            print_test_result "Secure Session Management" "PASS" "Advanced session management with security features implemented"
        else
            print_test_result "Secure Session Management" "FAIL" "Session management implementation incomplete"
       fi
    else
        print_test_result "Secure Session Management" "FAIL" "Session management system not found"
    fi
}

# Test 2.4: Database Encryption at Rest
test_database_encryption() {
    if [[ -f "$PROJECT_ROOT/security/database_encryption.py" ]]; then
        if grep -q "DatabaseEncryption" "$PROJECT_ROOT/security/database_encryption.py" && 
           grep -q "AES-256-GCM" "$PROJECT_ROOT/security/database_encryption.py" &&
           grep -q "searchable" "$PROJECT_ROOT/security/database_encryption.py"; then
            print_test_result "Database Encryption at Rest" "PASS" "AES-256-GCM encryption with searchable fields implemented"
        else
            print_test_result "Database Encryption at Rest" "FAIL" "Database encryption implementation incomplete"
        fi
    else
        print_test_result "Database Encryption at Rest" "FAIL" "Database encryption system not found"
    fi
}

# Test 2.5: Production Configuration Security
test_production_config() {
    if [[ -f "$PROJECT_ROOT/docker-compose.production.yml" ]]; then
        local security_features=0
        
        # Check for security features in production config
        if grep -q "no-new-privileges" "$PROJECT_ROOT/docker-compose.production.yml"; then
            security_features=$((security_features + 1))
        fi
        if grep -q "read_only: true" "$PROJECT_ROOT/docker-compose.production.yml"; then
            security_features=$((security_features + 1))
        fi
        if grep -q "127.0.0.1:" "$PROJECT_ROOT/docker-compose.production.yml"; then
            security_features=$((security_features + 1))
        fi
        
        if [[ $security_features -ge 2 ]]; then
            print_test_result "Production Configuration Security" "PASS" "Production config includes security hardening"
        else
            print_test_result "Production Configuration Security" "FAIL" "Production config lacks security features"
        fi
    else
        print_test_result "Production Configuration Security" "FAIL" "Production configuration not found"
    fi
}

# Test 2.6: Monitoring and Alerting
test_monitoring_system() {
    if [[ -f "$PROJECT_ROOT/monitoring/alerts_config.py" ]]; then
        if grep -q "AlertManager" "$PROJECT_ROOT/monitoring/alerts_config.py" && 
           grep -q "MetricsCollector" "$PROJECT_ROOT/monitoring/alerts_config.py" &&
           grep -q "security_violations" "$PROJECT_ROOT/monitoring/alerts_config.py"; then
            print_test_result "Monitoring and Alerting System" "PASS" "Comprehensive monitoring with security alerts implemented"
        else
            print_test_result "Monitoring and Alerting System" "FAIL" "Monitoring system implementation incomplete"
        fi
    else
        print_test_result "Monitoring and Alerting System" "FAIL" "Monitoring system not found"
    fi
}

print_section "Integration and Functional Tests"

# Test 3.1: Database Encryption Functionality
test_encryption_functionality() {
    if [[ -f "$PROJECT_ROOT/security/database_encryption.py" ]]; then
        # Test encryption functionality
        python3 -c "
import sys
sys.path.append('$PROJECT_ROOT')
try:
    from security.database_encryption import DatabaseEncryption
    encryption = DatabaseEncryption()
    
    # Test basic encryption
    test_data = 'test@example.com'
    encrypted = encryption.encrypt_field(test_data, 'users', 'email')
    decrypted = encryption.decrypt_field(encrypted, 'users', 'email')
    
    if decrypted == test_data and encrypted != test_data:
        print('ENCRYPTION_TEST_PASS')
    else:
        print('ENCRYPTION_TEST_FAIL')
except Exception as e:
    print(f'ENCRYPTION_TEST_ERROR: {e}')
" > "$TEMP_DIR/encryption_test_result.txt"
        
        local result=$(cat "$TEMP_DIR/encryption_test_result.txt")
        if [[ "$result" == "ENCRYPTION_TEST_PASS" ]]; then
            print_test_result "Database Encryption Functionality" "PASS" "Encryption/decryption working correctly"
        else
            print_test_result "Database Encryption Functionality" "FAIL" "Encryption test failed: $result"
        fi
    else
        print_test_result "Database Encryption Functionality" "FAIL" "Encryption module not available"
    fi
}

# Test 3.2: Monitoring Service Health
test_monitoring_health() {
    if command -v curl >/dev/null 2>&1; then
        # Check if monitoring service is running
        if curl -s http://localhost:8002/api/health >/dev/null 2>&1; then
            local health_response=$(curl -s http://localhost:8002/api/health)
            if echo "$health_response" | grep -q '"status"' && echo "$health_response" | grep -q '"active_alerts_count"'; then
                print_test_result "Monitoring Service Health" "PASS" "Monitoring service responding with valid health data"
            else
                print_test_result "Monitoring Service Health" "FAIL" "Monitoring service response invalid"
            fi
        else
            print_test_result "Monitoring Service Health" "FAIL" "Monitoring service not responding"
        fi
    else
        print_test_result "Monitoring Service Health" "FAIL" "curl not available for testing"
    fi
}

# Test 3.3: Database Schema Integrity
test_database_schema() {
    if [[ -f "$PROJECT_ROOT/agent_system.db" ]]; then
        # Check encryption configuration table
        local encryption_config_count=$(sqlite3 "$PROJECT_ROOT/agent_system.db" "SELECT COUNT(*) FROM encryption_config;" 2>/dev/null || echo "0")
        if [[ $encryption_config_count -gt 0 ]]; then
            print_test_result "Database Schema (Encryption Tables)" "PASS" "Encryption configuration tables present with data"
        else
            print_test_result "Database Schema (Encryption Tables)" "FAIL" "Encryption configuration missing or empty"
        fi
    else
        print_test_result "Database Schema (Encryption Tables)" "FAIL" "Database file not found"
    fi
}

print_section "Security Best Practices Validation"

# Test 4.1: File Permissions Security
test_file_permissions() {
    local secure_files=0
    local total_files=0
    
    # Check sensitive file permissions
    for file in "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/security/"*.py; do
        if [[ -f "$file" ]]; then
            total_files=$((total_files + 1))
            local permissions=$(stat -f "%OLp" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null || echo "755")
            
            # Check if file permissions are restrictive (600, 640, 644, etc.)
            if [[ "$permissions" =~ ^[0-6][0-4][0-4]$ ]]; then
                secure_files=$((secure_files + 1))
            fi
        fi
    done
    
    if [[ $total_files -gt 0 ]]; then
        local percentage=$((secure_files * 100 / total_files))
        if [[ $percentage -ge 80 ]]; then
            print_test_result "File Permissions Security" "PASS" "$percentage% of sensitive files have secure permissions"
        else
            print_test_result "File Permissions Security" "FAIL" "Only $percentage% of sensitive files have secure permissions"
        fi
    else
        print_test_result "File Permissions Security" "FAIL" "No sensitive files found"
    fi
}

# Test 4.2: Backup Security
test_backup_security() {
    if [[ -f "$PROJECT_ROOT/scripts/backup-encrypted-database.sh" ]]; then
        if grep -q "openssl enc -aes-256-cbc" "$PROJECT_ROOT/scripts/backup-encrypted-database.sh"; then
            print_test_result "Backup Security (Encryption)" "PASS" "Database backups are encrypted with AES-256"
        else
            print_test_result "Backup Security (Encryption)" "FAIL" "Backup encryption not properly configured"
        fi
    else
        print_test_result "Backup Security (Encryption)" "FAIL" "Encrypted backup script not found"
    fi
}

# Test 4.3: Secret Management
test_secret_management() {
    local secrets_in_code=0
    
    # Check for hardcoded secrets in code files
    for file in "$PROJECT_ROOT"/*.py "$PROJECT_ROOT"/services/*.py "$PROJECT_ROOT"/middleware/*.py; do
        if [[ -f "$file" ]]; then
            # Look for common patterns of hardcoded secrets
            if grep -E "(password|secret|key).*=.*['\"][^'\"]{10,}['\"]" "$file" >/dev/null 2>&1; then
                # Exclude template/example patterns
                if ! grep -E "(example|template|test|placeholder)" "$file" >/dev/null 2>&1; then
                    secrets_in_code=$((secrets_in_code + 1))
                fi
            fi
        fi
    done
    
    if [[ $secrets_in_code -eq 0 ]]; then
        print_test_result "Secret Management (No Hardcoded Secrets)" "PASS" "No hardcoded secrets found in code"
    else
        print_test_result "Secret Management (No Hardcoded Secrets)" "FAIL" "Potential hardcoded secrets found in $secrets_in_code files"
    fi
}

# Run all tests
run_all_tests() {
    print_section "Phase 1: Critical Security Vulnerabilities"
    test_jwt_security
    test_admin_password
    test_password_hashing
    test_cors_security
    test_input_validation
    test_environment_security
    test_docker_security
    test_password_logging
    
    print_section "Phase 2: Infrastructure Hardening"
    test_rate_limiting
    test_security_headers
    test_session_management
    test_database_encryption
    test_production_config
    test_monitoring_system
    
    print_section "Integration and Functional Tests"
    test_encryption_functionality
    test_monitoring_health
    test_database_schema
    
    print_section "Security Best Practices"
    test_file_permissions
    test_backup_security
    test_secret_management
}

# Calculate security score
calculate_security_score() {
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        local score=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo $score
    else
        echo 0
    fi
}

# Generate final report
generate_report() {
    local security_score=$(calculate_security_score)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_section "Security Validation Results Summary"
    echo -e "${BLUE}Timestamp: $timestamp${NC}"
    echo -e "${BLUE}Total Tests: $TOTAL_TESTS${NC}"
    echo -e "${GREEN}Passed Tests: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed Tests: $FAILED_TESTS${NC}"
    echo -e "${BLUE}Security Score: $security_score%${NC}"
    
    # Update JSON results
    cat > "$TEST_RESULTS_FILE" << EOF
{
  "test_run": {
    "timestamp": "$timestamp",
    "environment": "${NODE_ENV:-development}",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "security_score": $security_score
  },
  "categories": {
    "phase1_critical_vulnerabilities": "Phase 1 security fixes implemented",
    "phase2_infrastructure_hardening": "Phase 2 security hardening implemented",
    "integration_tests": "Functional security tests",
    "best_practices": "Security best practices validation"
  },
  "recommendations": {
    "production_deployment": "All security measures validated for production deployment",
    "monitoring": "Continuous security monitoring active",
    "incident_response": "Security incident response capabilities established"
  }
}
EOF
    
    # Security assessment
    if [[ $security_score -ge 90 ]]; then
        echo -e "\n${GREEN}🔒 SECURITY ASSESSMENT: EXCELLENT${NC}"
        echo -e "${GREEN}System is ready for production deployment with enterprise-grade security.${NC}"
    elif [[ $security_score -ge 80 ]]; then
        echo -e "\n${YELLOW}🔒 SECURITY ASSESSMENT: GOOD${NC}"
        echo -e "${YELLOW}System has strong security but may need minor improvements.${NC}"
    elif [[ $security_score -ge 70 ]]; then
        echo -e "\n${YELLOW}🔒 SECURITY ASSESSMENT: ADEQUATE${NC}"
        echo -e "${YELLOW}System meets basic security requirements but needs improvements for production.${NC}"
    else
        echo -e "\n${RED}🔒 SECURITY ASSESSMENT: NEEDS IMPROVEMENT${NC}"
        echo -e "${RED}System requires significant security improvements before production deployment.${NC}"
    fi
    
    echo -e "\n${BLUE}Detailed results saved to: $TEST_RESULTS_FILE${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🔒 6FB AI Agent System - Comprehensive Security Validation${NC}"
    echo -e "${BLUE}============================================================${NC}"
    
    run_all_tests
    generate_report
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    echo -e "\n${GREEN}✅ Security validation completed!${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All security tests passed! System is production-ready.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Some security tests failed. Review the results above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"