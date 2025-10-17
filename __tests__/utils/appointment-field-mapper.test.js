/**
 * Unit Tests for Appointment Field Mapping Utility
 *
 * Tests the bidirectional mapping between database schema (new field names)
 * and Python service interface (old field names).
 *
 * @jest-environment node
 */

import {
  mapAppointmentForPythonService,
  mapForBookingNotification,
  mapFromPythonService,
  validateAppointmentForMapping,
  batchMapAppointments
} from '../../app/api/utils/appointment-field-mapper.js';

describe('Appointment Field Mapper', () => {
  // ==========================================
  // Test Data Fixtures
  // ==========================================

  const baseAppointment = {
    id: 'appt-123',
    client_id: 'client-456',
    client_name: 'John Doe',
    client_phone: '+1234567890',
    client_email: 'john@example.com',
    scheduled_at: '2025-10-15T14:00:00.000Z',
    duration_minutes: 30,
    total_amount: 45.00,
    status: 'CONFIRMED',
    payment_status: 'PAID',
    payment_method: 'credit_card',
    notes: 'First time customer',
    service_name: 'Haircut',
    barber_name: 'Mike Smith',
    barbershop_name: 'Elite Cuts',
    barber_id: 'barber-789',
    barbershop_id: 'shop-012',
    service_id: 'service-345',
    is_walk_in: false,
    booking_source: 'online'
  };

  const walkInAppointment = {
    id: 'appt-walk-in-1',
    client_id: null,
    client_name: 'Walk-in Customer',
    client_phone: '+1987654321',
    client_email: null,
    scheduled_at: '2025-10-15T15:30:00.000Z',
    duration_minutes: 45,
    total_amount: 60.00,
    status: 'CONFIRMED',
    service_name: 'Haircut & Beard Trim',
    barber_name: 'Sarah Johnson',
    barbershop_name: 'Downtown Barbers',
    is_walk_in: true,
    booking_source: 'walk_in'
  };

  const appointmentWithClientObject = {
    id: 'appt-789',
    client_id: 'client-999',
    scheduled_at: '2025-10-16T10:00:00.000Z',
    duration_minutes: 60,
    total_amount: 75.00,
    status: 'PENDING',
    client: {
      id: 'client-999',
      full_name: 'Jane Smith',
      name: 'Jane Smith',
      phone: '+1122334455',
      email: 'jane@example.com'
    },
    service: {
      id: 'service-555',
      name: 'Full Service Cut'
    },
    barber: {
      id: 'barber-666',
      full_name: 'Tom Anderson',
      name: 'Tom Anderson'
    },
    barbershop: {
      id: 'shop-777',
      name: 'Premier Barbershop'
    }
  };

  // ==========================================
  // mapAppointmentForPythonService Tests
  // ==========================================

  describe('mapAppointmentForPythonService', () => {
    it('should map basic appointment fields correctly', () => {
      const result = mapAppointmentForPythonService(baseAppointment);

      expect(result.booking_id).toBe('appt-123');
      expect(result.customer_id).toBe('client-456');
      expect(result.customer_name).toBe('John Doe');
      expect(result.customer_phone).toBe('+1234567890');
      expect(result.customer_email).toBe('john@example.com');
      expect(result.service_name).toBe('Haircut');
      expect(result.barber_name).toBe('Mike Smith');
      expect(result.barbershop_name).toBe('Elite Cuts');
      expect(result.appointment_duration).toBe(30);
      expect(result.total_price).toBe(45.00);
      expect(result.booking_status).toBe('CONFIRMED');
      expect(result.payment_status).toBe('PAID');
      expect(result.payment_method).toBe('credit_card');
      expect(result.notes).toBe('First time customer');
    });

    it('should parse scheduled_at as Date object', () => {
      const result = mapAppointmentForPythonService(baseAppointment);

      expect(result.appointment_date).toBeInstanceOf(Date);
      expect(result.start_time).toBeInstanceOf(Date);
      expect(result.end_time).toBeInstanceOf(Date);

      const expectedDate = new Date('2025-10-15T14:00:00.000Z');
      expect(result.appointment_date.toISOString()).toBe(expectedDate.toISOString());
    });

    it('should calculate end_time correctly from scheduled_at and duration_minutes', () => {
      const result = mapAppointmentForPythonService(baseAppointment);

      const startTime = new Date('2025-10-15T14:00:00.000Z');
      const expectedEndTime = new Date(startTime.getTime() + 30 * 60000);

      expect(result.end_time.toISOString()).toBe(expectedEndTime.toISOString());
    });

    it('should handle walk-in appointments without client object', () => {
      const result = mapAppointmentForPythonService(walkInAppointment);

      expect(result.customer_id).toBeNull();
      expect(result.customer_name).toBe('Walk-in Customer');
      expect(result.customer_phone).toBe('+1987654321');
      expect(result.customer_email).toBeNull();
      expect(result.metadata.is_walk_in).toBe(true);
      expect(result.metadata.booking_source).toBe('walk_in');
    });

    it('should extract client info from nested client object', () => {
      const result = mapAppointmentForPythonService(appointmentWithClientObject);

      expect(result.customer_id).toBe('client-999');
      expect(result.customer_name).toBe('Jane Smith');
      expect(result.customer_phone).toBe('+1122334455');
      expect(result.customer_email).toBe('jane@example.com');
    });

    it('should extract service/barber/shop info from nested objects', () => {
      const result = mapAppointmentForPythonService(appointmentWithClientObject);

      expect(result.service_name).toBe('Full Service Cut');
      expect(result.barber_name).toBe('Tom Anderson');
      expect(result.barbershop_name).toBe('Premier Barbershop');
      expect(result.barber_id).toBe('barber-666');
      expect(result.barbershop_id).toBe('shop-777');
    });

    it('should use safe fallbacks for missing optional fields', () => {
      const minimalAppointment = {
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: 30
      };

      const result = mapAppointmentForPythonService(minimalAppointment);

      expect(result.customer_name).toBe('Walk-in');
      expect(result.service_name).toBe('Service');
      expect(result.barber_name).toBe('Barber');
      expect(result.barbershop_name).toBe('Barbershop');
      expect(result.total_price).toBe(0);
      expect(result.booking_status).toBe('PENDING');
    });

    it('should include metadata with source and timestamp', () => {
      const result = mapAppointmentForPythonService(baseAppointment);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.source).toBe('database');
      expect(result.metadata.mapped_at).toBeDefined();
      expect(result.metadata.is_walk_in).toBe(false);
      expect(result.metadata.booking_source).toBe('online');
    });

    it('should throw error if appointment data is missing', () => {
      expect(() => mapAppointmentForPythonService(null)).toThrow('Appointment data is required');
      expect(() => mapAppointmentForPythonService(undefined)).toThrow('Appointment data is required');
    });

    it('should throw error if scheduled_at is missing', () => {
      const invalidAppointment = {
        duration_minutes: 30
      };

      expect(() => mapAppointmentForPythonService(invalidAppointment)).toThrow('scheduled_at is required');
    });

    it('should throw error if duration_minutes is missing', () => {
      const invalidAppointment = {
        scheduled_at: '2025-10-15T14:00:00.000Z'
      };

      expect(() => mapAppointmentForPythonService(invalidAppointment)).toThrow('duration_minutes is required');
    });

    it('should throw error if scheduled_at is invalid', () => {
      const invalidAppointment = {
        scheduled_at: 'invalid-date',
        duration_minutes: 30
      };

      expect(() => mapAppointmentForPythonService(invalidAppointment)).toThrow();
    });
  });

  // ==========================================
  // mapForBookingNotification Tests
  // ==========================================

  describe('mapForBookingNotification', () => {
    it('should create complete notification payload', () => {
      const result = mapForBookingNotification(baseAppointment);

      expect(result.booking_id).toBe('appt-123');
      expect(result.user_id).toBe('client-456');
      expect(result.customer_name).toBe('John Doe');
      expect(result.customer_email).toBe('john@example.com');
      expect(result.customer_phone).toBe('+1234567890');
      expect(result.barbershop_name).toBe('Elite Cuts');
      expect(result.barber_name).toBe('Mike Smith');
      expect(result.service_name).toBe('Haircut');
      expect(result.appointment_date).toBeInstanceOf(Date);
      expect(result.appointment_duration).toBe(30);
      expect(result.total_price).toBe(45.00);
      expect(result.booking_status).toBe('CONFIRMED');
      expect(result.payment_status).toBe('PAID');
      expect(result.payment_method).toBe('credit_card');
    });

    it('should handle walk-in appointments in notifications', () => {
      const result = mapForBookingNotification(walkInAppointment);

      expect(result.user_id).toBe('guest');
      expect(result.customer_name).toBe('Walk-in Customer');
      expect(result.customer_email).toBe('');
      expect(result.customer_phone).toBe('+1987654321');
      expect(result.metadata.is_walk_in).toBe(true);
    });

    it('should extract info from separate barbershop/barber objects', () => {
      const barbershop = { id: 'shop-custom', name: 'Custom Shop' };
      const barber = { id: 'barber-custom', full_name: 'Custom Barber' };

      const result = mapForBookingNotification(baseAppointment, barbershop, barber);

      expect(result.barbershop_name).toBe('Custom Shop');
      expect(result.barber_name).toBe('Custom Barber');
      expect(result.metadata.barbershop_id).toBe('shop-custom');
      expect(result.metadata.barber_id).toBe('barber-custom');
    });

    it('should include comprehensive metadata', () => {
      const result = mapForBookingNotification(baseAppointment);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.appointment_id).toBe('appt-123');
      expect(result.metadata.is_walk_in).toBe(false);
      expect(result.metadata.booking_source).toBe('online');
      expect(result.metadata.barbershop_id).toBeDefined();
      expect(result.metadata.barber_id).toBeDefined();
      expect(result.metadata.service_id).toBeDefined();
      expect(result.metadata.mapped_for_notification).toBe(true);
      expect(result.metadata.mapped_at).toBeDefined();
    });

    it('should throw error if appointment is missing', () => {
      expect(() => mapForBookingNotification(null)).toThrow('Appointment data is required');
    });

    it('should throw error if scheduled_at is missing', () => {
      const invalidAppointment = {
        client_name: 'Test',
        duration_minutes: 30
      };

      expect(() => mapForBookingNotification(invalidAppointment)).toThrow('scheduled_at is required for notification');
    });

    it('should throw error if no contact method available', () => {
      const invalidAppointment = {
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: 30,
        client_email: null,
        client_phone: null
      };

      expect(() => mapForBookingNotification(invalidAppointment)).toThrow('At least one contact method');
    });

    it('should default user_id to guest for walk-ins', () => {
      const walkIn = {
        ...walkInAppointment,
        client_id: null,
        user_id: null
      };

      const result = mapForBookingNotification(walkIn);
      expect(result.user_id).toBe('guest');
    });
  });

  // ==========================================
  // mapFromPythonService Tests (Reverse Mapping)
  // ==========================================

  describe('mapFromPythonService', () => {
    const pythonResponse = {
      booking_id: 'appt-999',
      customer_id: 'client-888',
      customer_name: 'Alice Brown',
      customer_phone: '+1555666777',
      customer_email: 'alice@example.com',
      appointment_date: new Date('2025-10-20T16:00:00.000Z'),
      appointment_duration: 40,
      total_price: 55.00,
      booking_status: 'CONFIRMED',
      payment_status: 'PENDING',
      payment_method: 'cash',
      notes: 'Prefers shorter cut',
      service_id: 'service-111',
      barber_id: 'barber-222',
      barbershop_id: 'shop-333'
    };

    it('should reverse map customer_* to client_*', () => {
      const result = mapFromPythonService(pythonResponse);

      expect(result.client_id).toBe('client-888');
      expect(result.client_name).toBe('Alice Brown');
      expect(result.client_phone).toBe('+1555666777');
      expect(result.client_email).toBe('alice@example.com');
    });

    it('should reverse map appointment_date to scheduled_at', () => {
      const result = mapFromPythonService(pythonResponse);

      expect(result.scheduled_at).toBe('2025-10-20T16:00:00.000Z');
    });

    it('should reverse map appointment_duration to duration_minutes', () => {
      const result = mapFromPythonService(pythonResponse);

      expect(result.duration_minutes).toBe(40);
    });

    it('should reverse map financial and status fields', () => {
      const result = mapFromPythonService(pythonResponse);

      expect(result.total_amount).toBe(55.00);
      expect(result.status).toBe('CONFIRMED');
      expect(result.payment_status).toBe('PENDING');
      expect(result.payment_method).toBe('cash');
    });

    it('should include service/barber/shop IDs if present', () => {
      const result = mapFromPythonService(pythonResponse);

      expect(result.id).toBe('appt-999');
      expect(result.service_id).toBe('service-111');
      expect(result.barber_id).toBe('barber-222');
      expect(result.barbershop_id).toBe('shop-333');
    });

    it('should handle null/undefined fields gracefully', () => {
      const minimalResponse = {
        customer_name: 'Test User'
      };

      const result = mapFromPythonService(minimalResponse);

      expect(result.client_name).toBe('Test User');
      expect(result.client_id).toBeNull();
      expect(result.scheduled_at).toBeNull();
      expect(result.duration_minutes).toBeNull();
    });

    it('should include reverse mapping metadata', () => {
      const responseWithMetadata = {
        ...pythonResponse,
        metadata: { original_source: 'test' }
      };

      const result = mapFromPythonService(responseWithMetadata);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.reverse_mapped_at).toBeDefined();
      expect(result.metadata.original_source).toBe('test');
    });

    it('should throw error if service response is missing', () => {
      expect(() => mapFromPythonService(null)).toThrow('Service response is required');
      expect(() => mapFromPythonService(undefined)).toThrow('Service response is required');
    });
  });

  // ==========================================
  // validateAppointmentForMapping Tests
  // ==========================================

  describe('validateAppointmentForMapping', () => {
    it('should validate complete appointment as valid', () => {
      const result = validateAppointmentForMapping(baseAppointment);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const invalidAppointment = {
        client_name: 'Test'
      };

      const result = validateAppointmentForMapping(invalidAppointment);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('scheduled_at is required');
      expect(result.errors).toContain('duration_minutes is required');
    });

    it('should return error for invalid scheduled_at', () => {
      const invalidAppointment = {
        scheduled_at: 'invalid-date',
        duration_minutes: 30
      };

      const result = validateAppointmentForMapping(invalidAppointment);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('Invalid scheduled_at'))).toBe(true);
    });

    it('should return error for invalid duration_minutes', () => {
      const invalidAppointment = {
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: -5
      };

      const result = validateAppointmentForMapping(invalidAppointment);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('duration_minutes must be a positive number');
    });

    it('should return warnings for missing recommended fields', () => {
      const minimalAppointment = {
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: 30
      };

      const result = validateAppointmentForMapping(minimalAppointment);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Client name not provided (will default to "Walk-in")');
      expect(result.warnings).toContain('No contact information (email or phone) available for client');
      expect(result.warnings).toContain('Service information not provided');
      expect(result.warnings).toContain('Barber information not provided');
      expect(result.warnings).toContain('Barbershop information not provided');
    });

    it('should return error if appointment is null', () => {
      const result = validateAppointmentForMapping(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Appointment data is required');
    });
  });

  // ==========================================
  // batchMapAppointments Tests
  // ==========================================

  describe('batchMapAppointments', () => {
    const validAppointments = [
      baseAppointment,
      walkInAppointment,
      appointmentWithClientObject
    ];

    it('should map multiple valid appointments', () => {
      const result = batchMapAppointments(validAppointments);

      expect(result.mapped).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.mapped[0].data.customer_name).toBe('John Doe');
      expect(result.mapped[1].data.customer_name).toBe('Walk-in Customer');
      expect(result.mapped[2].data.customer_name).toBe('Jane Smith');
    });

    it('should include validation results when requested', () => {
      const result = batchMapAppointments(validAppointments, { includeValidation: true });

      expect(result.mapped[0].validation).toBeDefined();
      expect(result.mapped[0].validation.valid).toBe(true);
    });

    it('should exclude validation results when not requested', () => {
      const result = batchMapAppointments(validAppointments, { includeValidation: false });

      expect(result.mapped[0].validation).toBeUndefined();
    });

    it('should handle mixed valid and invalid appointments with skipInvalid', () => {
      const mixedAppointments = [
        baseAppointment,
        { client_name: 'Invalid' }, // Missing required fields
        walkInAppointment
      ];

      const result = batchMapAppointments(mixedAppointments, { skipInvalid: true });

      expect(result.mapped).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].error).toBeDefined();
    });

    it('should throw error on invalid appointment when skipInvalid is false', () => {
      const mixedAppointments = [
        baseAppointment,
        { client_name: 'Invalid' }
      ];

      const result = batchMapAppointments(mixedAppointments, { skipInvalid: false });

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Validation failed');
    });

    it('should include index and appointment_id in results', () => {
      const result = batchMapAppointments(validAppointments);

      expect(result.mapped[0].index).toBe(0);
      expect(result.mapped[1].index).toBe(1);
      expect(result.mapped[2].index).toBe(2);
      expect(result.mapped[0].data.booking_id).toBe('appt-123');
    });

    it('should throw error if appointments is not an array', () => {
      expect(() => batchMapAppointments('not-an-array')).toThrow('Appointments must be an array');
      expect(() => batchMapAppointments(null)).toThrow('Appointments must be an array');
    });

    it('should handle empty array', () => {
      const result = batchMapAppointments([]);

      expect(result.mapped).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });
  });

  // ==========================================
  // Edge Cases and Error Handling
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle appointment with only client_name (no nested client)', () => {
      const appointment = {
        client_name: 'Simple Name',
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: 30
      };

      const result = mapAppointmentForPythonService(appointment);
      expect(result.customer_name).toBe('Simple Name');
    });

    it('should handle appointment with nested client but no client_name', () => {
      const appointment = {
        client: {
          full_name: 'Nested Name'
        },
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: 30
      };

      const result = mapAppointmentForPythonService(appointment);
      expect(result.customer_name).toBe('Nested Name');
    });

    it('should handle multiple duration formats', () => {
      const appointment = {
        scheduled_at: '2025-10-15T14:00:00.000Z',
        duration_minutes: 90
      };

      const result = mapAppointmentForPythonService(appointment);

      const startTime = new Date('2025-10-15T14:00:00.000Z');
      const expectedEndTime = new Date(startTime.getTime() + 90 * 60000);

      expect(result.end_time.toISOString()).toBe(expectedEndTime.toISOString());
    });

    it('should handle various date formats in scheduled_at', () => {
      const formats = [
        '2025-10-15T14:00:00.000Z',
        '2025-10-15T14:00:00Z',
        new Date('2025-10-15T14:00:00Z')
      ];

      formats.forEach(format => {
        const appointment = {
          scheduled_at: format,
          duration_minutes: 30
        };

        const result = mapAppointmentForPythonService(appointment);
        expect(result.appointment_date).toBeInstanceOf(Date);
      });
    });

    it('should preserve existing metadata when mapping', () => {
      const appointment = {
        ...baseAppointment,
        metadata: {
          custom_field: 'custom_value',
          tracking_id: 'track-123'
        }
      };

      const result = mapAppointmentForPythonService(appointment);

      expect(result.metadata.custom_field).toBe('custom_value');
      expect(result.metadata.tracking_id).toBe('track-123');
      expect(result.metadata.source).toBe('database');
    });
  });
});
