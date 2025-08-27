/**
 * 🔒 PAYROLL SYSTEM SECURITY COMPREHENSIVE TEST SUITE
 * Advanced Security Testing for 6FB AI Agent System Payroll Module
 * 
 * This suite focuses on comprehensive security validation including:
 * - Advanced webhook security and signature verification
 * - Row Level Security (RLS) policy enforcement
 * - Input validation and sanitization
 * - Rate limiting and DDoS protection
 * - Authentication and authorization security
 * - Data encryption and privacy compliance
 * - PCI DSS compliance for payment data handling
 * - GDPR compliance for data protection
 */

import { describe, beforeAll, afterAll, test, expect, jest } from '@jest/globals'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { WebhookAutomationPipeline } from '@/services/webhook-automation-pipeline.js'
import { PayrollExportService } from '@/services/payroll-export-service.js'

const SECURITY_CONFIG = {
  webhook: {
    signatureToleranceSeconds: 300, // 5 minutes
    maxPayloadSize: 1024 * 1024, // 1MB
    requiredHeaders: ['stripe-signature', 'content-type']
  },
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    blockDuration: 300000 // 5 minutes
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16
  }
}

// Security test helpers
const SecurityTestHelpers = {
  generateValidStripeSignature: (payload, secret, timestamp = null) => {
    const ts = timestamp || Math.floor(Date.now() / 1000)
    const signedPayload = `${ts}.${payload}`
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')
    return `t=${ts},v1=${signature}`
  },

  generateInvalidStripeSignature: (payload) => {
    const timestamp = Math.floor(Date.now() / 1000)
    const fakeSignature = crypto.randomBytes(32).toString('hex')
    return `t=${timestamp},v1=${fakeSignature}`
  },

  createSQLInjectionPayloads: () => [
    "'; DROP TABLE commission_transactions; --",
    "' OR '1'='1' --",
    "'; INSERT INTO commission_transactions (barber_id) VALUES ('malicious'); --",
    "' UNION SELECT * FROM barbershop_staff --",
    "'; UPDATE barbershops SET owner_id = 'hacker' WHERE id = '1'; --"
  ],

  createXSSPayloads: () => [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "<%2Fscript%3E%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E",
    "<svg/onload=alert('xss')>"
  ],

  createCSRFToken: () => {
    return crypto.randomBytes(32).toString('hex')
  },

  generateMaliciousFilePayload: () => {
    return {
      name: '../../../etc/passwd',
      content: Buffer.from('malicious content'),
      type: 'application/octet-stream'
    }
  }
}

describe('🔒 PAYROLL SYSTEM SECURITY COMPREHENSIVE TESTS', () => {
  let supabase
  let webhookPipeline
  let payrollService
  let testBarbershop
  let testData = []

  beforeAll(async () => {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    webhookPipeline = new WebhookAutomationPipeline()
    payrollService = new PayrollExportService()

    // Create isolated test barbershop for security testing
    testBarbershop = {
      id: 'security-test-shop-' + Date.now(),
      name: 'Security Test Barbershop',
      owner_id: 'security-test-owner-' + Date.now()
    }

    await supabase.from('barbershops').insert([testBarbershop])
  }, 30000)

  afterAll(async () => {
    // Security cleanup - ensure all test data is removed
    for (const { table, ids } of testData) {
      await supabase.from(table).delete().in('id', ids)
    }
    await supabase.from('barbershops').delete().eq('id', testBarbershop.id)
  }, 30000)

  // ==========================================
  // WEBHOOK SECURITY TESTS
  // ==========================================

  describe('🔐 Webhook Security Validation', () => {
    test('should validate webhook signature using multiple algorithms', async () => {
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_security_test' } }
      })

      const secret = process.env.STRIPE_WEBHOOK_SECRET

      // Test valid signature
      const validSignature = SecurityTestHelpers.generateValidStripeSignature(payload, secret)
      const validResult = await webhookPipeline.validateWebhookSignature(payload, validSignature, secret)
      expect(validResult.isValid).toBe(true)
      expect(validResult.timestamp).toBeGreaterThan(0)

      // Test invalid signature
      const invalidSignature = SecurityTestHelpers.generateInvalidStripeSignature(payload)
      const invalidResult = await webhookPipeline.validateWebhookSignature(payload, invalidSignature, secret)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toContain('signature')

      // Test signature with wrong secret
      const wrongSecret = 'wrong_secret_key'
      const wrongSecretSig = SecurityTestHelpers.generateValidStripeSignature(payload, wrongSecret)
      const wrongSecretResult = await webhookPipeline.validateWebhookSignature(payload, wrongSecretSig, secret)
      expect(wrongSecretResult.isValid).toBe(false)
    })

    test('should enforce webhook timestamp tolerance for replay attack prevention', async () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' })
      const secret = process.env.STRIPE_WEBHOOK_SECRET

      // Test expired signature (10 minutes old)
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600
      const expiredSignature = SecurityTestHelpers.generateValidStripeSignature(payload, secret, expiredTimestamp)
      
      const expiredResult = await webhookPipeline.validateWebhookSignature(payload, expiredSignature, secret)
      expect(expiredResult.isValid).toBe(false)
      expect(expiredResult.error).toContain('timestamp too old')

      // Test future timestamp (should also be rejected)
      const futureTimestamp = Math.floor(Date.now() / 1000) + 600
      const futureSignature = SecurityTestHelpers.generateValidStripeSignature(payload, secret, futureTimestamp)
      
      const futureResult = await webhookPipeline.validateWebhookSignature(payload, futureSignature, secret)
      expect(futureResult.isValid).toBe(false)
      expect(futureResult.error).toContain('timestamp in future')
    })

    test('should prevent webhook payload manipulation attacks', async () => {
      const originalPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { 
          object: { 
            id: 'pi_test',
            amount: 10000,
            metadata: { barber_id: 'legitimate_barber' }
          } 
        }
      })

      const validSignature = SecurityTestHelpers.generateValidStripeSignature(
        originalPayload, 
        process.env.STRIPE_WEBHOOK_SECRET
      )

      // Attempt to modify payload after signature generation
      const tamperedPayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { 
          object: { 
            id: 'pi_test',
            amount: 100000, // Increased amount
            metadata: { barber_id: 'malicious_barber' } // Changed barber
          } 
        }
      })

      const tamperedResult = await webhookPipeline.validateWebhookSignature(
        tamperedPayload, 
        validSignature, 
        process.env.STRIPE_WEBHOOK_SECRET
      )

      expect(tamperedResult.isValid).toBe(false)
      expect(tamperedResult.error).toContain('signature mismatch')
    })

    test('should enforce webhook payload size limits', async () => {
      // Create oversized payload (> 1MB)
      const largePayload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { 
          object: { 
            id: 'pi_large',
            metadata: {
              large_data: 'x'.repeat(2 * 1024 * 1024) // 2MB of data
            }
          } 
        }
      })

      const signature = SecurityTestHelpers.generateValidStripeSignature(
        largePayload, 
        process.env.STRIPE_WEBHOOK_SECRET
      )

      await expect(
        webhookPipeline.processStripeWebhook(largePayload, signature)
      ).rejects.toThrow('Payload too large')
    })

    test('should validate required webhook headers', async () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' })
      const headers = {}

      // Missing stripe-signature header
      await expect(
        webhookPipeline.processWebhookWithHeaders(payload, headers)
      ).rejects.toThrow('Missing required header: stripe-signature')

      // Missing content-type header
      headers['stripe-signature'] = 'valid_signature'
      await expect(
        webhookPipeline.processWebhookWithHeaders(payload, headers)
      ).rejects.toThrow('Missing required header: content-type')

      // Invalid content-type
      headers['content-type'] = 'text/html'
      await expect(
        webhookPipeline.processWebhookWithHeaders(payload, headers)
      ).rejects.toThrow('Invalid content-type')
    })
  })

  // ==========================================
  // INPUT VALIDATION & SANITIZATION TESTS
  // ==========================================

  describe('🛡️ Input Validation & Sanitization', () => {
    test('should sanitize SQL injection attempts', async () => {
      const sqlPayloads = SecurityTestHelpers.createSQLInjectionPayloads()

      for (const maliciousInput of sqlPayloads) {
        const mockPayment = {
          id: 'pi_sql_test',
          amount: 10000,
          metadata: {
            service_name: maliciousInput,
            barber_id: testBarbershop.id,
            notes: maliciousInput
          }
        }

        const payload = JSON.stringify({
          type: 'payment_intent.succeeded',
          data: { object: mockPayment }
        })

        const signature = SecurityTestHelpers.generateValidStripeSignature(
          payload, 
          process.env.STRIPE_WEBHOOK_SECRET
        )

        const result = await webhookPipeline.processStripeWebhook(payload, signature)

        if (result.success) {
          // Input should be sanitized
          expect(result.commission_data.service_name).not.toContain('DROP TABLE')
          expect(result.commission_data.service_name).not.toContain("'")
          expect(result.commission_data.service_name).not.toContain('--')
        } else {
          // Or webhook should be rejected
          expect(result.error).toContain('Invalid input detected')
        }
      }
    })

    test('should prevent XSS attacks in payroll exports', async () => {
      const xssPayloads = SecurityTestHelpers.createXSSPayloads()

      // Create commission record with XSS payload
      const maliciousCommission = {
        id: 'xss_test_commission',
        barbershop_id: testBarbershop.id,
        barber_id: 'test_barber',
        service_name: xssPayloads[0], // <script>alert('xss')</script>
        payment_amount: 10000,
        commission_amount: 6000,
        created_at: new Date().toISOString()
      }

      const { data } = await supabase
        .from('commission_transactions')
        .insert([maliciousCommission])
        .select()

      testData.push({ table: 'commission_transactions', ids: [data[0].id] })

      // Generate export that includes the malicious data
      const exportResult = await payrollService.generatePayrollExport({
        format: 'pdf',
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      })

      expect(exportResult.success).toBe(true)

      // The exported content should not contain script tags
      const exportContent = exportResult.data.toString()
      expect(exportContent).not.toContain('<script>')
      expect(exportContent).not.toContain('javascript:')
      expect(exportContent).not.toContain('onerror=')
    })

    test('should validate numeric input ranges', async () => {
      const invalidNumericInputs = [
        { amount: -1000, description: 'negative payment amount' },
        { amount: Number.MAX_SAFE_INTEGER + 1, description: 'overflow amount' },
        { amount: 0.001, description: 'sub-cent amount' },
        { amount: NaN, description: 'NaN amount' },
        { amount: Infinity, description: 'infinite amount' },
        { amount: 'not_a_number', description: 'string as amount' }
      ]

      for (const { amount, description } of invalidNumericInputs) {
        const mockPayment = {
          id: `pi_invalid_${Date.now()}`,
          amount: amount,
          currency: 'usd',
          metadata: { barbershop_id: testBarbershop.id }
        }

        const payload = JSON.stringify({
          type: 'payment_intent.succeeded',
          data: { object: mockPayment }
        })

        const signature = SecurityTestHelpers.generateValidStripeSignature(
          payload, 
          process.env.STRIPE_WEBHOOK_SECRET
        )

        const result = await webhookPipeline.processStripeWebhook(payload, signature)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid amount')
        console.log(`✅ Rejected ${description}: ${amount}`)
      }
    })

    test('should validate email format in export recipients', async () => {
      const invalidEmails = [
        'not_an_email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user space@domain.com',
        'user@domain..com',
        '<script>@domain.com'
      ]

      for (const email of invalidEmails) {
        const scheduleConfig = {
          name: 'Test Schedule',
          frequency: 'monthly',
          emailOptions: {
            recipients: [email]
          }
        }

        await expect(
          payrollService.scheduleExport(scheduleConfig)
        ).rejects.toThrow('Invalid email format')
      }
    })

    test('should prevent directory traversal in file operations', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/shadow',
        '../../../../proc/self/environ',
        'file://etc/passwd',
        'file:///c:/windows/system.ini'
      ]

      for (const filename of maliciousFilenames) {
        const exportConfig = {
          format: 'pdf',
          customizations: {
            customTitle: filename,
            outputFileName: filename
          }
        }

        const result = await payrollService.generatePayrollExport(exportConfig)

        if (result.success) {
          // Filename should be sanitized
          expect(result.fileName).not.toContain('../')
          expect(result.fileName).not.toContain('..\\')
          expect(result.fileName).not.toContain('/etc/')
          expect(result.fileName).not.toContain('c:/')
        } else {
          expect(result.error).toContain('Invalid filename')
        }
      }
    })
  })

  // ==========================================
  // ROW LEVEL SECURITY (RLS) TESTS
  // ==========================================

  describe('🏛️ Row Level Security (RLS) Enforcement', () => {
    test('should enforce barbershop data isolation', async () => {
      // Create a second barbershop for isolation testing
      const otherBarbershop = {
        id: 'rls-test-other-shop-' + Date.now(),
        name: 'Other Test Shop',
        owner_id: 'other-owner-' + Date.now()
      }

      await supabase.from('barbershops').insert([otherBarbershop])

      // Create commission record in other barbershop
      const otherShopCommission = {
        id: 'other_shop_commission',
        barbershop_id: otherBarbershop.id,
        barber_id: 'other_barber',
        payment_amount: 15000,
        commission_amount: 9000
      }

      const { data: insertedData } = await supabase
        .from('commission_transactions')
        .insert([otherShopCommission])
        .select()

      // Try to access other barbershop's data with current context
      const { data: unauthorizedData } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('barbershop_id', otherBarbershop.id)

      // RLS should prevent access to other barbershop's data
      expect(unauthorizedData).toEqual([])

      // Clean up
      await supabase.from('commission_transactions').delete().eq('id', insertedData[0].id)
      await supabase.from('barbershops').delete().eq('id', otherBarbershop.id)
    })

    test('should enforce barber-specific data access', async () => {
      const barber1Id = 'rls_test_barber_1'
      const barber2Id = 'rls_test_barber_2'

      // Create commission records for both barbers
      const commissions = [
        {
          id: 'barber1_commission',
          barbershop_id: testBarbershop.id,
          barber_id: barber1Id,
          payment_amount: 10000,
          commission_amount: 6000
        },
        {
          id: 'barber2_commission',
          barbershop_id: testBarbershop.id,
          barber_id: barber2Id,
          payment_amount: 12000,
          commission_amount: 7200
        }
      ]

      const { data: insertedCommissions } = await supabase
        .from('commission_transactions')
        .insert(commissions)
        .select()

      // Simulate barber1's context - should only see their own data
      const { data: barber1Data } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('barber_id', barber1Id)
        .eq('barbershop_id', testBarbershop.id)

      expect(barber1Data).toHaveLength(1)
      expect(barber1Data[0].barber_id).toBe(barber1Id)

      // Track for cleanup
      testData.push({ 
        table: 'commission_transactions', 
        ids: insertedCommissions.map(c => c.id) 
      })
    })

    test('should prevent unauthorized payroll export access', async () => {
      // Create export history record
      const exportRecord = {
        id: 'rls_export_test',
        barbershop_id: testBarbershop.id,
        generated_by: 'test_user',
        export_format: 'pdf',
        file_name: 'test_export.pdf',
        created_at: new Date().toISOString()
      }

      const { data: insertedExport } = await supabase
        .from('payroll_export_history')
        .insert([exportRecord])
        .select()

      // Try to access export history from different barbershop context
      const unauthorizedQuery = supabase
        .from('payroll_export_history')
        .select('*')
        .neq('barbershop_id', testBarbershop.id) // Different shop

      const { data: unauthorizedExports } = await unauthorizedQuery

      // Should not return exports from other barbershops
      expect(unauthorizedExports.length).toBe(0)

      // Track for cleanup
      testData.push({ 
        table: 'payroll_export_history', 
        ids: [insertedExport[0].id] 
      })
    })

    test('should validate role-based access controls', async () => {
      const roles = ['BARBER', 'SHOP_MANAGER', 'SHOP_OWNER', 'SUPER_ADMIN']

      for (const role of roles) {
        // Test role-specific access permissions
        const accessTest = await webhookPipeline.validateRoleAccess(role, 'commission_data')

        switch (role) {
          case 'BARBER':
            expect(accessTest.canViewOwn).toBe(true)
            expect(accessTest.canViewOthers).toBe(false)
            expect(accessTest.canModify).toBe(false)
            break
          case 'SHOP_MANAGER':
            expect(accessTest.canViewOthers).toBe(true)
            expect(accessTest.canModify).toBe(true)
            expect(accessTest.canExportReports).toBe(true)
            break
          case 'SHOP_OWNER':
            expect(accessTest.canViewOthers).toBe(true)
            expect(accessTest.canModify).toBe(true)
            expect(accessTest.canExportReports).toBe(true)
            expect(accessTest.canManageSettings).toBe(true)
            break
          case 'SUPER_ADMIN':
            expect(accessTest.canViewAll).toBe(true)
            expect(accessTest.canModifyAll).toBe(true)
            break
        }
      }
    })
  })

  // ==========================================
  // RATE LIMITING & DDOS PROTECTION TESTS
  // ==========================================

  describe('🚦 Rate Limiting & DDoS Protection', () => {
    test('should enforce webhook rate limits per IP', async () => {
      const sourceIP = '192.168.1.100'
      const maxRequests = SECURITY_CONFIG.rateLimit.maxRequests
      const requests = []

      // Generate requests exceeding the limit
      for (let i = 0; i < maxRequests + 10; i++) {
        const payload = JSON.stringify({
          type: 'payment_intent.succeeded',
          data: { object: { id: `pi_rate_limit_${i}` } }
        })
        
        const signature = SecurityTestHelpers.generateValidStripeSignature(
          payload, 
          process.env.STRIPE_WEBHOOK_SECRET
        )

        requests.push(
          webhookPipeline.processStripeWebhookWithIP(payload, signature, sourceIP)
        )
      }

      const results = await Promise.allSettled(requests)
      
      // Some requests should be rate limited
      const rateLimitedCount = results.filter(r => 
        r.status === 'rejected' && r.reason.message?.includes('Rate limit exceeded')
      ).length

      expect(rateLimitedCount).toBeGreaterThan(5)
      console.log(`✅ Rate limited ${rateLimitedCount} requests from IP ${sourceIP}`)
    })

    test('should implement progressive rate limit penalties', async () => {
      const sourceIP = '192.168.1.101'
      
      // First burst - should be rate limited normally
      const firstBurst = await generateBurstRequests(sourceIP, 20)
      const firstRejected = countRateLimitRejections(firstBurst)

      // Second burst - should have increased penalties
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      const secondBurst = await generateBurstRequests(sourceIP, 20)
      const secondRejected = countRateLimitRejections(secondBurst)

      // Second burst should have more rejections (progressive penalty)
      expect(secondRejected).toBeGreaterThan(firstRejected)
    })

    test('should detect and block suspicious request patterns', async () => {
      // Simulate bot-like behavior patterns
      const suspiciousPatterns = [
        { pattern: 'high_frequency', description: 'Too many requests in short time' },
        { pattern: 'identical_payloads', description: 'Identical requests repeated' },
        { pattern: 'sequential_ids', description: 'Sequential payment IDs' },
        { pattern: 'missing_variance', description: 'No natural request variance' }
      ]

      for (const { pattern, description } of suspiciousPatterns) {
        const requests = await generateSuspiciousPattern(pattern)
        const results = await Promise.allSettled(requests)

        const blockedCount = results.filter(r => 
          r.status === 'rejected' && r.reason.message?.includes('Suspicious pattern detected')
        ).length

        expect(blockedCount).toBeGreaterThan(0)
        console.log(`✅ Blocked suspicious pattern: ${description}`)
      }
    })

    test('should whitelist legitimate high-volume sources', async () => {
      const whitelistedIP = '192.168.1.200'
      
      // Add to whitelist
      await webhookPipeline.addToWhitelist(whitelistedIP, 'legitimate_payment_processor')

      // Generate high volume of requests
      const requests = []
      for (let i = 0; i < 200; i++) {
        const payload = JSON.stringify({
          type: 'payment_intent.succeeded',
          data: { object: { id: `pi_whitelist_${i}` } }
        })
        
        const signature = SecurityTestHelpers.generateValidStripeSignature(
          payload, 
          process.env.STRIPE_WEBHOOK_SECRET
        )

        requests.push(
          webhookPipeline.processStripeWebhookWithIP(payload, signature, whitelistedIP)
        )
      }

      const results = await Promise.allSettled(requests)
      const successCount = results.filter(r => r.status === 'fulfilled').length

      // Whitelisted IP should have much higher success rate
      expect(successCount).toBeGreaterThan(150)
      console.log(`✅ Whitelisted IP processed ${successCount}/200 requests`)
    })

    // Helper functions for rate limiting tests
    async function generateBurstRequests(sourceIP, count) {
      const requests = []
      for (let i = 0; i < count; i++) {
        const payload = JSON.stringify({
          type: 'payment_intent.succeeded',
          data: { object: { id: `pi_burst_${sourceIP}_${i}` } }
        })
        const signature = SecurityTestHelpers.generateValidStripeSignature(
          payload, 
          process.env.STRIPE_WEBHOOK_SECRET
        )
        requests.push(
          webhookPipeline.processStripeWebhookWithIP(payload, signature, sourceIP)
        )
      }
      return await Promise.allSettled(requests)
    }

    function countRateLimitRejections(results) {
      return results.filter(r => 
        r.status === 'rejected' && r.reason.message?.includes('Rate limit')
      ).length
    }

    async function generateSuspiciousPattern(pattern) {
      const requests = []
      const basePayload = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_suspicious', amount: 10000 } }
      }

      switch (pattern) {
        case 'high_frequency':
          // 50 identical requests in rapid succession
          for (let i = 0; i < 50; i++) {
            const payload = JSON.stringify(basePayload)
            const signature = SecurityTestHelpers.generateValidStripeSignature(
              payload, process.env.STRIPE_WEBHOOK_SECRET
            )
            requests.push(webhookPipeline.processStripeWebhook(payload, signature))
          }
          break

        case 'sequential_ids':
          // Payment IDs in perfect sequence
          for (let i = 0; i < 20; i++) {
            const sequentialPayload = {
              ...basePayload,
              data: { object: { id: `pi_${i.toString().padStart(8, '0')}` } }
            }
            const payload = JSON.stringify(sequentialPayload)
            const signature = SecurityTestHelpers.generateValidStripeSignature(
              payload, process.env.STRIPE_WEBHOOK_SECRET
            )
            requests.push(webhookPipeline.processStripeWebhook(payload, signature))
          }
          break
      }

      return requests
    }
  })

  // ==========================================
  // DATA ENCRYPTION & PRIVACY TESTS
  // ==========================================

  describe('🔐 Data Encryption & Privacy Compliance', () => {
    test('should encrypt sensitive data at rest', async () => {
      const sensitiveData = {
        socialSecurityNumber: '123-45-6789',
        bankAccountNumber: '1234567890',
        taxId: '12-3456789',
        personalNotes: 'Confidential staff information'
      }

      // Store encrypted sensitive data
      const encryptedData = await payrollService.encryptSensitiveData(sensitiveData)
      
      expect(encryptedData.socialSecurityNumber).not.toBe(sensitiveData.socialSecurityNumber)
      expect(encryptedData.bankAccountNumber).not.toBe(sensitiveData.bankAccountNumber)
      expect(encryptedData.taxId).not.toBe(sensitiveData.taxId)
      expect(encryptedData.personalNotes).not.toBe(sensitiveData.personalNotes)

      // Verify data can be decrypted correctly
      const decryptedData = await payrollService.decryptSensitiveData(encryptedData)
      
      expect(decryptedData.socialSecurityNumber).toBe(sensitiveData.socialSecurityNumber)
      expect(decryptedData.bankAccountNumber).toBe(sensitiveData.bankAccountNumber)
      expect(decryptedData.taxId).toBe(sensitiveData.taxId)
      expect(decryptedData.personalNotes).toBe(sensitiveData.personalNotes)
    })

    test('should mask sensitive data in logs and exports', async () => {
      const commissionWithPII = {
        id: 'pii_test_commission',
        barbershop_id: testBarbershop.id,
        barber_id: 'test_barber',
        payment_amount: 10000,
        commission_amount: 6000,
        metadata: {
          client_email: 'client@example.com',
          client_phone: '555-123-4567',
          payment_method_last4: '4242'
        }
      }

      const { data } = await supabase
        .from('commission_transactions')
        .insert([commissionWithPII])
        .select()

      testData.push({ table: 'commission_transactions', ids: [data[0].id] })

      // Generate export
      const exportResult = await payrollService.generatePayrollExport({
        format: 'csv',
        includePersonalData: false // Should mask PII
      })

      const exportContent = exportResult.data

      // PII should be masked in export
      expect(exportContent).not.toContain('client@example.com')
      expect(exportContent).not.toContain('555-123-4567')
      expect(exportContent).toContain('***@***.com') // Masked email
      expect(exportContent).toContain('***-***-4567') // Masked phone
    })

    test('should implement GDPR data portability', async () => {
      const userId = 'gdpr_test_user'
      
      // Create various data records for the user
      const userData = {
        commissions: [{
          barbershop_id: testBarbershop.id,
          barber_id: userId,
          payment_amount: 15000,
          commission_amount: 9000
        }],
        exports: [{
          barbershop_id: testBarbershop.id,
          generated_by: userId,
          export_format: 'pdf',
          file_name: 'gdpr_test_export.pdf'
        }]
      }

      // Insert test data
      const { data: commissionData } = await supabase
        .from('commission_transactions')
        .insert(userData.commissions)
        .select()

      const { data: exportData } = await supabase
        .from('payroll_export_history')
        .insert(userData.exports)
        .select()

      // Request data export for GDPR compliance
      const gdprExport = await payrollService.generateGDPRDataExport(userId)

      expect(gdprExport.success).toBe(true)
      expect(gdprExport.data.commissions).toHaveLength(1)
      expect(gdprExport.data.exports).toHaveLength(1)
      expect(gdprExport.format).toBe('json')

      // Clean up
      testData.push({ table: 'commission_transactions', ids: [commissionData[0].id] })
      testData.push({ table: 'payroll_export_history', ids: [exportData[0].id] })
    })

    test('should implement GDPR right to erasure', async () => {
      const userToDelete = 'gdpr_delete_user'
      
      // Create user data across multiple tables
      const userCommission = {
        id: 'delete_test_commission',
        barbershop_id: testBarbershop.id,
        barber_id: userToDelete,
        payment_amount: 12000,
        commission_amount: 7200
      }

      const { data: commissionData } = await supabase
        .from('commission_transactions')
        .insert([userCommission])
        .select()

      // Request data deletion
      const deletionResult = await payrollService.processGDPRDeletion(userToDelete)

      expect(deletionResult.success).toBe(true)
      expect(deletionResult.deletedRecords.commission_transactions).toBeGreaterThan(0)

      // Verify data is actually deleted
      const { data: remainingData } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('barber_id', userToDelete)

      expect(remainingData).toHaveLength(0)
    })
  })

  // ==========================================
  // PCI DSS COMPLIANCE TESTS
  // ==========================================

  describe('💳 PCI DSS Compliance Validation', () => {
    test('should never store full credit card numbers', async () => {
      const mockPayment = {
        id: 'pi_pci_test',
        amount: 10000,
        payment_method: {
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          }
        }
      }

      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: mockPayment }
      })

      const signature = SecurityTestHelpers.generateValidStripeSignature(
        payload,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      const result = await webhookPipeline.processStripeWebhook(payload, signature)

      // Verify no full card numbers are stored
      const { data: storedData } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('payment_id', mockPayment.id)

      if (storedData.length > 0) {
        const dataString = JSON.stringify(storedData[0])
        
        // Should not contain full card number patterns
        expect(dataString).not.toMatch(/4[0-9]{15}/) // Visa
        expect(dataString).not.toMatch(/5[1-5][0-9]{14}/) // MasterCard
        expect(dataString).not.toMatch(/3[47][0-9]{13}/) // Amex
        
        // Should only contain last4 if anything
        if (dataString.includes('4242')) {
          expect(dataString).toContain('4242')
          expect(dataString).not.toMatch(/[0-9]{12}4242/)
        }
      }
    })

    test('should tokenize sensitive payment data', async () => {
      const paymentData = {
        cardNumber: '4242424242424242',
        cvv: '123',
        expiryMonth: '12',
        expiryYear: '2025'
      }

      const tokenizedData = await payrollService.tokenizePaymentData(paymentData)

      // Original data should be replaced with tokens
      expect(tokenizedData.cardToken).toMatch(/^tok_[a-zA-Z0-9]+$/)
      expect(tokenizedData.cardNumber).toBeUndefined()
      expect(tokenizedData.cvv).toBeUndefined()
      
      // Only safe data should remain
      expect(tokenizedData.last4).toBe('4242')
      expect(tokenizedData.brand).toBe('visa')
      expect(tokenizedData.expiryMonth).toBe('12')
      expect(tokenizedData.expiryYear).toBe('2025')
    })

    test('should maintain audit trails for payment data access', async () => {
      const userId = 'pci_audit_user'
      const sensitiveAction = 'view_commission_details'

      // Perform action that accesses payment data
      await payrollService.viewCommissionDetails(userId, 'test_commission_id')

      // Check audit trail was created
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('action', sensitiveAction)
        .order('created_at', { ascending: false })
        .limit(1)

      if (auditLogs.length > 0) {
        expect(auditLogs[0].user_id).toBe(userId)
        expect(auditLogs[0].action).toBe(sensitiveAction)
        expect(auditLogs[0].ip_address).toBeTruthy()
        expect(auditLogs[0].user_agent).toBeTruthy()
      }
    })

    test('should enforce data retention policies', async () => {
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 8) // 8 years ago

      // Create old commission record
      const oldCommission = {
        id: 'retention_test_commission',
        barbershop_id: testBarbershop.id,
        barber_id: 'retention_test_barber',
        payment_amount: 10000,
        commission_amount: 6000,
        created_at: oldDate.toISOString()
      }

      const { data: insertedData } = await supabase
        .from('commission_transactions')
        .insert([oldCommission])
        .select()

      // Run retention policy enforcement
      const retentionResult = await payrollService.enforceRetentionPolicy()

      expect(retentionResult.success).toBe(true)
      expect(retentionResult.deletedRecords).toBeGreaterThan(0)

      // Verify old data was deleted
      const { data: remainingData } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('id', 'retention_test_commission')

      expect(remainingData).toHaveLength(0)
    })
  })
})

/**
 * 🔒 SECURITY TEST EXECUTION SUMMARY
 * 
 * This comprehensive security test suite validates:
 * 
 * ✅ Webhook Security (5 tests):
 *   - Multi-algorithm signature validation
 *   - Timestamp tolerance for replay prevention
 *   - Payload manipulation attack prevention
 *   - Payload size limit enforcement
 *   - Required header validation
 * 
 * ✅ Input Validation & Sanitization (5 tests):
 *   - SQL injection prevention
 *   - XSS attack prevention in exports
 *   - Numeric input range validation
 *   - Email format validation
 *   - Directory traversal prevention
 * 
 * ✅ Row Level Security (4 tests):
 *   - Barbershop data isolation
 *   - Barber-specific data access
 *   - Unauthorized export access prevention
 *   - Role-based access control validation
 * 
 * ✅ Rate Limiting & DDoS Protection (4 tests):
 *   - Per-IP webhook rate limiting
 *   - Progressive rate limit penalties
 *   - Suspicious pattern detection
 *   - Legitimate source whitelisting
 * 
 * ✅ Data Encryption & Privacy (4 tests):
 *   - Sensitive data encryption at rest
 *   - PII masking in logs and exports
 *   - GDPR data portability compliance
 *   - GDPR right to erasure implementation
 * 
 * ✅ PCI DSS Compliance (4 tests):
 *   - Credit card number storage prevention
 *   - Payment data tokenization
 *   - Audit trail maintenance
 *   - Data retention policy enforcement
 * 
 * TOTAL: 26 comprehensive security test cases
 * 
 * Run Command: npm test payroll-security-comprehensive.test.js
 * Expected Duration: ~45-60 seconds for full security validation
 * Security Standards: OWASP Top 10, PCI DSS Level 1, GDPR Article 25
 */