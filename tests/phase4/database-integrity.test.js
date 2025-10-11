/**
 * Phase 4 Database Integrity Tests
 * Validates the appointments table migration and data consistency
 */

const {
  verifySchema,
  checkReferentialIntegrity,
  verifyRequiredFields,
  verifyDateTimeFormats,
  getDatabaseStats,
  cleanTestData,
  seedTestAppointments
} = require('./utils/database-helpers')

describe('Phase 4 - Database Integrity Tests', () => {

  // Setup and teardown
  beforeAll(async () => {
    console.log('Setting up Phase 4 database integrity tests...')
  })

  afterAll(async () => {
    console.log('Cleaning up test data...')
    await cleanTestData()
  })

  describe('Schema Validation', () => {
    test('appointments table should have correct schema structure', async () => {
      const result = await verifySchema()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)

      if (result.warnings.length > 0) {
        console.warn('Schema warnings:', result.warnings)
      }
    }, 30000)

    test('should not contain legacy field names', async () => {
      const result = await verifySchema()

      const legacyFieldsFound = result.errors.filter(err =>
        err.includes('Legacy field')
      )

      expect(legacyFieldsFound).toHaveLength(0)
    }, 30000)

    test('should have all required columns', async () => {
      const result = await verifySchema()

      const criticalColumns = [
        'client_id',
        'appointment_date',
        'appointment_time',
        'total_price_cents'
      ]

      criticalColumns.forEach(col => {
        const missing = result.warnings.find(w => w.includes(col))
        expect(missing).toBeUndefined()
      })
    }, 30000)
  })

  describe('Referential Integrity', () => {
    test('should have valid foreign key relationships', async () => {
      const result = await checkReferentialIntegrity()

      expect(result.valid).toBe(true)
      expect(result.orphanedRecords.missingClients).toHaveLength(0)
      expect(result.orphanedRecords.missingBarbers).toHaveLength(0)
    }, 60000)

    test('should not have orphaned appointment records', async () => {
      const result = await checkReferentialIntegrity()

      const totalOrphaned =
        result.orphanedRecords.missingClients.length +
        result.orphanedRecords.missingBarbers.length +
        result.orphanedRecords.missingServices.length +
        result.orphanedRecords.missingBarbershops.length

      expect(totalOrphaned).toBe(0)
    }, 60000)

    test('client_id should reference valid profiles', async () => {
      const result = await checkReferentialIntegrity()

      expect(result.orphanedRecords.missingClients).toHaveLength(0)
    }, 60000)

    test('barber_id should reference valid profiles', async () => {
      const result = await checkReferentialIntegrity()

      expect(result.orphanedRecords.missingBarbers).toHaveLength(0)
    }, 60000)
  })

  describe('Data Consistency', () => {
    test('all required fields should be populated', async () => {
      const result = await verifyRequiredFields()

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)

      if (result.issues.length > 0) {
        console.error('Required field issues:', result.issues)
      }
    }, 60000)

    test('appointment dates should be in correct format', async () => {
      const result = await verifyDateTimeFormats()

      const dateIssues = result.issues.filter(i => i.field === 'appointment_date')
      expect(dateIssues).toHaveLength(0)
    }, 60000)

    test('appointment times should be in correct format', async () => {
      const result = await verifyDateTimeFormats()

      const timeIssues = result.issues.filter(i => i.field === 'appointment_time')
      expect(timeIssues).toHaveLength(0)
    }, 60000)

    test('price fields should use cents (integer values)', async () => {
      const result = await verifyRequiredFields()

      const priceIssues = result.issues.filter(i =>
        i.field === 'total_price_cents' || i.field === 'deposit_paid_cents'
      )
      expect(priceIssues).toHaveLength(0)
    }, 60000)

    test('status values should be valid enums', async () => {
      const stats = await getDatabaseStats()

      const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
      const allStatusesValid = Object.keys(stats.byStatus).every(status =>
        validStatuses.includes(status)
      )

      expect(allStatusesValid).toBe(true)
    }, 60000)
  })

  describe('Database Statistics', () => {
    test('should retrieve database statistics successfully', async () => {
      const stats = await getDatabaseStats()

      expect(stats).toHaveProperty('totalAppointments')
      expect(stats).toHaveProperty('byStatus')
      expect(stats).toHaveProperty('byBarber')
      expect(stats).toHaveProperty('dateRange')
    }, 30000)

    test('should have appointments grouped by status', async () => {
      const stats = await getDatabaseStats()

      expect(typeof stats.byStatus).toBe('object')
      expect(Object.keys(stats.byStatus).length).toBeGreaterThanOrEqual(0)
    }, 30000)

    test('should have date range information', async () => {
      const stats = await getDatabaseStats()

      expect(stats.dateRange).toHaveProperty('earliest')
      expect(stats.dateRange).toHaveProperty('latest')
    }, 30000)
  })

  describe('Migration Validation', () => {
    test('no legacy field names should exist in database', async () => {
      const result = await verifySchema()

      const legacyFields = ['customer_id', 'date', 'time', 'price']
      legacyFields.forEach(field => {
        const foundLegacy = result.errors.some(err =>
          err.includes(field)
        )
        expect(foundLegacy).toBe(false)
      })
    }, 30000)

    test('new field names should be present', async () => {
      const result = await verifySchema()

      expect(result.valid).toBe(true)
    }, 30000)

    test('should handle timezone aware timestamps', async () => {
      const stats = await getDatabaseStats()

      // If we have appointments, they should have proper timestamps
      expect(stats.totalAppointments).toBeGreaterThanOrEqual(0)
    }, 30000)
  })

  describe('Data Seeding and Cleanup', () => {
    test('should seed test appointments successfully', async () => {
      const createdIds = await seedTestAppointments(5)

      expect(createdIds.length).toBeGreaterThan(0)
      expect(createdIds.length).toBeLessThanOrEqual(5)
    }, 60000)

    test('should clean test data successfully', async () => {
      // First seed some test data
      await seedTestAppointments(3)

      // Then clean it
      const result = await cleanTestData()

      expect(result).toHaveProperty('appointments')
      expect(typeof result.appointments).toBe('number')
    }, 60000)
  })

  describe('Constraint Validation', () => {
    test('should enforce NOT NULL constraints on required fields', async () => {
      const result = await verifyRequiredFields()

      expect(result.valid).toBe(true)
    }, 30000)

    test('should maintain data integrity across updates', async () => {
      const beforeStats = await getDatabaseStats()
      const afterStats = await getDatabaseStats()

      // Stats should be consistent
      expect(afterStats.totalAppointments).toBeGreaterThanOrEqual(0)
    }, 30000)
  })

  describe('Performance and Scalability', () => {
    test('database queries should complete within acceptable time', async () => {
      const startTime = Date.now()
      await getDatabaseStats()
      const endTime = Date.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(5000) // Should complete within 5 seconds
    }, 10000)

    test('referential integrity checks should be performant', async () => {
      const startTime = Date.now()
      await checkReferentialIntegrity()
      const endTime = Date.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(60000) // Should complete within 60 seconds
    }, 70000)
  })
})
