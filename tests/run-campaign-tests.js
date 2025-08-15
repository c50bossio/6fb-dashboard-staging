#!/usr/bin/env node

/**
 * Campaign & Billing Test Runner
 * Runs E2E tests for the marketing campaign and billing system
 */

const { spawn } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_DEV_MODE = 'true';

console.log('🚀 Starting Campaign & Billing E2E Tests');
console.log('📦 Environment: Development with Mock Services');
console.log('🔐 Authentication: Test User (UUID: 11111111-1111-1111-1111-111111111111)\n');

function runTests() {
  const testFile = path.join(__dirname, 'e2e', 'campaigns-billing.spec.js');
  
  const playwright = spawn('npx', [
    'playwright',
    'test',
    testFile,
    '--project=chromium',
    '--reporter=list'
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: '1'
    }
  });

  playwright.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All tests passed successfully!');
      console.log('📊 Test Summary:');
      console.log('  - Authentication: ✓ Working');
      console.log('  - Campaign Display: ✓ Working');
      console.log('  - Billing Modal: ✓ Working');
      console.log('  - Email Campaign Creation: ✓ Working');
      console.log('  - SMS Campaign Creation: ✓ Working');
      console.log('  - Mock Services: ✓ Working');
    } else {
      console.log(`\n❌ Tests failed with code ${code}`);
      console.log('💡 Tip: Make sure the dev server is running on port 9999');
      console.log('   Run: NODE_ENV=development NEXT_PUBLIC_DEV_MODE=true npm run dev');
    }
    process.exit(code);
  });
}

const checkPlaywright = spawn('npx', ['playwright', '--version'], {
  stdio: 'pipe'
});

checkPlaywright.on('close', (code) => {
  if (code !== 0) {
    console.log('⚠️  Playwright not found. Installing...');
    const install = spawn('npx', ['playwright', 'install', 'chromium'], {
      stdio: 'inherit'
    });
    
    install.on('close', (installCode) => {
      if (installCode === 0) {
        console.log('✅ Playwright installed successfully\n');
        runTests();
      } else {
        console.error('❌ Failed to install Playwright');
        process.exit(1);
      }
    });
  } else {
    runTests();
  }
});

checkPlaywright.on('error', (err) => {
  console.error('Error checking Playwright:', err);
  process.exit(1);
});