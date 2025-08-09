const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Slow down actions so we can see what's happening
  });
  
  const page = await browser.newPage();
  
  console.log('📅 Testing Calendar System...\n');
  
  // Navigate to the calendar page
  await page.goto('http://localhost:9999/dashboard/calendar');
  
  // Wait for FullCalendar to load properly
  console.log('⏳ Waiting for FullCalendar to initialize...');
  await page.waitForSelector('.fc', { timeout: 10000 });
  await page.waitForTimeout(3000); // Extra time for resources to load
  
  // Take initial screenshot
  await page.screenshot({ path: 'calendar-initial.png', fullPage: true });
  console.log('✅ Initial calendar loaded');
  
  // Check if calendar is visible
  const calendarVisible = await page.isVisible('.fc');
  console.log(`Calendar visible: ${calendarVisible}`);
  
  // Get current view
  const currentView = await page.textContent('.fc-toolbar-title');
  console.log(`Current date: ${currentView}`);
  
  // Check what buttons are available
  console.log('\n🔍 Checking available toolbar buttons...');
  const toolbarButtons = await page.$$eval('.fc-toolbar button', buttons => 
    buttons.map(btn => btn.textContent.trim())
  );
  console.log('Available buttons:', toolbarButtons.join(', '));
  
  // Test Week view button - try different selectors
  console.log('\n🔄 Testing Week View...');
  try {
    // Try multiple selectors for week button
    const weekSelectors = [
      'button.fc-resourceTimelineWeek-button',
      'button:has-text("week")',
      '.fc-toolbar button:has-text("week")',
      'button[title*="week"]'
    ];
    
    let weekClicked = false;
    for (const selector of weekSelectors) {
      if (await page.isVisible(selector)) {
        await page.click(selector);
        weekClicked = true;
        console.log(`✅ Week view clicked using selector: ${selector}`);
        break;
      }
    }
    
    if (!weekClicked) {
      console.log('❌ Week button not found with any selector');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'calendar-week-view.png', fullPage: true });
  } catch (error) {
    console.log('❌ Error clicking week button:', error.message);
  }
  
  // Test Day view button - try different selectors
  console.log('\n🔄 Testing Day View...');
  try {
    const daySelectors = [
      'button.fc-resourceTimelineDay-button',
      'button:has-text("day")',
      '.fc-toolbar button:has-text("day")',
      'button[title*="day"]'
    ];
    
    let dayClicked = false;
    for (const selector of daySelectors) {
      if (await page.isVisible(selector)) {
        await page.click(selector);
        dayClicked = true;
        console.log(`✅ Day view clicked using selector: ${selector}`);
        break;
      }
    }
    
    if (!dayClicked) {
      console.log('❌ Day button not found with any selector');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'calendar-day-view.png', fullPage: true });
  } catch (error) {
    console.log('❌ Error clicking day button:', error.message);
  }
  
  // Test Month view button
  console.log('\n🔄 Testing Month View...');
  const monthBtn = await page.locator('button:has-text("month")').first();
  if (await monthBtn.isVisible()) {
    await monthBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'calendar-month-view.png', fullPage: true });
    console.log('✅ Month view clicked');
  } else {
    console.log('❌ Month button not found');
  }
  
  // Test List view button
  console.log('\n🔄 Testing List View...');
  const listBtn = await page.locator('button:has-text("list")').first();
  if (await listBtn.isVisible()) {
    await listBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'calendar-list-view.png', fullPage: true });
    console.log('✅ List view clicked');
  } else {
    console.log('❌ List button not found');
  }
  
  // Check for barber resources
  console.log('\n🔍 Checking for Resources...');
  const resources = await page.locator('.fc-resource-cell').count();
  console.log(`Found ${resources} resource cells`);
  
  // Try to get resource names
  try {
    const resourceNames = await page.$$eval('.fc-resource-cell', cells => 
      cells.map(cell => cell.textContent.trim())
    );
    if (resourceNames.length > 0) {
      console.log('Resource names:', resourceNames.join(', '));
    }
  } catch (e) {
    console.log('Could not read resource names');
  }
  
  // Check for any appointments/events
  const events = await page.locator('.fc-event').count();
  console.log(`Found ${events} events`);
  
  // Check for grid lines and slots
  const gridLines = await page.locator('.fc-timegrid-slot').count();
  const timelineSlots = await page.locator('.fc-timeline-slot').count();
  console.log(`Found ${gridLines} time grid slots`);
  console.log(`Found ${timelineSlots} timeline slots`);
  
  // Check the calendar's current view type
  const currentViewType = await page.evaluate(() => {
    const calendar = document.querySelector('.fc');
    if (calendar) {
      const classList = Array.from(calendar.classList);
      const viewClass = classList.find(cls => cls.includes('fc-view-'));
      return viewClass || 'unknown';
    }
    return 'no calendar found';
  });
  console.log(`Current view type: ${currentViewType}`);
  
  // Test navigation buttons
  console.log('\n🔄 Testing Navigation...');
  const prevBtn = await page.locator('.fc-prev-button').first();
  if (await prevBtn.isVisible()) {
    await prevBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Previous button clicked');
  }
  
  const nextBtn = await page.locator('.fc-next-button').first();
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Next button clicked');
  }
  
  const todayBtn = await page.locator('.fc-today-button').first();
  if (await todayBtn.isVisible()) {
    await todayBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Today button clicked');
  }
  
  // Check for any console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  // Final screenshot
  await page.screenshot({ path: 'calendar-final-test.png', fullPage: true });
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`Calendar loaded: ${calendarVisible}`);
  console.log(`Resources found: ${resources}`);
  console.log(`Events found: ${events}`);
  console.log(`Grid slots: ${gridLines}`);
  
  // Keep browser open for manual inspection
  console.log('\n👀 Browser will stay open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('\n✅ Test completed!');
})();