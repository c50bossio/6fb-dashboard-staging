/**
 * Appointment Field Mapping Utility
 *
 * Production-ready utility for transforming appointment data between database schema
 * (new field names) and Python service interface (old field names).
 *
 * Database Schema (New):
 * - client_name, client_id, client_phone, client_email
 * - scheduled_at (timestamp)
 * - duration_minutes (integer)
 *
 * Python Service Schema (Old):
 * - customer_name, customer_id, customer_phone, customer_email
 * - appointment_date (Date object)
 * - start_time, end_time (calculated from scheduled_at + duration_minutes)
 * - appointment_duration (duration_minutes)
 *
 * @module appointment-field-mapper
 */

/**
 * Converts a timestamp to a formatted date string suitable for notifications
 * @private
 * @param {Date|string} timestamp - The timestamp to format
 * @returns {Date} - JavaScript Date object
 * @throws {Error} If timestamp is invalid
 */
function parseTimestamp(timestamp) {
  if (!timestamp) {
    throw new Error('Timestamp is required');
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  return date;
}

/**
 * Calculates end time from start time and duration
 * @private
 * @param {Date|string} startTime - The start time
 * @param {number} durationMinutes - Duration in minutes
 * @returns {Date} - End time as Date object
 * @throws {Error} If parameters are invalid
 */
function calculateEndTime(startTime, durationMinutes) {
  const start = parseTimestamp(startTime);

  if (!durationMinutes || typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    throw new Error(`Invalid duration: ${durationMinutes}`);
  }

  const endTime = new Date(start.getTime() + durationMinutes * 60000);
  return endTime;
}

/**
 * Formats a Date object to ISO string for database storage
 * @private
 * @param {Date} date - The date to format
 * @returns {string} - ISO formatted date string
 */
function formatForDatabase(date) {
  return date.toISOString();
}

/**
 * Safely extracts client information from appointment data
 * Handles both walk-in appointments (no client object) and registered clients
 *
 * @private
 * @param {Object} appointment - Appointment data from database
 * @returns {Object} - Extracted client information
 */
function extractClientInfo(appointment) {
  return {
    id: appointment.client_id || appointment.client?.id || null,
    name: appointment.client_name || appointment.client?.full_name || appointment.client?.name || 'Walk-in',
    phone: appointment.client_phone || appointment.client?.phone || null,
    email: appointment.client_email || appointment.client?.email || null
  };
}

/**
 * Maps appointment data from database schema (new) to Python service schema (old)
 *
 * Transforms field names to match the BookingNotificationData dataclass expected by Python services:
 * - Maps client_* → customer_*
 * - Maps scheduled_at → appointment_date
 * - Calculates end_time from scheduled_at + duration_minutes
 * - Includes safe fallbacks for missing data
 *
 * @param {Object} dbAppointment - Appointment from database with new field names
 * @param {string} [dbAppointment.id] - Appointment ID (booking_id)
 * @param {string} [dbAppointment.client_id] - Client user ID
 * @param {string} [dbAppointment.client_name] - Client name
 * @param {string} [dbAppointment.client_phone] - Client phone number
 * @param {string} [dbAppointment.client_email] - Client email address
 * @param {Object} [dbAppointment.client] - Client object (if populated)
 * @param {Date|string} dbAppointment.scheduled_at - Appointment scheduled time
 * @param {number} dbAppointment.duration_minutes - Appointment duration in minutes
 * @param {number} [dbAppointment.total_amount] - Total price/amount
 * @param {string} [dbAppointment.status] - Appointment status
 * @param {string} [dbAppointment.payment_status] - Payment status
 * @param {string} [dbAppointment.payment_method] - Payment method
 * @param {string} [dbAppointment.notes] - Appointment notes
 * @param {Object} [dbAppointment.service] - Service object
 * @param {Object} [dbAppointment.barber] - Barber object
 * @param {Object} [dbAppointment.barbershop] - Barbershop object
 *
 * @returns {Object} - Appointment formatted for Python services
 * @throws {Error} If required fields are missing or invalid
 *
 * @example
 * const dbAppointment = {
 *   id: 'appt-123',
 *   client_name: 'John Doe',
 *   client_email: 'john@example.com',
 *   scheduled_at: '2025-10-15T14:00:00Z',
 *   duration_minutes: 30,
 *   total_amount: 45.00,
 *   status: 'CONFIRMED'
 * };
 *
 * const pythonData = mapAppointmentForPythonService(dbAppointment);
 * // Returns: { customer_name: 'John Doe', appointment_date: Date(...), ... }
 */
export function mapAppointmentForPythonService(dbAppointment) {
  if (!dbAppointment) {
    throw new Error('Appointment data is required');
  }

  if (!dbAppointment.scheduled_at) {
    throw new Error('scheduled_at is required');
  }

  if (!dbAppointment.duration_minutes) {
    throw new Error('duration_minutes is required');
  }

  try {
    const client = extractClientInfo(dbAppointment);
    const appointmentDate = parseTimestamp(dbAppointment.scheduled_at);
    const endTime = calculateEndTime(dbAppointment.scheduled_at, dbAppointment.duration_minutes);

    return {
      // Booking identification
      booking_id: dbAppointment.id || dbAppointment.booking_id || null,

      // Customer information (mapped from client_*)
      customer_id: client.id,
      customer_name: client.name,
      customer_phone: client.phone,
      customer_email: client.email,

      // Date and time (mapped from scheduled_at)
      appointment_date: appointmentDate,
      start_time: appointmentDate,
      end_time: endTime,
      appointment_duration: dbAppointment.duration_minutes,

      // Service and provider information
      service_name: dbAppointment.service?.name || dbAppointment.service_name || 'Service',
      barber_name: dbAppointment.barber?.full_name || dbAppointment.barber?.name || dbAppointment.barber_name || 'Barber',
      barber_id: dbAppointment.barber_id || dbAppointment.barber?.id || null,
      barbershop_name: dbAppointment.barbershop?.name || dbAppointment.barbershop_name || 'Barbershop',
      barbershop_id: dbAppointment.barbershop_id || dbAppointment.barbershop?.id || null,

      // Financial information
      total_price: dbAppointment.total_amount || dbAppointment.price || 0,

      // Status tracking
      booking_status: dbAppointment.status || 'PENDING',
      payment_status: dbAppointment.payment_status || null,
      payment_method: dbAppointment.payment_method || null,

      // Additional information
      notes: dbAppointment.notes || null,
      cancellation_reason: dbAppointment.cancellation_reason || null,

      // Metadata
      metadata: {
        source: 'database',
        mapped_at: new Date().toISOString(),
        is_walk_in: dbAppointment.is_walk_in || false,
        booking_source: dbAppointment.booking_source || 'online',
        ...dbAppointment.metadata
      }
    };
  } catch (error) {
    throw new Error(`Failed to map appointment for Python service: ${error.message}`);
  }
}

/**
 * Maps booking notification data specifically for BookingNotificationData dataclass
 *
 * Creates a complete notification payload that matches the exact structure expected
 * by the Python booking_notifications.py service. Handles both walk-in appointments
 * and registered client scenarios with appropriate fallbacks.
 *
 * @param {Object} appointment - Appointment data from database
 * @param {Object} [barbershop] - Barbershop data (optional, can be extracted from appointment)
 * @param {Object} [barber] - Barber data (optional, can be extracted from appointment)
 *
 * @returns {Object} - Data formatted for BookingNotificationData
 * @throws {Error} If required fields are missing
 *
 * @example
 * const notificationData = mapForBookingNotification(appointment, barbershop, barber);
 * // Returns object matching BookingNotificationData structure
 */
export function mapForBookingNotification(appointment, barbershop = null, barber = null) {
  if (!appointment) {
    throw new Error('Appointment data is required');
  }

  try {
    // Use provided objects or extract from appointment
    const shopData = barbershop || appointment.barbershop || {};
    const barberData = barber || appointment.barber || {};
    const client = extractClientInfo(appointment);

    // Validate required fields
    if (!appointment.scheduled_at) {
      throw new Error('scheduled_at is required for notification');
    }

    if (!client.email && !client.phone) {
      throw new Error('At least one contact method (email or phone) is required');
    }

    const appointmentDate = parseTimestamp(appointment.scheduled_at);

    return {
      // Required fields for BookingNotificationData
      booking_id: appointment.id || appointment.booking_id,
      user_id: client.id || appointment.user_id || 'guest',

      // Customer information
      customer_name: client.name,
      customer_email: client.email || '',
      customer_phone: client.phone || null,

      // Business information
      barbershop_name: shopData.name || appointment.barbershop_name || 'Barbershop',
      barber_name: barberData.full_name || barberData.name || appointment.barber_name || 'Barber',

      // Service information
      service_name: appointment.service?.name || appointment.service_name || 'Service',

      // Appointment timing
      appointment_date: appointmentDate,
      appointment_duration: appointment.duration_minutes || 30,

      // Financial information
      total_price: parseFloat(appointment.total_amount || appointment.price || 0),

      // Status information
      booking_status: appointment.status || 'CONFIRMED',
      payment_status: appointment.payment_status || null,
      payment_method: appointment.payment_method || null,

      // Optional fields
      cancellation_reason: appointment.cancellation_reason || null,
      notes: appointment.notes || null,

      // Metadata
      metadata: {
        appointment_id: appointment.id,
        is_walk_in: appointment.is_walk_in || false,
        booking_source: appointment.booking_source || 'online',
        barbershop_id: shopData.id || appointment.barbershop_id,
        barber_id: barberData.id || appointment.barber_id,
        service_id: appointment.service_id || appointment.service?.id,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
        mapped_for_notification: true,
        mapped_at: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(`Failed to map appointment for booking notification: ${error.message}`);
  }
}

/**
 * Reverse mapping: Python service response → database schema
 *
 * Transforms data from Python service responses back to database field names.
 * Useful for storing updated appointment data after Python service processing.
 *
 * @param {Object} serviceResponse - Response from Python service
 * @param {string} [serviceResponse.customer_name] - Customer name
 * @param {string} [serviceResponse.customer_id] - Customer ID
 * @param {string} [serviceResponse.customer_phone] - Customer phone
 * @param {string} [serviceResponse.customer_email] - Customer email
 * @param {Date|string} [serviceResponse.appointment_date] - Appointment date
 * @param {number} [serviceResponse.appointment_duration] - Duration in minutes
 * @param {string} [serviceResponse.booking_status] - Booking status
 *
 * @returns {Object} - Data formatted for database
 * @throws {Error} If required fields are invalid
 *
 * @example
 * const pythonResponse = {
 *   customer_name: 'John Doe',
 *   appointment_date: new Date('2025-10-15T14:00:00Z'),
 *   appointment_duration: 30
 * };
 *
 * const dbData = mapFromPythonService(pythonResponse);
 * // Returns: { client_name: 'John Doe', scheduled_at: '2025-10-15T14:00:00.000Z', ... }
 */
export function mapFromPythonService(serviceResponse) {
  if (!serviceResponse) {
    throw new Error('Service response is required');
  }

  try {
    const dbData = {
      // Map customer_* → client_*
      client_id: serviceResponse.customer_id || serviceResponse.user_id || null,
      client_name: serviceResponse.customer_name || null,
      client_phone: serviceResponse.customer_phone || null,
      client_email: serviceResponse.customer_email || null,

      // Map appointment_date → scheduled_at
      scheduled_at: serviceResponse.appointment_date
        ? formatForDatabase(parseTimestamp(serviceResponse.appointment_date))
        : null,

      // Duration mapping (same field name concept)
      duration_minutes: serviceResponse.appointment_duration || serviceResponse.duration_minutes || null,

      // Financial mapping
      total_amount: serviceResponse.total_price || serviceResponse.total_amount || null,

      // Status mapping
      status: serviceResponse.booking_status || serviceResponse.status || null,
      payment_status: serviceResponse.payment_status || null,
      payment_method: serviceResponse.payment_method || null,

      // Additional fields
      notes: serviceResponse.notes || null,
      cancellation_reason: serviceResponse.cancellation_reason || null
    };

    // Include service/barber/shop IDs if present
    if (serviceResponse.service_id) dbData.service_id = serviceResponse.service_id;
    if (serviceResponse.barber_id) dbData.barber_id = serviceResponse.barber_id;
    if (serviceResponse.barbershop_id) dbData.barbershop_id = serviceResponse.barbershop_id;
    if (serviceResponse.booking_id) dbData.id = serviceResponse.booking_id;

    // Include metadata if present
    if (serviceResponse.metadata) {
      dbData.metadata = {
        ...serviceResponse.metadata,
        reverse_mapped_at: new Date().toISOString()
      };
    }

    return dbData;
  } catch (error) {
    throw new Error(`Failed to map from Python service response: ${error.message}`);
  }
}

/**
 * Validates that an appointment object has all required fields for Python service mapping
 *
 * @param {Object} appointment - Appointment data to validate
 * @returns {Object} - Validation result
 * @returns {boolean} result.valid - Whether appointment is valid
 * @returns {string[]} result.errors - Array of validation error messages
 * @returns {string[]} result.warnings - Array of validation warning messages
 *
 * @example
 * const validation = validateAppointmentForMapping(appointment);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 */
export function validateAppointmentForMapping(appointment) {
  const errors = [];
  const warnings = [];

  if (!appointment) {
    return { valid: false, errors: ['Appointment data is required'], warnings: [] };
  }

  // Required fields
  if (!appointment.scheduled_at) {
    errors.push('scheduled_at is required');
  } else {
    try {
      parseTimestamp(appointment.scheduled_at);
    } catch (e) {
      errors.push(`Invalid scheduled_at: ${e.message}`);
    }
  }

  if (!appointment.duration_minutes) {
    errors.push('duration_minutes is required');
  } else if (typeof appointment.duration_minutes !== 'number' || appointment.duration_minutes <= 0) {
    errors.push('duration_minutes must be a positive number');
  }

  // Recommended fields
  const client = extractClientInfo(appointment);
  if (!client.name || client.name === 'Walk-in') {
    warnings.push('Client name not provided (will default to "Walk-in")');
  }

  if (!client.email && !client.phone) {
    warnings.push('No contact information (email or phone) available for client');
  }

  if (!appointment.service && !appointment.service_name) {
    warnings.push('Service information not provided');
  }

  if (!appointment.barber && !appointment.barber_name) {
    warnings.push('Barber information not provided');
  }

  if (!appointment.barbershop && !appointment.barbershop_name) {
    warnings.push('Barbershop information not provided');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Batch maps multiple appointments for Python service
 *
 * @param {Object[]} appointments - Array of appointment objects
 * @param {Object} [options] - Mapping options
 * @param {boolean} [options.skipInvalid=false] - Skip invalid appointments instead of throwing
 * @param {boolean} [options.includeValidation=true] - Include validation results in output
 *
 * @returns {Object} - Batch mapping result
 * @returns {Object[]} result.mapped - Successfully mapped appointments
 * @returns {Object[]} result.failed - Failed mappings with error information
 *
 * @example
 * const result = batchMapAppointments(appointments, { skipInvalid: true });
 * console.log(`Mapped ${result.mapped.length}, failed ${result.failed.length}`);
 */
export function batchMapAppointments(appointments, options = {}) {
  const { skipInvalid = false, includeValidation = true } = options;
  const mapped = [];
  const failed = [];

  if (!Array.isArray(appointments)) {
    throw new Error('Appointments must be an array');
  }

  for (let i = 0; i < appointments.length; i++) {
    const appointment = appointments[i];

    try {
      const validation = includeValidation ? validateAppointmentForMapping(appointment) : { valid: true };

      if (!validation.valid && !skipInvalid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.valid || skipInvalid) {
        const mappedData = mapAppointmentForPythonService(appointment);
        mapped.push({
          index: i,
          data: mappedData,
          validation: includeValidation ? validation : undefined
        });
      } else {
        failed.push({
          index: i,
          appointment_id: appointment.id,
          error: 'Validation failed',
          details: validation.errors
        });
      }
    } catch (error) {
      failed.push({
        index: i,
        appointment_id: appointment.id,
        error: error.message
      });
    }
  }

  return { mapped, failed };
}

// Export all functions as default export for convenience
export default {
  mapAppointmentForPythonService,
  mapForBookingNotification,
  mapFromPythonService,
  validateAppointmentForMapping,
  batchMapAppointments
};
