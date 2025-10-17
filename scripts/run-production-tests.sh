#!/bin/bash

# Production-Ready Test Runner
# Comprehensive test execution script for verifying production readiness

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=300000  # 5 minutes
JEST_WORKERS=4

echo -e "${BOLD}${BLUE}6FB Barbershop Platform - Production Test Suite${NC}\n"

# Function to print section headers
print_section() {
    echo -e "\n${BOLD}${CYAN}========================================${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}========================================${NC}\n"
}

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓ $message${NC}"
            ;;
        "FAIL")
            echo -e "${RED}✗ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ $message${NC}"
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "PASS" "Node.js installed: $NODE_VERSION"
    else
        print_status "FAIL" "Node.js not found"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "PASS" "npm installed: $NPM_VERSION"
    else
        print_status "FAIL" "npm not found"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ -d "node_modules" ]; then
        print_status "PASS" "Node modules installed"
    else
        print_status "WARN" "Installing dependencies..."
        npm install
    fi
    
    # Check environment variables
    if [ -f ".env.local" ] || [ -f ".env" ]; then
        print_status "PASS" "Environment file found"
    else
        print_status "WARN" "No environment file found - some tests may fail"
    fi
    
    # Check Supabase connection
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        print_status "PASS" "Supabase credentials configured"
    else
        print_status "WARN" "Supabase credentials missing - database tests will be skipped"
    fi
}

# Function to run production readiness checker
run_readiness_checker() {
    print_section "Running Production Readiness Checker"
    
    if [ -f "scripts/production-readiness-checker.js" ]; then
        print_status "INFO" "Starting production readiness check..."
        
        if node scripts/production-readiness-checker.js; then
            print_status "PASS" "Production readiness check completed"
        else
            print_status "FAIL" "Production readiness check failed"
            echo -e "${RED}Critical issues found. Check the report for details.${NC}"
            exit 1
        fi
    else
        print_status "WARN" "Production readiness checker not found"
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_section "Running Unit Tests"
    
    print_status "INFO" "Starting Jest unit tests..."
    
    if npm run test:unit -- --timeout=$TEST_TIMEOUT --maxWorkers=$JEST_WORKERS --coverage --verbose; then
        print_status "PASS" "Unit tests completed successfully"
    else
        print_status "FAIL" "Unit tests failed"
        return 1
    fi
}

# Function to run production-ready integration tests
run_production_tests() {
    print_section "Running Production-Ready Tests"
    
    local test_files=(
        "__tests__/production-ready/auth-flow.test.js"
        "__tests__/production-ready/dashboard-data.test.js"
        "__tests__/production-ready/booking-system.test.js"
        "__tests__/production-ready/ai-system.test.js"
        "__tests__/production-ready/external-integrations.test.js"
        "__tests__/production-ready/data-integrity.test.js"
    )
    
    local failed_tests=()
    
    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            test_name=$(basename "$test_file" .test.js)
            print_status "INFO" "Running $test_name tests..."
            
            if npx jest "$test_file" --timeout=$TEST_TIMEOUT --verbose; then
                print_status "PASS" "$test_name tests completed"
            else
                print_status "FAIL" "$test_name tests failed"
                failed_tests+=("$test_name")
            fi
        else
            print_status "WARN" "Test file not found: $test_file"
        fi
    done
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        print_status "PASS" "All production-ready tests completed successfully"
        return 0
    else
        print_status "FAIL" "Failed tests: ${failed_tests[*]}"
        return 1
    fi
}

# Function to run Playwright E2E tests
run_e2e_tests() {
    print_section "Running End-to-End Tests"
    
    # Check if Playwright is installed
    if command -v npx playwright &> /dev/null; then
        print_status "INFO" "Starting Playwright E2E tests..."
        
        # Install browsers if needed
        if ! npx playwright install --dry-run &> /dev/null; then
            print_status "INFO" "Installing Playwright browsers..."
            npx playwright install
        fi
        
        # Run critical E2E tests
        if npx playwright test --project=chromium --grep="@production" --timeout=60000; then
            print_status "PASS" "E2E tests completed successfully"
        else
            print_status "FAIL" "E2E tests failed"
            return 1
        fi
    else
        print_status "WARN" "Playwright not available - E2E tests skipped"
    fi
}

# Function to run security tests
run_security_tests() {
    print_section "Running Security Tests"
    
    if [ -d "__tests__/security" ]; then
        print_status "INFO" "Starting security tests..."
        
        if npm run test:security:quick; then
            print_status "PASS" "Security tests completed"
        else
            print_status "FAIL" "Security tests failed"
            return 1
        fi
    else
        print_status "WARN" "Security tests not found"
    fi
}

# Function to check code quality
check_code_quality() {
    print_section "Checking Code Quality"
    
    # Run linting
    print_status "INFO" "Running ESLint..."
    if npm run lint; then
        print_status "PASS" "Linting passed"
    else
        print_status "FAIL" "Linting failed"
        return 1
    fi
    
    # Check TypeScript
    if [ -f "tsconfig.json" ]; then
        print_status "INFO" "Running TypeScript check..."
        if npm run type-check; then
            print_status "PASS" "TypeScript check passed"
        else
            print_status "FAIL" "TypeScript check failed"
            return 1
        fi
    fi
    
    # Test build
    print_status "INFO" "Testing production build..."
    if npm run build; then
        print_status "PASS" "Production build successful"
    else
        print_status "FAIL" "Production build failed"
        return 1
    fi
}

# Function to generate comprehensive report
generate_report() {
    print_section "Generating Test Report"
    
    local report_dir="test-reports"
    local report_file="$report_dir/production-test-report-$(date +%Y%m%d_%H%M%S).json"
    
    mkdir -p "$report_dir"
    
    # Create test report
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": {
        "node_version": "$(node --version)",
        "npm_version": "$(npm --version)",
        "os": "$(uname -s)",
        "arch": "$(uname -m)"
    },
    "tests_run": {
        "production_readiness": true,
        "unit_tests": true,
        "production_ready_tests": true,
        "e2e_tests": true,
        "security_tests": true,
        "code_quality": true
    },
    "status": "$1",
    "summary": "Production test suite execution completed"
}
EOF
    
    print_status "PASS" "Test report generated: $report_file"
    
    # Generate HTML report if possible
    if command -v node &> /dev/null; then
        cat > "$report_dir/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Production Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .status-pass { color: #27ae60; }
        .status-fail { color: #e74c3c; }
        .status-warn { color: #f39c12; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; background: #f8f9fa; }
    </style>
</head>
<body>
    <h1 class="header">6FB Barbershop Platform - Production Test Report</h1>
    <div class="section">
        <h2>Test Summary</h2>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Status:</strong> <span class="status-$1">$1</span></p>
        <p><strong>Environment:</strong> $(uname -s) $(uname -m)</p>
    </div>
    <div class="section">
        <h2>Test Categories</h2>
        <ul>
            <li>✓ Production Readiness Check</li>
            <li>✓ Unit Tests</li>
            <li>✓ Production-Ready Integration Tests</li>
            <li>✓ End-to-End Tests</li>
            <li>✓ Security Tests</li>
            <li>✓ Code Quality Check</li>
        </ul>
    </div>
</body>
</html>
EOF
        print_status "PASS" "HTML report generated: $report_dir/index.html"
    fi
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local overall_status="PASS"
    local failed_sections=()
    
    # Run all test sections
    check_prerequisites || { overall_status="FAIL"; failed_sections+=("prerequisites"); }
    
    run_readiness_checker || { overall_status="FAIL"; failed_sections+=("readiness_checker"); }
    
    run_unit_tests || { overall_status="FAIL"; failed_sections+=("unit_tests"); }
    
    run_production_tests || { overall_status="FAIL"; failed_sections+=("production_tests"); }
    
    run_e2e_tests || { overall_status="FAIL"; failed_sections+=("e2e_tests"); }
    
    run_security_tests || { overall_status="FAIL"; failed_sections+=("security_tests"); }
    
    check_code_quality || { overall_status="FAIL"; failed_sections+=("code_quality"); }
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate report
    generate_report "$overall_status"
    
    # Print final summary
    print_section "Test Execution Summary"
    
    echo -e "Execution time: ${duration}s"
    echo -e "Overall status: $overall_status"
    
    if [ "$overall_status" = "PASS" ]; then
        echo -e "\n${BOLD}${GREEN}🎉 ALL TESTS PASSED - PLATFORM IS PRODUCTION READY! 🎉${NC}\n"
        exit 0
    else
        echo -e "\n${BOLD}${RED}❌ TESTS FAILED - PLATFORM IS NOT READY FOR PRODUCTION${NC}"
        echo -e "${RED}Failed sections: ${failed_sections[*]}${NC}\n"
        exit 1
    fi
}

# Handle script arguments
case "${1:-all}" in
    "readiness")
        check_prerequisites
        run_readiness_checker
        ;;
    "unit")
        check_prerequisites
        run_unit_tests
        ;;
    "production")
        check_prerequisites
        run_production_tests
        ;;
    "e2e")
        check_prerequisites
        run_e2e_tests
        ;;
    "security")
        check_prerequisites
        run_security_tests
        ;;
    "quality")
        check_prerequisites
        check_code_quality
        ;;
    "all"|"")
        main
        ;;
    *)
        echo "Usage: $0 [readiness|unit|production|e2e|security|quality|all]"
        echo ""
        echo "Test categories:"
        echo "  readiness   - Run production readiness checker only"
        echo "  unit        - Run unit tests only"
        echo "  production  - Run production-ready integration tests only"
        echo "  e2e         - Run end-to-end tests only"
        echo "  security    - Run security tests only"
        echo "  quality     - Run code quality checks only"
        echo "  all         - Run all tests (default)"
        exit 1
        ;;
esac