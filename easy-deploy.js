#!/usr/bin/env node

/**
 * Easy Deploy Script for Novu Workflows
 * Simple command-line interface for deploying workflows
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🎯 6FB Barbershop Workflow Deployment');
  console.log('=====================================\n');
  
  console.log('Choose your deployment method:\n');
  console.log('1. 🤖 Automated API Deployment (fastest)');
  console.log('2. 🌐 Browser Automation (most reliable)');
  console.log('3. 📋 Manual with Templates (copy/paste)');
  console.log('4. 🧪 Test Existing Workflows');
  console.log('5. ❌ Exit\n');
  
  const choice = await ask('Enter your choice (1-5): ');
  
  switch (choice) {
    case '1':
      await deployViaAPI();
      break;
    case '2':
      await deployViaBrowser();
      break;
    case '3':
      await showManualInstructions();
      break;
    case '4':
      await testWorkflows();
      break;
    case '5':
      console.log('👋 Goodbye!');
      break;
    default:
      console.log('❌ Invalid choice. Please try again.');
      await main();
  }
  
  rl.close();
}

async function deployViaAPI() {
  console.log('\n🤖 Starting Automated API Deployment...\n');
  
  try {
    execSync('node auto-deploy-novu-workflows.js', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
  } catch (error) {
    console.log('\n❌ API deployment failed.');
    console.log('💡 Try option 2 (Browser Automation) or option 3 (Manual) instead.');
  }
}

async function deployViaBrowser() {
  console.log('\n🌐 Starting Browser Automation...\n');
  console.log('📝 This will:');
  console.log('   • Open a browser window');
  console.log('   • Navigate to Novu');
  console.log('   • Wait for you to log in');
  console.log('   • Automatically create all workflows\n');
  
  const confirm = await ask('Continue? (y/n): ');
  
  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    try {
      execSync('node claude-workflow-deployer.js', { 
        stdio: 'inherit',
        cwd: __dirname 
      });
    } catch (error) {
      console.log('\n❌ Browser automation failed.');
      console.log('💡 Try option 3 (Manual) instead.');
    }
  } else {
    console.log('⏸️  Cancelled browser deployment.');
  }
}

async function showManualInstructions() {
  console.log('\n📋 Manual Deployment Instructions\n');
  console.log('✅ Use these files for easy copy/paste:');
  console.log('   • workflow-1-appointment-confirmation-FIXED.txt');
  console.log('   • workflow-2-booking-reminder-FIXED.txt');
  console.log('   • workflow-3-payment-confirmation-FIXED.txt\n');
  
  console.log('📝 Steps:');
  console.log('   1. Open one of the FIXED.txt files');
  console.log('   2. Go to https://web.novu.co → Workflows → Create Workflow');
  console.log('   3. Copy/paste the info from the txt file');
  console.log('   4. Repeat for all 3 workflows');
  console.log('   5. Test with: node test-novu-workflows.js\n');
  
  console.log('💡 The FIXED files use {{{variable}}} format to avoid errors.');
  
  const openFile = await ask('\nOpen the first workflow file? (y/n): ');
  if (openFile.toLowerCase() === 'y' || openFile.toLowerCase() === 'yes') {
    try {
      // Try to open the file with default editor
      if (process.platform === 'darwin') {
        execSync('open workflow-1-appointment-confirmation-FIXED.txt', { cwd: __dirname });
      } else if (process.platform === 'win32') {
        execSync('start workflow-1-appointment-confirmation-FIXED.txt', { cwd: __dirname });
      } else {
        execSync('xdg-open workflow-1-appointment-confirmation-FIXED.txt', { cwd: __dirname });
      }
      console.log('📂 Opened workflow-1-appointment-confirmation-FIXED.txt');
    } catch (error) {
      console.log('❌ Could not open file automatically.');
      console.log('📂 Manually open: workflow-1-appointment-confirmation-FIXED.txt');
    }
  }
}

async function testWorkflows() {
  console.log('\n🧪 Testing Existing Workflows...\n');
  
  try {
    execSync('node test-novu-workflows.js', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
  } catch (error) {
    console.log('\n❌ Test failed. Workflows may not be deployed yet.');
    console.log('💡 Use options 1, 2, or 3 to deploy workflows first.');
  }
}

// Check dependencies
function checkDependencies() {
  const fs = require('fs');
  
  const requiredFiles = [
    'auto-deploy-novu-workflows.js',
    'test-novu-workflows.js',
    'workflow-1-appointment-confirmation-FIXED.txt',
    'workflow-2-booking-reminder-FIXED.txt',
    'workflow-3-payment-confirmation-FIXED.txt'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.log('❌ Missing required files:');
    missingFiles.forEach(file => console.log(`   • ${file}`));
    console.log('\n💡 Make sure you\'re running from the correct directory.');
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  checkDependencies();
  main().catch(console.error);
}

module.exports = { main };