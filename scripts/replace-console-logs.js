#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logger
 * Run: node scripts/replace-console-logs.js
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'dist',
  'build',
  'public'
]

// File patterns to process
const FILE_PATTERNS = [
  '**/*.js',
  '**/*.jsx',
  '**/*.ts',
  '**/*.tsx'
]

// Patterns to replace
const REPLACEMENTS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    importNeeded: true
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    importNeeded: true
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    importNeeded: true
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    importNeeded: true
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    importNeeded: true
  },
  {
    pattern: /console\.trace\(/g,
    replacement: 'logger.debug(',
    importNeeded: true
  },
  {
    pattern: /console\.group\(/g,
    replacement: 'logger.group(',
    importNeeded: true
  },
  {
    pattern: /console\.groupEnd\(/g,
    replacement: 'logger.groupEnd(',
    importNeeded: true
  },
  {
    pattern: /console\.time\(/g,
    replacement: 'logger.time(',
    importNeeded: true
  },
  {
    pattern: /console\.timeEnd\(/g,
    replacement: 'logger.timeEnd(',
    importNeeded: true
  },
  {
    pattern: /console\.table\(/g,
    replacement: 'logger.table(',
    importNeeded: true
  }
]

// Check if file should be skipped
function shouldSkipFile(filePath) {
  // Skip if in skip directory
  for (const dir of SKIP_DIRS) {
    if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
      return true
    }
  }
  
  // Skip test files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return true
  }
  
  // Skip the logger file itself
  if (filePath.includes('lib/logger')) {
    return true
  }
  
  // Skip this script
  if (filePath.includes('replace-console-logs')) {
    return true
  }
  
  return false
}

// Add logger import if needed
function addLoggerImport(content, filePath) {
  // Check if logger is already imported
  if (content.includes("from '@/lib/logger'") || 
      content.includes('from "@/lib/logger"') ||
      content.includes("from '../lib/logger'") ||
      content.includes('from "../lib/logger"')) {
    return content
  }
  
  // Check if file uses any console methods
  const needsImport = REPLACEMENTS.some(r => r.pattern.test(content))
  if (!needsImport) {
    return content
  }
  
  // Determine import path based on file location
  const depth = filePath.split('/').length - 2 // -2 for root dir and filename
  let importPath = '@/lib/logger'
  
  // Add import at the top of the file
  const importStatement = `import { logger } from '${importPath}'\n`
  
  // If file has existing imports, add after them
  if (content.match(/^import .* from/m)) {
    // Find the last import statement
    const lines = content.split('\n')
    let lastImportIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i
      } else if (lastImportIndex >= 0 && lines[i].trim() && !lines[i].startsWith('import ')) {
        break
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement.trim())
      return lines.join('\n')
    }
  }
  
  // Otherwise add at the very top
  return importStatement + content
}

// Process a single file
function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true }
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content
  let replacementCount = 0
  
  // Apply replacements
  for (const { pattern, replacement } of REPLACEMENTS) {
    const matches = content.match(pattern)
    if (matches) {
      replacementCount += matches.length
      content = content.replace(pattern, replacement)
    }
  }
  
  // Add import if needed
  if (replacementCount > 0) {
    content = addLoggerImport(content, filePath)
  }
  
  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8')
    return { 
      processed: true, 
      replacements: replacementCount 
    }
  }
  
  return { processed: false }
}

// Main execution
async function main() {
  console.log('🔍 Searching for files to process...')
  
  let totalFiles = 0
  let processedFiles = 0
  let skippedFiles = 0
  let totalReplacements = 0
  
  for (const pattern of FILE_PATTERNS) {
    const files = glob.sync(pattern, {
      ignore: SKIP_DIRS.map(dir => `**/${dir}/**`),
      nodir: true
    })
    
    for (const file of files) {
      totalFiles++
      const result = processFile(file)
      
      if (result.skipped) {
        skippedFiles++
      } else if (result.processed) {
        processedFiles++
        totalReplacements += result.replacements
        console.log(`✅ Processed: ${file} (${result.replacements} replacements)`)
      }
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`Total files scanned: ${totalFiles}`)
  console.log(`Files processed: ${processedFiles}`)
  console.log(`Files skipped: ${skippedFiles}`)
  console.log(`Total replacements: ${totalReplacements}`)
  console.log('\n✨ Console.log replacement complete!')
  
  if (totalReplacements > 0) {
    console.log('\n⚠️  Remember to:')
    console.log('1. Run your tests to ensure everything still works')
    console.log('2. Check that logger imports are correct')
    console.log('3. Review any complex console usage that may need manual adjustment')
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})