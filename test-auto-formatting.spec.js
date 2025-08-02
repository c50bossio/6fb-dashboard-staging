import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:9999';

test.describe('Auto-Formatting Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the settings page
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForLoadState('networkidle');
  });

  test('Phone number auto-formatting in settings page', async ({ page }) => {
    console.log('Testing phone number auto-formatting...');
    
    // First, we need to click Edit to make the phone field editable
    const editButton = page.locator('text=Edit').first();
    await editButton.click();
    await page.waitForTimeout(500);
    
    // Find the phone input field
    const phoneInput = page.locator('input[type="tel"]').first();
    await expect(phoneInput).toBeVisible();
    
    // Test Case 1: Basic US phone number
    await phoneInput.clear();
    await phoneInput.type('5551234567', { delay: 100 });
    
    // Check if it gets formatted to (555) 123-4567
    let phoneValue = await phoneInput.inputValue();
    console.log('After typing 5551234567:', phoneValue);
    expect(phoneValue).toBe('(555) 123-4567');
    
    // Test Case 2: Phone number with country code
    await phoneInput.clear();
    await phoneInput.type('15551234567', { delay: 100 });
    
    phoneValue = await phoneInput.inputValue();
    console.log('After typing 15551234567:', phoneValue);
    expect(phoneValue).toBe('+1 (555) 123-4567');
    
    // Test Case 3: Partial phone number
    await phoneInput.clear();
    await phoneInput.type('555123', { delay: 100 });
    
    phoneValue = await phoneInput.inputValue();
    console.log('After typing 555123:', phoneValue);
    expect(phoneValue).toBe('(555) 123');
    
    // Test Case 4: International format
    await phoneInput.clear();
    await phoneInput.type('+15551234567', { delay: 100 });
    
    phoneValue = await phoneInput.inputValue();
    console.log('After typing +15551234567:', phoneValue);
    expect(phoneValue).toBe('+1 (555) 123-4567');
    
    // Test validation on blur
    await phoneInput.blur();
    await page.waitForTimeout(500);
    
    // Check for validation feedback
    const validationMessage = page.locator('.text-green-500, .text-red-500').first();
    if (await validationMessage.isVisible()) {
      const validationText = await validationMessage.textContent();
      console.log('Validation message:', validationText);
    }
  });

  test('Email auto-formatting in settings page', async ({ page }) => {
    console.log('Testing email auto-formatting...');
    
    // Click Edit to make the email field editable
    const editButton = page.locator('text=Edit').first();
    await editButton.click();
    await page.waitForTimeout(500);
    
    // Find the email input field
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Test Case 1: Mixed case email
    await emailInput.clear();
    await emailInput.type('TEST@EXAMPLE.COM', { delay: 100 });
    
    let emailValue = await emailInput.inputValue();
    console.log('After typing TEST@EXAMPLE.COM:', emailValue);
    expect(emailValue).toBe('test@example.com');
    
    // Test Case 2: Email with extra @ symbols
    await emailInput.clear();
    await emailInput.type('user@@domain.com', { delay: 100 });
    
    emailValue = await emailInput.inputValue();
    console.log('After typing user@@domain.com:', emailValue);
    expect(emailValue).toBe('user@domain.com');
    
    // Test Case 3: Email with spaces and mixed case
    await emailInput.clear();
    await emailInput.type('  Test.User@Gmail.Com  ', { delay: 100 });
    
    emailValue = await emailInput.inputValue();
    console.log('After typing "  Test.User@Gmail.Com  ":', emailValue);
    expect(emailValue).toBe('test.user@gmail.com');
    
    // Test validation on blur
    await emailInput.blur();
    await page.waitForTimeout(500);
    
    // Check for validation feedback
    const validationMessage = page.locator('.text-green-500, .text-red-500').first();
    if (await validationMessage.isVisible()) {
      const validationText = await validationMessage.textContent();
      console.log('Email validation message:', validationText);
    }
  });

  test('Edge cases and invalid inputs', async ({ page }) => {
    console.log('Testing edge cases and invalid inputs...');
    
    // Click Edit to make fields editable
    const editButton = page.locator('text=Edit').first();
    await editButton.click();
    await page.waitForTimeout(500);
    
    const phoneInput = page.locator('input[type="tel"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    
    // Phone edge cases
    await phoneInput.clear();
    await phoneInput.type('abc123def456', { delay: 50 });
    let phoneValue = await phoneInput.inputValue();
    console.log('Phone with letters (abc123def456):', phoneValue);
    // Should strip letters and format numbers only
    expect(phoneValue).toBe('(123) 456');
    
    // Very long phone number
    await phoneInput.clear();
    await phoneInput.type('123456789012345', { delay: 50 });
    phoneValue = await phoneInput.inputValue();
    console.log('Very long phone number:', phoneValue);
    // Should limit to standard format
    expect(phoneValue).toBe('(123) 456-7890');
    
    // Email edge cases
    await emailInput.clear();
    await emailInput.type('invalid@', { delay: 50 });
    let emailValue = await emailInput.inputValue();
    console.log('Invalid email (invalid@):', emailValue);
    expect(emailValue).toBe('invalid@');
    
    // Email with multiple domains
    await emailInput.clear();
    await emailInput.type('user@domain@extra.com', { delay: 50 });
    emailValue = await emailInput.inputValue();
    console.log('Email with multiple @ symbols:', emailValue);
    expect(emailValue).toBe('user@domainextra.com');
  });

  test('Real-time formatting behavior', async ({ page }) => {
    console.log('Testing real-time formatting behavior...');
    
    // Click Edit to make fields editable
    const editButton = page.locator('text=Edit').first();
    await editButton.click();
    await page.waitForTimeout(500);
    
    const phoneInput = page.locator('input[type="tel"]').first();
    
    // Type digit by digit and check formatting at each step
    await phoneInput.clear();
    
    // Type one digit at a time
    const digits = '5551234567';
    for (let i = 0; i < digits.length; i++) {
      await phoneInput.type(digits[i], { delay: 100 });
      const currentValue = await phoneInput.inputValue();
      console.log(`After typing ${digits.slice(0, i + 1)}: "${currentValue}"`);
      
      // Verify progressive formatting
      if (i === 2) { // After "555"
        expect(currentValue).toBe('555');
      } else if (i === 5) { // After "555123"
        expect(currentValue).toBe('(555) 123');
      } else if (i === 9) { // After "5551234567"
        expect(currentValue).toBe('(555) 123-4567');
      }
    }
  });

  test('Cursor position preservation', async ({ page }) => {
    console.log('Testing cursor position preservation during formatting...');
    
    // Click Edit to make fields editable
    const editButton = page.locator('text=Edit').first();
    await editButton.click();
    await page.waitForTimeout(500);
    
    const phoneInput = page.locator('input[type="tel"]').first();
    
    // Set up a partially formatted number
    await phoneInput.clear();
    await phoneInput.type('5551234567');
    
    // Get current formatted value
    let phoneValue = await phoneInput.inputValue();
    console.log('Initial formatted value:', phoneValue);
    expect(phoneValue).toBe('(555) 123-4567');
    
    // Click in the middle of the number and add a digit
    await phoneInput.click();
    
    // Use keyboard to position cursor and add digit
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    
    // Add a digit in the middle
    await phoneInput.type('8');
    
    phoneValue = await phoneInput.inputValue();
    console.log('After inserting 8 in middle:', phoneValue);
    
    // The formatting should handle the insertion correctly
    // and maintain proper cursor position
  });
});

test.describe('Custom Test Page Auto-Formatting', () => {
  test('Standalone test page functionality', async ({ page }) => {
    console.log('Testing standalone auto-formatting test page...');
    
    // Navigate to our custom test page
    await page.goto(`http://localhost:9999/test-auto-formatting.html`);
    await page.waitForLoadState('networkidle');
    
    // Test phone formatting
    const phoneInput1 = page.locator('#phone-test-1 input').first();
    await phoneInput1.type('5551234567', { delay: 100 });
    
    const result1 = await page.locator('#phone-result-1').textContent();
    console.log('Phone test 1 result:', result1);
    
    // Test international phone
    const phoneInput2 = page.locator('#phone-test-2 input').first();
    await phoneInput2.type('+442079460958', { delay: 100 });
    
    const result2 = await page.locator('#phone-result-2').textContent();
    console.log('International phone test result:', result2);
    
    // Test email formatting
    const emailInput1 = page.locator('#email-test-1 input').first();
    await emailInput1.type('TEST@EXAMPLE.COM', { delay: 100 });
    
    const emailResult1 = await page.locator('#email-result-1').textContent();
    console.log('Email test 1 result:', emailResult1);
    
    // Test currency formatting
    const currencyInput1 = page.locator('#currency-test-1 input').first();
    await currencyInput1.type('123.45', { delay: 100 });
    
    const currencyResult1 = await page.locator('#currency-result-1').textContent();
    console.log('Currency test result:', currencyResult1);
    
    // Test ZIP code formatting
    const zipInput1 = page.locator('#zip-test-1 input').first();
    await zipInput1.type('123456789', { delay: 100 });
    
    const zipResult1 = await page.locator('#zip-result-1').textContent();
    console.log('ZIP code test result:', zipResult1);
  });
});