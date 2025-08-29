#!/usr/bin/env node

/**
 * API Route Standardization Script
 * 
 * This script automatically updates API routes to use the new unified tenant resolution pattern.
 * Part of Phase 1 of the approved 12-week system overhaul.
 */

import fs from 'fs'
import path from 'path'

// High priority API routes that need immediate standardization
const PRIORITY_ROUTES = [
  'app/api/dashboard/metrics/route.js',
  'app/api/appointments/route.js',
  'app/api/bookings/route.js',
  'app/api/services/route.js',
  'app/api/customers/route.js',
  'app/api/shop/analytics/dashboard/route.js',
  'app/api/shop/barbers/route.js',
  'app/api/ai/daily-report/route.js',
  'app/api/analytics/preview/route.js',
  'app/api/realtime/dashboard/route.js'
]

// Patterns to find and replace
const PATTERNS = [
  {
    // Pattern 1: Basic shop_id || barbershop_id pattern
    find: /(\s+)(?:const|let)\s+(\w+)\s*=\s*profile\.shop_id\s*\|\|\s*profile\.barbershop_id/g,
    replace: '$1// Get barbershop ID using unified tenant resolver\n$1const { barbershopId } = await getTenant(profile.id, { supabase })\n$1const $2 = barbershopId'
  },
  {
    // Pattern 2: More complex shop resolution patterns
    find: /(\s+)(?:let|const)\s+(\w+)\s*=\s*profile\.shop_id\s*\|\|\s*profile\.barbershop_id[\s\S]*?(?=\n\s*(?:if|const|let|\/\/|\}|return))/g,
    replace: '$1// Get barbershop ID using unified tenant resolver\n$1const { barbershopId } = await getTenant(profile.id, { supabase })\n$1const $2 = barbershopId'
  },
  {
    // Pattern 3: Check if user owns a barbershop
    find: /(\s+)\/\/ Check if user owns a barbershop[\s\S]*?barbershopId = ownedShops\[0\]\.id[\s\S]*?\}/g,
    replace: '$1// Unified tenant resolution handles ownership and staff relationships automatically'
  }
]

// Import statement to add if not present
const IMPORT_STATEMENT = "import { getTenant } from '@/lib/tenant-resolver'"

function updateApiRoute(filePath) {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(fullPath, 'utf8')
  let modified = false

  // Add import if not present and file contains shop_id or barbershop_id patterns
  if ((content.includes('shop_id') || content.includes('barbershop_id')) && 
      !content.includes('getTenant')) {
    
    // Find the last import statement
    const importMatch = content.match(/^import.*from.*$/gm)
    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1]
      const lastImportIndex = content.lastIndexOf(lastImport)
      const insertIndex = lastImportIndex + lastImport.length
      
      content = content.slice(0, insertIndex) + '\n' + IMPORT_STATEMENT + content.slice(insertIndex)
      modified = true
    }
  }

  // Apply pattern replacements
  for (const pattern of PATTERNS) {
    const before = content
    content = content.replace(pattern.find, pattern.replace)
    if (content !== before) {
      modified = true
    }
  }

  // Save if modified
  if (modified) {
    fs.writeFileSync(fullPath, content)
    console.log(`✅ Updated: ${filePath}`)
    return true
  } else {
    console.log(`⏩ No changes needed: ${filePath}`)
    return false
  }
}

function main() {
  console.log('🚀 Starting API Route Standardization')
  console.log('📋 Processing priority routes...\n')

  let updatedCount = 0
  
  for (const route of PRIORITY_ROUTES) {
    const wasUpdated = updateApiRoute(route)
    if (wasUpdated) {
      updatedCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   - Routes processed: ${PRIORITY_ROUTES.length}`)
  console.log(`   - Routes updated: ${updatedCount}`)
  console.log(`   - Routes unchanged: ${PRIORITY_ROUTES.length - updatedCount}`)
  
  if (updatedCount > 0) {
    console.log('\n✨ API route standardization completed successfully!')
    console.log('🔄 Next: Test the updated routes and continue with remaining routes')
  } else {
    console.log('\n🎯 All priority routes are already using standardized patterns!')
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { updateApiRoute, PRIORITY_ROUTES }