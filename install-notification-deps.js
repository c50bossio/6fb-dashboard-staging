#!/usr/bin/env node

/**
 * Install Notification Dependencies
 * Simple script to install nodemailer and twilio
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Installing notification dependencies...\n');

try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const hasNodemailer = fs.existsSync(path.join(nodeModulesPath, 'nodemailer'));
  const hasTwilio = fs.existsSync(path.join(nodeModulesPath, 'twilio'));

  if (hasNodemailer && hasTwilio) {
    console.log('✅ Both nodemailer and twilio are already installed!');
    process.exit(0);
  }

  const packagesToInstall = [];
  
  if (!hasNodemailer) {
    console.log('📧 Installing nodemailer...');
    packagesToInstall.push('nodemailer');
  }

  if (!hasTwilio) {
    console.log('📱 Installing twilio...');
    packagesToInstall.push('twilio');
  }

  if (packagesToInstall.length > 0) {
    const packageManagers = ['npm', 'pnpm', 'yarn'];
    let success = false;

    for (const pm of packageManagers) {
      try {
        console.log(`\n🔄 Trying ${pm}...`);
        
        execSync(`${pm} --version`, { stdio: 'ignore' });
        
        const installCmd = pm === 'yarn' ? 
          `${pm} add ${packagesToInstall.join(' ')}` :
          `${pm} install ${packagesToInstall.join(' ')}`;
        
        console.log(`Running: ${installCmd}`);
        execSync(installCmd, { stdio: 'inherit' });
        
        success = true;
        console.log(`\n✅ Successfully installed packages with ${pm}!`);
        break;
        
      } catch (error) {
        console.log(`❌ ${pm} failed:`, error.message);
        continue;
      }
    }

    if (!success) {
      console.log('\n⚠️  Automatic installation failed.');
      console.log('💡 Please manually install the packages:');
      console.log(`   npm install ${packagesToInstall.join(' ')}`);
      console.log('   OR');
      console.log(`   pnpm add ${packagesToInstall.join(' ')}`);
      process.exit(1);
    }
  }

  console.log('\n🎉 Notification system is ready!');
  console.log('📧 Email service: SendGrid configured');
  console.log('📱 SMS service: Twilio configured');
  console.log('\n🧪 Test with: curl -X POST http://localhost:9999/api/notifications -H "Content-Type: application/json" -d \'{"type": "test", "data": {}}\'');

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  console.log('\n💡 Manual installation steps:');
  console.log('1. Run: npm install nodemailer twilio');
  console.log('2. Or try: pnpm add nodemailer twilio');
  console.log('3. Restart your development server');
  process.exit(1);
}