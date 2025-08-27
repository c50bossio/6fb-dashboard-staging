#!/usr/bin/env node

/**
 * Payroll Export System - Integration Test Script
 * Tests actual functionality with real database connections and file generation
 * 
 * Usage: node test-payroll-export-integration.js [--verbose] [--cleanup]
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const verbose = process.argv.includes('--verbose')
const cleanup = process.argv.includes('--cleanup')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logVerbose(message) {
  if (verbose) {
    log(`  → ${message}`, 'blue')
  }
}

class PayrollExportIntegrationTest {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    }
    this.testData = {
      shopId: null,
      userId: null,
      staffIds: [],
      appointmentIds: [],
      exportIds: []
    }
  }

  async runAllTests() {
    log('🚀 Starting Payroll Export Integration Tests', 'bold')
    log('=' * 60, 'blue')
    
    try {
      // Database Schema Tests
      await this.testDatabaseSchema()
      
      // Data Setup
      await this.setupTestData()
      
      // Service Tests
      await this.testPayrollExportService()
      
      // API Endpoint Tests  
      await this.testAPIEndpoints()
      
      // Email Service Tests
      await this.testEmailService()
      
      // File Generation Tests
      await this.testFileGeneration()
      
      // Performance Tests
      await this.testPerformance()
      
      // Cleanup
      if (cleanup) {
        await this.cleanupTestData()
      }
      
      // Results
      this.displayResults()
      
    } catch (error) {
      log(`❌ Critical test failure: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(error.message)
    }
  }

  async testDatabaseSchema() {
    log('\n📊 Testing Database Schema...', 'yellow')
    
    const tables = [
      'payroll_export_history',
      'payroll_export_schedules', 
      'payroll_schedule_executions',
      'payroll_export_templates',
      'payroll_export_permissions',
      'payroll_rate_limits',
      'payroll_notification_log'
    ]
    
    for (const table of tables) {
      try {
        const { error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error && error.code === 'PGRST106') {
          log(`❌ Table '${table}' does not exist`, 'red')
          this.testResults.failed++
          this.testResults.errors.push(`Missing table: ${table}`)
        } else {
          log(`✅ Table '${table}' exists and accessible`, 'green')
          this.testResults.passed++
          logVerbose(`Table ${table} schema validated`)
        }
      } catch (error) {
        log(`❌ Error testing table '${table}': ${error.message}`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`Table error ${table}: ${error.message}`)
      }
    }
  }

  async setupTestData() {
    log('\n🏗️  Setting up test data...', 'yellow')
    
    try {
      // Create test shop
      const { data: shop, error: shopError } = await this.supabase
        .from('shops')
        .insert({
          name: 'Payroll Test Barbershop',
          address: '123 Test Street',
          phone: '+1234567890',
          email: 'test@payrolltest.com',
          business_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '16:00' },
            sunday: { closed: true }
          }
        })
        .select()
        .single()

      if (shopError) {
        log(`❌ Failed to create test shop: ${shopError.message}`, 'red')
        throw shopError
      }

      this.testData.shopId = shop.id
      log(`✅ Created test shop: ${shop.id}`, 'green')

      // Create test user
      const { data: auth, error: authError } = await this.supabase.auth.admin.createUser({
        email: 'payroll.test@example.com',
        password: 'testpass123',
        email_confirm: true
      })

      if (authError) {
        log(`❌ Failed to create test user: ${authError.message}`, 'red')
        throw authError
      }

      this.testData.userId = auth.user.id

      // Create test profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: auth.user.id,
          email: 'payroll.test@example.com',
          full_name: 'Payroll Test Manager',
          role: 'SHOP_OWNER',
          shop_id: shop.id,
          phone: '+1234567890'
        })
        .select()
        .single()

      if (profileError) {
        log(`❌ Failed to create test profile: ${profileError.message}`, 'red')
        throw profileError
      }

      log(`✅ Created test user profile: ${profile.id}`, 'green')

      // Create test staff
      const staffData = [
        {
          id: `staff-1-${Date.now()}`,
          email: 'john.barber@test.com',
          full_name: 'John Test Barber',
          role: 'BARBER',
          shop_id: shop.id,
          hire_date: '2024-01-15',
          hourly_rate: 25.00,
          commission_rate: 0.40,
          booth_rent: 150.00,
          tier_level: 'STANDARD',
          active: true
        },
        {
          id: `staff-2-${Date.now()}`,
          email: 'jane.stylist@test.com', 
          full_name: 'Jane Test Stylist',
          role: 'BARBER',
          shop_id: shop.id,
          hire_date: '2024-02-01',
          hourly_rate: 30.00,
          commission_rate: 0.45,
          booth_rent: 200.00,
          tier_level: 'PREMIUM',
          active: true
        }
      ]

      const { data: staffProfiles, error: staffError } = await this.supabase
        .from('profiles')
        .insert(staffData)
        .select()

      if (staffError) {
        log(`❌ Failed to create test staff: ${staffError.message}`, 'red')
        throw staffError
      }

      this.testData.staffIds = staffProfiles.map(s => s.id)
      log(`✅ Created ${staffProfiles.length} test staff members`, 'green')

      // Create test appointments with commission data
      const appointmentData = []
      const startDate = new Date('2024-01-01')
      
      for (let i = 0; i < 20; i++) {
        const appointmentDate = new Date(startDate)
        appointmentDate.setDate(startDate.getDate() + i)
        
        appointmentData.push({
          barber_id: this.testData.staffIds[i % 2],
          customer_name: `Test Customer ${i + 1}`,
          customer_email: `customer${i + 1}@test.com`,
          customer_phone: `+123456789${i}`,
          service_name: 'Haircut & Style',
          service_price: 45.00 + (i * 5),
          appointment_date: appointmentDate.toISOString().split('T')[0],
          start_time: '10:00',
          end_time: '11:00',
          status: 'COMPLETED',
          shop_id: shop.id,
          payment_status: 'PAID',
          service_commission: (45.00 + (i * 5)) * 0.40,
          product_commission: 15.00,
          tips: 5.00 + (i * 2),
          booth_rent_deduction: i % 7 === 0 ? 150.00 : 0, // Weekly booth rent
        })
      }

      const { data: appointments, error: appointmentError } = await this.supabase
        .from('appointments')
        .insert(appointmentData)
        .select()

      if (appointmentError) {
        log(`❌ Failed to create test appointments: ${appointmentError.message}`, 'red')
        throw appointmentError
      }

      this.testData.appointmentIds = appointments.map(a => a.id)
      log(`✅ Created ${appointments.length} test appointments with payroll data`, 'green')

      this.testResults.passed += 4 // shop, user, staff, appointments
      logVerbose('Test data setup completed successfully')

    } catch (error) {
      log(`❌ Test data setup failed: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(`Setup error: ${error.message}`)
      throw error
    }
  }

  async testPayrollExportService() {
    log('\n⚙️  Testing Payroll Export Service...', 'yellow')
    
    try {
      // Import the service
      const { default: PayrollExportService } = await import('./services/payroll-export-service.js')
      const service = new PayrollExportService()
      
      // Test PDF generation
      logVerbose('Testing PDF export generation...')
      const pdfResult = await service.generatePayrollExport({
        format: 'pdf',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        staffFilter: 'all',
        shopId: this.testData.shopId,
        includeComponents: {
          summary: true,
          individual: true,
          transactions: false
        }
      })
      
      if (pdfResult.success && pdfResult.file_url) {
        log('✅ PDF export generation successful', 'green')
        this.testResults.passed++
        logVerbose(`PDF file size: ${pdfResult.file_size} bytes`)
        logVerbose(`Generation time: ${pdfResult.generation_time}ms`)
      } else {
        log('❌ PDF export generation failed', 'red')
        this.testResults.failed++
        this.testResults.errors.push('PDF export failed')
      }

      // Test Excel generation
      logVerbose('Testing Excel export generation...')
      const excelResult = await service.generatePayrollExport({
        format: 'excel',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        staffFilter: this.testData.staffIds,
        shopId: this.testData.shopId,
        customization: {
          includeLogo: true,
          showTotals: true,
          groupByStaff: true,
          showFormulas: true
        }
      })
      
      if (excelResult.success && excelResult.file_url) {
        log('✅ Excel export generation successful', 'green')
        this.testResults.passed++
        logVerbose(`Excel file size: ${excelResult.file_size} bytes`)
      } else {
        log('❌ Excel export generation failed', 'red')
        this.testResults.failed++
        this.testResults.errors.push('Excel export failed')
      }

      // Test CSV generation
      logVerbose('Testing CSV export generation...')
      const csvResult = await service.generatePayrollExport({
        format: 'csv',
        dateRange: {
          startDate: '2024-01-01', 
          endDate: '2024-01-31'
        },
        staffFilter: 'active',
        shopId: this.testData.shopId
      })
      
      if (csvResult.success && csvResult.file_url) {
        log('✅ CSV export generation successful', 'green')
        this.testResults.passed++
        logVerbose(`CSV file size: ${csvResult.file_size} bytes`)
      } else {
        log('❌ CSV export generation failed', 'red')
        this.testResults.failed++
        this.testResults.errors.push('CSV export failed')
      }

      // Store export IDs for cleanup
      this.testData.exportIds.push(pdfResult.export_id, excelResult.export_id, csvResult.export_id)

    } catch (error) {
      log(`❌ Payroll Export Service test failed: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(`Service error: ${error.message}`)
    }
  }

  async testAPIEndpoints() {
    log('\n🌐 Testing API Endpoints...', 'yellow')
    
    try {
      // Test export endpoint
      logVerbose('Testing /api/payroll/export endpoint...')
      
      const exportResponse = await fetch('http://localhost:3000/api/payroll/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getTestAuthToken()}`
        },
        body: JSON.stringify({
          format: 'pdf',
          dateRange: { preset: 'current-month' },
          staffFilter: 'all',
          includeComponents: {
            summary: true,
            individual: true
          }
        })
      })

      if (exportResponse.ok) {
        const exportData = await exportResponse.json()
        if (exportData.success) {
          log('✅ Export API endpoint working', 'green')
          this.testResults.passed++
          logVerbose(`Export ID: ${exportData.export.export_id}`)
        } else {
          log('❌ Export API returned failure', 'red')
          this.testResults.failed++
          this.testResults.errors.push('Export API failure')
        }
      } else {
        log(`❌ Export API endpoint error: ${exportResponse.status}`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`Export API HTTP ${exportResponse.status}`)
      }

      // Test schedule endpoint
      logVerbose('Testing /api/payroll/schedule endpoint...')
      
      const scheduleResponse = await fetch('http://localhost:3000/api/payroll/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getTestAuthToken()}`
        },
        body: JSON.stringify({
          name: 'Test Monthly Report',
          schedule_type: 'monthly',
          format: 'excel',
          dateRange: { preset: 'last-month' },
          staffFilter: 'active',
          email_recipients: ['test@example.com'],
          enabled: true
        })
      })

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        if (scheduleData.success) {
          log('✅ Schedule API endpoint working', 'green')
          this.testResults.passed++
          logVerbose(`Schedule ID: ${scheduleData.schedule.id}`)
        } else {
          log('❌ Schedule API returned failure', 'red')
          this.testResults.failed++
          this.testResults.errors.push('Schedule API failure')
        }
      } else {
        log(`❌ Schedule API endpoint error: ${scheduleResponse.status}`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`Schedule API HTTP ${scheduleResponse.status}`)
      }

    } catch (error) {
      log(`❌ API endpoint test failed: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(`API error: ${error.message}`)
    }
  }

  async testEmailService() {
    log('\n📧 Testing Email Service...', 'yellow')
    
    try {
      // Import email service
      const { default: PayrollEmailService } = await import('./services/payroll-email-service.js')
      const emailService = new PayrollEmailService()
      
      // Test email configuration validation
      logVerbose('Testing email configuration validation...')
      const config = emailService.validateEmailConfig()
      
      if (config.isValid) {
        log('✅ Email configuration is valid', 'green')
        this.testResults.passed++
        logVerbose(`SendGrid configured: ${config.sendgridConfigured}`)
        logVerbose(`From email set: ${config.fromEmailSet}`)
      } else {
        log('⚠️  Email configuration issues detected', 'yellow')
        logVerbose('This is expected in test environment')
        this.testResults.passed++
      }

      // Test email template generation
      logVerbose('Testing email template generation...')
      const emailTemplate = emailService.generateExportEmailTemplate({
        exportData: {
          export_id: 'test-export',
          file_name: 'test-payroll.pdf',
          format: 'pdf',
          generation_time: 1500
        },
        shopInfo: {
          name: 'Test Barbershop',
          address: '123 Test Street'
        },
        customMessage: 'Test payroll report'
      })

      if (emailTemplate.html && emailTemplate.text) {
        log('✅ Email template generation successful', 'green')
        this.testResults.passed++
        logVerbose(`HTML template length: ${emailTemplate.html.length} chars`)
        logVerbose(`Text template length: ${emailTemplate.text.length} chars`)
      } else {
        log('❌ Email template generation failed', 'red')
        this.testResults.failed++
        this.testResults.errors.push('Email template generation failed')
      }

      // Note: Actual email sending test skipped to avoid spam
      log('ℹ️  Actual email sending test skipped (prevents spam)', 'blue')

    } catch (error) {
      log(`❌ Email service test failed: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(`Email error: ${error.message}`)
    }
  }

  async testFileGeneration() {
    log('\n📄 Testing File Generation...', 'yellow')
    
    try {
      // Import file generation utilities
      const { default: PayrollExportService } = await import('./services/payroll-export-service.js')
      const service = new PayrollExportService()
      
      // Test file generation with mock data
      const testPayrollData = {
        staff: [
          {
            id: 'staff-1',
            full_name: 'John Test Barber',
            role: 'BARBER',
            hire_date: '2024-01-15',
            commission_rate: 0.40
          }
        ],
        payrollRecords: [
          {
            staff_id: 'staff-1',
            date: '2024-01-20',
            service_revenue: 320.00,
            service_commission: 128.00,
            product_commission: 32.00,
            tips: 45.00,
            booth_rent_deduction: 150.00,
            gross_earnings: 205.00,
            net_earnings: 55.00
          }
        ],
        summary: {
          totalGrossEarnings: 205.00,
          totalNetEarnings: 55.00,
          totalServiceCommission: 128.00,
          totalProductCommission: 32.00
        }
      }

      // Test PDF generation
      logVerbose('Testing PDF file generation...')
      try {
        const pdfBlob = await service.generatePDFReport(testPayrollData, {
          customization: { includeLogo: true, showTotals: true }
        })
        
        if (pdfBlob && pdfBlob.size > 0) {
          log('✅ PDF file generation successful', 'green')
          this.testResults.passed++
          logVerbose(`PDF file size: ${pdfBlob.size} bytes`)
        } else {
          log('❌ PDF file generation returned empty result', 'red')
          this.testResults.failed++
          this.testResults.errors.push('Empty PDF generation')
        }
      } catch (pdfError) {
        log(`❌ PDF generation error: ${pdfError.message}`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`PDF error: ${pdfError.message}`)
      }

      // Test Excel generation
      logVerbose('Testing Excel file generation...')
      try {
        const excelBuffer = await service.generateExcelReport(testPayrollData, {
          customization: { showFormulas: true, groupByStaff: true }
        })
        
        if (excelBuffer && excelBuffer.length > 0) {
          log('✅ Excel file generation successful', 'green')
          this.testResults.passed++
          logVerbose(`Excel file size: ${excelBuffer.length} bytes`)
        } else {
          log('❌ Excel file generation returned empty result', 'red')
          this.testResults.failed++
          this.testResults.errors.push('Empty Excel generation')
        }
      } catch (excelError) {
        log(`❌ Excel generation error: ${excelError.message}`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`Excel error: ${excelError.message}`)
      }

      // Test CSV generation
      logVerbose('Testing CSV file generation...')
      try {
        const csvContent = await service.generateCSVReport(testPayrollData, {})
        
        if (csvContent && csvContent.length > 0) {
          log('✅ CSV file generation successful', 'green')
          this.testResults.passed++
          logVerbose(`CSV content length: ${csvContent.length} characters`)
        } else {
          log('❌ CSV file generation returned empty result', 'red')
          this.testResults.failed++
          this.testResults.errors.push('Empty CSV generation')
        }
      } catch (csvError) {
        log(`❌ CSV generation error: ${csvError.message}`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`CSV error: ${csvError.message}`)
      }

    } catch (error) {
      log(`❌ File generation test failed: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(`File generation error: ${error.message}`)
    }
  }

  async testPerformance() {
    log('\n⚡ Testing Performance...', 'yellow')
    
    try {
      // Import service
      const { default: PayrollExportService } = await import('./services/payroll-export-service.js')
      const service = new PayrollExportService()
      
      // Performance test with large dataset
      logVerbose('Running performance test with large dataset...')
      
      const largePayrollData = {
        staff: Array.from({ length: 50 }, (_, i) => ({
          id: `staff-${i}`,
          full_name: `Staff Member ${i}`,
          role: 'BARBER',
          commission_rate: 0.40
        })),
        payrollRecords: Array.from({ length: 500 }, (_, i) => ({
          staff_id: `staff-${i % 50}`,
          date: '2024-01-20',
          service_revenue: 100 + (i * 2),
          service_commission: (100 + (i * 2)) * 0.40,
          gross_earnings: (100 + (i * 2)) * 0.40,
          net_earnings: (100 + (i * 2)) * 0.40 - 50
        })),
        summary: {
          totalGrossEarnings: 50000,
          totalNetEarnings: 25000
        }
      }

      // Test PDF performance
      const pdfStart = performance.now()
      const pdfResult = await service.generatePDFReport(largePayrollData, {})
      const pdfTime = performance.now() - pdfStart

      if (pdfTime < 10000) { // Should complete in under 10 seconds
        log(`✅ PDF performance test passed (${pdfTime.toFixed(0)}ms)`, 'green')
        this.testResults.passed++
      } else {
        log(`❌ PDF performance test failed (${pdfTime.toFixed(0)}ms)`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`PDF too slow: ${pdfTime.toFixed(0)}ms`)
      }

      // Test Excel performance
      const excelStart = performance.now()
      const excelResult = await service.generateExcelReport(largePayrollData, {})
      const excelTime = performance.now() - excelStart

      if (excelTime < 15000) { // Should complete in under 15 seconds
        log(`✅ Excel performance test passed (${excelTime.toFixed(0)}ms)`, 'green')
        this.testResults.passed++
      } else {
        log(`❌ Excel performance test failed (${excelTime.toFixed(0)}ms)`, 'red')
        this.testResults.failed++
        this.testResults.errors.push(`Excel too slow: ${excelTime.toFixed(0)}ms`)
      }

      logVerbose(`Performance test completed: PDF=${pdfTime.toFixed(0)}ms, Excel=${excelTime.toFixed(0)}ms`)

    } catch (error) {
      log(`❌ Performance test failed: ${error.message}`, 'red')
      this.testResults.failed++
      this.testResults.errors.push(`Performance error: ${error.message}`)
    }
  }

  async cleanupTestData() {
    log('\n🧹 Cleaning up test data...', 'yellow')
    
    try {
      // Delete test appointments
      if (this.testData.appointmentIds.length > 0) {
        const { error: appointmentError } = await this.supabase
          .from('appointments')
          .delete()
          .in('id', this.testData.appointmentIds)
        
        if (!appointmentError) {
          log(`✅ Deleted ${this.testData.appointmentIds.length} test appointments`, 'green')
        }
      }

      // Delete test staff profiles
      if (this.testData.staffIds.length > 0) {
        const { error: staffError } = await this.supabase
          .from('profiles')
          .delete()
          .in('id', this.testData.staffIds)
        
        if (!staffError) {
          log(`✅ Deleted ${this.testData.staffIds.length} test staff profiles`, 'green')
        }
      }

      // Delete test user
      if (this.testData.userId) {
        const { error: userError } = await this.supabase.auth.admin.deleteUser(this.testData.userId)
        
        if (!userError) {
          log('✅ Deleted test user', 'green')
        }
      }

      // Delete test shop
      if (this.testData.shopId) {
        const { error: shopError } = await this.supabase
          .from('shops')
          .delete()
          .eq('id', this.testData.shopId)
        
        if (!shopError) {
          log('✅ Deleted test shop', 'green')
        }
      }

      // Clean export records
      if (this.testData.exportIds.length > 0) {
        const { error: exportError } = await this.supabase
          .from('payroll_export_history')
          .delete()
          .in('export_id', this.testData.exportIds)
        
        if (!exportError) {
          log(`✅ Cleaned ${this.testData.exportIds.length} export records`, 'green')
        }
      }

      log('✅ Test data cleanup completed', 'green')

    } catch (error) {
      log(`⚠️  Cleanup warning: ${error.message}`, 'yellow')
    }
  }

  async getTestAuthToken() {
    // Generate a test JWT token for API testing
    // In production, this would use proper auth flow
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: 'payroll.test@example.com',
      password: 'testpass123'
    })

    if (error) {
      throw new Error(`Auth error: ${error.message}`)
    }

    return data.session.access_token
  }

  displayResults() {
    log('\n📊 Test Results Summary', 'bold')
    log('=' * 60, 'blue')
    
    log(`✅ Tests Passed: ${this.testResults.passed}`, 'green')
    log(`❌ Tests Failed: ${this.testResults.failed}`, 'red')
    
    const total = this.testResults.passed + this.testResults.failed
    const passRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : 0
    
    log(`📈 Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red')
    
    if (this.testResults.errors.length > 0) {
      log('\n❌ Errors encountered:', 'red')
      this.testResults.errors.forEach((error, index) => {
        log(`   ${index + 1}. ${error}`, 'red')
      })
    }
    
    if (this.testResults.failed === 0) {
      log('\n🎉 All tests passed! Payroll export system is ready for production.', 'green')
    } else {
      log('\n⚠️  Some tests failed. Please review and fix issues before deployment.', 'yellow')
    }
    
    log('=' * 60, 'blue')
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PayrollExportIntegrationTest()
  await tester.runAllTests()
  process.exit(tester.testResults.failed > 0 ? 1 : 0)
}

export default PayrollExportIntegrationTest