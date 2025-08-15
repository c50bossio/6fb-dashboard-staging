#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const NODE_ONLY_MODULES = [
  'crypto',
  'fs',
  'path',
  'dns',
  'child_process',
  'os',
  'net',
  'stream',
  'buffer',
  'http',
  'https',
  'zlib',
  'querystring',
  'url',
  'util',
  'vm',
  'cluster',
  'worker_threads',
  'fs/promises',
  'dns/promises',
  'stream/promises'
];

const apiRoutePattern = path.join(__dirname, '..', 'app', 'api', '**', '*.js');
const apiRoutes = glob.sync(apiRoutePattern);

console.log(`Found ${apiRoutes.length} API route files`);

let fixedCount = 0;
let edgeCount = 0;
let nodeCount = 0;

apiRoutes.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  let usesNodeModules = false;
  for (const module of NODE_ONLY_MODULES) {
    const patterns = [
      `require('${module}')`,
      `require("${module}")`,
      `from '${module}'`,
      `from "${module}"`,
      `import('${module}')`,
      `import("${module}")`,
    ];
    
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        usesNodeModules = true;
        break;
      }
    }
    if (usesNodeModules) break;
  }
  
  if (content.includes('writeFile') || content.includes('readFile') || 
      content.includes('mkdir') || content.includes('unlink') ||
      content.includes('createWriteStream') || content.includes('createReadStream')) {
    usesNodeModules = true;
  }
  
  if (content.includes('stripe.webhooks.constructEvent')) {
    usesNodeModules = true;
  }
  
  if (usesNodeModules && content.includes("export const runtime = 'edge'")) {
    const updatedContent = content.replace("export const runtime = 'edge'\n", '');
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Removed Edge Runtime from: ${path.relative(process.cwd(), filePath)}`);
    fixedCount++;
    nodeCount++;
  } else if (content.includes("export const runtime = 'edge'")) {
    edgeCount++;
  } else {
    nodeCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`  Fixed: ${fixedCount} routes (removed Edge Runtime)`);
console.log(`  Edge Runtime: ${edgeCount} routes`);
console.log(`  Node.js Runtime: ${nodeCount} routes`);
console.log(`  Total: ${apiRoutes.length} routes`);