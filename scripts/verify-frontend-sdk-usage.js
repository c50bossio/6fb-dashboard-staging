#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'components');
const LIB_DIR = path.join(PROJECT_ROOT, 'lib');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

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

function verifySDKUsage() {

  const appFiles = getAllFrontendFiles(APP_DIR);
  const componentFiles = getAllFrontendFiles(COMPONENTS_DIR);
  const allFiles = [...appFiles, ...componentFiles];

  const results = {};
  let totalImplemented = 0;
  let totalMissing = 0;
  
  for (const [sdkName, config] of Object.entries(SDK_MAPPINGS)) {

    const libPath = path.join(PROJECT_ROOT, config.libFile);
    const libExists = fs.existsSync(libPath);
    
    if (!libExists) {
      
      results[sdkName] = { status: 'MISSING', reason: 'Library file not found' };
      totalMissing++;
      continue;
    }
    
    let importFound = false;
    let usageFound = false;
    const importMatches = [];
    const usageMatches = [];
    const filesWithImports = [];
    const filesWithUsage = [];
    
    for (const filePath of allFiles) {
      const imports = checkPatternsInFile(filePath, config.importPatterns);
      if (imports.length > 0) {
        importFound = true;
        importMatches.push(...imports);
        filesWithImports.push(path.relative(PROJECT_ROOT, filePath));
      }
      
      const usage = checkPatternsInFile(filePath, config.usagePatterns);
      if (usage.length > 0) {
        usageFound = true;
        usageMatches.push(...usage);
        filesWithUsage.push(path.relative(PROJECT_ROOT, filePath));
      }
    }
    
    if (importFound && usageFound) {

      if (filesWithImports.length <= 3) {
        }`);
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
      
      }${colors.reset}`);
      results[sdkName] = { 
        status: 'PARTIAL', 
        reason: 'Imported but not used',
        importFiles: filesWithImports.length
      };
      totalMissing++;
    } else {
      
      results[sdkName] = { status: 'MISSING', reason: 'No frontend imports or usage found' };
      totalMissing++;
    }
  }
  
  const totalSDKs = Object.keys(SDK_MAPPINGS).length;
  const completionPercentage = Math.round((totalImplemented / totalSDKs) * 100);

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

  if (completionPercentage >= 90) {

  } else if (completionPercentage >= 70) {

  } else if (completionPercentage >= 50) {

  } else {

  }
  
  return completionPercentage >= 80;
}

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

const success = verifySDKUsage();
process.exit(success ? 0 : 1);