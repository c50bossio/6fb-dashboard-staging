#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

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

const apiRoutePattern = path.join(__dirname, '..', 'app', 'api', '**', '*.js');
const apiRoutes = glob.sync(apiRoutePattern);

let fixedCount = 0;
let alreadyFixed = 0;
let edgeCompatible = 0;

apiRoutes.forEach(filePath => {
  const relativePath = path.relative(process.cwd(), filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("export const runtime = 'edge'")) {
    alreadyFixed++;
    return;
  }
  
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
  
  const fileImports = content.match(/from ['"]@?\/?lib\/[^'"]+['"]/g) || [];
  for (const imp of fileImports) {
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
    content = content.replace("export const runtime = 'edge'\n", '');
    fs.writeFileSync(filePath, content, 'utf8');
    `);
    fixedCount++;
  } else {
    edgeCompatible++;
  }
});

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
  
  problematicLibs.forEach(({ file, dependency }) => {
    `);
  });
}