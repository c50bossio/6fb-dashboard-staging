const https = require('https');

console.log('Testing Production Cache System...\n');

// Test Build Info
https.get('https://bookedbarber.com/api/build-info', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const info = JSON.parse(data);
    console.log('✅ Build Info API Working:');
    console.log('   Build ID:', info.buildId);
    console.log('   Version:', info.version);
    console.log('   Environment:', info.environment);
  });
});

// Test Service Worker
https.get('https://bookedbarber.com/sw.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data.includes('BUILD_TIMESTAMP')) {
      console.log('\n✅ Service Worker has dynamic versioning');
    }
  });
});
