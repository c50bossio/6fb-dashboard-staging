#!/bin/bash

# E2E Test Execution Script
# Comprehensive script for running E2E tests with various configurations

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$PROJECT_ROOT/tests"
REPORT_DIR="$PROJECT_ROOT/playwright-report"
RESULTS_DIR="$PROJECT_ROOT/test-results"

# Default values
ENVIRONMENT="development"
BROWSERS="chromium"
SUITES="all"
WORKERS="auto"
TIMEOUT="60000"
HEADED="false"
DEBUG="false"
VERBOSE="false"
PARALLEL="true"
CLEAN="true"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display help
show_help() {
    echo "E2E Test Runner - 6FB AI Agent System"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV     Test environment (development|staging|production) [default: development]"
    echo "  -b, --browsers BROWSERS   Browsers to test (chromium|firefox|webkit|all) [default: chromium]"
    echo "  -s, --suites SUITES       Test suites to run (booking|payment|notifications|analytics|visual|errors|all) [default: all]"
    echo "  -w, --workers COUNT       Number of parallel workers [default: auto]"
    echo "  -t, --timeout MS          Test timeout in milliseconds [default: 60000]"
    echo "      --headed              Run tests in headed mode"
    echo "      --debug               Run tests in debug mode"
    echo "      --verbose             Verbose output"
    echo "      --no-parallel         Disable parallel execution"
    echo "      --no-clean            Skip cleanup of previous test results"
    echo "      --critical-only       Run only critical priority tests"
    echo "      --smoke               Run smoke tests only"
    echo "      --full                Run full test suite (all browsers, all tests)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run basic E2E tests"
    echo "  $0 --browsers all --suites critical  # Run critical tests on all browsers"
    echo "  $0 --environment staging --full      # Run full test suite on staging"
    echo "  $0 --headed --debug --suites booking # Debug booking tests with browser"
    echo "  $0 --smoke                           # Quick smoke test"
    echo ""
}

# Function to validate environment
validate_environment() {
    print_status "Validating test environment..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npx playwright --version &> /dev/null; then
        print_error "Playwright is not installed. Run: npm install @playwright/test"
        exit 1
    fi
    
    # Check required environment variables
    required_vars=("NEXT_PUBLIC_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_success "Environment validation passed"
}

# Function to check service health
check_services() {
    print_status "Checking service health..."
    
    # Check if frontend is running
    if curl -f http://localhost:9999/api/health &> /dev/null; then
        print_success "Frontend service is healthy"
    else
        print_warning "Frontend service may not be running on port 9999"
        print_status "Attempting to start services..."
        start_services
    fi
    
    # Check if backend is running (if applicable)
    if curl -f http://localhost:8001/health &> /dev/null; then
        print_success "Backend service is healthy"
    else
        print_warning "Backend service may not be running on port 8001"
    fi
}

# Function to start services
start_services() {
    print_status "Starting development services..."
    
    # Check if docker-dev-start.sh exists
    if [ -f "$PROJECT_ROOT/docker-dev-start.sh" ]; then
        print_status "Using docker-dev-start.sh to start services..."
        cd "$PROJECT_ROOT"
        bash docker-dev-start.sh &
        START_PID=$!
        
        # Wait for services to be ready
        print_status "Waiting for services to start..."
        sleep 30
        
        # Check if services are now running
        if curl -f http://localhost:9999/api/health &> /dev/null; then
            print_success "Services started successfully"
        else
            print_error "Failed to start services"
            exit 1
        fi
    else
        print_warning "docker-dev-start.sh not found. Please start services manually."
        exit 1
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Create necessary directories
    mkdir -p "$REPORT_DIR"
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$PROJECT_ROOT/screenshots"
    
    # Clean previous results if requested
    if [ "$CLEAN" = "true" ]; then
        print_status "Cleaning previous test results..."
        rm -rf "$REPORT_DIR"/*
        rm -rf "$RESULTS_DIR"/*
        rm -rf "$PROJECT_ROOT/screenshots"/*
    fi
    
    # Install Playwright browsers if needed
    print_status "Ensuring Playwright browsers are installed..."
    npx playwright install
    
    print_success "Test environment setup complete"
}

# Function to build test command
build_test_command() {
    local cmd="npx playwright test"
    
    # Add test directory
    cmd="$cmd tests/e2e/"
    
    # Add browser projects
    case $BROWSERS in
        "all")
            cmd="$cmd --project=chromium --project=firefox --project=webkit"
            ;;
        "chromium"|"firefox"|"webkit")
            cmd="$cmd --project=$BROWSERS"
            ;;
        *)
            # Multiple browsers separated by comma
            IFS=',' read -ra BROWSER_ARRAY <<< "$BROWSERS"
            for browser in "${BROWSER_ARRAY[@]}"; do
                cmd="$cmd --project=$browser"
            done
            ;;
    esac
    
    # Add suite filters
    if [ "$SUITES" != "all" ]; then
        case $SUITES in
            "booking")
                cmd="$cmd complete-booking-flow.spec.js"
                ;;
            "payment")
                cmd="$cmd payment-processing.spec.js"
                ;;
            "notifications")
                cmd="$cmd notification-system.spec.js"
                ;;
            "analytics")
                cmd="$cmd analytics-dashboard.spec.js"
                ;;
            "visual")
                cmd="$cmd visual-regression.spec.js"
                ;;
            "errors")
                cmd="$cmd error-scenarios.spec.js"
                ;;
            "critical")
                cmd="$cmd --grep '@critical'"
                ;;
            *)
                # Multiple suites
                IFS=',' read -ra SUITE_ARRAY <<< "$SUITES"
                suite_files=""
                for suite in "${SUITE_ARRAY[@]}"; do
                    case $suite in
                        "booking") suite_files="$suite_files complete-booking-flow.spec.js" ;;
                        "payment") suite_files="$suite_files payment-processing.spec.js" ;;
                        "notifications") suite_files="$suite_files notification-system.spec.js" ;;
                        "analytics") suite_files="$suite_files analytics-dashboard.spec.js" ;;
                        "visual") suite_files="$suite_files visual-regression.spec.js" ;;
                        "errors") suite_files="$suite_files error-scenarios.spec.js" ;;
                    esac
                done
                cmd="$cmd $suite_files"
                ;;
        esac
    fi
    
    # Add workers
    if [ "$PARALLEL" = "true" ]; then
        cmd="$cmd --workers=$WORKERS"
    else
        cmd="$cmd --workers=1"
    fi
    
    # Add timeout
    cmd="$cmd --timeout=$TIMEOUT"
    
    # Add headed mode
    if [ "$HEADED" = "true" ]; then
        cmd="$cmd --headed"
    fi
    
    # Add debug mode
    if [ "$DEBUG" = "true" ]; then
        cmd="$cmd --debug"
    fi
    
    # Add reporter
    cmd="$cmd --reporter=html --reporter=json --reporter=github"
    
    # Add output directory
    cmd="$cmd --output-dir=$RESULTS_DIR"
    
    echo "$cmd"
}

# Function to run tests
run_tests() {
    print_status "Starting E2E test execution..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Browsers: $BROWSERS"
    print_status "Suites: $SUITES"
    print_status "Workers: $WORKERS"
    print_status "Timeout: ${TIMEOUT}ms"
    echo ""
    
    # Build and execute test command
    local test_cmd=$(build_test_command)
    
    print_status "Executing command: $test_cmd"
    echo ""
    
    # Execute tests
    cd "$PROJECT_ROOT"
    
    if [ "$VERBOSE" = "true" ]; then
        eval "$test_cmd"
    else
        eval "$test_cmd" 2>&1 | tee "$RESULTS_DIR/test-execution.log"
    fi
    
    local exit_code=$?
    
    return $exit_code
}

# Function to generate reports
generate_reports() {
    print_status "Generating comprehensive test reports..."
    
    # Run the custom test runner for additional reporting
    if [ -f "$TEST_DIR/e2e-test-runner.js" ]; then
        node "$TEST_DIR/e2e-test-runner.js" --generate-report-only
    fi
    
    # Create summary report
    create_summary_report
    
    print_success "Reports generated successfully"
    print_status "View reports at:"
    print_status "  HTML Report: file://$REPORT_DIR/index.html"
    print_status "  JSON Results: $RESULTS_DIR/results.json"
}

# Function to create summary report
create_summary_report() {
    local summary_file="$RESULTS_DIR/test-summary.txt"
    
    cat > "$summary_file" << EOF
6FB AI Agent System - E2E Test Summary
=====================================

Execution Details:
- Date: $(date)
- Environment: $ENVIRONMENT
- Browsers: $BROWSERS
- Test Suites: $SUITES
- Workers: $WORKERS
- Timeout: ${TIMEOUT}ms

Test Results:
$(if [ -f "$RESULTS_DIR/results.json" ]; then
    node -e "
    const fs = require('fs');
    const results = JSON.parse(fs.readFileSync('$RESULTS_DIR/results.json'));
    console.log(\`- Total Tests: \${results.stats.total}\`);
    console.log(\`- Passed: \${results.stats.passed}\`);
    console.log(\`- Failed: \${results.stats.failed}\`);
    console.log(\`- Skipped: \${results.stats.skipped}\`);
    console.log(\`- Duration: \${Math.round(results.stats.duration / 1000)}s\`);
    "
else
    echo "- Results file not found"
fi)

Report Locations:
- HTML Report: $REPORT_DIR/index.html
- JSON Results: $RESULTS_DIR/results.json
- Execution Log: $RESULTS_DIR/test-execution.log
- Screenshots: $PROJECT_ROOT/screenshots/

EOF

    print_status "Summary report created: $summary_file"
}

# Function to handle cleanup
cleanup() {
    print_status "Performing cleanup..."
    
    # Kill background services if started by this script
    if [ ! -z "$START_PID" ]; then
        print_status "Stopping services started by this script..."
        kill $START_PID 2>/dev/null || true
    fi
    
    print_success "Cleanup completed"
}

# Function to run smoke tests
run_smoke_tests() {
    print_status "Running smoke tests (quick verification)..."
    
    # Override settings for smoke tests
    SUITES="booking"
    BROWSERS="chromium"
    WORKERS="1"
    TIMEOUT="30000"
    
    # Run minimal test set
    run_tests
}

# Function to run full test suite
run_full_tests() {
    print_status "Running full test suite (all browsers, all tests)..."
    
    # Override settings for full tests
    SUITES="all"
    BROWSERS="all"
    WORKERS="auto"
    TIMEOUT="120000"
    
    # Run complete test set
    run_tests
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--browsers)
            BROWSERS="$2"
            shift 2
            ;;
        -s|--suites)
            SUITES="$2"
            shift 2
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --headed)
            HEADED="true"
            shift
            ;;
        --debug)
            DEBUG="true"
            shift
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --no-parallel)
            PARALLEL="false"
            shift
            ;;
        --no-clean)
            CLEAN="false"
            shift
            ;;
        --critical-only)
            SUITES="critical"
            shift
            ;;
        --smoke)
            run_smoke_tests
            exit $?
            ;;
        --full)
            run_full_tests
            exit $?
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_status "6FB AI Agent System - E2E Test Runner"
    print_status "====================================="
    
    # Set up signal handlers for cleanup
    trap cleanup EXIT
    trap 'print_error "Test execution interrupted"; exit 1' INT TERM
    
    # Execute test pipeline
    validate_environment
    check_services
    setup_test_environment
    
    # Run tests
    if run_tests; then
        print_success "All tests completed successfully!"
        generate_reports
        exit 0
    else
        print_error "Some tests failed!"
        generate_reports
        exit 1
    fi
}

# Execute main function
main "$@"