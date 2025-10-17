#!/usr/bin/env node

/**
 * Campaign & Billing Test Runner
 * Runs E2E tests for the marketing campaign and billing system
 */

const { spawn } = require('child_process');
const path = require('path');

process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_DEV_MODE = 'true';

\n');

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

    } else {

    }
    process.exit(code);
  });
}

const checkPlaywright = spawn('npx', ['playwright', '--version'], {
  stdio: 'pipe'
});

checkPlaywright.on('close', (code) => {
  if (code !== 0) {
    
    const install = spawn('npx', ['playwright', 'install', 'chromium'], {
      stdio: 'inherit'
    });
    
    install.on('close', (installCode) => {
      if (installCode === 0) {
        
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