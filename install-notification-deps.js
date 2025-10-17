#!/usr/bin/env node

/**
 * Install Notification Dependencies
 * Simple script to install nodemailer and twilio
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const hasNodemailer = fs.existsSync(path.join(nodeModulesPath, 'nodemailer'));
  const hasTwilio = fs.existsSync(path.join(nodeModulesPath, 'twilio'));

  if (hasNodemailer && hasTwilio) {
    
    process.exit(0);
  }

  const packagesToInstall = [];
  
  if (!hasNodemailer) {
    
    packagesToInstall.push('nodemailer');
  }

  if (!hasTwilio) {
    
    packagesToInstall.push('twilio');
  }

  if (packagesToInstall.length > 0) {
    const packageManagers = ['npm', 'pnpm', 'yarn'];
    let success = false;

    for (const pm of packageManagers) {
      try {

        execSync(`${pm} --version`, { stdio: 'ignore' });
        
        const installCmd = pm === 'yarn' ? 
          `${pm} add ${packagesToInstall.join(' ')}` :
          `${pm} install ${packagesToInstall.join(' ')}`;

        execSync(installCmd, { stdio: 'inherit' });
        
        success = true;
        
        break;
        
      } catch (error) {
        
        continue;
      }
    }

    if (!success) {

      }`);
      
      }`);
      process.exit(1);
    }
  }

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);

  process.exit(1);
}