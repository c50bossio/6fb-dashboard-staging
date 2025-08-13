#!/bin/bash

echo "🔍 Checking for remaining '6FB' branding in codebase..."
echo "=========================================="

# Check JavaScript/TypeScript files
echo -e "\n📄 JavaScript/TypeScript files with '6FB':"
grep -r "6FB" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "check-" | head -20

# Check HTML files
echo -e "\n📄 HTML files with '6FB':"
grep -r "6FB" --include="*.html" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -10

# Check JSON files (config, package.json, etc)
echo -e "\n📄 Configuration files with '6FB':"
grep -r "6FB" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -10

# Check CSS files
echo -e "\n📄 CSS files with '6FB':"
grep -r "6FB" --include="*.css" . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -10

# Count total occurrences
echo -e "\n📊 Summary:"
TOTAL=$(grep -r "6FB" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "check-" | wc -l)
echo "Total files with '6FB' branding: $TOTAL"