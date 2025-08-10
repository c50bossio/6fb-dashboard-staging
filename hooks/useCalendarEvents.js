import { useState, useEffect, useCallback } from 'react';
import { processCalendarEvents } from '@/components/calendar/CalendarConfig';
const TimezoneService = require('../services/timezone.service');

/**
 * Custom hook for managing calendar events with proper recurring support
 */
export const useCalendarEvents = (options = {}) => {
  const {
    barberId = null,
    shopId = 'shop_001',
    timezone = TimezoneService.getCurrentTimezone(),
    useServerExpansion = true // Use server-side expansion for better performance
  } = options;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });

  /**
   * Fetch events using server-side expansion
   */
  const fetchEventsWithExpansion = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/calendar/recurring/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          barber_id: barberId,
          shop_id: shopId,
          include_single: true,
          timezone: timezone
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Events are already formatted from the expand endpoint
      setEvents(data.events || []);
      
      console.log(`Loaded ${data.meta?.total || 0} events (${data.meta?.recurring_count || 0} recurring, ${data.meta?.single_count || 0} single)`);
      
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [barberId, shopId, timezone]);

  /**
   * Fetch events using client-side expansion (fallback)
   */
  const fetchEventsWithClientExpansion = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        shop_id: shopId
      });

      if (barberId) {
        params.append('barber_id', barberId);
      }

      const response = await fetch(`/api/calendar/appointments?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process events for calendar display
      const processedEvents = processCalendarEvents(data.appointments || [], timezone);
      setEvents(processedEvents);
      
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [barberId, shopId, timezone]);

  /**
   * Main fetch function that chooses the appropriate method
   */
  const fetchEvents = useCallback(async (startDate, endDate) => {
    // Update date range
    setDateRange({ start: startDate, end: endDate });

    // Use server expansion if enabled
    if (useServerExpansion) {
      await fetchEventsWithExpansion(startDate, endDate);
    } else {
      await fetchEventsWithClientExpansion(startDate, endDate);
    }
  }, [useServerExpansion, fetchEventsWithExpansion, fetchEventsWithClientExpansion]);

  /**
   * Create a new appointment
   */
  const createAppointment = useCallback(async (appointmentData) => {
    try {
      setLoading(true);
      setError(null);

      // Determine endpoint based on whether it's recurring
      const endpoint = appointmentData.is_recurring 
        ? '/api/calendar/recurring/create'
        : '/api/calendar/appointments';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...appointmentData,
          shop_id: shopId,
          timezone: timezone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create appointment');
      }

      const data = await response.json();

      // Refresh events after creation
      if (dateRange.start && dateRange.end) {
        await fetchEvents(dateRange.start, dateRange.end);
      }

      return data;
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [shopId, timezone, dateRange, fetchEvents]);

  /**
   * Update an existing appointment
   */
  const updateAppointment = useCallback(async (appointmentId, updates, modificationOptions = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Check if this is a recurring appointment modification
      const isRecurringModification = modificationOptions.modification_type && 
        ['this_only', 'this_and_future', 'all'].includes(modificationOptions.modification_type);

      const endpoint = isRecurringModification
        ? '/api/calendar/recurring/modify'
        : `/api/calendar/appointments/${appointmentId}`;

      const method = isRecurringModification ? 'PUT' : 'PATCH';

      const body = isRecurringModification
        ? {
            appointment_id: appointmentId,
            modification_type: modificationOptions.modification_type,
            occurrence_date: modificationOptions.occurrence_date,
            changes: updates,
            timezone: timezone
          }
        : updates;

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appointment');
      }

      const data = await response.json();

      // Refresh events after update
      if (dateRange.start && dateRange.end) {
        await fetchEvents(dateRange.start, dateRange.end);
      }

      return data;
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [timezone, dateRange, fetchEvents]);

  /**
   * Delete an appointment
   */
  const deleteAppointment = useCallback(async (appointmentId, deletionOptions = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Check if this is a recurring appointment deletion
      const isRecurringDeletion = deletionOptions.deletion_type && 
        ['this_only', 'this_and_future', 'all'].includes(deletionOptions.deletion_type);

      const endpoint = isRecurringDeletion
        ? '/api/calendar/recurring/delete'
        : `/api/calendar/appointments/${appointmentId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          ...deletionOptions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete appointment');
      }

      const data = await response.json();

      // Refresh events after deletion
      if (dateRange.start && dateRange.end) {
        await fetchEvents(dateRange.start, dateRange.end);
      }

      return data;
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dateRange, fetchEvents]);

  /**
   * Convert a single appointment to recurring
   */
  const convertToRecurring = useCallback(async (appointmentId, recurrencePattern) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/calendar/appointments/${appointmentId}/convert-recurring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recurrence_rule: recurrencePattern.rrule || recurrencePattern,
          timezone: timezone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert to recurring');
      }

      const data = await response.json();

      // Refresh events after conversion
      if (dateRange.start && dateRange.end) {
        await fetchEvents(dateRange.start, dateRange.end);
      }

      return data;
    } catch (err) {
      console.error('Error converting to recurring:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [timezone, dateRange, fetchEvents]);

  /**
   * Check for conflicts
   */
  const checkConflicts = useCallback(async (barberId, startTime, endTime, excludeId = null) => {
    try {
      const response = await fetch('/api/calendar/appointments/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barber_id: barberId,
          start_time: startTime,
          end_time: endTime,
          exclude_id: excludeId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check conflicts');
      }

      const data = await response.json();
      return data.hasConflict;
    } catch (err) {
      console.error('Error checking conflicts:', err);
      return false; // Assume no conflict on error
    }
  }, []);

  /**
   * Refresh events for current date range
   */
  const refresh = useCallback(() => {
    if (dateRange.start && dateRange.end) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchEvents]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    convertToRecurring,
    checkConflicts,
    refresh,
    dateRange
  };
};

export default useCalendarEvents;