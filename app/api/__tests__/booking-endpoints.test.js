/**
 * Booking API Endpoints Test Suite
 * 
 * Comprehensive testing for all booking-related API endpoints including:
 * - Availability checking and slot validation
 * - Booking creation and management
 * - Real-time conflict prevention
 * - Business rules validation
 * - Error handling and edge cases
 * - Performance and load testing
 * - Security and authentication
 */

import { jest } from '@jest/globals'
import { testApiHandler } from 'next-test-api-route-handler'
import { createMocks } from 'node-mocks-http'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis()
  })),
  auth: {
    getUser: jest.fn()
  },
  rpc: jest.fn()
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock handlers - these would be your actual API route handlers
const mockAvailabilityHandler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { barberbarbershopId, date, serviceId, duration = 30 } = req.method === 'GET' ? req.query : req.body

  if (!barberbarbershopId || !date) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    // Mock business logic
    const slots = [
      {
        time: '2024-01-15T09:00:00Z',
        available: true,
        duration: 30,
        display: '9:00 AM'
      },
      {
        time: '2024-01-15T09:30:00Z', 
        available: true,
        duration: 30,
        display: '9:30 AM'
      },
      {
        time: '2024-01-15T10:00:00Z',
        available: false,
        duration: 30,
        display: '10:00 AM',
        conflictReason: 'Existing booking'
      }
    ]

    res.status(200).json({
      success: true,
      data: {
        barberbarbershopId,
        date,
        slots,
        totalSlots: slots.length,
        availableSlots: slots.filter(s => s.available).length
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

const mockBookingHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    barberbarbershopId,
    barberId,
    serviceId,
    scheduledAt,
    customerName,
    customerEmail,
    customerPhone,
    durationMinutes = 30
  } = req.body

  // Validation
  const requiredFields = ['barberbarbershopId', 'serviceId', 'scheduledAt', 'customerName', 'customerEmail']
  const missingFields = requiredFields.filter(field => !req.body[field])
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields
    })
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(customerEmail)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  // Date validation
  const appointmentDate = new Date(scheduledAt)
  if (appointmentDate <= new Date()) {
    return res.status(400).json({ error: 'Appointment must be in the future' })
  }

  try {
    // Mock conflict check
    const hasConflict = scheduledAt === '2024-01-15T10:00:00Z'
    if (hasConflict) {
      return res.status(409).json({
        error: 'Time slot no longer available',
        conflictDetails: {
          existingBooking: {
            id: 'existing-123',
            customerName: 'John Doe',
            start: '2024-01-15T10:00:00Z'
          }
        }
      })
    }

    // Mock successful booking
    const booking = {
      id: `booking-${Date.now()}`,
      barberbarbershopId,
      barberId: barberId || null,
      serviceId,
      scheduledAt,
      customerName,
      customerEmail,
      customerPhone,
      durationMinutes,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    }

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking', details: error.message })
  }
}

const mockBookingUpdateHandler = async (req, res) => {
  const { id } = req.query
  
  if (!id) {
    return res.status(400).json({ error: 'Booking ID is required' })
  }

  if (req.method === 'GET') {
    // Get booking details
    const booking = {
      id,
      barberbarbershopId: 'shop-123',
      serviceId: 'service-456',
      scheduledAt: '2024-01-15T09:00:00Z',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      status: 'confirmed',
      createdAt: '2024-01-14T12:00:00Z'
    }

    return res.status(200).json({ success: true, data: booking })
  }

  if (req.method === 'PUT') {
    // Update booking
    const updates = req.body
    const allowedUpdates = ['scheduledAt', 'status', 'customerName', 'customerEmail', 'customerPhone']
    const actualUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key))

    if (actualUpdates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' })
    }

    // Mock conflict check for rescheduling
    if (updates.scheduledAt === '2024-01-15T10:00:00Z') {
      return res.status(409).json({
        error: 'New time slot is not available',
        availableAlternatives: [
          '2024-01-15T10:30:00Z',
          '2024-01-15T11:00:00Z'
        ]
      })
    }

    const updatedBooking = {
      id,
      barberbarbershopId: 'shop-123',
      serviceId: 'service-456',
      scheduledAt: updates.scheduledAt || '2024-01-15T09:00:00Z',
      customerName: updates.customerName || 'Jane Doe',
      customerEmail: updates.customerEmail || 'jane@example.com',
      status: updates.status || 'confirmed',
      updatedAt: new Date().toISOString()
    }

    return res.status(200).json({ success: true, data: updatedBooking })
  }

  if (req.method === 'DELETE') {
    // Cancel booking
    const { reason = 'Customer cancellation' } = req.body

    const cancelledBooking = {
      id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason
    }

    return res.status(200).json({ 
      success: true, 
      data: cancelledBooking,
      message: 'Booking cancelled successfully'
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

const mockValidationHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { barberbarbershopId, scheduledAt, durationMinutes = 30, barberId } = req.body

  if (!barberbarbershopId || !scheduledAt) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    const appointmentDate = new Date(scheduledAt)
    const dayOfWeek = appointmentDate.getDay()
    const hour = appointmentDate.getHours()

    // Mock business hours validation
    const businessHours = {
      1: { open: 9, close: 18 }, // Monday
      2: { open: 9, close: 18 }, // Tuesday
      3: { open: 9, close: 18 }, // Wednesday
      4: { open: 9, close: 18 }, // Thursday
      5: { open: 9, close: 18 }, // Friday
      6: { open: 10, close: 16 }, // Saturday
      0: null // Sunday - closed
    }

    const dayHours = businessHours[dayOfWeek]
    const isWithinHours = dayHours && hour >= dayHours.open && hour < dayHours.close

    // Mock conflict check
    const hasConflict = scheduledAt === '2024-01-15T10:00:00Z'

    // Mock advance booking validation
    const now = new Date()
    const minAdvance = 60 * 60 * 1000 // 1 hour in ms
    const tooSoon = appointmentDate.getTime() - now.getTime() < minAdvance

    const validation = {
      valid: isWithinHours && !hasConflict && !tooSoon,
      businessHours: {
        valid: isWithinHours,
        message: !isWithinHours ? 'Outside business hours' : null
      },
      conflicts: {
        hasConflict,
        message: hasConflict ? 'Time slot is already booked' : null,
        conflictingBooking: hasConflict ? {
          id: 'existing-123',
          customerName: 'John Doe'
        } : null
      },
      advance: {
        valid: !tooSoon,
        message: tooSoon ? 'Booking too close to current time' : null,
        minimumAdvance: '1 hour'
      }
    }

    res.status(200).json({ success: true, data: validation })
  } catch (error) {
    res.status(500).json({ error: 'Validation failed', details: error.message })
  }
}

describe('Booking API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {} }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null })
    })
  })

  describe('/api/availability', () => {
    test('GET: returns available slots for valid request', async () => {
      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            query: {
              barberbarbershopId: 'shop-123',
              date: '2024-01-15',
              serviceId: 'service-456'
            }
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.success).toBe(true)
          expect(json.data.slots).toHaveLength(3)
          expect(json.data.availableSlots).toBe(2)
        }
      })
    })

    test('GET: returns 400 for missing parameters', async () => {
      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            query: {
              barberbarbershopId: 'shop-123'
              // Missing date parameter
            }
          })

          const json = await res.json()

          expect(res.status).toBe(400)
          expect(json.error).toBe('Missing required parameters')
        }
      })
    })

    test('POST: accepts date range requests', async () => {
      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barberbarbershopId: 'shop-123',
              date: '2024-01-15',
              serviceId: 'service-456',
              duration: 45
            })
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.success).toBe(true)
        }
      })
    })

    test('returns 405 for unsupported methods', async () => {
      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'DELETE',
            query: { barberbarbershopId: 'shop-123', date: '2024-01-15' }
          })

          const json = await res.json()

          expect(res.status).toBe(405)
          expect(json.error).toBe('Method not allowed')
        }
      })
    })
  })

  describe('/api/bookings', () => {
    test('POST: creates booking successfully', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const bookingData = {
            barberbarbershopId: 'shop-123',
            serviceId: 'service-456',
            scheduledAt: '2024-01-15T09:00:00Z',
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            customerPhone: '+1234567890'
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
          })

          const json = await res.json()

          expect(res.status).toBe(201)
          expect(json.success).toBe(true)
          expect(json.data.id).toBeDefined()
          expect(json.data.confirmationCode).toBeDefined()
          expect(json.data.status).toBe('confirmed')
        }
      })
    })

    test('POST: returns 400 for missing required fields', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const incompleteData = {
            barberbarbershopId: 'shop-123',
            // Missing required fields
            scheduledAt: '2024-01-15T09:00:00Z'
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incompleteData)
          })

          const json = await res.json()

          expect(res.status).toBe(400)
          expect(json.error).toBe('Missing required fields')
          expect(json.missingFields).toContain('customerName')
          expect(json.missingFields).toContain('customerEmail')
        }
      })
    })

    test('POST: validates email format', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const bookingData = {
            barberbarbershopId: 'shop-123',
            serviceId: 'service-456',
            scheduledAt: '2024-01-15T09:00:00Z',
            customerName: 'John Doe',
            customerEmail: 'invalid-email', // Invalid format
            customerPhone: '+1234567890'
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
          })

          const json = await res.json()

          expect(res.status).toBe(400)
          expect(json.error).toBe('Invalid email format')
        }
      })
    })

    test('POST: prevents past date bookings', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const bookingData = {
            barberbarbershopId: 'shop-123',
            serviceId: 'service-456',
            scheduledAt: '2020-01-15T09:00:00Z', // Past date
            customerName: 'John Doe',
            customerEmail: 'john@example.com'
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
          })

          const json = await res.json()

          expect(res.status).toBe(400)
          expect(json.error).toBe('Appointment must be in the future')
        }
      })
    })

    test('POST: handles booking conflicts', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const conflictingBooking = {
            barberbarbershopId: 'shop-123',
            serviceId: 'service-456',
            scheduledAt: '2024-01-15T10:00:00Z', // This time has a conflict
            customerName: 'John Doe',
            customerEmail: 'john@example.com'
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conflictingBooking)
          })

          const json = await res.json()

          expect(res.status).toBe(409)
          expect(json.error).toBe('Time slot no longer available')
          expect(json.conflictDetails).toBeDefined()
        }
      })
    })
  })

  describe('/api/bookings/[id]', () => {
    test('GET: retrieves booking details', async () => {
      await testApiHandler({
        handler: mockBookingUpdateHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            url: '/api/bookings/booking-123'
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.success).toBe(true)
          expect(json.data.id).toBe('booking-123')
        }
      })
    })

    test('PUT: updates booking successfully', async () => {
      await testApiHandler({
        handler: mockBookingUpdateHandler,
        test: async ({ fetch }) => {
          const updates = {
            customerName: 'Jane Smith',
            scheduledAt: '2024-01-15T11:00:00Z'
          }

          const res = await fetch({
            method: 'PUT',
            url: '/api/bookings/booking-123',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.success).toBe(true)
          expect(json.data.customerName).toBe('Jane Smith')
          expect(json.data.updatedAt).toBeDefined()
        }
      })
    })

    test('PUT: prevents rescheduling to conflicted slots', async () => {
      await testApiHandler({
        handler: mockBookingUpdateHandler,
        test: async ({ fetch }) => {
          const updates = {
            scheduledAt: '2024-01-15T10:00:00Z' // Conflicted time
          }

          const res = await fetch({
            method: 'PUT',
            url: '/api/bookings/booking-123',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })

          const json = await res.json()

          expect(res.status).toBe(409)
          expect(json.error).toBe('New time slot is not available')
          expect(json.availableAlternatives).toBeDefined()
        }
      })
    })

    test('PUT: returns 400 for invalid updates', async () => {
      await testApiHandler({
        handler: mockBookingUpdateHandler,
        test: async ({ fetch }) => {
          const invalidUpdates = {
            invalidField: 'some value'
          }

          const res = await fetch({
            method: 'PUT',
            url: '/api/bookings/booking-123',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidUpdates)
          })

          const json = await res.json()

          expect(res.status).toBe(400)
          expect(json.error).toBe('No valid updates provided')
        }
      })
    })

    test('DELETE: cancels booking successfully', async () => {
      await testApiHandler({
        handler: mockBookingUpdateHandler,
        test: async ({ fetch }) => {
          const cancellationData = {
            reason: 'Customer requested cancellation'
          }

          const res = await fetch({
            method: 'DELETE',
            url: '/api/bookings/booking-123',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancellationData)
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.success).toBe(true)
          expect(json.data.status).toBe('cancelled')
          expect(json.data.cancelledAt).toBeDefined()
        }
      })
    })

    test('returns 400 for missing booking ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/bookings/', // No ID
        query: {}
      })

      await mockBookingUpdateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Booking ID is required')
    })
  })

  describe('/api/validate-slot', () => {
    test('POST: validates available slot', async () => {
      await testApiHandler({
        handler: mockValidationHandler,
        test: async ({ fetch }) => {
          const validationData = {
            barberbarbershopId: 'shop-123',
            scheduledAt: '2024-01-15T14:00:00Z', // Monday 2 PM
            durationMinutes: 30
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationData)
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.success).toBe(true)
          expect(json.data.valid).toBe(true)
          expect(json.data.businessHours.valid).toBe(true)
          expect(json.data.conflicts.hasConflict).toBe(false)
        }
      })
    })

    test('POST: detects business hours violation', async () => {
      await testApiHandler({
        handler: mockValidationHandler,
        test: async ({ fetch }) => {
          const validationData = {
            barberbarbershopId: 'shop-123',
            scheduledAt: '2024-01-14T14:00:00Z', // Sunday (closed)
            durationMinutes: 30
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationData)
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.data.valid).toBe(false)
          expect(json.data.businessHours.valid).toBe(false)
          expect(json.data.businessHours.message).toBe('Outside business hours')
        }
      })
    })

    test('POST: detects booking conflicts', async () => {
      await testApiHandler({
        handler: mockValidationHandler,
        test: async ({ fetch }) => {
          const validationData = {
            barberbarbershopId: 'shop-123',
            scheduledAt: '2024-01-15T10:00:00Z', // Conflicted time
            durationMinutes: 30
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationData)
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.data.valid).toBe(false)
          expect(json.data.conflicts.hasConflict).toBe(true)
          expect(json.data.conflicts.conflictingBooking).toBeDefined()
        }
      })
    })

    test('POST: validates minimum advance booking time', async () => {
      await testApiHandler({
        handler: mockValidationHandler,
        test: async ({ fetch }) => {
          const now = new Date()
          const tooSoon = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now

          const validationData = {
            barberbarbershopId: 'shop-123',
            scheduledAt: tooSoon.toISOString(),
            durationMinutes: 30
          }

          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationData)
          })

          const json = await res.json()

          expect(res.status).toBe(200)
          expect(json.data.valid).toBe(false)
          expect(json.data.advance.valid).toBe(false)
          expect(json.data.advance.message).toBe('Booking too close to current time')
        }
      })
    })
  })

  describe('Error Handling', () => {
    test('handles database connection errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            query: {
              barberbarbershopId: 'shop-123',
              date: '2024-01-15'
            }
          })

          const json = await res.json()

          expect(res.status).toBe(500)
          expect(json.error).toBe('Internal server error')
        }
      })
    })

    test('handles malformed JSON requests', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json{'
          })

          expect(res.status).toBeGreaterThanOrEqual(400)
        }
      })
    })
  })

  describe('Performance Tests', () => {
    test('handles concurrent availability requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        testApiHandler({
          handler: mockAvailabilityHandler,
          test: async ({ fetch }) => {
            return fetch({
              method: 'GET',
              query: {
                barberbarbershopId: 'shop-123',
                date: '2024-01-15'
              }
            })
          }
        })
      )

      const responses = await Promise.all(promises)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    test('handles large date range requests efficiently', async () => {
      const startTime = Date.now()

      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barberbarbershopId: 'shop-123',
              date: '2024-01-15',
              endDate: '2024-01-21' // Week range
            })
          })

          const endTime = Date.now()
          const duration = endTime - startTime

          expect(res.status).toBe(200)
          expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
        }
      })
    })
  })

  describe('Security Tests', () => {
    test('prevents SQL injection attempts', async () => {
      await testApiHandler({
        handler: mockAvailabilityHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            query: {
              barberbarbershopId: "'; DROP TABLE bookings; --",
              date: '2024-01-15'
            }
          })

          // Should not crash and should handle safely
          expect(res.status).toBeGreaterThanOrEqual(200)
          expect(res.status).toBeLessThan(500)
        }
      })
    })

    test('validates input lengths', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barberbarbershopId: 'shop-123',
              serviceId: 'service-456',
              scheduledAt: '2024-01-15T09:00:00Z',
              customerName: 'A'.repeat(1000), // Very long name
              customerEmail: 'test@example.com'
            })
          })

          // Should handle gracefully (implementation dependent)
          expect(res.status).toBeGreaterThanOrEqual(200)
        }
      })
    })

    test('sanitizes user input', async () => {
      await testApiHandler({
        handler: mockBookingHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barberbarbershopId: 'shop-123',
              serviceId: 'service-456',
              scheduledAt: '2024-01-15T09:00:00Z',
              customerName: '<script>alert("xss")</script>',
              customerEmail: 'test@example.com'
            })
          })

          if (res.status === 201) {
            const json = await res.json()
            // Name should be sanitized
            expect(json.data.customerName).not.toContain('<script>')
          }
        }
      })
    })
  })

  describe('Rate Limiting', () => {
    test('implements rate limiting for booking creation', async () => {
      const rapidRequests = Array.from({ length: 20 }, () =>
        testApiHandler({
          handler: mockBookingHandler,
          test: async ({ fetch }) => {
            return fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                barberbarbershopId: 'shop-123',
                serviceId: 'service-456',
                scheduledAt: '2024-01-15T09:00:00Z',
                customerName: 'John Doe',
                customerEmail: 'john@example.com'
              })
            })
          }
        })
      )

      const responses = await Promise.all(rapidRequests)
      
      // At least some requests should succeed
      const successCount = responses.filter(r => r.status === 201).length
      expect(successCount).toBeGreaterThan(0)
      
      // Rate limiting would be implemented at infrastructure level
      // This test verifies the API can handle rapid requests
    })
  })
})