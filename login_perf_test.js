const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting login page performance test...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = {
      startTime: Date.now(),
      domContentLoaded: 0,
      loadComplete: 0,
      resourceCount: 0,
      errors: []
    };
    
    document.addEventListener('DOMContentLoaded', () => {
      window.performanceMetrics.domContentLoaded = Date.now() - window.performanceMetrics.startTime;
    });
    
    window.addEventListener('load', () => {
      window.performanceMetrics.loadComplete = Date.now() - window.performanceMetrics.startTime;
      window.performanceMetrics.resourceCount = performance.getEntriesByType('resource').length;
    });
    
    window.addEventListener('error', (e) => {
      window.performanceMetrics.errors.push(e.message);
    });
  });
  
  // Track network requests
  const networkRequests = [];
  page.on('response', (response) => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      timing: response.timing()
    });
  });
  
  // Track console messages
  const consoleMessages = [];
  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });
  
  console.log('📍 Navigating to login page...');
  const startTime = Date.now();
  
  try {
    await page.goto('http://localhost:9999/login', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    const navigationTime = Date.now() - startTime;
    console.log(`⏱️  Navigation completed in ${navigationTime}ms`);
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      
      return {
        navigationStart: timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractiveEventEnd - timing.navigationStart,
        resourceCount: performance.getEntriesByType('resource').length,
        customMetrics: window.performanceMetrics,
        readyState: document.readyState,
        hasForm: !!document.querySelector('form'),
        hasSubmitButton: !!document.querySelector('button[type="submit"], button'),
        title: document.title
      };
    });
    
    // Get slowest resources
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .map(r => ({
          name: r.name.split('/').pop() || r.name,
          duration: r.duration,
          size: r.transferSize || 0,
          type: r.initiatorType
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    });
    
    // Test form functionality
    console.log('🧪 Testing form functionality...');
    try {
      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      if (emailInput) {
        await emailInput.type('test@example.com', {delay: 50});
        console.log('   ✓ Email input works');
      }
      
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.type('testpass', {delay: 50});
        console.log('   ✓ Password input works');
      }
      
      const submitButton = await page.$('button[type="submit"], button');
      if (submitButton) {
        const buttonText = await page.evaluate(el => el.textContent, submitButton);
        console.log(`   ✓ Submit button found: "${buttonText}"`);
      }
    } catch (e) {
      console.log(`   ⚠️ Form test error: ${e.message}`);
    }
    
    // Results
    console.log('\n📊 Performance Results:');
    console.log(`   Page Title: ${metrics.title}`);
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms (${(metrics.domContentLoaded/1000).toFixed(2)}s)`);
    console.log(`   Load Event Complete: ${metrics.loadComplete}ms (${(metrics.loadComplete/1000).toFixed(2)}s)`);
    console.log(`   DOM Interactive: ${metrics.domInteractive}ms (${(metrics.domInteractive/1000).toFixed(2)}s)`);
    console.log(`   Resource Count: ${metrics.resourceCount}`);
    console.log(`   Document Ready: ${metrics.readyState}`);
    console.log(`   Form Present: ${metrics.hasForm}`);
    console.log(`   Submit Button: ${metrics.hasSubmitButton}`);
    
    console.log('\n🐌 Slowest Resources:');
    resources.forEach((r, i) => {
      console.log(`   ${String(i+1).padStart(2)}. ${r.duration.toFixed(2)}ms - ${r.type} - ${r.name}`);
    });
    
    console.log(`\n🌐 Network Summary:`);
    console.log(`   Total Requests: ${networkRequests.length}`);
    const failedRequests = networkRequests.filter(r => r.status >= 400);
    console.log(`   Failed Requests: ${failedRequests.length}`);
    
    if (consoleMessages.length > 0) {
      console.log('\n📝 Console Messages:');
      consoleMessages.forEach(msg => {
        if (msg.type === 'error') {
          console.log(`   ❌ ${msg.type}: ${msg.text}`);
        } else if (msg.type === 'warning') {
          console.log(`   ⚠️ ${msg.type}: ${msg.text}`);
        }
      });
    }
    
    // Performance comparison
    const currentLoadTime = metrics.loadComplete / 1000;
    const previousBaseline = 5.3;
    const improvement = ((previousBaseline - currentLoadTime) / previousBaseline) * 100;
    
    console.log('\n📈 Performance Comparison:');
    console.log(`   Previous Baseline: ${previousBaseline}s`);
    console.log(`   Current Load Time: ${currentLoadTime.toFixed(2)}s`);
    
    if (improvement > 0) {
      console.log(`   Improvement: ${improvement.toFixed(1)}% faster ✅`);
    } else {
      console.log(`   Change: ${Math.abs(improvement).toFixed(1)}% slower ❌`);
    }
    
    const targetMet = currentLoadTime <= 2.0;
    console.log(`   Target (≤2s): ${targetMet ? '✅ SUCCESS' : '❌ NEEDS WORK'}`);
    
    if (targetMet) {
      console.log('\n🎉 Performance optimization was successful!');
    } else {
      console.log('\n⚠️ Performance still needs improvement.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();