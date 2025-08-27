const puppeteer = require('puppeteer');

async function captureInventoryPageDirect() {
  let browser;
  let page;
  
  try {
    console.log('🔗 Connecting to existing Chrome instance on localhost:9222...');
    
    // Connect to existing Chrome instance
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: { width: 1920, height: 1080 }
    });

    console.log('📄 Creating new page...');
    page = await browser.newPage();
    
    console.log('🌐 Navigating to localhost:9999...');
    await page.goto('http://localhost:9999', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('⏱️ Waiting for page to load completely...');
    await page.waitForTimeout(3000);

    console.log('📸 Taking initial screenshot...');
    await page.screenshot({
      path: '/tmp/localhost-9999-initial.png',
      fullPage: true
    });

    // Try to navigate to inventory section
    console.log('🔍 Looking for inventory navigation links...');
    
    // Try multiple selectors to find inventory
    const inventorySelectors = [
      'a[href*="inventory"]',
      'a[href*="products"]', 
      'button:has-text("Inventory")',
      'button:has-text("Products")',
      '[data-testid*="inventory"]',
      'nav a:has-text("Inventory")',
      'nav a:has-text("Products")',
      '.inventory',
      '#inventory'
    ];

    let inventoryElement = null;
    
    for (const selector of inventorySelectors) {
      try {
        console.log(`🔍 Trying selector: ${selector}`);
        inventoryElement = await page.$(selector);
        if (inventoryElement) {
          console.log(`✅ Found inventory element with: ${selector}`);
          await inventoryElement.click();
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        console.log(`❌ Failed with selector: ${selector}`);
      }
    }

    if (!inventoryElement) {
      console.log('🔄 Trying direct URL navigation...');
      const inventoryUrls = [
        'http://localhost:9999/inventory',
        'http://localhost:9999/products',
        'http://localhost:9999/dashboard/inventory',
        'http://localhost:9999/admin/inventory'
      ];
      
      for (const url of inventoryUrls) {
        try {
          console.log(`🔄 Trying URL: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
          const title = await page.title();
          if (!title.includes('404') && !title.includes('Not Found')) {
            console.log(`✅ Successfully loaded: ${url}`);
            break;
          }
        } catch (e) {
          console.log(`❌ Failed to load: ${url}`);
        }
      }
    }

    // Wait for any dynamic content to load
    await page.waitForTimeout(3000);

    console.log('🔍 Analyzing modal overlays...');
    
    // Check for modal elements and overlapping content
    const modalInfo = await page.evaluate(() => {
      const modalSelectors = [
        '.modal',
        '[role="dialog"]',
        '.dialog',
        '.overlay',
        '.popup',
        '[data-testid*="modal"]',
        '.fixed.inset-0', // Common Tailwind modal backdrop
        '.z-50', // High z-index elements that might be modals
        '.backdrop-blur' // Backdrop blur effects
      ];

      const results = [];
      modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            results.push({
              selector: selector,
              index: index,
              visible: styles.display !== 'none' && styles.visibility !== 'hidden',
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              },
              zIndex: styles.zIndex,
              classes: element.className,
              id: element.id
            });
          });
        }
      });

      // Also check for card layouts that might be confusing
      const cards = document.querySelectorAll('.card, [class*="card"], .bg-white, .shadow, .border');
      const cardInfo = Array.from(cards).map((card, index) => {
        const rect = card.getBoundingClientRect();
        return {
          type: 'card',
          index: index,
          position: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          },
          classes: card.className
        };
      });

      return {
        modals: results,
        cards: cardInfo.slice(0, 10), // Limit to first 10 cards
        totalCards: cardInfo.length,
        pageTitle: document.title,
        currentUrl: window.location.href
      };
    });

    console.log('📊 Modal Analysis Results:');
    console.log(`  • Found ${modalInfo.modals.length} modal elements`);
    console.log(`  • Found ${modalInfo.totalCards} card elements`);
    console.log(`  • Current URL: ${modalInfo.currentUrl}`);
    console.log(`  • Page Title: ${modalInfo.pageTitle}`);

    if (modalInfo.modals.length > 0) {
      console.log('📋 Modal details:');
      modalInfo.modals.forEach(modal => {
        console.log(`  • ${modal.selector} - Visible: ${modal.visible} - Z-Index: ${modal.zIndex}`);
      });
    }

    console.log('📸 Taking final screenshot with analysis...');
    await page.screenshot({
      path: '/tmp/inventory-analysis-complete.png',
      fullPage: true
    });

    // Also take a viewport-only screenshot to focus on what users see
    await page.screenshot({
      path: '/tmp/inventory-viewport-focus.png',
      fullPage: false
    });

    // Save analysis data
    const fs = require('fs');
    const analysisData = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      title: await page.title(),
      modalAnalysis: modalInfo,
      screenshots: [
        '/tmp/localhost-9999-initial.png',
        '/tmp/inventory-analysis-complete.png', 
        '/tmp/inventory-viewport-focus.png'
      ]
    };

    fs.writeFileSync('/tmp/inventory-modal-analysis.json', JSON.stringify(analysisData, null, 2));

    console.log('✅ Analysis complete!');
    console.log('📁 Files created:');
    console.log('  • /tmp/localhost-9999-initial.png (initial state)');
    console.log('  • /tmp/inventory-analysis-complete.png (final state)');
    console.log('  • /tmp/inventory-viewport-focus.png (viewport only)');
    console.log('  • /tmp/inventory-modal-analysis.json (analysis data)');

  } catch (error) {
    console.error('❌ Error during capture:', error.message);
    if (error.message.includes('Target closed') || error.message.includes('Connection refused')) {
      console.error('💡 Chrome debugging session may have closed. Try restarting Chrome with:');
      console.error('   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug');
    }
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}

// Execute the capture
captureInventoryPageDirect().catch(console.error);