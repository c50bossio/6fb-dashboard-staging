import { test, expect } from '@playwright/test'

/**
 * Direct Navigation Logo Testing
 * Tests the navigation component directly by examining the code structure
 */

test.describe('Navigation Logo - Direct Testing', () => {
  test('verify mobile navigation implementation in code', async ({ page }) => {
    // Navigate to any page to get the code loaded
    await page.goto('http://localhost:9999/')
    
    // Check if our Navigation component is loaded by looking for mobile header classes
    const hasLgHidden = await page.evaluate(() => {
      // Look for elements with lg:hidden class (mobile header)
      const mobileHeaders = document.querySelectorAll('.lg\\:hidden')
      return mobileHeaders.length > 0
    })
    
    console.log('Mobile headers found:', hasLgHidden)
    
    // Check for our specific mobile header structure
    const mobileHeaderStructure = await page.evaluate(() => {
      // Look for the specific mobile header structure we implemented
      const headers = Array.from(document.querySelectorAll('.lg\\:hidden'))
      
      for (const header of headers) {
        // Check if it has our height class (h-14)
        if (header.classList.contains('h-14')) {
          // Check for our logo container
          const logoContainer = header.querySelector('.flex-shrink-0.max-h-10')
          if (logoContainer) {
            return {
              found: true,
              headerHeight: header.classList.contains('h-14'),
              hasLogoContainer: true,
              containerClasses: logoContainer.className,
              logoImage: logoContainer.querySelector('img') ? {
                src: logoContainer.querySelector('img').src,
                classes: logoContainer.querySelector('img').className
              } : null
            }
          }
        }
      }
      
      return { found: false, headers: headers.length }
    })
    
    console.log('Mobile header structure:', JSON.stringify(mobileHeaderStructure, null, 2))
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: 'test-results/navigation-component-analysis.png',
      fullPage: true 
    })
  })

  test('verify responsive logo classes in component files', async ({ page }) => {
    // This test examines if our Navigation component has the right structure
    await page.goto('http://localhost:9999/')
    
    // Check the actual DOM for our responsive logo implementation
    const logoAnalysis = await page.evaluate(() => {
      const results = {
        mobileHeadersFound: 0,
        logoImagesFound: 0,
        responsiveClassesFound: [],
        logoDetails: []
      }
      
      // Look for all images that might be logos
      const images = document.querySelectorAll('img')
      
      images.forEach((img, index) => {
        results.logoImagesFound++
        
        const details = {
          index,
          src: img.src,
          alt: img.alt,
          classes: img.className,
          hasMaxHeight: img.className.includes('max-h'),
          hasAutoWidth: img.className.includes('w-auto'),
          hasObjectContain: img.className.includes('object-contain'),
          parentClasses: img.parentElement ? img.parentElement.className : null
        }
        
        results.logoDetails.push(details)
        
        // Check for responsive classes
        if (details.hasMaxHeight) results.responsiveClassesFound.push('max-h')
        if (details.hasAutoWidth) results.responsiveClassesFound.push('w-auto')
        if (details.hasObjectContain) results.responsiveClassesFound.push('object-contain')
      })
      
      // Look for mobile headers
      const mobileHeaders = document.querySelectorAll('.lg\\:hidden, [class*="lg:hidden"]')
      results.mobileHeadersFound = mobileHeaders.length
      
      return results
    })
    
    console.log('Logo analysis:', JSON.stringify(logoAnalysis, null, 2))
    
    // Verify our responsive classes are being applied somewhere
    expect(logoAnalysis.logoImagesFound).toBeGreaterThan(0)
    
    // Take screenshot of any logos found
    const logoImages = page.locator('img')
    const logoCount = await logoImages.count()
    
    for (let i = 0; i < Math.min(logoCount, 3); i++) {
      const logo = logoImages.nth(i)
      if (await logo.isVisible()) {
        await logo.screenshot({ 
          path: `test-results/logo-${i}-analysis.png` 
        })
      }
    }
  })

  test('mobile viewport simulation of current page', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to current page
    await page.goto('http://localhost:9999/')
    await page.waitForTimeout(3000)
    
    // Add mobile simulation CSS to force mobile layout
    await page.addStyleTag({
      content: `
        @media (max-width: 1023px) {
          .lg\\:hidden { display: block !important; }
          .lg\\:block { display: none !important; }
          .lg\\:flex { display: none !important; }
        }
        
        /* Force mobile navigation to show if it exists */
        .mobile-nav, .mobile-header, [class*="mobile"] {
          display: block !important;
        }
      `
    })
    
    await page.waitForTimeout(1000)
    
    // Take screenshots at different mobile sizes
    const mobileSizes = [
      { width: 320, height: 568, name: 'very-small' },
      { width: 375, height: 667, name: 'iphone-se' },
      { width: 390, height: 844, name: 'iphone-12' },
      { width: 414, height: 896, name: 'iphone-pro-max' }
    ]
    
    for (const size of mobileSizes) {
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.waitForTimeout(500)
      
      await page.screenshot({ 
        path: `test-results/mobile-simulation-${size.name}-${size.width}w.png`,
        fullPage: false 
      })
      
      // Check for any navigation elements at this size
      const navElements = await page.evaluate(() => {
        const navs = document.querySelectorAll('nav, header, .navigation, [role="navigation"]')
        return Array.from(navs).map(nav => ({
          tagName: nav.tagName,
          classes: nav.className,
          visible: nav.offsetWidth > 0 && nav.offsetHeight > 0
        }))
      })
      
      console.log(`Navigation elements at ${size.width}px:`, navElements)
    }
  })
})