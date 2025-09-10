const puppeteer = require('puppeteer');

const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667, deviceScaleFactor: 2 },
  'iPhone 12': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iPhone 12 Pro Max': { width: 428, height: 926, deviceScaleFactor: 3 },
  'Samsung Galaxy S21': { width: 384, height: 854, deviceScaleFactor: 2.75 },
  'iPad Mini': { width: 768, height: 1024, deviceScaleFactor: 2 }
};

async function testMobileBookingFlow() {
  console.log('🚀 Starting Mobile Booking Flow Tests...\n');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const [deviceName, viewport] of Object.entries(MOBILE_VIEWPORTS)) {
    console.log(`📱 Testing on ${deviceName} (${viewport.width}x${viewport.height})`);
    
    const page = await browser.newPage();
    await page.setViewport(viewport);

    try {
      // Navigate to booking page
      await page.goto('http://localhost:3000/booking', { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });

      // Test mobile responsiveness
      console.log(`  ✅ Page loaded successfully`);

      // Check if mobile layout is visible
      const mobileProgressBar = await page.$('.md\\:hidden');
      if (mobileProgressBar) {
        console.log(`  ✅ Mobile progress bar is visible`);
      }

      // Test touch targets (minimum 44px)
      const buttons = await page.$$('button');
      let touchTargetCount = 0;
      for (const button of buttons) {
        const boundingBox = await button.boundingBox();
        if (boundingBox && (boundingBox.height >= 44 || boundingBox.width >= 44)) {
          touchTargetCount++;
        }
      }
      console.log(`  ✅ ${touchTargetCount} buttons have adequate touch targets`);

      // Test text size (should be at least 16px to prevent zoom)
      const textSize = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        const minSize = Math.min(...Array.from(inputs).map(input => 
          parseFloat(window.getComputedStyle(input).fontSize)
        ));
        return minSize;
      });
      
      if (textSize >= 16) {
        console.log(`  ✅ Input text size is ${textSize}px (prevents zoom)`);
      } else {
        console.log(`  ⚠️ Input text size is ${textSize}px (may cause zoom)`);
      }

      // Test swipe indicators
      const swipeIndicators = await page.$('.md\\:hidden .flex.space-x-1');
      if (swipeIndicators) {
        console.log(`  ✅ Swipe indicators are visible on mobile`);
      }

      // Test booking summary position on mobile
      const mobileSummary = await page.$('.md\\:hidden .space-y-4');
      if (mobileSummary) {
        console.log(`  ✅ Mobile booking summary layout detected`);
      }

      // Test viewport-specific styles
      const isSmallMobile = viewport.width <= 375;
      if (isSmallMobile) {
        // Test grid layout on small screens
        const timeSlots = await page.$('.grid.grid-cols-3');
        if (timeSlots) {
          console.log(`  ✅ Time slots use 3-column grid on small mobile`);
        }
      }

      // Capture screenshot for visual verification
      await page.screenshot({
        path: `mobile-test-${deviceName.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true
      });
      console.log(`  📸 Screenshot saved for ${deviceName}\n`);

    } catch (error) {
      console.log(`  ❌ Error testing ${deviceName}: ${error.message}\n`);
    }

    await page.close();
  }

  await browser.close();
  console.log('🎉 Mobile testing complete! Check the generated screenshots for visual verification.');
}

// Performance test for mobile
async function testMobilePerformance() {
  console.log('📊 Testing Mobile Performance...\n');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Throttle to simulate 3G mobile connection
  await page.emulateNetworkConditions({
    offline: false,
    downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps
    latency: 150
  });

  await page.setViewport(MOBILE_VIEWPORTS['iPhone 12']);

  // Enable performance monitoring
  await page.tracing.start({
    path: 'mobile-performance-trace.json',
    screenshots: true
  });

  const startTime = Date.now();
  await page.goto('http://localhost:3000/booking', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  const loadTime = Date.now() - startTime;

  await page.tracing.stop();

  console.log(`📱 Mobile load time: ${loadTime}ms`);
  
  // Test Core Web Vitals
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const vitals = {};
        
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            vitals.FCP = entry.startTime;
          }
          if (entry.name === 'largest-contentful-paint') {
            vitals.LCP = entry.startTime;
          }
        });
        
        resolve(vitals);
      }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      
      // Fallback timeout
      setTimeout(() => resolve({}), 5000);
    });
  });

  console.log('📊 Core Web Vitals:');
  if (metrics.FCP) console.log(`  - First Contentful Paint: ${Math.round(metrics.FCP)}ms`);
  if (metrics.LCP) console.log(`  - Largest Contentful Paint: ${Math.round(metrics.LCP)}ms`);

  await browser.close();
}

// Run tests
async function runAllTests() {
  try {
    await testMobileBookingFlow();
    await testMobilePerformance();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runAllTests();