const puppeteer = require('puppeteer');

async function captureInventoryPageDirect() {
  let browser;
  let page;
  
  try {

    // Connect to existing Chrome instance
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: { width: 1920, height: 1080 }
    });

    page = await browser.newPage();

    await page.goto('http://localhost:9999', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '/tmp/localhost-9999-initial.png',
      fullPage: true
    });

    // Try to navigate to inventory section

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
        
        inventoryElement = await page.$(selector);
        if (inventoryElement) {
          
          await inventoryElement.click();
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        
      }
    }

    if (!inventoryElement) {
      
      const inventoryUrls = [
        'http://localhost:9999/inventory',
        'http://localhost:9999/products',
        'http://localhost:9999/dashboard/inventory',
        'http://localhost:9999/admin/inventory'
      ];
      
      for (const url of inventoryUrls) {
        try {
          
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
          const title = await page.title();
          if (!title.includes('404') && !title.includes('Not Found')) {
            
            break;
          }
        } catch (e) {
          
        }
      }
    }

    // Wait for any dynamic content to load
    await page.waitForTimeout(3000);

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

    if (modalInfo.modals.length > 0) {
      
      modalInfo.modals.forEach(modal => {
        
      });
    }

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

    ');
    ');
    ');
    ');

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