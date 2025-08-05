#!/usr/bin/env node

// Frontend SDK Usage Verification Script
// Checks if SDKs are actually imported and used in frontend components

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'components');
const LIB_DIR = path.join(PROJECT_ROOT, 'lib');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🔍 Verifying Frontend SDK Usage${colors.reset}`);
console.log(`${colors.blue}=================================${colors.reset}`);

// SDK mappings - what to look for in frontend code
const SDK_MAPPINGS = {
  'Supabase': {
    libFile: 'lib/supabase.js',
    importPatterns: [
      'from.*lib/supabase',
      'import.*supabase',
      'createClient',
      'signUp',
      'signIn',
      'signOut'
    ],
    usagePatterns: [
      'supabase\\.',
      'signUp\\(',
      'signIn\\(',
      'signOut\\(',
      'insertRecord\\(',
      'getRecords\\('
    ]
  },
  'Stripe': {
    libFile: 'lib/stripe.js',
    importPatterns: [
      'from.*lib/stripe',
      'import.*stripe',
      'getStripe',
      'loadStripe'
    ],
    usagePatterns: [
      'getStripe\\(',
      'createPaymentIntent\\(',
      'createSubscription\\(',
      'createCustomer\\('
    ]
  },
  'Pusher': {
    libFile: 'lib/pusher-client.js',
    importPatterns: [
      'from.*lib/pusher',
      'import.*pusher',
      'getPusherClient'
    ],
    usagePatterns: [
      'getPusherClient\\(',
      'subscribeToChannel\\(',
      'unsubscribeFromChannel\\(',
      'CHANNELS\\.',
      'EVENTS\\.'
    ]
  },
  'Novu': {
    libFile: 'lib/novu.js',
    importPatterns: [
      'from.*lib/novu',
      'import.*novu',
      'triggerNotification'
    ],
    usagePatterns: [
      'triggerNotification\\(',
      'createSubscriber\\(',
      'NOTIFICATION_TEMPLATES\\.'
    ]
  },
  'PostHog': {
    libFile: 'lib/posthog.js',
    importPatterns: [
      'from.*lib/posthog',
      'import.*posthog',
      'PostHogProvider'
    ],
    usagePatterns: [
      'posthog\\.',
      'PostHogProvider',
      'capture\\(',
      'identify\\('
    ]
  },
  'Sentry': {
    libFile: 'lib/sentry.js',
    importPatterns: [
      'from.*lib/sentry',
      'import.*sentry',
      'captureException'
    ],
    usagePatterns: [
      'captureException\\(',
      'captureMessage\\(',
      'setUser\\(',
      'withSentry\\('
    ]
  },
  'Turnstile': {
    libFile: 'lib/turnstile.js',
    importPatterns: [
      'from.*lib/turnstile',
      'import.*turnstile',
      'renderTurnstile'
    ],
    usagePatterns: [
      'renderTurnstile\\(',
      'resetTurnstile\\(',
      'useTurnstile\\(',
      'verifyTurnstileToken\\('
    ]
  },
  'Edge Config': {
    libFile: 'lib/edgeConfig.js',
    importPatterns: [
      'from.*lib/edgeConfig',
      'import.*edgeConfig',
      'from.*@vercel/edge-config'
    ],
    usagePatterns: [
      'edgeConfig\\.',
      'getValue\\(',
      'getFeatureFlags\\(',
      'isFeatureEnabled\\('
    ]
  }
};

// Get all frontend files
function getAllFrontendFiles(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

// Check if patterns exist in file content
function checkPatternsInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      const found = content.match(regex);
      if (found) {
        matches.push(...found);
      }
    }
    
    return matches;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

// Main verification function
function verifySDKUsage() {
  console.log(`${colors.blue}Scanning directories:${colors.reset}`);
  console.log(`• App: ${APP_DIR}`);
  console.log(`• Components: ${COMPONENTS_DIR}`);
  console.log(`• Lib: ${LIB_DIR}`);
  
  // Get all frontend files
  const appFiles = getAllFrontendFiles(APP_DIR);
  const componentFiles = getAllFrontendFiles(COMPONENTS_DIR);
  const allFiles = [...appFiles, ...componentFiles];
  
  console.log(`\n${colors.blue}Found ${allFiles.length} frontend files to scan${colors.reset}\n`);
  
  const results = {};
  let totalImplemented = 0;
  let totalMissing = 0;
  
  // Check each SDK
  for (const [sdkName, config] of Object.entries(SDK_MAPPINGS)) {
    console.log(`${colors.blue}=== ${sdkName} SDK Verification ===${colors.reset}`);
    
    // Check if lib file exists
    const libPath = path.join(PROJECT_ROOT, config.libFile);
    const libExists = fs.existsSync(libPath);
    
    if (!libExists) {
      console.log(`${colors.red}✗ MISSING${colors.reset} ${sdkName} - Library file not found: ${config.libFile}`);
      results[sdkName] = { status: 'MISSING', reason: 'Library file not found' };
      totalMissing++;
      continue;
    }
    
    // Check for imports in frontend code
    let importFound = false;
    let usageFound = false;
    const importMatches = [];
    const usageMatches = [];
    const filesWithImports = [];
    const filesWithUsage = [];
    
    for (const filePath of allFiles) {
      // Check imports
      const imports = checkPatternsInFile(filePath, config.importPatterns);
      if (imports.length > 0) {
        importFound = true;
        importMatches.push(...imports);
        filesWithImports.push(path.relative(PROJECT_ROOT, filePath));
      }
      
      // Check usage
      const usage = checkPatternsInFile(filePath, config.usagePatterns);
      if (usage.length > 0) {
        usageFound = true;
        usageMatches.push(...usage);
        filesWithUsage.push(path.relative(PROJECT_ROOT, filePath));
      }
    }
    
    // Determine status
    if (importFound && usageFound) {
      console.log(`${colors.green}✓ IMPLEMENTED${colors.reset} ${sdkName} - Active usage found`);
      console.log(`  ${colors.blue}Files with imports: ${filesWithImports.length}${colors.reset}`);
      console.log(`  ${colors.blue}Files with usage: ${filesWithUsage.length}${colors.reset}`);
      if (filesWithImports.length <= 3) {
        console.log(`    ${filesWithImports.join(', ')}`);
      }
      results[sdkName] = { 
        status: 'IMPLEMENTED', 
        importFiles: filesWithImports.length,
        usageFiles: filesWithUsage.length,
        imports: importMatches.length,
        usage: usageMatches.length
      };
      totalImplemented++;
    } else if (importFound && !usageFound) {
      console.log(`${colors.yellow}⚠ PARTIAL${colors.reset} ${sdkName} - Imported but not used`);
      console.log(`  ${colors.blue}Files with imports: ${filesWithImports.join(', ')}${colors.reset}`);
      results[sdkName] = { 
        status: 'PARTIAL', 
        reason: 'Imported but not used',
        importFiles: filesWithImports.length
      };
      totalMissing++;
    } else {
      console.log(`${colors.red}✗ MISSING${colors.reset} ${sdkName} - No frontend usage found`);
      results[sdkName] = { status: 'MISSING', reason: 'No frontend imports or usage found' };
      totalMissing++;
    }
  }
  
  // Generate summary
  const totalSDKs = Object.keys(SDK_MAPPINGS).length;
  const completionPercentage = Math.round((totalImplemented / totalSDKs) * 100);
  
  console.log(`\n${colors.blue}=== Frontend SDK Usage Summary ===${colors.reset}`);
  console.log(`${colors.blue}Total SDKs: ${totalSDKs}${colors.reset}`);
  console.log(`${colors.green}Implemented: ${totalImplemented}${colors.reset}`);
  console.log(`${colors.red}Missing/Partial: ${totalMissing}${colors.reset}`);
  console.log(`${colors.blue}Completion: ${completionPercentage}%${colors.reset}`);
  
  // Save detailed results
  const reportPath = path.join(PROJECT_ROOT, 'frontend_sdk_usage_report.json');
  const report = {
    timestamp: new Date().toISOString(),
    total_sdks: totalSDKs,
    implemented_sdks: totalImplemented,
    missing_sdks: totalMissing,
    completion_percentage: completionPercentage,
    files_scanned: allFiles.length,
    sdk_details: results,
    recommendations: generateRecommendations(results)
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.blue}Detailed report saved to: frontend_sdk_usage_report.json${colors.reset}`);
  
  // Final assessment
  if (completionPercentage >= 90) {
    console.log(`\n${colors.green}🎉 FRONTEND INTEGRATION STATUS: EXCELLENT${colors.reset}`);
    console.log(`${colors.green}Most SDKs are actively used in frontend components.${colors.reset}`);
  } else if (completionPercentage >= 70) {
    console.log(`\n${colors.yellow}🔧 FRONTEND INTEGRATION STATUS: GOOD${colors.reset}`);
    console.log(`${colors.yellow}Core SDKs are implemented. Consider adding missing integrations.${colors.reset}`);
  } else if (completionPercentage >= 50) {
    console.log(`\n${colors.yellow}⚠️ FRONTEND INTEGRATION STATUS: PARTIAL${colors.reset}`);
    console.log(`${colors.yellow}Several SDKs need frontend implementation before production.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}🚨 FRONTEND INTEGRATION STATUS: INCOMPLETE${colors.reset}`);
    console.log(`${colors.red}Most SDKs are not integrated in frontend. Significant work required.${colors.reset}`);
  }
  
  return completionPercentage >= 80;
}

// Generate recommendations based on results
function generateRecommendations(results) {
  const recommendations = [];
  
  for (const [sdkName, result] of Object.entries(results)) {
    if (result.status === 'MISSING') {
      recommendations.push({
        sdk: sdkName,
        priority: 'HIGH',
        action: `Implement ${sdkName} integration in frontend components`,
        details: `Add imports and usage of ${sdkName} SDK in relevant React components`
      });
    } else if (result.status === 'PARTIAL') {
      recommendations.push({
        sdk: sdkName,
        priority: 'MEDIUM',
        action: `Complete ${sdkName} implementation`,
        details: `Add actual usage of imported ${sdkName} functions in components`
      });
    }
  }
  
  return recommendations;
}

// Run the verification
const success = verifySDKUsage();
process.exit(success ? 0 : 1);