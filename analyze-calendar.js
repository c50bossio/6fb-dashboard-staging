const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:9999/dashboard/calendar');
  await page.waitForTimeout(3000);
  
  const analysis = await page.evaluate(() => {
    const results = {
      hasCalendar: false,
      calendarLibrary: null,
      viewType: null,
      resources: [],
      events: [],
      issues: [],
      dimensions: {},
      elements: {}
    };
    
    const fcElement = document.querySelector('.fc');
    if (fcElement) {
      results.hasCalendar = true;
      results.calendarLibrary = 'FullCalendar';
      
      const viewTitle = document.querySelector('.fc-toolbar-title');
      results.viewType = viewTitle ? viewTitle.textContent : 'Unknown';
      
      const calendarContainer = document.querySelector('.calendar-container');
      if (calendarContainer) {
        const rect = calendarContainer.getBoundingClientRect();
        results.dimensions = {
          width: rect.width,
          height: rect.height
        };
      }
      
      const resourceHeaders = document.querySelectorAll('.fc-col-header-cell-cushion');
      resourceHeaders.forEach(header => {
        const text = header.textContent.trim();
        if (text && !text.includes('2024') && !text.includes('2025')) {
          results.resources.push(text);
        }
      });
      
      const events = document.querySelectorAll('.fc-event');
      results.events = Array.from(events).map(event => ({
        title: event.textContent,
        visible: event.offsetHeight > 0
      }));
      
      const scrollers = document.querySelectorAll('.fc-scroller');
      scrollers.forEach(scroller => {
        if (scroller.scrollHeight > scroller.clientHeight + 10) {
          results.issues.push('Scroller overflow detected');
        }
      });
      
      const allDaySection = document.querySelector('.fc-daygrid-body');
      if (allDaySection) {
        const height = allDaySection.offsetHeight;
        if (height > 100) {
          results.issues.push(`All-day section too tall: ${height}px`);
        }
      }
      
      const timeSlots = document.querySelectorAll('.fc-timegrid-slot');
      const visibleSlots = Array.from(timeSlots).filter(slot => slot.offsetHeight > 0);
      results.elements.totalTimeSlots = timeSlots.length;
      results.elements.visibleTimeSlots = visibleSlots.length;
      
      const styles = window.getComputedStyle(fcElement);
      if (styles.height === 'auto' || styles.height === '0px') {
        results.issues.push('Calendar height issue detected');
      }
    }
    
    return results;
  });
  
  console.log('Calendar Analysis Results:');
  console.log(JSON.stringify(analysis, null, 2));
  
  await page.screenshot({ path: 'calendar-full-page.png', fullPage: true });
  
  const viewButtons = await page.$$('.fc-button-group button');
  for (let i = 0; i < Math.min(viewButtons.length, 3); i++) {
    await viewButtons[i].click();
    await page.waitForTimeout(1000);
    const viewName = await page.evaluate(() => {
      const activeButton = document.querySelector('.fc-button-active');
      return activeButton ? activeButton.textContent : 'unknown';
    });
    await page.screenshot({ path: `calendar-view-${viewName}.png` });
  }
  
  await browser.close();
})();