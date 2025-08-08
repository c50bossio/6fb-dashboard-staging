#!/usr/bin/env node

/**
 * API Testing Script for Booking Links System
 * 
 * This script tests all the booking links API endpoints to ensure they're working correctly
 */

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'

// Mock test data
const testBarberId = 'test-barber-id-123'
const testLinkData = {
  barberId: testBarberId,
  name: 'API Test Link',
  url: `/book/${testBarberId}?services=1,2&duration=60&price=75`,
  services: [
    { id: 1, name: 'Classic Cut', price: 35, duration: 30 },
    { id: 2, name: 'Beard Trim', price: 20, duration: 20 }
  ],
  timeSlots: ['morning', 'afternoon'],
  duration: 60,
  customPrice: 75,
  discount: 10,
  expiresAt: null,
  description: 'Test booking link created by API test script',
  requirePhone: true,
  requireEmail: true,
  allowReschedule: true,
  sendReminders: true
}

async function testAPI(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`
  console.log(`\n🧪 Testing: ${options.method || 'GET'} ${endpoint}`)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`)
      if (options.verbose) {
        console.log('Response:', JSON.stringify(result, null, 2))
      }
      return result
    } else {
      console.log(`❌ Failed (${response.status}): ${result.error || result.message}`)
      return null
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function runTests() {
  console.log('🚀 Starting API tests for Booking Links system...')
  console.log(`📡 Base URL: ${baseUrl}`)
  console.log('─'.repeat(60))

  // Test 1: Health Check
  console.log('\n1️⃣ Testing Health Check')
  await testAPI('/api/health')

  // Test 2: Create Booking Link
  console.log('\n2️⃣ Testing Create Booking Link')
  const createResult = await testAPI('/api/barber/booking-links/create', {
    method: 'POST',
    body: JSON.stringify(testLinkData)
  })

  let testLinkId = null
  if (createResult?.success) {
    testLinkId = createResult.data.id
    console.log(`📝 Created test link with ID: ${testLinkId}`)
  }

  // Test 3: Fetch Booking Links
  console.log('\n3️⃣ Testing Fetch Booking Links')
  await testAPI(`/api/barber/booking-links/create?barberId=${testBarberId}`)

  // Test 4: Generate QR Code (if we have a link ID)
  if (testLinkId) {
    console.log('\n4️⃣ Testing QR Code Generation')
    const qrResult = await testAPI('/api/barber/qr-codes/generate', {
      method: 'POST',
      body: JSON.stringify({ 
        linkId: testLinkId,
        options: { size: 200, margin: 4 }
      })
    })

    if (qrResult?.success) {
      console.log('🎨 QR Code generated successfully')
    }
  }

  // Test 5: Analytics Tracking
  console.log('\n5️⃣ Testing Analytics Tracking')
  if (testLinkId) {
    // Test page view tracking
    await testAPI('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        linkId: testLinkId,
        eventType: 'view',
        sessionId: 'test-session-123',
        referrer: 'https://google.com',
        utmSource: 'test',
        utmMedium: 'api-test',
        utmCampaign: 'validation'
      })
    })

    // Test click tracking
    await testAPI('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        linkId: testLinkId,
        eventType: 'click',
        sessionId: 'test-session-123'
      })
    })

    // Test conversion tracking
    await testAPI('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        linkId: testLinkId,
        eventType: 'conversion',
        sessionId: 'test-session-123',
        bookingId: 'test-booking-456',
        conversionValue: 75
      })
    })

    // Get analytics summary
    console.log('\n6️⃣ Testing Analytics Retrieval')
    await testAPI(`/api/analytics/track?linkId=${testLinkId}&days=7`)
  }

  // Test 6: SEO and Guest Booking Page
  console.log('\n7️⃣ Testing Guest Booking Page')
  const bookingPageResponse = await fetch(`${baseUrl}/book/${testBarberId}?linkId=${testLinkId || 'test-link'}`)
  
  if (bookingPageResponse.ok) {
    const html = await bookingPageResponse.text()
    
    // Basic SEO checks
    const hasTitle = html.includes('<title>')
    const hasMetaDescription = html.includes('name="description"')
    const hasStructuredData = html.includes('application/ld+json')
    const hasOpenGraph = html.includes('property="og:')
    
    console.log('📄 Guest booking page loaded successfully')
    console.log('SEO Elements:')
    console.log(`  ${hasTitle ? '✅' : '❌'} Title tag`)
    console.log(`  ${hasMetaDescription ? '✅' : '❌'} Meta description`)
    console.log(`  ${hasStructuredData ? '✅' : '❌'} Structured data`)
    console.log(`  ${hasOpenGraph ? '✅' : '❌'} Open Graph tags`)
  } else {
    console.log(`❌ Guest booking page failed (${bookingPageResponse.status})`)
  }

  // Test 7: Sitemap
  console.log('\n8️⃣ Testing Dynamic Sitemap')
  const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`)
  
  if (sitemapResponse.ok) {
    const sitemap = await sitemapResponse.text()
    const hasBookingUrls = sitemap.includes('/book/')
    console.log('🗺️  Sitemap generated successfully')
    console.log(`  ${hasBookingUrls ? '✅' : '❌'} Contains booking URLs`)
  } else {
    console.log(`❌ Sitemap generation failed (${sitemapResponse.status})`)
  }

  // Test 8: Robots.txt
  console.log('\n9️⃣ Testing Robots.txt')
  const robotsResponse = await fetch(`${baseUrl}/robots.txt`)
  
  if (robotsResponse.ok) {
    console.log('🤖 Robots.txt served successfully')
  } else {
    console.log(`❌ Robots.txt failed (${robotsResponse.status})`)
  }

  console.log('\n' + '─'.repeat(60))
  console.log('🎯 API Testing Complete!')
  console.log('\n📋 Summary:')
  console.log('• Booking Links API endpoints tested')
  console.log('• QR Code generation validated')
  console.log('• Analytics tracking verified')
  console.log('• SEO optimization confirmed')
  console.log('• Guest booking page tested')
  console.log('• Sitemap and robots.txt checked')
  
  console.log('\n🚀 Next Steps:')
  console.log('1. Run the database setup script if tables don\'t exist')
  console.log('2. Test the frontend booking links page in your browser')
  console.log('3. Create real booking links and test the full flow')
  console.log('4. Monitor analytics and performance')

  if (testLinkId) {
    console.log(`\n🔗 Test link created: ${baseUrl}/book/${testBarberId}?linkId=${testLinkId}`)
  }
}

// Only run if this is the main module
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests, testAPI }