import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * DELETE /api/calendar/recurring/delete
 * Delete a recurring appointment series or single occurrence
 */
export async function DELETE(request) {
  try {
    const body = await request.json();
    const {
      appointment_id,
      deletion_type = 'this_only', // 'this_only', 'this_and_future', 'all'
      occurrence_date, // Required for 'this_only' and 'this_and_future'
      soft_delete = true // Soft delete by default for history preservation
    } = body;

    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    if ((deletion_type === 'this_only' || deletion_type === 'this_and_future') && !occurrence_date) {
      return NextResponse.json(
        { error: 'Occurrence date is required for this deletion type' },
        { status: 400 }
      );
    }

    const { data: appointment, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (!appointment.is_recurring && deletion_type !== 'all') {
      return NextResponse.json(
        { error: 'This is not a recurring appointment' },
        { status: 400 }
      );
    }

    let result;

    switch (deletion_type) {
      case 'this_only':
        result = await deleteThisOnly(appointment, occurrence_date, soft_delete);
        break;
      
      case 'this_and_future':
        result = await deleteThisAndFuture(appointment, occurrence_date, soft_delete);
        break;
      
      case 'all':
        result = await deleteAll(appointment, soft_delete);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid deletion type' },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Unexpected error in recurring appointment deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete only a single occurrence
 */
async function deleteThisOnly(appointment, occurrenceDate, softDelete) {
  try {
    const exceptions = appointment.recurring_pattern?.exceptions || [];
    const deletions = appointment.recurring_pattern?.deletions || {};
    
    const occurrenceKey = new Date(occurrenceDate).toISOString().split('T')[0];
    
    if (!exceptions.includes(occurrenceKey)) {
      exceptions.push(occurrenceKey);
    }
    
    deletions[occurrenceKey] = {
      deleted_at: new Date().toISOString(),
      soft_delete: softDelete
    };

    const updatedPattern = {
      ...appointment.recurring_pattern,
      exceptions,
      deletions
    };

    const { data, error } = await supabase
      .from('bookings')
      .update({ recurring_pattern: updatedPattern })
      .eq('id', appointment.id)
      .select()
      .single();

    if (error) {
      return { error: 'Failed to update recurring pattern', status: 500 };
    }

    if (!softDelete) {
      await supabase
        .from('bookings')
        .delete()
        .eq('parent_id', appointment.id)
        .eq('occurrence_date', occurrenceKey);
    } else {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('parent_id', appointment.id)
        .eq('occurrence_date', occurrenceKey);
    }

    return {
      data: {
        message: 'Single occurrence deleted successfully',
        appointment_id: appointment.id,
        deletion_type: 'this_only',
        occurrence_date: occurrenceKey,
        soft_delete: softDelete
      }
    };

  } catch (error) {
    console.error('Error in deleteThisOnly:', error);
    return { error: 'Failed to delete occurrence', status: 500 };
  }
}

/**
 * Delete this and all future occurrences
 */
async function deleteThisAndFuture(appointment, occurrenceDate, softDelete) {
  try {
    const untilDate = new Date(occurrenceDate);
    untilDate.setDate(untilDate.getDate() - 1); // End the day before
    
    let updatedRRule = appointment.recurring_pattern.rrule;
    const untilStr = untilDate.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\\.\\d{3}/, '');
    
    updatedRRule = updatedRRule.replace(/UNTIL=[^;\\n]+[;\\n]?/, '');
    
    if (updatedRRule.includes(';')) {
      updatedRRule += `;UNTIL=${untilStr}`;
    } else if (updatedRRule.includes('\\n')) {
      updatedRRule += `\\nUNTIL=${untilStr}`;
    } else {
      updatedRRule += `;UNTIL=${untilStr}`;
    }

    const updatedPattern = {
      ...appointment.recurring_pattern,
      rrule: updatedRRule,
      until: untilDate.toISOString(),
      truncated_at: occurrenceDate,
      truncated_date: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('bookings')
      .update({ recurring_pattern: updatedPattern })
      .eq('id', appointment.id)
      .select()
      .single();

    if (error) {
      return { error: 'Failed to update recurring pattern', status: 500 };
    }

    const deleteQuery = supabase
      .from('bookings')
      .eq('parent_id', appointment.id);

    if (!softDelete) {
      await deleteQuery.delete();
    } else {
      await deleteQuery.update({ status: 'cancelled' });
    }

    return {
      data: {
        message: 'This and future occurrences deleted successfully',
        appointment_id: appointment.id,
        deletion_type: 'this_and_future',
        truncated_at: occurrenceDate,
        new_end_date: untilDate.toISOString(),
        soft_delete: softDelete
      }
    };

  } catch (error) {
    console.error('Error in deleteThisAndFuture:', error);
    return { error: 'Failed to delete future occurrences', status: 500 };
  }
}

/**
 * Delete all occurrences in the series
 */
async function deleteAll(appointment, softDelete) {
  try {
    let result;

    if (softDelete) {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', appointment.id)
        .select()
        .single();

      if (error) {
        return { error: 'Failed to cancel appointment', status: 500 };
      }

      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('parent_id', appointment.id);

      result = data;
    } else {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', appointment.id);

      if (error) {
        return { error: 'Failed to delete appointment', status: 500 };
      }

      await supabase
        .from('bookings')
        .delete()
        .eq('parent_id', appointment.id);

      result = { id: appointment.id, deleted: true };
    }

    return {
      data: {
        message: 'All occurrences deleted successfully',
        appointment_id: appointment.id,
        deletion_type: 'all',
        soft_delete: softDelete,
        result: result
      }
    };

  } catch (error) {
    console.error('Error in deleteAll:', error);
    return { error: 'Failed to delete all occurrences', status: 500 };
  }
}

/**
 * POST /api/calendar/recurring/delete
 * Restore a soft-deleted appointment (undo deletion)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { appointment_id } = body;

    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        cancelled_at: null
      })
      .eq('id', appointment_id)
      .eq('status', 'cancelled') // Only restore if currently cancelled
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to restore appointment' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Appointment not found or not cancelled' },
        { status: 404 }
      );
    }

    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('parent_id', appointment_id)
      .eq('status', 'cancelled');

    return NextResponse.json({
      message: 'Appointment restored successfully',
      appointment: data
    });

  } catch (error) {
    console.error('Unexpected error in appointment restoration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}