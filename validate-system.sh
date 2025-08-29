#!/bin/bash

# System Validation Script for Enterprise Features
# This script validates that all components are properly set up

echo "=================================================="
echo "🔍 6FB AI Agent System - Validation Check"
echo "=================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js and npm
echo -e "\n${BLUE}Checking Node.js environment...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
fi

# Check for required environment variables
echo -e "\n${BLUE}Checking environment variables...${NC}"
ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓${NC} .env.local file exists"
    
    # Check for required variables
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
    )
    
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$VAR=" "$ENV_FILE"; then
            echo -e "${GREEN}✓${NC} $VAR is set"
        else
            echo -e "${YELLOW}⚠${NC} $VAR not found in .env.local"
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env.local file not found"
fi

# Check API endpoints
echo -e "\n${BLUE}Checking API endpoints...${NC}"

# Phase 9-10 endpoints
PHASE_910_ENDPOINTS=(
    "app/api/enterprise/multi-location-dashboard/route.js"
    "app/api/enterprise/staff-optimization/route.js"
    "app/api/enterprise/advanced-analytics/route.js"
    "app/api/enterprise/erp/route.js"
)

echo -e "\n${YELLOW}Phase 9-10 Enterprise Management:${NC}"
for ENDPOINT in "${PHASE_910_ENDPOINTS[@]}"; do
    if [ -f "$ENDPOINT" ]; then
        FILE_SIZE=$(wc -l < "$ENDPOINT")
        echo -e "${GREEN}✓${NC} $ENDPOINT (${FILE_SIZE} lines)"
    else
        echo -e "${RED}✗${NC} $ENDPOINT not found"
    fi
done

# Phase 11-12 endpoints
PHASE_1112_ENDPOINTS=(
    "app/api/ai-agents/customer-service/route.js"
    "app/api/ai-agents/marketing/route.js"
)

echo -e "\n${YELLOW}Phase 11-12 AI Agents:${NC}"
for ENDPOINT in "${PHASE_1112_ENDPOINTS[@]}"; do
    if [ -f "$ENDPOINT" ]; then
        FILE_SIZE=$(wc -l < "$ENDPOINT")
        echo -e "${GREEN}✓${NC} $ENDPOINT (${FILE_SIZE} lines)"
    else
        echo -e "${RED}✗${NC} $ENDPOINT not found"
    fi
done

# Check database schema files
echo -e "\n${BLUE}Checking database schema files...${NC}"
SCHEMA_FILES=(
    "database/phase9-10-enterprise-schema.sql"
    "database/phase7-8-cross-selling-schema.sql"
    "database/phase7-8-inventory-forecasting-schema.sql"
    "database/phase7-8-customer-insights-schema.sql"
)

for SCHEMA in "${SCHEMA_FILES[@]}"; do
    if [ -f "$SCHEMA" ]; then
        echo -e "${GREEN}✓${NC} $SCHEMA exists"
    else
        echo -e "${YELLOW}⚠${NC} $SCHEMA not found"
    fi
done

# Check documentation
echo -e "\n${BLUE}Checking documentation...${NC}"
DOCS=(
    "PHASE9-10_IMPLEMENTATION.md"
    "PHASE9-10_COMPLETE.md"
    "PHASE11-12_IMPLEMENTATION.md"
    "PHASE7-8_IMPLEMENTATION.md"
    "PHASE7-8_COMPLETE.md"
    "PHASE5-6_COMPLETE.md"
)

for DOC in "${DOCS[@]}"; do
    if [ -f "$DOC" ]; then
        echo -e "${GREEN}✓${NC} $DOC exists"
    else
        echo -e "${YELLOW}⚠${NC} $DOC not found"
    fi
done

# Check package dependencies
echo -e "\n${BLUE}Checking required packages...${NC}"
if [ -f "package.json" ]; then
    REQUIRED_PACKAGES=(
        "@supabase/supabase-js"
        "openai"
        "next"
    )
    
    for PACKAGE in "${REQUIRED_PACKAGES[@]}"; do
        if grep -q "\"$PACKAGE\"" package.json; then
            echo -e "${GREEN}✓${NC} $PACKAGE is in package.json"
        else
            echo -e "${YELLOW}⚠${NC} $PACKAGE not found in package.json"
        fi
    done
fi

# Summary
echo -e "\n${BLUE}=================================================="
echo -e "📊 Validation Summary"
echo -e "==================================================${NC}"

# Count API files
API_COUNT=$(find app/api -name "route.js" 2>/dev/null | wc -l)
echo -e "API Endpoints: ${API_COUNT} route files found"

# Count lines of code
if command -v wc &> /dev/null; then
    TOTAL_LINES=$(find app/api/enterprise app/api/ai-agents -name "*.js" 2>/dev/null | xargs wc -l | tail -1 | awk '{print $1}')
    echo -e "Enterprise Code: ${TOTAL_LINES} lines"
fi

echo -e "\n${GREEN}Validation complete!${NC}"
echo -e "\nTo run the comprehensive test suite:"
echo -e "${YELLOW}node test-enterprise-features.js${NC}"
echo -e "\nTo start the development server:"
echo -e "${YELLOW}npm run dev${NC}"