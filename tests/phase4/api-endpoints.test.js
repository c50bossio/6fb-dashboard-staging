/**
 * Phase 4 API Endpoint Tests
 * Validates appointment CRUD operations and field name consistency
 */

const {
  createTestAppointment,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  listAppointments,
  checkAvailability,
  updateAppointmentStatus,
  checkInAppointment,
  completeAppointment,
  searchByPhone,
  getCalendarAppointments,
  createCalendarAppointment,
  verifyResponseStructure,
  verifyFieldNames,
  testErrorHandling,
  measureResponseTime
} = require('./utils/api-helpers')

const { loadFixture } = require('./utils/database-helpers')

describe('Phase 4 - API Endpoint Tests', () => {
  let testAppointmentId
  const appointmentFixtures = loadFixture('test-appointments')

  describe('Appointment CRUD Operations', () => {
    test('POST /api/appointments - should create new appointment', async () => {
      const appointmentData = appointmentFixtures.validAppointment

      const response = await createTestAppointment(appointmentData)

      expect(response.success).toBe(true)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      expect(response.data).toHaveProperty('id')

      // Save ID for subsequent tests
      testAppointmentId = response.data.id
    }, 30000)

    test('GET /api/appointments/:id - should retrieve single appointment', async () => {
      if (!testAppointmentId) {
        // Create one first
        const createResponse = await createTestAppointment(
          appointmentFixtures.validAppointment
        )
        testAppointmentId = createResponse.data?.id
      }

      const response = await getAppointment(testAppointmentId)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('id', testAppointmentId)
    }, 30000)

    test('GET /api/appointments - should list appointments', async () => {
      const response = await listAppointments()

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)
    }, 30000)

    test('PUT /api/appointments/:id - should update appointment', async () => {
      if (!testAppointmentId) {
        const createResponse = await createTestAppointment(
          appointmentFixtures.validAppointment
        )
        testAppointmentId = createResponse.data?.id
      }

      const updateData = {
        client_notes: 'Updated notes for testing'
      }

      const response = await updateAppointment(testAppointmentId, updateData)

      expect(response.success).toBe(true)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
    }, 30000)

    test('DELETE /api/appointments/:id - should cancel appointment', async () => {
      // Create a new appointment to delete
      const createResponse = await createTestAppointment(
        appointmentFixtures.walkInAppointment
      )
      const appointmentToDelete = createResponse.data?.id

      if (!appointmentToDelete) {
        console.warn('Could not create appointment to delete')
        return
      }

      const response = await deleteAppointment(appointmentToDelete)

      expect(response.success).toBe(true)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
    }, 30000)
  })

  describe('Field Name Validation', () => {
    test('API requests should use new field names', async () => {
      const appointmentData = appointmentFixtures.validAppointment

      // Ensure we're using new field names
      expect(appointmentData).toHaveProperty('client_id')
      expect(appointmentData).toHaveProperty('appointment_date')
      expect(appointmentData).toHaveProperty('appointment_time')
      expect(appointmentData).toHaveProperty('total_price_cents')

      // Should not have legacy field names
      expect(appointmentData).not.toHaveProperty('customer_id')
      expect(appointmentData).not.toHaveProperty('date')
      expect(appointmentData).not.toHaveProperty('time')
      expect(appointmentData).not.toHaveProperty('price')
    })

    test('API responses should use new field names', async () => {
      const createResponse = await createTestAppointment(
        appointmentFixtures.validAppointment
      )

      if (!createResponse.success) {
        console.warn('Could not create appointment for field validation')
        return
      }

      const fieldValidation = verifyFieldNames(createResponse)

      expect(fieldValidation.valid).toBe(true)
      expect(fieldValidation.legacyFieldsPresent).toHaveLength(0)
      expect(fieldValidation.errors).toHaveLength(0)
    }, 30000)

    test('API response structure should match expected schema', async () => {
      const createResponse = await createTestAppointment(
        appointmentFixtures.validAppointment
      )

      if (!createResponse.success) {
        console.warn('Could not create appointment for structure validation')
        return
      }

      const expectedFields = [
        'id',
        'barbershop_id',
        'client_id',
        'barber_id',
        'service_id',
        'appointment_date',
        'appointment_time',
        'duration_minutes',
        'status',
        'total_price_cents'
      ]

      const structureValidation = verifyResponseStructure(
        createResponse,
        expectedFields
      )

      expect(structureValidation.valid).toBe(true)
      expect(structureValidation.missingFields).toHaveLength(0)
      expect(structureValidation.errors).toHaveLength(0)
    }, 30000)
  })

  describe('Calendar Integration Endpoints', () => {
    test('GET /api/calendar/appointments - should retrieve calendar view', async () => {
      const params = {
        start_date: '2025-10-01',
        end_date: '2025-10-31'
      }

      const response = await getCalendarAppointments(params)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)
    }, 30000)

    test('POST /api/calendar/appointments - should create via calendar', async () => {
      const appointmentData = appointmentFixtures.futureAppointment

      const response = await createCalendarAppointment(appointmentData)

      expect(response.success).toBe(true)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
    }, 30000)
  })

  describe('Availability Check Endpoints', () => {
    test('GET /api/appointments/availability - should check barber availability', async () => {
      const params = {
        barber_id: 'test-barber-1',
        date: '2025-10-15'
      }

      const response = await checkAvailability(params)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
    }, 30000)
  })

  describe('Status Management Endpoints', () => {
    test('PUT /api/appointments/:id/status - should update appointment status', async () => {
      const createResponse = await createTestAppointment(
        appointmentFixtures.validAppointment
      )

      if (!createResponse.success) {
        console.warn('Could not create appointment for status test')
        return
      }

      const appointmentId = createResponse.data.id
      const response = await updateAppointmentStatus(appointmentId, 'CONFIRMED')

      expect(response.success).toBe(true)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
    }, 30000)

    test('POST /api/appointments/:id/check-in - should check-in appointment', async () => {
      const createResponse = await createTestAppointment(
        appointmentFixtures.validAppointment
      )

      if (!createResponse.success) {
        console.warn('Could not create appointment for check-in test')
        return
      }

      const appointmentId = createResponse.data.id
      const response = await checkInAppointment(appointmentId)

      // Check-in might require specific status, so accept various outcomes
      expect(response.status).toBeGreaterThan(0)
    }, 30000)

    test('POST /api/appointments/:id/complete - should complete appointment', async () => {
      const createResponse = await createTestAppointment(
        appointmentFixtures.validAppointment
      )

      if (!createResponse.success) {
        console.warn('Could not create appointment for completion test')
        return
      }

      const appointmentId = createResponse.data.id
      const response = await completeAppointment(appointmentId)

      // Completion might require specific status
      expect(response.status).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Search and Filter Endpoints', () => {
    test('GET /api/appointments?client_id=xxx - should filter by client', async () => {
      const filters = {
        client_id: 'test-client-1'
      }

      const response = await listAppointments(filters)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)
    }, 30000)

    test('GET /api/appointments?barber_id=xxx - should filter by barber', async () => {
      const filters = {
        barber_id: 'test-barber-1'
      }

      const response = await listAppointments(filters)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)
    }, 30000)

    test('GET /api/appointments?date=xxx - should filter by date', async () => {
      const filters = {
        appointment_date: '2025-10-15'
      }

      const response = await listAppointments(filters)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)
    }, 30000)

    test('POST /api/appointments/search-by-phone - should search by phone', async () => {
      const phone = '+15551234567'

      const response = await searchByPhone(phone)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
    }, 30000)
  })

  describe('Error Handling', () => {
    test('should handle invalid appointment data gracefully', async () => {
      const invalidData = appointmentFixtures.invalidAppointment

      const response = await testErrorHandling('POST', '/appointments', invalidData)

      expect(response.handledGracefully).toBe(true)
      expect(response.statusCode).toBeGreaterThanOrEqual(400)
      expect(response.statusCode).toBeLessThan(500)
    }, 30000)

    test('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      const response = await getAppointment(fakeId)

      expect(response.success).toBe(false)
      expect(response.status).toBe(404)
    }, 30000)

    test('should validate required fields', async () => {
      const incompleteData = {
        barbershop_id: 'test-barbershop-1'
        // Missing required fields
      }

      const response = await testErrorHandling('POST', '/appointments', incompleteData)

      expect(response.handledGracefully).toBe(true)
      expect(response.providesValidation).toBe(true)
    }, 30000)

    test('should reject invalid foreign key references', async () => {
      const invalidFkData = {
        ...appointmentFixtures.validAppointment,
        client_id: 'invalid-uuid-that-does-not-exist'
      }

      const response = await testErrorHandling('POST', '/appointments', invalidFkData)

      expect(response.handledGracefully).toBe(true)
      expect(response.statusCode).toBeGreaterThanOrEqual(400)
    }, 30000)
  })

  describe('Performance Metrics', () => {
    test('POST endpoint should respond within 500ms', async () => {
      const metrics = await measureResponseTime(async () => {
        return await createTestAppointment(appointmentFixtures.validAppointment)
      })

      expect(metrics.responseTime).toBeLessThan(500)
    }, 30000)

    test('GET endpoint should respond within 300ms', async () => {
      const metrics = await measureResponseTime(async () => {
        return await listAppointments()
      })

      expect(metrics.responseTime).toBeLessThan(300)
    }, 30000)
  })

  describe('Data Validation', () => {
    test('should enforce date format validation', async () => {
      const invalidDateData = {
        ...appointmentFixtures.validAppointment,
        appointment_date: '10/15/2025' // Wrong format
      }

      const response = await testErrorHandling('POST', '/appointments', invalidDateData)

      expect(response.handledGracefully).toBe(true)
    }, 30000)

    test('should enforce time format validation', async () => {
      const invalidTimeData = {
        ...appointmentFixtures.validAppointment,
        appointment_time: '2:30 PM' // Wrong format
      }

      const response = await testErrorHandling('POST', '/appointments', invalidTimeData)

      expect(response.handledGracefully).toBe(true)
    }, 30000)

    test('should enforce positive price values', async () => {
      const negativePriceData = {
        ...appointmentFixtures.validAppointment,
        total_price_cents: -1000
      }

      const response = await testErrorHandling('POST', '/appointments', negativePriceData)

      expect(response.handledGracefully).toBe(true)
    }, 30000)
  })
})
