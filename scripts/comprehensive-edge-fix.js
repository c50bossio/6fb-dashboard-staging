#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Libraries that require Node.js runtime
const NODE_DEPENDENT_LIBS = [
  'otplib',
  '@sendgrid',
  'stripe',
  'twilio',
  'nodemailer',
  'jsonwebtoken',
  'bcrypt',
  'bcryptjs',
  'axios',
  'node-fetch',
  'formidable',
  'multer',
  'busboy',
  'qrcode',
  'canvas',
  'sharp',
  'html2canvas',
  'jspdf',
  'puppeteer',
  'playwright',
  'bull',
  'bullmq',
  'ioredis',
  'redis',
  'mongoose',
  'sequelize',
  'typeorm',
  'prisma',
  '@prisma/client'
];

// Find all API route files
const apiRoutePattern = path.join(__dirname, '..', 'app', 'api', '**', '*.js');
const apiRoutes = glob.sync(apiRoutePattern);

console.log(`Checking ${apiRoutes.length} API route files for Edge Runtime compatibility\n`);

let fixedCount = 0;
let alreadyFixed = 0;
let edgeCompatible = 0;

apiRoutes.forEach(filePath => {
  const relativePath = path.relative(process.cwd(), filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it has Edge Runtime
  if (!content.includes("export const runtime = 'edge'")) {
    alreadyFixed++;
    return;
  }
  
  // Check for Node.js dependent libraries
  let hasNodeDependency = false;
  let foundDependency = null;
  
  for (const lib of NODE_DEPENDENT_LIBS) {
    if (content.includes(`'${lib}'`) || content.includes(`"${lib}"`) || 
        content.includes(`'${lib}/`) || content.includes(`"${lib}/`)) {
      hasNodeDependency = true;
      foundDependency = lib;
      break;
    }
  }
  
  // Also check for file imports that might use Node.js internally
  const fileImports = content.match(/from ['"]@?\/?lib\/[^'"]+['"]/g) || [];
  for (const imp of fileImports) {
    // Check if the imported file exists and uses Node modules
    const importPath = imp.match(/['"]([^'"]+)['"]/)[1];
    if (importPath.includes('notification') || importPath.includes('sms') || 
        importPath.includes('email') || importPath.includes('stripe') ||
        importPath.includes('twilio') || importPath.includes('sendgrid')) {
      hasNodeDependency = true;
      foundDependency = importPath;
      break;
    }
  }
  
  if (hasNodeDependency) {
    // Remove Edge Runtime export
    content = content.replace("export const runtime = 'edge'\n", '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${relativePath} (uses ${foundDependency})`);
    fixedCount++;
  } else {
    edgeCompatible++;
  }
});

console.log('\n📊 Final Summary:');
console.log(`  Fixed in this run: ${fixedCount} routes`);
console.log(`  Already on Node.js: ${alreadyFixed} routes`);
console.log(`  Edge compatible: ${edgeCompatible} routes`);
console.log(`  Total routes: ${apiRoutes.length}`);

// Now check lib files for problematic imports
console.log('\n🔍 Checking lib files for Node.js dependencies...');

const libPattern = path.join(__dirname, '..', 'lib', '**', '*.js');
const libFiles = glob.sync(libPattern);

const problematicLibs = [];
libFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const lib of NODE_DEPENDENT_LIBS) {
    if (content.includes(`'${lib}'`) || content.includes(`"${lib}"`)) {
      problematicLibs.push({
        file: path.relative(process.cwd(), filePath),
        dependency: lib
      });
      break;
    }
  }
});

if (problematicLibs.length > 0) {
  console.log('\n⚠️  Lib files with Node.js dependencies:');
  problematicLibs.forEach(({ file, dependency }) => {
    console.log(`  - ${file} (uses ${dependency})`);
  });
}