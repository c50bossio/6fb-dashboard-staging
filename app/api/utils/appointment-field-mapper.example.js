/**
 * Example Usage: Appointment Field Mapping Utility
 *
 * This file demonstrates how to use the appointment field mapper in real-world scenarios.
 */

import {
  mapAppointmentForPythonService,
  mapForBookingNotification,
  mapFromPythonService,
  validateAppointmentForMapping,
  batchMapAppointments
} from './appointment-field-mapper.js';

// ==========================================
// Example 1: Map Appointment for Python Service
// ==========================================

console.log('\n=== Example 1: Mapping Database Appointment for Python Service ===\n');

// Appointment data as it comes from database
const dbAppointment = {
  id: 'appt-12345',
  client_id: 'user-67890',
  client_name: 'John Doe',
  client_phone: '+1234567890',
  client_email: 'john.doe@example.com',
  scheduled_at: '2025-10-15T14:00:00.000Z',
  duration_minutes: 45,
  total_amount: 65.00,
  status: 'CONFIRMED',
  payment_status: 'PAID',
  payment_method: 'credit_card',
  notes: 'Regular customer, prefers fade cut',
  service_name: 'Premium Haircut',
  barber_name: 'Mike Johnson',
  barbershop_name: 'Elite Cuts Barbershop',
  barber_id: 'barber-111',
  barbershop_id: 'shop-222',
  service_id: 'service-333',
  is_walk_in: false,
  booking_source: 'online'
};

// Map to Python service format
const pythonData = mapAppointmentForPythonService(dbAppointment);

console.log('Original Database Format:');
console.log({
  client_name: dbAppointment.client_name,
  scheduled_at: dbAppointment.scheduled_at,
  duration_minutes: dbAppointment.duration_minutes
});

console.log('\nMapped Python Service Format:');
console.log({
  customer_name: pythonData.customer_name,
  appointment_date: pythonData.appointment_date,
  start_time: pythonData.start_time,
  end_time: pythonData.end_time,
  appointment_duration: pythonData.appointment_duration
});

// ==========================================
// Example 2: Map Walk-in Appointment
// ==========================================

console.log('\n=== Example 2: Mapping Walk-in Appointment ===\n');

const walkInAppointment = {
  id: 'appt-walk-001',
  client_id: null, // No registered user
  client_name: null, // Will default to 'Walk-in'
  client_phone: '+1987654321',
  client_email: null, // Only phone available
  scheduled_at: new Date('2025-10-16T10:30:00.000Z'),
  duration_minutes: 30,
  total_amount: 40.00,
  status: 'CONFIRMED',
  service_name: 'Quick Trim',
  barber_name: 'Sarah Martinez',
  barbershop_name: 'Downtown Cuts',
  is_walk_in: true,
  booking_source: 'walk_in'
};

const walkInPythonData = mapAppointmentForPythonService(walkInAppointment);

console.log('Walk-in Appointment:');
console.log({
  customer_name: walkInPythonData.customer_name, // Will be 'Walk-in'
  customer_id: walkInPythonData.customer_id, // Will be null
  customer_phone: walkInPythonData.customer_phone,
  is_walk_in: walkInPythonData.metadata.is_walk_in
});

// ==========================================
// Example 3: Map for Booking Notification
// ==========================================

console.log('\n=== Example 3: Mapping for Booking Notification ===\n');

// Create notification payload
const notificationData = mapForBookingNotification(dbAppointment);

console.log('Notification Payload Structure:');
console.log({
  booking_id: notificationData.booking_id,
  user_id: notificationData.user_id,
  customer_name: notificationData.customer_name,
  customer_email: notificationData.customer_email,
  barbershop_name: notificationData.barbershop_name,
  barber_name: notificationData.barber_name,
  service_name: notificationData.service_name,
  appointment_date: notificationData.appointment_date,
  appointment_duration: notificationData.appointment_duration,
  total_price: notificationData.total_price,
  booking_status: notificationData.booking_status
});

// Send to Python notification service
// await sendBookingNotification(notificationData);

// ==========================================
// Example 4: Reverse Mapping (Python → Database)
// ==========================================

console.log('\n=== Example 4: Reverse Mapping from Python Service ===\n');

// Response from Python service
const pythonResponse = {
  booking_id: 'appt-99999',
  customer_id: 'user-88888',
  customer_name: 'Jane Smith',
  customer_phone: '+1122334455',
  customer_email: 'jane.smith@example.com',
  appointment_date: new Date('2025-10-17T15:00:00.000Z'),
  appointment_duration: 60,
  total_price: 85.00,
  booking_status: 'CONFIRMED',
  payment_status: 'PAID',
  service_id: 'service-444',
  barber_id: 'barber-555',
  barbershop_id: 'shop-666'
};

// Map back to database format
const dbFormat = mapFromPythonService(pythonResponse);

console.log('Python Service Response:');
console.log({
  customer_name: pythonResponse.customer_name,
  appointment_date: pythonResponse.appointment_date
});

console.log('\nReverse Mapped to Database Format:');
console.log({
  client_name: dbFormat.client_name,
  scheduled_at: dbFormat.scheduled_at,
  duration_minutes: dbFormat.duration_minutes
});

// Update database with response
// await supabase.from('appointments').update(dbFormat).eq('id', dbFormat.id);

// ==========================================
// Example 5: Validation Before Mapping
// ==========================================

console.log('\n=== Example 5: Validation Before Mapping ===\n');

// Incomplete appointment
const incompleteAppointment = {
  client_name: 'Test User',
  scheduled_at: '2025-10-18T12:00:00.000Z'
  // Missing duration_minutes
};

// Validate before mapping
const validation = validateAppointmentForMapping(incompleteAppointment);

console.log('Validation Result:');
console.log({
  valid: validation.valid,
  errors: validation.errors,
  warnings: validation.warnings
});

if (!validation.valid) {
  console.log('\n❌ Validation Failed - Cannot proceed with mapping');
  console.log('Errors:', validation.errors.join(', '));
} else if (validation.warnings.length > 0) {
  console.log('\n⚠️ Validation Passed with Warnings');
  console.log('Warnings:', validation.warnings.join(', '));
}

// ==========================================
// Example 6: Batch Mapping Multiple Appointments
// ==========================================

console.log('\n=== Example 6: Batch Mapping Multiple Appointments ===\n');

const appointments = [
  {
    id: 'appt-001',
    client_name: 'Customer 1',
    scheduled_at: '2025-10-20T09:00:00.000Z',
    duration_minutes: 30
  },
  {
    id: 'appt-002',
    client_name: 'Customer 2',
    scheduled_at: '2025-10-20T10:00:00.000Z',
    duration_minutes: 45
  },
  {
    id: 'appt-003',
    client_name: 'Customer 3',
    scheduled_at: 'invalid-date', // Invalid
    duration_minutes: 30
  },
  {
    id: 'appt-004',
    client_name: 'Customer 4',
    scheduled_at: '2025-10-20T12:00:00.000Z',
    duration_minutes: 60
  }
];

// Batch map with skipInvalid option
const batchResult = batchMapAppointments(appointments, {
  skipInvalid: true,
  includeValidation: true
});

console.log(`Successfully Mapped: ${batchResult.mapped.length} appointments`);
console.log(`Failed: ${batchResult.failed.length} appointments`);

console.log('\nMapped Appointments:');
batchResult.mapped.forEach((item, index) => {
  console.log(`  [${item.index}] ${item.data.customer_name} - ${item.data.appointment_date.toLocaleString()}`);
});

if (batchResult.failed.length > 0) {
  console.log('\nFailed Appointments:');
  batchResult.failed.forEach(item => {
    console.log(`  [${item.index}] Appointment ${item.appointment_id}: ${item.error}`);
  });
}

// ==========================================
// Example 7: Real-World API Integration
// ==========================================

console.log('\n=== Example 7: Real-World API Endpoint Usage ===\n');

/**
 * Example Next.js API Route using the mapper
 */
async function exampleAPIRoute(req, res) {
  try {
    // Fetch appointment from database
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:users!client_id(id, full_name, email, phone),
        service:services(id, name),
        barber:users!barber_id(id, full_name),
        barbershop:barbershops(id, name)
      `)
      .eq('id', req.query.appointmentId)
      .single();

    if (error) throw error;

    // Validate before mapping
    const validation = validateAppointmentForMapping(appointment);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid appointment data',
        details: validation.errors
      });
    }

    // Map for notification service
    const notificationPayload = mapForBookingNotification(appointment);

    // Send to Python notification service
    const response = await fetch('http://localhost:8001/api/v1/booking-notifications/booking-confirmed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationPayload)
    });

    const result = await response.json();

    return res.status(200).json({
      success: true,
      notificationSent: result.success,
      appointment: notificationPayload
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Failed to process appointment',
      message: error.message
    });
  }
}

console.log('Example API route defined for /api/appointments/[id]/notify');

// ==========================================
// Example 8: Error Handling Patterns
// ==========================================

console.log('\n=== Example 8: Error Handling Patterns ===\n');

function safeMapAppointment(appointment) {
  try {
    // First validate
    const validation = validateAppointmentForMapping(appointment);

    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors);
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Warnings:', validation.warnings);
    }

    // Proceed with mapping
    const mapped = mapAppointmentForPythonService(appointment);

    return {
      success: true,
      data: mapped,
      warnings: validation.warnings
    };

  } catch (error) {
    console.error('❌ Mapping error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test error handling
const testAppointment = {
  scheduled_at: '2025-10-20T14:00:00.000Z',
  duration_minutes: 30
};

const result = safeMapAppointment(testAppointment);
console.log('Safe mapping result:', result);

// ==========================================
// Summary
// ==========================================

console.log('\n=== Summary ===\n');
console.log('The appointment field mapper provides:');
console.log('✓ Bidirectional mapping between database and Python service schemas');
console.log('✓ Safe fallbacks for missing data (walk-ins, incomplete info)');
console.log('✓ Comprehensive validation before mapping');
console.log('✓ Batch processing for multiple appointments');
console.log('✓ Error handling with detailed messages');
console.log('✓ Metadata preservation and augmentation');
console.log('\nUse Cases:');
console.log('- Sending booking notifications via Python service');
console.log('- Processing appointments from database for AI analysis');
console.log('- Reverse mapping Python service responses back to database');
console.log('- Validating appointment data before operations');
console.log('- Batch processing for bulk notifications or reports');
