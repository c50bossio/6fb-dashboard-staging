// Direct test of the formatting functions
// This will test the core formatting logic without the UI

// Import the formatters (we'll simulate the ES6 imports)
const fs = require('fs');
const path = require('path');

// Read the formatters file and extract the functions
const formattersPath = path.join(__dirname, 'lib', 'formatters.js');

console.log('🧪 Testing Auto-Formatting Functions Directly\n');
console.log('='.repeat(50));

// Simulate the formatting functions (copied from the actual implementation)

function formatPhoneNumber(value) {
  if (!value) return value
  
  const phoneNumber = value.replace(/[^\d]/g, '')
  const phoneNumberLength = phoneNumber.length
  
  if (phoneNumberLength < 4) return phoneNumber
  
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  }
  
  if (phoneNumberLength <= 10) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }
  
  if (phoneNumberLength === 11 && phoneNumber.startsWith('1')) {
    return `+1 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`
  }
  
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
}

function formatInternationalPhone(value) {
  if (!value) return value
  
  let cleaned = value.replace(/[^\d+]/g, '')
  
  if (cleaned.startsWith('+1')) {
    const digits = cleaned.slice(2)
    if (digits.length >= 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 6) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length >= 3) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return `+1 ${digits}`
    }
  }
  
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.slice(0, cleaned.length >= 3 ? 3 : cleaned.length)
    const remainder = cleaned.slice(countryCode.length)
    
    if (remainder.length > 6) {
      return `${countryCode} ${remainder.slice(0, 3)} ${remainder.slice(3, 6)} ${remainder.slice(6)}`
    } else if (remainder.length > 3) {
      return `${countryCode} ${remainder.slice(0, 3)} ${remainder.slice(3)}`
    } else {
      return `${countryCode} ${remainder}`
    }
  }
  
  return cleaned
}

function formatEmail(value) {
  if (!value) return value
  
  let formatted = value.toLowerCase().trim()
  
  const atIndex = formatted.indexOf('@')
  if (atIndex !== -1) {
    const beforeAt = formatted.slice(0, atIndex)
    const afterAt = formatted.slice(atIndex + 1).replace(/@/g, '')
    formatted = beforeAt + '@' + afterAt
  }
  
  return formatted
}

function formatCurrency(value) {
  if (!value) return value
  
  const numericValue = value.replace(/[^\d.]/g, '')
  
  const parts = numericValue.split('.')
  if (parts.length > 2) {
    const formatted = parts[0] + '.' + parts.slice(1).join('')
    return '$' + formatted
  }
  
  if (parts[1] && parts[1].length > 2) {
    parts[1] = parts[1].slice(0, 2)
  }
  
  const result = parts.join('.')
  return result ? '$' + result : ''
}

function formatZipCode(value) {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d]/g, '')
  
  if (cleaned.length <= 5) {
    return cleaned
  } else if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
  }
  
  return cleaned.slice(0, 9)
}

function formatCreditCard(value) {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d]/g, '')
  const groups = cleaned.match(/.{1,4}/g) || []
  
  return groups.join(' ').substr(0, 19) // Max 16 digits with spaces
}

function formatSSN(value) {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d]/g, '')
  
  if (cleaned.length <= 3) {
    return cleaned
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`
  }
}

function formatTime12Hour(value) {
  if (!value) return value
  
  const digits = value.replace(/[^\d]/g, '')
  
  if (digits.length <= 2) {
    return digits
  } else if (digits.length <= 4) {
    const hours = digits.slice(0, 2)
    const minutes = digits.slice(2)
    return `${hours}:${minutes}`
  }
  
  return digits.slice(0, 4)
}

// Test functions
function runTest(testName, formatter, testCases) {
  console.log(`\n📞 ${testName} Tests:`);
  console.log('-'.repeat(30));
  
  testCases.forEach(({ input, expected, description }) => {
    const result = formatter(input);
    const passed = result === expected;
    const status = passed ? '✅' : '❌';
    
    console.log(`${status} ${description}`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Output:   "${result}"`);
    console.log(`   Expected: "${expected}"`);
    if (!passed) {
      console.log(`   ❌ FAILED: Expected "${expected}", got "${result}"`);
    }
    console.log('');
  });
}

// Phone Number Tests
runTest('Phone Number Formatting', formatPhoneNumber, [
  { input: '5551234567', expected: '(555) 123-4567', description: 'Basic US phone number' },
  { input: '15551234567', expected: '+1 (555) 123-4567', description: 'US phone with country code' },
  { input: '555123', expected: '(555) 123', description: 'Partial phone number' },
  { input: '555', expected: '555', description: 'Very short number' },
  { input: 'abc555def123ghi4567', expected: '(555) 123-4567', description: 'Phone with letters' },
  { input: '123456789012345', expected: '(123) 456-7890', description: 'Very long number' }
]);

// International Phone Tests
runTest('International Phone Formatting', formatInternationalPhone, [
  { input: '+15551234567', expected: '+1 (555) 123-4567', description: 'US international format' },
  { input: '+44 20 7946 0958', expected: '+44 207 946 0958', description: 'UK phone number' },
  { input: '+33142868326', expected: '+33 142 868 326', description: 'French phone number' },
  { input: '+1555123', expected: '+1 (555) 123', description: 'Partial international' }
]);

// Email Tests
runTest('Email Formatting', formatEmail, [
  { input: 'TEST@EXAMPLE.COM', expected: 'test@example.com', description: 'Uppercase to lowercase' },
  { input: '  Test.User@Gmail.Com  ', expected: 'test.user@gmail.com', description: 'Mixed case with spaces' },
  { input: 'user@@domain.com', expected: 'user@domain.com', description: 'Multiple @ symbols' },
  { input: 'valid@email.co.uk', expected: 'valid@email.co.uk', description: 'Valid complex email' },
  { input: 'user@domain@extra.com', expected: 'user@domainextra.com', description: 'Multiple domains' }
]);

// Currency Tests
runTest('Currency Formatting', formatCurrency, [
  { input: '123.45', expected: '$123.45', description: 'Basic currency' },
  { input: '1000', expected: '$1000', description: 'Whole number' },
  { input: '50.678', expected: '$50.67', description: 'More than 2 decimals' },
  { input: 'abc123.45def', expected: '$123.45', description: 'Currency with letters' },
  { input: '1.2.3.4', expected: '$1.234', description: 'Multiple decimal points' }
]);

// ZIP Code Tests
runTest('ZIP Code Formatting', formatZipCode, [
  { input: '12345', expected: '12345', description: 'Basic 5-digit ZIP' },
  { input: '123456789', expected: '12345-6789', description: 'Extended ZIP+4' },
  { input: 'abc12345def', expected: '12345', description: 'ZIP with letters' },
  { input: '90210', expected: '90210', description: 'Famous ZIP code' },
  { input: '123456789012', expected: '123456789', description: 'Too many digits' }
]);

// Credit Card Tests
runTest('Credit Card Formatting', formatCreditCard, [
  { input: '1234567890123456', expected: '1234 5678 9012 3456', description: 'Full credit card' },
  { input: '4111111111111111', expected: '4111 1111 1111 1111', description: 'Visa test number' },
  { input: '12345', expected: '1234 5', description: 'Partial card number' },
  { input: 'abc1234def5678ghi', expected: '1234 5678', description: 'Card with letters' }
]);

// SSN Tests
runTest('SSN Formatting', formatSSN, [
  { input: '123456789', expected: '123-45-6789', description: 'Full SSN' },
  { input: '12345', expected: '123-45', description: 'Partial SSN' },
  { input: '123', expected: '123', description: 'Very short SSN' },
  { input: 'abc123def45ghi6789', expected: '123-45-6789', description: 'SSN with letters' }
]);

// Time Tests
runTest('Time Formatting', formatTime12Hour, [
  { input: '1230', expected: '12:30', description: 'Basic time' },
  { input: '9', expected: '9', description: 'Single digit' },
  { input: '930', expected: '9:30', description: 'Three digits' },
  { input: 'abc1245def', expected: '12:45', description: 'Time with letters' }
]);

console.log('\n' + '='.repeat(50));
console.log('🏁 Auto-Formatting Tests Complete');
console.log('\n💡 Test Summary:');
console.log('• Phone numbers: US and international formatting');
console.log('• Email addresses: lowercase conversion and cleanup');
console.log('• Currency: dollar sign prefix and decimal handling');
console.log('• ZIP codes: 5-digit and ZIP+4 formatting');
console.log('• Credit cards: 4-digit grouping with spaces');
console.log('• SSN: XXX-XX-XXXX formatting');
console.log('• Time: 12-hour format with colon separator');
console.log('\n🚦 Next Steps:');
console.log('1. Check the settings page at http://localhost:9999/dashboard/settings');
console.log('2. Click "Edit" on the Barbershop Information section');
console.log('3. Test phone and email formatting in the nuclear inputs');
console.log('4. Verify real-time formatting and validation feedback');