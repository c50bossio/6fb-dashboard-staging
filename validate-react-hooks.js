// AddStaffModal Focus Behavior Validation Script
// Run this in the browser console when the AddStaffModal is open

/**
 * Comprehensive validation script for AddStaffModal focus behavior
 * Tests the fixes for the input field focus loss issue
 */

class FocusValidator {
  constructor() {
    this.results = {
      basicInfoFields: {},
      sectionToggling: {},
      conditionalFields: {},
      performance: {},
      overallStatus: 'pending'
    };
    this.testStartTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    
  }

  // Test 1: Basic Information Fields Focus Behavior
  async testBasicInfoFields() {
    this.log('Starting Basic Information Fields Test...', 'info');
    
    const fields = [
      { selector: 'input[placeholder="Enter full name"]', name: 'Full Name', testText: 'John Michael Smith' },
      { selector: 'input[placeholder="barber@example.com"]', name: 'Email', testText: 'john.smith@example.com' },
      { selector: 'input[placeholder="(555) 123-4567"]', name: 'Phone', testText: '555-123-4567' }
    ];

    for (const field of fields) {
      const element = document.querySelector(field.selector);
      if (!element) {
        this.log(`${field.name} field not found - check if modal is open`, 'error');
        this.results.basicInfoFields[field.name] = { status: 'not_found' };
        continue;
      }

      // Clear field and focus
      element.value = '';
      element.focus();
      
      const initialFocus = document.activeElement === element;
      if (!initialFocus) {
        this.log(`${field.name} field could not be focused`, 'error');
        this.results.basicInfoFields[field.name] = { status: 'focus_failed' };
        continue;
      }

      // Simulate continuous typing
      let focusLost = false;
      for (let i = 0; i < field.testText.length; i++) {
        const char = field.testText[i];
        
        // Simulate typing one character at a time
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Check if focus is still maintained
        if (document.activeElement !== element) {
          focusLost = true;
          this.log(`${field.name} lost focus after typing "${element.value}"`, 'error');
          break;
        }
        
        // Small delay to simulate real typing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const finalFocus = document.activeElement === element;
      const result = {
        status: focusLost ? 'focus_lost' : 'success',
        focusLostAt: focusLost ? element.value : null,
        finalValue: element.value,
        finalFocus: finalFocus
      };

      this.results.basicInfoFields[field.name] = result;
      this.log(`${field.name}: ${result.status}`, result.status === 'success' ? 'success' : 'error');
    }
  }

  // Test 2: Section Toggling While Typing
  async testSectionToggling() {
    this.log('Starting Section Toggling Test...', 'info');
    
    // Find a collapsible section
    const sectionButton = document.querySelector('button:contains("Legal & Compliance")') || 
                         document.querySelector('[class*="FormSection"] button');
    
    if (!sectionButton) {
      this.log('No collapsible sections found', 'error');
      this.results.sectionToggling = { status: 'no_sections_found' };
      return;
    }

    // Find an input field to test with
    const testInput = document.querySelector('input[placeholder="Enter full name"]');
    if (!testInput) {
      this.log('Test input field not found', 'error');
      this.results.sectionToggling = { status: 'no_test_field' };
      return;
    }

    testInput.focus();
    testInput.value = '';
    
    // Start typing
    const testText = 'Testing while toggling';
    let focusLostDuringToggle = false;
    
    for (let i = 0; i < testText.length; i++) {
      testInput.value += testText[i];
      testInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Toggle section mid-typing
      if (i === Math.floor(testText.length / 2)) {
        sectionButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (document.activeElement !== testInput) {
          focusLostDuringToggle = true;
          this.log('Focus lost during section toggle', 'error');
          break;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.results.sectionToggling = {
      status: focusLostDuringToggle ? 'focus_lost_on_toggle' : 'success',
      finalValue: testInput.value
    };
    
    this.log(`Section Toggling: ${this.results.sectionToggling.status}`, 
             this.results.sectionToggling.status === 'success' ? 'success' : 'error');
  }

  // Test 3: Performance and Re-render Analysis
  testPerformance() {
    this.log('Starting Performance Analysis...', 'info');
    
    const performanceEntries = performance.getEntriesByType('measure');
    const reactRenderEntries = performanceEntries.filter(entry => 
      entry.name.includes('React') || entry.name.includes('render')
    );

    // Check for React DevTools if available
    const hasReactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
    
    this.results.performance = {
      reactDevToolsAvailable: hasReactDevTools,
      renderMeasures: reactRenderEntries.length,
      testDuration: Date.now() - this.testStartTime,
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : 'not_available'
    };

    this.log(`Performance analysis complete - ${reactRenderEntries.length} render measures found`, 'info');
  }

  // Test 4: React Warnings Detection
  testReactWarnings() {
    this.log('Checking for React warnings...', 'info');
    
    // Override console.warn temporarily to catch React warnings
    const originalWarn = console.warn;
    const reactWarnings = [];
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('React') || message.includes('useEffect') || message.includes('dependency')) {
        reactWarnings.push(message);
      }
      originalWarn.apply(console, args);
    };

    // Simulate some interactions to trigger potential warnings
    const nameField = document.querySelector('input[placeholder="Enter full name"]');
    if (nameField) {
      nameField.focus();
      nameField.value = 'Test';
      nameField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Restore original console.warn
    setTimeout(() => {
      console.warn = originalWarn;
      this.results.reactWarnings = {
        count: reactWarnings.length,
        warnings: reactWarnings
      };
      
      if (reactWarnings.length > 0) {
        this.log(`Found ${reactWarnings.length} React warnings`, 'error');
        reactWarnings.forEach(warning => this.log(warning, 'error'));
      } else {
        this.log('No React warnings detected', 'success');
      }
    }, 1000);
  }

  // Test 5: Tab Navigation
  async testTabNavigation() {
    this.log('Testing tab navigation...', 'info');
    
    const focusableElements = document.querySelectorAll(
      'input, select, textarea, button:not([disabled])'
    );
    
    if (focusableElements.length < 2) {
      this.log('Not enough focusable elements for tab test', 'error');
      this.results.tabNavigation = { status: 'insufficient_elements' };
      return;
    }

    let tabNavigationWorks = true;
    
    // Test tab navigation between first few elements
    for (let i = 0; i < Math.min(3, focusableElements.length - 1); i++) {
      const currentElement = focusableElements[i];
      currentElement.focus();
      
      // Simulate Tab key press
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        bubbles: true
      });
      
      currentElement.dispatchEvent(tabEvent);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if focus moved to next element (or stayed if tab is prevented)
      const focusedElement = document.activeElement;
      const expectedNext = focusableElements[i + 1];
      
      if (focusedElement !== expectedNext && focusedElement !== currentElement) {
        this.log(`Tab navigation unexpected at element ${i}`, 'error');
        tabNavigationWorks = false;
        break;
      }
    }

    this.results.tabNavigation = {
      status: tabNavigationWorks ? 'success' : 'failed',
      focusableElementsCount: focusableElements.length
    };
    
    this.log(`Tab Navigation: ${this.results.tabNavigation.status}`, 
             this.results.tabNavigation.status === 'success' ? 'success' : 'error');
  }

  // Generate comprehensive report
  generateReport() {
    this.log('Generating comprehensive test report...', 'info');
    
    const allTests = [
      this.results.basicInfoFields,
      this.results.sectionToggling,
      this.results.tabNavigation
    ];

    const passedTests = allTests.filter(test => {
      if (typeof test === 'object' && test.status) {
        return test.status === 'success';
      }
      return Object.values(test).every(result => result.status === 'success');
    }).length;

    const totalTests = allTests.length;
    this.results.overallStatus = passedTests === totalTests ? 'all_passed' : 
                                passedTests > totalTests / 2 ? 'mostly_passed' : 'mostly_failed';

    console.group('🧪 AddStaffModal Focus Behavior Test Results');

    console.groupEnd();

    // Return summary for external use
    return {
      passed: passedTests,
      total: totalTests,
      status: this.results.overallStatus,
      details: this.results
    };
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting AddStaffModal Focus Behavior Validation', 'info');
    
    // Check if modal is open
    const modal = document.querySelector('[class*="Modal"]') || 
                 document.querySelector('[role="dialog"]');
    
    if (!modal) {
      this.log('AddStaffModal not found - please open the modal first', 'error');
      return { error: 'Modal not found' };
    }

    try {
      await this.testBasicInfoFields();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.testSectionToggling();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.testTabNavigation();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.testPerformance();
      this.testReactWarnings();
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return this.generateReport();
    } catch (error) {
      this.log(`Test execution error: ${error.message}`, 'error');
      return { error: error.message };
    }
  }
}

// Quick validation function
function quickFocusTest() {

  const nameField = document.querySelector('input[placeholder="Enter full name"]');
  if (!nameField) {
    
    return false;
  }

  nameField.focus();
  const testText = 'Quick Test';
  let success = true;

  for (let char of testText) {
    nameField.value += char;
    nameField.dispatchEvent(new Event('input', { bubbles: true }));
    
    if (document.activeElement !== nameField) {
      
      success = false;
      break;
    }
  }

  return success;
}

// Export for use
window.FocusValidator = FocusValidator;
window.quickFocusTest = quickFocusTest;

3. Run full test suite: 
   const validator = new FocusValidator();
   validator.runAllTests().then(result => );

The validator will test:
- Basic input field focus behavior
- Section toggling during typing  
- Tab navigation
- Performance analysis
- React warnings detection
`);