/**
 * Schedule Reminder API Route
 * Handles scheduling reminder notifications
 */

import { NextResponse } from 'next/server';
import novuService from '../../../../lib/novu/novu-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { data, hoursBeforeAppointment = 24 } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Reminder data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'customerName', 
      'customerEmail', 
      'appointmentDate', 
      'appointmentTime',
      'serviceName',
      'barberName'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required in reminder data` },
          { status: 400 }
        );
      }
    }

    const response = await novuService.scheduleReminder(data, hoursBeforeAppointment);

    return NextResponse.json({
      success: true,
      scheduled: response.scheduled || false,
      reminderTime: response.reminderTime,
      hoursBeforeAppointment: response.hoursBeforeAppointment || hoursBeforeAppointment,
      transactionId: response.transactionId,
      message: response.scheduled 
        ? 'Reminder scheduled successfully'
        : 'Reminder sent immediately (appointment time was too close)'
    });

  } catch (error) {
    console.error('❌ Error in schedule reminder API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to schedule reminder',
        details: error.message 
      },
      { status: 500 }
    );
  }
}