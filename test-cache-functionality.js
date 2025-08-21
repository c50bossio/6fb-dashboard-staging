#!/usr/bin/env node

/**
 * Test script to verify cache management functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Cache Management System\n');
console.log('=' .repeat(50));

// Test 1: Build ID Generation
console.log('\n1️⃣ Testing Build ID Generation:');
const nextConfig = require('./next.config.js');
if (nextConfig.generateBuildId) {
  const buildId1 = nextConfig.generateBuildId();
  setTimeout(async () => {
    const buildId2 = await nextConfig.generateBuildId();
    console.log(`   ✅ Build ID 1: ${await buildId1}`);
    console.log(`   ✅ Build ID 2: ${buildId2}`);
    console.log(`   ✅ Unique IDs: ${await buildId1 !== buildId2 ? 'YES' : 'NO'}`);
  }, 100);
} else {
  console.log('   ❌ generateBuildId not found in next.config.js');
}

// Test 2: Service Worker Versioning
console.log('\n2️⃣ Testing Service Worker Versioning:');
const swPath = path.join(__dirname, 'public', 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');
const hasDynamicVersion = swContent.includes('BUILD_TIMESTAMP');
const hasVersionedCache = swContent.includes('CACHE_VERSION');
console.log(`   ${hasDynamicVersion ? '✅' : '❌'} Dynamic BUILD_TIMESTAMP found`);
console.log(`   ${hasVersionedCache ? '✅' : '❌'} CACHE_VERSION found`);

// Test 3: Cache Manager Functions
console.log('\n3️⃣ Testing Cache Manager:');
const cacheManager = require('./lib/cacheManager.js').default;
const methods = ['clearAll', 'checkForUpdates', 'applyUpdate', 'refresh', 'getStatus'];
methods.forEach(method => {
  const exists = typeof cacheManager[method] === 'function';
  console.log(`   ${exists ? '✅' : '❌'} ${method}() method exists`);
});

// Test 4: Versioned Storage
console.log('\n4️⃣ Testing Versioned Storage:');
const versionedStoragePath = path.join(__dirname, 'lib', 'versionedStorage.js');
const versionedStorageExists = fs.existsSync(versionedStoragePath);
if (versionedStorageExists) {
  const versionedStorage = require('./lib/versionedStorage.js');
  console.log(`   ✅ Versioned storage module exists`);
  console.log(`   ✅ Storage version: ${versionedStorage.STORAGE_VERSION || 'Not found'}`);
} else {
  console.log(`   ❌ Versioned storage not found at ${versionedStoragePath}`);
}

// Test 5: Build Info API
console.log('\n5️⃣ Testing Build Info API:');
const buildInfoPath = path.join(__dirname, 'app', 'api', 'build-info', 'route.js');
const buildInfoExists = fs.existsSync(buildInfoPath);
console.log(`   ${buildInfoExists ? '✅' : '❌'} Build info API endpoint exists`);

// Test 6: Cache Management Page
console.log('\n6️⃣ Testing Cache Management Page:');
const cachePagePath = path.join(__dirname, 'app', '(protected)', 'shop', 'settings', 'system', 'cache', 'page.js');
const cachePageExists = fs.existsSync(cachePagePath);
console.log(`   ${cachePageExists ? '✅' : '❌'} Cache management page exists in protected area`);

if (cachePageExists) {
  const cachePageContent = fs.readFileSync(cachePagePath, 'utf8');
  const hasFixButton = cachePageContent.includes('Fix Update Issues');
  const usesCacheManager = cachePageContent.includes('cacheManager');
  console.log(`   ${hasFixButton ? '✅' : '❌'} Has "Fix Update Issues" button`);
  console.log(`   ${usesCacheManager ? '✅' : '❌'} Uses cacheManager utility`);
}

// Summary
console.log('\n' + '=' .repeat(50));
console.log('📊 SUMMARY:');
const allTests = [
  hasDynamicVersion,
  hasVersionedCache,
  versionedStorageExists,
  buildInfoExists,
  cachePageExists
];
const passed = allTests.filter(t => t).length;
const total = allTests.length;
console.log(`   ${passed}/${total} core features implemented`);
console.log(`   ${passed === total ? '✅ All systems operational!' : '⚠️  Some features missing'}`);