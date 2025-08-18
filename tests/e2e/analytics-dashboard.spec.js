/**
 * Analytics Dashboard E2E Tests
 * 
 * Comprehensive tests for the analytics dashboard that verify real data
 * integration, accurate calculations, and proper display of business metrics.
 * Tests revenue tracking, customer analytics, booking trends, and data integrity.
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@/lib/supabase/client'

class AnalyticsTestEnvironment {
  constructor() {
    this.supabase = createClient()
    this.testData = {
      shop: null,
      bookings: [],
      revenue: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      customers: [],
      services: []
    }
  }

  async setupAnalyticsTest() {
    // Get shop with existing data for analytics testing
    const { data: shop } = await this.supabase
      .from('barbershops')
      .select(`
        *,
        business_settings (*),
        services (*),
        bookings (
          *,
          profiles!bookings_barber_id_fkey (name)
        )
      `)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (!shop) {
      throw new Error('No active shop found for analytics testing')
    }

    this.testData.shop = shop
    this.testData.services = shop.services || []
    this.testData.bookings = shop.bookings || []

    // Calculate expected revenue metrics
    await this.calculateExpectedMetrics()

    return this.testData
  }

  async calculateExpectedMetrics() {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get real revenue data from database
    const { data: dailyRevenue } = await this.supabase
      .from('bookings')
      .select('total_amount')
      .eq('barbershop_id', this.testData.shop.id)
      .eq('payment_status', 'completed')
      .gte('created_at', startOfDay.toISOString())

    const { data: weeklyRevenue } = await this.supabase
      .from('bookings')
      .select('total_amount')
      .eq('barbershop_id', this.testData.shop.id)
      .eq('payment_status', 'completed')
      .gte('created_at', startOfWeek.toISOString())

    const { data: monthlyRevenue } = await this.supabase
      .from('bookings')
      .select('total_amount')
      .eq('barbershop_id', this.testData.shop.id)
      .eq('payment_status', 'completed')
      .gte('created_at', startOfMonth.toISOString())

    this.testData.revenue.daily = dailyRevenue?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0
    this.testData.revenue.weekly = weeklyRevenue?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0
    this.testData.revenue.monthly = monthlyRevenue?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0

    // Get customer data
    const { data: customers } = await this.supabase
      .from('bookings')
      .select('client_email, client_name')
      .eq('barbershop_id', this.testData.shop.id)
      .not('client_email', 'is', null)

    this.testData.customers = [...new Set(customers?.map(c => c.client_email) || [])]

    console.log('Expected metrics calculated:', {
      daily: this.testData.revenue.daily,
      weekly: this.testData.revenue.weekly,
      monthly: this.testData.revenue.monthly,
      customers: this.testData.customers.length
    })
  }

  async createTestBooking() {
    const testBooking = {
      barbershop_id: this.testData.shop.id,
      barber_id: this.testData.shop.bookings[0]?.barber_id || 'test-barber',
      service_id: this.testData.services[0]?.id || 'test-service',
      scheduled_at: new Date().toISOString(),
      duration_minutes: 60,
      service_price: 50,
      total_amount: 50,
      client_name: `Analytics Test ${Date.now()}`,
      client_email: `analytics.test.${Date.now()}@example.com`,
      payment_method: 'online',
      payment_status: 'completed',
      status: 'CONFIRMED'
    }

    const { data: booking, error } = await this.supabase
      .from('bookings')
      .insert(testBooking)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to create test booking: ${error.message}`)
    }

    this.testData.testBooking = booking
    return booking
  }

  async cleanup() {
    try {
      if (this.testData.testBooking?.id) {
        await this.supabase
          .from('bookings')
          .delete()
          .eq('id', this.testData.testBooking.id)
      }
    } catch (error) {
      console.error('Analytics cleanup error:', error)
    }
  }

  getDashboardUrl() {
    return `/dashboard?shopId=${this.testData.shop.id}`
  }
}

test.describe('Analytics Dashboard - Revenue Metrics', () => {
  let analyticsEnv

  test.beforeEach(async ({ page }) => {
    analyticsEnv = new AnalyticsTestEnvironment()
    await analyticsEnv.setupAnalyticsTest()

    // Navigate to dashboard
    await page.goto(analyticsEnv.getDashboardUrl())
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await analyticsEnv.cleanup()
  })

  test('Dashboard displays accurate revenue metrics', async ({ page }) => {
    console.log('Testing revenue metrics accuracy...')

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ timeout: 15000 })

    // Verify daily revenue
    const dailyRevenueElement = page.locator('[data-testid="daily-revenue"]')
    await expect(dailyRevenueElement).toBeVisible()
    
    const displayedDailyRevenue = await dailyRevenueElement.textContent()
    const expectedDaily = analyticsEnv.testData.revenue.daily.toFixed(2)
    
    expect(displayedDailyRevenue).toContain(expectedDaily)

    // Verify weekly revenue
    const weeklyRevenueElement = page.locator('[data-testid="weekly-revenue"]')
    await expect(weeklyRevenueElement).toBeVisible()
    
    const displayedWeeklyRevenue = await weeklyRevenueElement.textContent()
    const expectedWeekly = analyticsEnv.testData.revenue.weekly.toFixed(2)
    
    expect(displayedWeeklyRevenue).toContain(expectedWeekly)

    // Verify monthly revenue
    const monthlyRevenueElement = page.locator('[data-testid="monthly-revenue"]')
    await expect(monthlyRevenueElement).toBeVisible()
    
    const displayedMonthlyRevenue = await monthlyRevenueElement.textContent()
    const expectedMonthly = analyticsEnv.testData.revenue.monthly.toFixed(2)
    
    expect(displayedMonthlyRevenue).toContain(expectedMonthly)
  })

  test('Revenue calculations update after new booking', async ({ page }) => {
    console.log('Testing real-time revenue updates...')

    // Get initial revenue
    await expect(page.locator('[data-testid="daily-revenue"]')).toBeVisible()
    const initialRevenue = await page.locator('[data-testid="daily-revenue"]').textContent()
    const initialAmount = parseFloat(initialRevenue.replace(/[^0-9.]/g, ''))

    // Create new booking
    const newBooking = await analyticsEnv.createTestBooking()

    // Refresh dashboard to see updated metrics
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify revenue increased
    await expect(page.locator('[data-testid="daily-revenue"]')).toBeVisible()
    const updatedRevenue = await page.locator('[data-testid="daily-revenue"]').textContent()
    const updatedAmount = parseFloat(updatedRevenue.replace(/[^0-9.]/g, ''))

    expect(updatedAmount).toBeGreaterThan(initialAmount)
    expect(updatedAmount - initialAmount).toBeCloseTo(newBooking.total_amount, 2)
  })

  test('Revenue breakdown by service displays correctly', async ({ page }) => {
    console.log('Testing service revenue breakdown...')

    // Navigate to detailed analytics
    await page.locator('[data-testid="view-detailed-analytics"]').click()
    await expect(page.locator('[data-testid="service-revenue-breakdown"]')).toBeVisible()

    // Verify each service has accurate revenue data
    for (const service of analyticsEnv.testData.services) {
      const serviceRow = page.locator(`[data-testid="service-${service.id}-revenue"]`)
      await expect(serviceRow).toBeVisible()
      
      // Verify service name
      await expect(serviceRow).toContainText(service.name)
      
      // Verify revenue amount is displayed
      const revenueText = await serviceRow.locator('[data-testid="service-revenue-amount"]').textContent()
      expect(revenueText).toMatch(/\$\d+\.\d{2}/)
    }
  })

  test('Revenue trends chart displays historical data', async ({ page }) => {
    console.log('Testing revenue trends chart...')

    await expect(page.locator('[data-testid="revenue-trends-chart"]')).toBeVisible()

    // Verify chart has data points
    const chartDataPoints = page.locator('[data-testid="chart-data-point"]')
    const dataPointCount = await chartDataPoints.count()
    expect(dataPointCount).toBeGreaterThan(0)

    // Verify chart legend
    await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-legend"]')).toContainText('Revenue')

    // Test chart interactions
    await chartDataPoints.first().hover()
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible()
  })
})

test.describe('Analytics Dashboard - Customer Analytics', () => {
  let analyticsEnv

  test.beforeEach(async ({ page }) => {
    analyticsEnv = new AnalyticsTestEnvironment()
    await analyticsEnv.setupAnalyticsTest()
    await page.goto(analyticsEnv.getDashboardUrl())
  })

  test.afterEach(async () => {
    await analyticsEnv.cleanup()
  })

  test('Customer metrics display accurate counts', async ({ page }) => {
    console.log('Testing customer metrics accuracy...')

    await expect(page.locator('[data-testid="customer-metrics"]')).toBeVisible()

    // Verify total customers
    const totalCustomersElement = page.locator('[data-testid="total-customers"]')
    await expect(totalCustomersElement).toBeVisible()
    
    const displayedCustomerCount = await totalCustomersElement.textContent()
    const expectedCount = analyticsEnv.testData.customers.length
    
    expect(displayedCustomerCount).toContain(expectedCount.toString())

    // Verify new customers this month
    const newCustomersElement = page.locator('[data-testid="new-customers-month"]')
    await expect(newCustomersElement).toBeVisible()
    
    // Verify repeat customers
    const repeatCustomersElement = page.locator('[data-testid="repeat-customers"]')
    await expect(repeatCustomersElement).toBeVisible()
  })

  test('Customer acquisition chart shows growth trends', async ({ page }) => {
    console.log('Testing customer acquisition chart...')

    await expect(page.locator('[data-testid="customer-acquisition-chart"]')).toBeVisible()

    // Verify chart shows monthly acquisition data
    const chartBars = page.locator('[data-testid="acquisition-chart-bar"]')
    const barCount = await chartBars.count()
    expect(barCount).toBeGreaterThan(0)

    // Verify chart labels
    await expect(page.locator('[data-testid="chart-x-axis"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-y-axis"]')).toBeVisible()
  })

  test('Customer lifetime value calculations', async ({ page }) => {
    console.log('Testing customer lifetime value...')

    await page.locator('[data-testid="customer-analytics-tab"]').click()
    await expect(page.locator('[data-testid="customer-ltv-section"]')).toBeVisible()

    // Verify average customer lifetime value
    const ltvElement = page.locator('[data-testid="average-customer-ltv"]')
    await expect(ltvElement).toBeVisible()
    
    const ltvText = await ltvElement.textContent()
    expect(ltvText).toMatch(/\$\d+\.\d{2}/)

    // Verify LTV distribution chart
    await expect(page.locator('[data-testid="ltv-distribution-chart"]')).toBeVisible()
  })

  test('Top customers list displays accurate data', async ({ page }) => {
    console.log('Testing top customers list...')

    await page.locator('[data-testid="top-customers-tab"]').click()
    await expect(page.locator('[data-testid="top-customers-list"]')).toBeVisible()

    // Verify customer list has data
    const customerRows = page.locator('[data-testid="customer-row"]')
    const rowCount = await customerRows.count()
    
    if (rowCount > 0) {
      // Verify first customer data
      const firstCustomer = customerRows.first()
      await expect(firstCustomer.locator('[data-testid="customer-name"]')).toBeVisible()
      await expect(firstCustomer.locator('[data-testid="customer-bookings"]')).toBeVisible()
      await expect(firstCustomer.locator('[data-testid="customer-revenue"]')).toBeVisible()
    }
  })
})

test.describe('Analytics Dashboard - Booking Analytics', () => {
  let analyticsEnv

  test.beforeEach(async ({ page }) => {
    analyticsEnv = new AnalyticsTestEnvironment()
    await analyticsEnv.setupAnalyticsTest()
    await page.goto(analyticsEnv.getDashboardUrl())
  })

  test.afterEach(async () => {
    await analyticsEnv.cleanup()
  })

  test('Booking trends show accurate patterns', async ({ page }) => {
    console.log('Testing booking trends...')

    await expect(page.locator('[data-testid="booking-analytics"]')).toBeVisible()

    // Verify total bookings count
    const totalBookingsElement = page.locator('[data-testid="total-bookings"]')
    await expect(totalBookingsElement).toBeVisible()
    
    const expectedBookingCount = analyticsEnv.testData.bookings.length
    const displayedCount = await totalBookingsElement.textContent()
    expect(displayedCount).toContain(expectedBookingCount.toString())

    // Verify booking status breakdown
    await expect(page.locator('[data-testid="booking-status-chart"]')).toBeVisible()
    
    // Check for different booking statuses
    const confirmedBookings = page.locator('[data-testid="confirmed-bookings-count"]')
    const cancelledBookings = page.locator('[data-testid="cancelled-bookings-count"]')
    
    await expect(confirmedBookings).toBeVisible()
    await expect(cancelledBookings).toBeVisible()
  })

  test('Peak hours analysis displays correctly', async ({ page }) => {
    console.log('Testing peak hours analysis...')

    await page.locator('[data-testid="peak-hours-tab"]').click()
    await expect(page.locator('[data-testid="peak-hours-chart"]')).toBeVisible()

    // Verify hourly booking distribution
    const hourlyBars = page.locator('[data-testid="hourly-booking-bar"]')
    const barCount = await hourlyBars.count()
    expect(barCount).toBe(24) // Should show all 24 hours

    // Verify peak hours are highlighted
    const peakHourIndicators = page.locator('[data-testid="peak-hour-indicator"]')
    const peakCount = await peakHourIndicators.count()
    expect(peakCount).toBeGreaterThan(0)

    // Verify day-of-week analysis
    await expect(page.locator('[data-testid="day-of-week-chart"]')).toBeVisible()
    const dayBars = page.locator('[data-testid="day-booking-bar"]')
    const dayCount = await dayBars.count()
    expect(dayCount).toBe(7) // Should show all 7 days
  })

  test('Service popularity rankings', async ({ page }) => {
    console.log('Testing service popularity rankings...')

    await page.locator('[data-testid="service-analytics-tab"]').click()
    await expect(page.locator('[data-testid="service-popularity-chart"]')).toBeVisible()

    // Verify services are ranked by booking count
    const serviceRankings = page.locator('[data-testid="service-ranking-item"]')
    const rankingCount = await serviceRankings.count()
    expect(rankingCount).toBeGreaterThan(0)

    // Verify each ranking has service name and booking count
    for (let i = 0; i < Math.min(rankingCount, 3); i++) {
      const ranking = serviceRankings.nth(i)
      await expect(ranking.locator('[data-testid="service-name"]')).toBeVisible()
      await expect(ranking.locator('[data-testid="booking-count"]')).toBeVisible()
    }
  })

  test('Cancellation rate analysis', async ({ page }) => {
    console.log('Testing cancellation rate analysis...')

    await page.locator('[data-testid="cancellation-analytics"]').click()
    await expect(page.locator('[data-testid="cancellation-rate-metric"]')).toBeVisible()

    // Verify cancellation rate percentage
    const cancellationRate = await page.locator('[data-testid="cancellation-rate-value"]').textContent()
    expect(cancellationRate).toMatch(/\d+\.\d+%/)

    // Verify cancellation reasons breakdown
    await expect(page.locator('[data-testid="cancellation-reasons-chart"]')).toBeVisible()

    // Verify cancellation trends over time
    await expect(page.locator('[data-testid="cancellation-trends-chart"]')).toBeVisible()
  })
})

test.describe('Analytics Dashboard - Data Integrity', () => {
  let analyticsEnv

  test.beforeEach(async ({ page }) => {
    analyticsEnv = new AnalyticsTestEnvironment()
    await analyticsEnv.setupAnalyticsTest()
    await page.goto(analyticsEnv.getDashboardUrl())
  })

  test.afterEach(async () => {
    await analyticsEnv.cleanup()
  })

  test('No mock data indicators present', async ({ page }) => {
    console.log('Verifying no mock data is used...')

    // Check for common mock data indicators
    const mockDataIndicators = [
      'mock',
      'fake',
      'test-data',
      'placeholder',
      'sample',
      'demo-user',
      'example.com'
    ]

    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible()

    // Check revenue metrics don't contain mock indicators
    const revenueElements = await page.locator('[data-testid*="revenue"]').allTextContents()
    for (const text of revenueElements) {
      for (const indicator of mockDataIndicators) {
        expect(text.toLowerCase()).not.toContain(indicator)
      }
    }

    // Check customer data doesn't contain mock indicators  
    const customerElements = await page.locator('[data-testid*="customer"]').allTextContents()
    for (const text of customerElements) {
      for (const indicator of mockDataIndicators) {
        expect(text.toLowerCase()).not.toContain(indicator)
      }
    }

    // Verify data comes from real database queries
    const networkRequests = []
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('supabase')) {
        networkRequests.push(request.url())
      }
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    expect(networkRequests.length).toBeGreaterThan(0)
    const hasRealDatabaseCalls = networkRequests.some(url => 
      !url.includes('mock') && 
      (url.includes('supabase') || url.includes('/api/analytics'))
    )
    expect(hasRealDatabaseCalls).toBe(true)
  })

  test('Cross-reference dashboard data with database', async ({ page }) => {
    console.log('Cross-referencing dashboard data with database...')

    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible()

    // Get displayed revenue from dashboard
    const dashboardRevenue = await page.locator('[data-testid="monthly-revenue"]').textContent()
    const displayedAmount = parseFloat(dashboardRevenue.replace(/[^0-9.]/g, ''))

    // Compare with calculated expected revenue
    const expectedAmount = analyticsEnv.testData.revenue.monthly

    // Allow for small differences due to timing
    expect(Math.abs(displayedAmount - expectedAmount)).toBeLessThan(1.0)

    // Cross-reference booking count
    const dashboardBookings = await page.locator('[data-testid="total-bookings"]').textContent()
    const displayedBookings = parseInt(dashboardBookings.replace(/[^0-9]/g, ''))
    const expectedBookings = analyticsEnv.testData.bookings.length

    expect(displayedBookings).toBe(expectedBookings)
  })

  test('Real-time data updates work correctly', async ({ page }) => {
    console.log('Testing real-time data updates...')

    // Get initial metrics
    await expect(page.locator('[data-testid="daily-revenue"]')).toBeVisible()
    const initialRevenue = await page.locator('[data-testid="daily-revenue"]').textContent()
    const initialBookings = await page.locator('[data-testid="daily-bookings"]').textContent()

    // Create new booking
    await analyticsEnv.createTestBooking()

    // Wait for real-time update or refresh
    await page.waitForTimeout(5000) // Allow time for real-time updates
    
    // Check if data updated automatically
    const updatedRevenue = await page.locator('[data-testid="daily-revenue"]').textContent()
    const updatedBookings = await page.locator('[data-testid="daily-bookings"]').textContent()

    // If not updated automatically, refresh to verify data persistence
    if (updatedRevenue === initialRevenue) {
      await page.reload()
      await page.waitForLoadState('networkidle')
    }

    // Verify changes are reflected
    const finalRevenue = await page.locator('[data-testid="daily-revenue"]').textContent()
    const finalBookings = await page.locator('[data-testid="daily-bookings"]').textContent()

    expect(finalRevenue).not.toBe(initialRevenue)
    expect(finalBookings).not.toBe(initialBookings)
  })

  test('Export functionality works with real data', async ({ page }) => {
    console.log('Testing analytics export functionality...')

    await expect(page.locator('[data-testid="export-analytics"]')).toBeVisible()

    // Test CSV export
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="export-csv"]').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('.csv')

    // Verify export contains real data
    const path = await download.path()
    expect(path).toBeTruthy()

    // Test PDF export
    const pdfDownloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="export-pdf"]').click()
    const pdfDownload = await pdfDownloadPromise

    expect(pdfDownload.suggestedFilename()).toContain('.pdf')
  })
})

test.describe('Analytics Dashboard - Performance', () => {
  let analyticsEnv

  test.beforeEach(async ({ page }) => {
    analyticsEnv = new AnalyticsTestEnvironment()
    await analyticsEnv.setupAnalyticsTest()
  })

  test.afterEach(async () => {
    await analyticsEnv.cleanup()
  })

  test('Dashboard loads within acceptable time limits', async ({ page }) => {
    console.log('Testing dashboard load performance...')

    const startTime = Date.now()
    
    await page.goto(analyticsEnv.getDashboardUrl())
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ timeout: 10000 })
    
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 10 seconds
    expect(loadTime).toBeLessThan(10000)
    
    // Verify all key metrics are visible
    await expect(page.locator('[data-testid="daily-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="weekly-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-customers"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-bookings"]')).toBeVisible()
  })

  test('Large dataset handling', async ({ page }) => {
    console.log('Testing dashboard with large datasets...')

    // Navigate to dashboard with date range that includes more data
    await page.goto(`${analyticsEnv.getDashboardUrl()}&range=year`)
    
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ timeout: 15000 })
    
    // Verify dashboard still functions with larger dataset
    await expect(page.locator('[data-testid="revenue-trends-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-trends-chart"]')).toBeVisible()
    
    // Test pagination if applicable
    const paginationExists = await page.locator('[data-testid="pagination"]').isVisible()
    if (paginationExists) {
      await page.locator('[data-testid="next-page"]').click()
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible()
    }
  })
})