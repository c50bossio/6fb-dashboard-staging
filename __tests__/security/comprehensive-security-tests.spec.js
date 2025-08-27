/**
 * Comprehensive Security Testing Suite for 6FB AI Agent System Payroll
 * Tests critical security vulnerabilities, authentication, and data protection
 * 
 * Security Coverage:
 * 1. Webhook Security & Signature Verification
 * 2. Row Level Security (RLS) Policy Validation
 * 3. Authentication & Authorization Testing
 * 4. Input Validation & Injection Prevention
 * 5. Rate Limiting & Anti-Replay Protection
 * 6. Data Encryption & PCI Compliance
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const crypto = require('crypto')
const { performance } = require('perf_hooks')

describe('Comprehensive Security Test Suite', () => {
  let testHarness

  beforeAll(async () => {
    testHarness = await setupSecurityTestHarness()
  })

  afterAll(async () => {
    await cleanupSecurityTests()
  })

  describe('Webhook Security Validation', () => {
    it('should reject webhooks with invalid Stripe signatures', async () => {
      const maliciousPayload = JSON.stringify({
        id: 'evt_malicious',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_fake_payment',
            amount: 100000, // $1000 - trying to create large commission
            metadata: {
              barber_id: 'target_barber',
              barbershop_id: 'target_shop'
            }
          }
        }
      })

      const invalidSignature = 'invalid_signature_attempt'

      const response = await testHarness.sendWebhook(maliciousPayload, invalidSignature)

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Invalid signature')
      
      // Verify no commission was processed
      const commissionCount = await testHarness.countCommissions('pi_fake_payment')
      expect(commissionCount).toBe(0)

      // Verify security event was logged
      const securityLogs = await testHarness.getSecurityLogs('invalid_signature')
      expect(securityLogs.length).toBeGreaterThan(0)
    })

    it('should prevent replay attacks with duplicate event IDs', async () => {
      const legitimatePayload = JSON.stringify({
        id: 'evt_replay_attempt',
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'pi_legitimate_payment',
            amount: 10000,
            metadata: {
              barber_id: testHarness.testBarber.id,
              barbershop_id: testHarness.testShop.id
            }
          }
        }
      })

      const validSignature = testHarness.generateValidSignature(legitimatePayload)

      // First request should succeed
      const firstResponse = await testHarness.sendWebhook(legitimatePayload, validSignature)
      expect(firstResponse.status).toBe(200)

      // Replay attempt should be rejected
      const replayResponse = await testHarness.sendWebhook(legitimatePayload, validSignature)
      expect(replayResponse.status).toBe(400)
      expect(replayResponse.body.error).toContain('Duplicate event')

      // Verify only one commission was processed
      const commissionCount = await testHarness.countCommissions('pi_legitimate_payment')
      expect(commissionCount).toBe(1)
    })

    it('should enforce webhook signature timestamp validation', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600 // 10 minutes ago
      const payload = JSON.stringify({
        id: 'evt_old_webhook',
        type: 'payment_intent.succeeded',
        created: oldTimestamp,
        data: { object: { id: 'pi_old_payment' } }
      })

      const expiredSignature = testHarness.generateSignatureWithTimestamp(payload, oldTimestamp)

      const response = await testHarness.sendWebhook(payload, expiredSignature)

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Request too old')
    })

    it('should sanitize webhook payload data to prevent injection', async () => {
      const maliciousPayload = JSON.stringify({
        id: 'evt_injection_test',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_injection_test',
            amount: 5000,
            metadata: {
              barber_id: testHarness.testBarber.id,
              barbershop_id: testHarness.testShop.id,
              customer_name: '<script>alert("XSS")</script>',
              notes: "'; DROP TABLE commission_transactions; --",
              custom_field: '${process.env.SECRET_KEY}'
            }
          }
        }
      })

      const validSignature = testHarness.generateValidSignature(maliciousPayload)
      const response = await testHarness.sendWebhook(maliciousPayload, validSignature)

      expect(response.status).toBe(200) // Should process but sanitize

      // Verify data was sanitized in database
      const commission = await testHarness.getCommission('pi_injection_test')
      expect(commission.metadata.customer_name).not.toContain('<script>')
      expect(commission.metadata.notes).not.toContain('DROP TABLE')
      expect(commission.metadata.custom_field).not.toContain('${process')
    })
  })

  describe('Row Level Security (RLS) Policy Validation', () => {
    it('should enforce barbershop isolation in commission data', async () => {
      // Create commission for Shop A
      await testHarness.createCommission({
        barber_id: testHarness.testBarber.id,
        barbershop_id: testHarness.testShop.id,
        commission_amount: 100.00
      })

      // Try to access as Shop B user
      const shopBUser = await testHarness.createUser('shopb_owner', 'shop_b')
      
      const unauthorizedAccess = await testHarness.queryAsUser(shopBUser, {
        table: 'commission_transactions',
        filters: { barbershop_id: testHarness.testShop.id }
      })

      expect(unauthorizedAccess.data).toEqual([]) // Should return empty due to RLS
      expect(unauthorizedAccess.count).toBe(0)
    })

    it('should allow barbers to access only their own commission data', async () => {
      const barberA = testHarness.testBarber
      const barberB = await testHarness.createBarber('barber_b', testHarness.testShop.id)

      // Create commissions for both barbers
      await testHarness.createCommission({ barber_id: barberA.id, commission_amount: 60.00 })
      await testHarness.createCommission({ barber_id: barberB.id, commission_amount: 80.00 })

      // Barber A should only see their own data
      const barberAData = await testHarness.queryAsUser(barberA, {
        table: 'commission_transactions',
        filters: {}
      })

      expect(barberAData.data.length).toBe(1)
      expect(barberAData.data[0].barber_id).toBe(barberA.id)

      // Barber B should only see their own data
      const barberBData = await testHarness.queryAsUser(barberB, {
        table: 'commission_transactions',
        filters: {}
      })

      expect(barberBData.data.length).toBe(1)
      expect(barberBData.data[0].barber_id).toBe(barberB.id)
    })

    it('should prevent unauthorized tier structure modifications', async () => {
      const unauthorizedUser = await testHarness.createUser('hacker', null)

      const maliciousUpdate = await testHarness.queryAsUser(unauthorizedUser, {
        table: 'commission_tier_structures',
        operation: 'update',
        data: { commission_multiplier: 999 },
        filters: { id: testHarness.testTierStructure.id }
      })

      expect(maliciousUpdate.error).toBeTruthy()
      expect(maliciousUpdate.error.code).toBe('42501') // Insufficient privilege

      // Verify tier structure was not modified
      const tierStructure = await testHarness.getTierStructure(testHarness.testTierStructure.id)
      expect(tierStructure.commission_multiplier).not.toBe(999)
    })

    it('should validate payout history access permissions', async () => {
      const payoutRecord = await testHarness.createPayoutRecord({
        barber_id: testHarness.testBarber.id,
        barbershop_id: testHarness.testShop.id,
        amount: 500.00,
        status: 'completed'
      })

      // Shop owner should have access
      const ownerAccess = await testHarness.queryAsUser(testHarness.testShopOwner, {
        table: 'payout_history',
        filters: { id: payoutRecord.id }
      })
      expect(ownerAccess.data.length).toBe(1)

      // Different shop owner should not have access
      const otherShopOwner = await testHarness.createUser('other_owner', 'other_shop')
      const unauthorizedAccess = await testHarness.queryAsUser(otherShopOwner, {
        table: 'payout_history',
        filters: { id: payoutRecord.id }
      })
      expect(unauthorizedAccess.data.length).toBe(0)
    })
  })

  describe('Authentication & Authorization Security', () => {
    it('should require valid JWT tokens for payroll endpoints', async () => {
      const endpoints = [
        '/api/payroll/export',
        '/api/payroll/balance',
        '/api/payroll/history',
        '/api/payroll/tiers'
      ]

      for (const endpoint of endpoints) {
        // No token
        const noTokenResponse = await testHarness.apiRequest(endpoint, null)
        expect(noTokenResponse.status).toBe(401)

        // Invalid token
        const invalidTokenResponse = await testHarness.apiRequest(endpoint, 'invalid.jwt.token')
        expect(invalidTokenResponse.status).toBe(401)

        // Expired token
        const expiredToken = testHarness.generateExpiredToken()
        const expiredTokenResponse = await testHarness.apiRequest(endpoint, expiredToken)
        expect(expiredTokenResponse.status).toBe(401)
      }
    })

    it('should enforce role-based access for payroll export', async () => {
      const roles = [
        { role: 'client', shouldHaveAccess: false },
        { role: 'barber', shouldHaveAccess: true, scope: 'own_data' },
        { role: 'shop_owner', shouldHaveAccess: true, scope: 'shop_data' },
        { role: 'admin', shouldHaveAccess: true, scope: 'all_data' }
      ]

      for (const roleTest of roles) {
        const user = await testHarness.createUserWithRole(roleTest.role)
        const token = testHarness.generateValidToken(user)

        const response = await testHarness.apiRequest('/api/payroll/export', token, {
          barbershop_id: testHarness.testShop.id,
          format: 'pdf'
        })

        if (roleTest.shouldHaveAccess) {
          expect(response.status).toBe(200)
          
          // Verify scope restrictions
          if (roleTest.scope === 'own_data') {
            expect(response.data.records.every(r => r.barber_id === user.id)).toBe(true)
          }
        } else {
          expect(response.status).toBe(403)
        }
      }
    })

    it('should validate session security and concurrent login limits', async () => {
      const user = testHarness.testBarber
      const maxConcurrentSessions = 3

      // Create multiple sessions
      const sessions = []
      for (let i = 0; i < 5; i++) {
        const session = await testHarness.createUserSession(user, `device_${i}`)
        sessions.push(session)
      }

      // Verify only max allowed sessions are active
      const activeSessions = await testHarness.getActiveSessions(user.id)
      expect(activeSessions.length).toBeLessThanOrEqual(maxConcurrentSessions)

      // Verify oldest sessions were invalidated
      const oldestSessions = sessions.slice(0, 2)
      for (const session of oldestSessions) {
        const isValid = await testHarness.validateSession(session.token)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Rate Limiting & DDoS Protection', () => {
    it('should enforce rate limits on webhook endpoints', async () => {
      const requests = []
      const payload = JSON.stringify({
        id: 'evt_rate_limit_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_rate_test' } }
      })

      // Send 200 requests in quick succession (exceeds 100/minute limit)
      for (let i = 0; i < 200; i++) {
        requests.push(
          testHarness.sendWebhook(payload.replace('evt_rate_limit_test', `evt_${i}`))
        )
      }

      const responses = await Promise.allSettled(requests)
      const rateLimited = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      )

      expect(rateLimited.length).toBeGreaterThan(50) // At least 25% should be rate limited
    })

    it('should implement progressive backoff for repeated violations', async () => {
      const attackerIP = '192.168.1.100'
      
      // First violation - short timeout
      await testHarness.triggerRateLimit(attackerIP)
      let blockDuration = await testHarness.getBlockDuration(attackerIP)
      expect(blockDuration).toBeLessThanOrEqual(60) // 1 minute

      // Second violation - longer timeout
      await testHarness.triggerRateLimit(attackerIP)
      blockDuration = await testHarness.getBlockDuration(attackerIP)
      expect(blockDuration).toBeLessThanOrEqual(300) // 5 minutes

      // Third violation - extended timeout
      await testHarness.triggerRateLimit(attackerIP)
      blockDuration = await testHarness.getBlockDuration(attackerIP)
      expect(blockDuration).toBeLessThanOrEqual(3600) // 1 hour
    })

    it('should rate limit API endpoints by user and IP', async () => {
      const user = testHarness.testBarber
      const token = testHarness.generateValidToken(user)

      const requests = []
      // Exceed per-user rate limit (50/minute)
      for (let i = 0; i < 75; i++) {
        requests.push(
          testHarness.apiRequest('/api/payroll/balance', token)
        )
      }

      const responses = await Promise.allSettled(requests)
      const successfulRequests = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length

      expect(successfulRequests).toBeLessThanOrEqual(50)
    })
  })

  describe('Data Encryption & PCI Compliance', () => {
    it('should encrypt sensitive data at rest', async () => {
      const sensitiveData = {
        ssn: '123-45-6789',
        bank_account: '1234567890',
        routing_number: '021000021'
      }

      await testHarness.storeSensitiveData(testHarness.testBarber.id, sensitiveData)

      // Verify data is encrypted in database
      const rawData = await testHarness.getRawDatabaseRecord('encrypted_barber_data', {
        barber_id: testHarness.testBarber.id
      })

      expect(rawData.ssn_encrypted).not.toBe(sensitiveData.ssn)
      expect(rawData.bank_account_encrypted).not.toBe(sensitiveData.bank_account)
      expect(rawData.routing_number_encrypted).not.toBe(sensitiveData.routing_number)

      // Verify data decrypts correctly when accessed through API
      const decryptedData = await testHarness.getSensitiveData(testHarness.testBarber.id)
      expect(decryptedData.ssn).toBe(sensitiveData.ssn)
    })

    it('should mask sensitive data in logs and responses', async () => {
      const paymentData = {
        card_number: '4242424242424242',
        cvv: '123',
        expiry: '12/25'
      }

      await testHarness.processPayment(paymentData)

      // Verify sensitive data is masked in logs
      const logs = await testHarness.getApplicationLogs()
      const paymentLogs = logs.filter(log => log.message.includes('payment'))

      paymentLogs.forEach(log => {
        expect(log.message).not.toContain('4242424242424242')
        expect(log.message).not.toContain('123') // CVV
        expect(log.message).toMatch(/\*{12}\d{4}/) // Should show ****1234 format
      })
    })

    it('should enforce TLS for all sensitive communications', async () => {
      const insecureEndpoints = [
        'http://api.test.com/api/payroll/export',
        'http://api.test.com/api/webhooks/stripe'
      ]

      for (const endpoint of insecureEndpoints) {
        const response = await testHarness.makeRequest(endpoint)
        // Should redirect to HTTPS or reject
        expect([301, 302, 403, 426]).toContain(response.status)
      }
    })

    it('should validate PCI DSS compliance requirements', async () => {
      const complianceChecks = await testHarness.runPCIComplianceChecks()

      expect(complianceChecks.dataEncryption).toBe(true)
      expect(complianceChecks.accessControl).toBe(true)
      expect(complianceChecks.networkSecurity).toBe(true)
      expect(complianceChecks.regularTesting).toBe(true)
      expect(complianceChecks.informationSecurityPolicy).toBe(true)
    })
  })

  describe('Input Validation & Injection Prevention', () => {
    it('should prevent SQL injection in commission queries', async () => {
      const maliciousInputs = [
        "'; DROP TABLE commission_transactions; --",
        "' UNION SELECT * FROM users WHERE ''='",
        "'; UPDATE commission_transactions SET commission_amount = 999999; --",
        "' OR 1=1; --"
      ]

      for (const maliciousInput of maliciousInputs) {
        const response = await testHarness.queryCommissions({
          barber_id: maliciousInput,
          barbershop_id: testHarness.testShop.id
        })

        // Query should either fail safely or return no results
        expect(response.status).toBe(200)
        expect(response.data).toEqual([])
        
        // Verify no data corruption occurred
        const tableExists = await testHarness.checkTableExists('commission_transactions')
        expect(tableExists).toBe(true)
      }
    })

    it('should validate and sanitize financial amounts', async () => {
      const invalidAmounts = [
        -100.00,           // Negative amount
        0,                 // Zero amount
        999999999.99,      // Unreasonably large
        'not_a_number',    // Invalid type
        '100.001',         // Too many decimal places
        null,              // Null value
        undefined          // Undefined value
      ]

      for (const amount of invalidAmounts) {
        const response = await testHarness.createCommission({
          barber_id: testHarness.testBarber.id,
          barbershop_id: testHarness.testShop.id,
          commission_amount: amount
        })

        expect(response.error).toBeTruthy()
        expect(response.error.message).toContain('Invalid amount')
      }
    })

    it('should prevent NoSQL injection in metadata fields', async () => {
      const maliciousMetadata = {
        $where: 'function() { return true; }',
        $ne: null,
        customer_notes: { $regex: '.*' },
        booking_data: '{"$eval": "db.users.drop()"}'
      }

      const response = await testHarness.processWebhook({
        payment_intent_id: 'pi_nosql_test',
        metadata: maliciousMetadata
      })

      expect(response.status).toBe(200) // Should process but sanitize
      
      // Verify malicious operators were stripped
      const commission = await testHarness.getCommission('pi_nosql_test')
      expect(commission.metadata).not.toHaveProperty('$where')
      expect(commission.metadata).not.toHaveProperty('$ne')
      expect(typeof commission.metadata.customer_notes).toBe('string')
    })

    it('should validate file upload security for payroll exports', async () => {
      const maliciousUploads = [
        { filename: '../../../etc/passwd', type: 'path_traversal' },
        { filename: 'malware.exe', type: 'executable' },
        { filename: 'script.php', type: 'server_script' },
        { filename: 'large_file.csv', size: 100 * 1024 * 1024, type: 'oversized' }
      ]

      for (const upload of maliciousUploads) {
        const response = await testHarness.uploadPayrollTemplate(upload)
        
        expect(response.status).toBe(400)
        expect(response.error).toMatch(/invalid|unsafe|too large/i)
      }
    })
  })

  describe('Privacy & Data Protection', () => {
    it('should implement GDPR data erasure requirements', async () => {
      const userData = await testHarness.createUserWithData(testHarness.testBarber.id, {
        personal_data: 'sensitive information',
        commission_history: [100, 150, 200],
        contact_info: { email: 'test@example.com', phone: '555-1234' }
      })

      // Request data deletion
      await testHarness.requestDataDeletion(testHarness.testBarber.id)

      // Verify PII is anonymized/deleted
      const anonymizedUser = await testHarness.getUser(testHarness.testBarber.id)
      expect(anonymizedUser.email).toMatch(/deleted_user_\d+@deleted\.com/)
      expect(anonymizedUser.phone).toBe('[DELETED]')
      
      // Verify financial records are preserved for legal compliance
      const commissionRecords = await testHarness.getCommissionHistory(testHarness.testBarber.id)
      expect(commissionRecords.length).toBeGreaterThan(0)
      expect(commissionRecords[0].barber_id).toBe(testHarness.testBarber.id) // ID preserved
      expect(commissionRecords[0].personal_data).toBeUndefined() // PII removed
    })

    it('should provide data portability for user requests', async () => {
      const dataExport = await testHarness.exportUserData(testHarness.testBarber.id)

      expect(dataExport).toHaveProperty('personal_information')
      expect(dataExport).toHaveProperty('commission_history')
      expect(dataExport).toHaveProperty('payout_history')
      expect(dataExport).toHaveProperty('tier_progression')

      // Verify data is in machine-readable format
      expect(typeof dataExport).toBe('object')
      expect(Array.isArray(dataExport.commission_history)).toBe(true)
    })

    it('should audit access to sensitive financial data', async () => {
      const sensitiveOperations = [
        { operation: 'view_payroll_export', user: testHarness.testShopOwner },
        { operation: 'modify_commission_rate', user: testHarness.testShopOwner },
        { operation: 'access_tier_data', user: testHarness.testBarber }
      ]

      for (const op of sensitiveOperations) {
        await testHarness.performOperation(op.operation, op.user)
      }

      // Verify all operations were audited
      const auditLogs = await testHarness.getAuditLogs()
      
      sensitiveOperations.forEach(op => {
        const auditEntry = auditLogs.find(
          log => log.operation === op.operation && log.user_id === op.user.id
        )
        expect(auditEntry).toBeTruthy()
        expect(auditEntry.timestamp).toBeTruthy()
        expect(auditEntry.ip_address).toBeTruthy()
      })
    })
  })

  describe('Performance & Load Security Testing', () => {
    it('should maintain security under high load conditions', async () => {
      const concurrentRequests = 100
      const requestPromises = []

      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          testHarness.sendAuthenticatedRequest('/api/payroll/balance', {
            user: testHarness.testBarber,
            delay: Math.random() * 100 // Randomize timing
          })
        )
      }

      const responses = await Promise.allSettled(requestPromises)
      
      // All authenticated requests should maintain security
      const validResponses = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      )

      // Verify no security bypasses occurred under load
      validResponses.forEach(response => {
        expect(response.value.headers).toHaveProperty('x-ratelimit-remaining')
        expect(response.value.headers).toHaveProperty('x-security-headers')
      })

      // Verify rate limiting still functioned
      const rateLimited = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      )
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should resist timing attacks on authentication', async () => {
      const timingTests = []
      const validUser = testHarness.testBarber
      const invalidUser = 'nonexistent_user@test.com'

      // Measure authentication timing for valid vs invalid users
      for (let i = 0; i < 50; i++) {
        // Valid user
        const validStart = performance.now()
        await testHarness.authenticate(validUser.email, 'correct_password')
        const validTime = performance.now() - validStart
        timingTests.push({ type: 'valid', time: validTime })

        // Invalid user
        const invalidStart = performance.now()
        await testHarness.authenticate(invalidUser, 'wrong_password')
        const invalidTime = performance.now() - invalidStart
        timingTests.push({ type: 'invalid', time: invalidTime })
      }

      // Calculate timing statistics
      const validTimes = timingTests.filter(t => t.type === 'valid').map(t => t.time)
      const invalidTimes = timingTests.filter(t => t.type === 'invalid').map(t => t.time)

      const validAvg = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
      const invalidAvg = invalidTimes.reduce((sum, time) => sum + time, 0) / invalidTimes.length

      // Timing difference should be minimal to prevent timing attacks
      const timingDifference = Math.abs(validAvg - invalidAvg)
      expect(timingDifference).toBeLessThan(50) // Less than 50ms difference
    })

    it('should handle memory exhaustion attacks gracefully', async () => {
      const largePayloads = []

      // Create increasingly large payloads to test memory limits
      for (let size = 1; size <= 10; size++) {
        const payload = 'x'.repeat(size * 1024 * 1024) // 1MB, 2MB, ... 10MB
        largePayloads.push(
          testHarness.sendWebhook(JSON.stringify({
            id: `evt_large_${size}`,
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test', metadata: { large_data: payload } } }
          }))
        )
      }

      const responses = await Promise.allSettled(largePayloads)
      
      // Large requests should be rejected without crashing service
      const rejectedRequests = responses.filter(
        r => r.status === 'fulfilled' && [400, 413, 429].includes(r.value.status)
      )

      expect(rejectedRequests.length).toBeGreaterThan(5) // At least half should be rejected

      // Service should remain responsive
      const healthCheck = await testHarness.checkServiceHealth()
      expect(healthCheck.status).toBe('healthy')
      expect(healthCheck.memory_usage).toBeLessThan(0.9) // Below 90% memory usage
    })
  })

  // Security Test Harness Implementation
  async function setupSecurityTestHarness() {
    // Initialize test environment with security focus
    const harness = {
      testShop: await createTestShop(),
      testBarber: await createTestBarber(),
      testShopOwner: await createTestShopOwner(),
      
      sendWebhook: async (payload, signature) => {
        return await fetch('/api/webhooks/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature || generateValidSignature(payload)
          },
          body: payload
        })
      },

      generateValidSignature: (payload) => {
        const timestamp = Math.floor(Date.now() / 1000)
        const secret = process.env.STRIPE_WEBHOOK_SECRET || 'test_secret'
        const signature = crypto
          .createHmac('sha256', secret)
          .update(timestamp + '.' + payload)
          .digest('hex')
        return `t=${timestamp},v1=${signature}`
      },

      countCommissions: async (paymentIntentId) => {
        const { count } = await supabase
          .from('commission_transactions')
          .select('*', { count: 'exact' })
          .eq('payment_intent_id', paymentIntentId)
        return count
      },

      getSecurityLogs: async (eventType) => {
        const { data } = await supabase
          .from('webhook_security_logs')
          .select('*')
          .eq('event_type', eventType)
          .order('created_at', { ascending: false })
        return data || []
      }
    }

    return harness
  }
})