#!/bin/bash

echo "🔍 Running Quality Checks for 6FB AI Agent System..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# 1. Linting
echo -e "\n${BLUE}1. Running ESLint...${NC}"
npx eslint . --ext .js,.jsx,.ts,.tsx --fix --quiet
print_status $? "ESLint check"

# 2. Type checking (if TypeScript is configured)
echo -e "\n${BLUE}2. Running TypeScript check...${NC}"
if [ -f "tsconfig.json" ]; then
    npx tsc --noEmit
    print_status $? "TypeScript check"
else
    echo -e "${YELLOW}⚠️  TypeScript not configured, skipping...${NC}"
fi

# 3. Test Jest configuration
echo -e "\n${BLUE}3. Testing Jest configuration...${NC}"
npx jest --config jest.config.js --passWithNoTests --no-coverage
print_status $? "Jest configuration"

# 4. Check for unused dependencies
echo -e "\n${BLUE}4. Checking for unused dependencies...${NC}"
if command -v depcheck &> /dev/null; then
    depcheck --quiet
    print_status $? "Dependency check"
else
    echo -e "${YELLOW}⚠️  depcheck not installed, skipping...${NC}"
fi

# 5. Bundle analysis (if build succeeds)
echo -e "\n${BLUE}5. Analyzing bundle size...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
    if [ -d ".next/analyze" ]; then
        echo -e "${GREEN}📊 Bundle analysis available in .next/analyze/${NC}"
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
fi

# 6. Security audit
echo -e "\n${BLUE}6. Running security audit...${NC}"
npm audit --audit-level=high
print_status $? "Security audit"

# 7. Performance checks
echo -e "\n${BLUE}7. Performance configuration check...${NC}"
if [ -f "lib/performance.js" ]; then
    echo -e "${GREEN}✅ Performance monitoring configured${NC}"
else
    echo -e "${RED}❌ Performance monitoring not found${NC}"
fi

# 8. Check essential files
echo -e "\n${BLUE}8. Checking essential configuration files...${NC}"
essential_files=(
    ".eslintrc.json"
    "jest.config.js"
    "playwright.config.js"
    "next.config.js"
    "tailwind.config.js"
    "package.json"
)

for file in "${essential_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

# Summary
echo -e "\n${BLUE}=============================================="
echo -e "🎯 Quality Check Summary${NC}"
echo -e "=============================================="
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Fix any linting errors shown above"
echo "2. Address security vulnerabilities with 'npm audit fix'"
echo "3. Run 'npm run test:all' for comprehensive testing"
echo "4. Check performance metrics in browser dev tools"
echo ""
echo -e "${GREEN}🚀 Quality checks completed!${NC}"