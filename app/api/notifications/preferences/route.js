/**
 * Notification Preferences API
 * 
 * Manages user notification preferences for booking confirmations and reminders
 * 
 * Endpoints:
 * - GET /api/notifications/preferences - Get current user preferences
 * - POST /api/notifications/preferences - Update user preferences
 * - DELETE /api/notifications/preferences - Reset to defaults
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('user_id');

    if (!email && !userId) {
      return Response.json(
        { error: 'Email or user_id parameter required' },
        { status: 400 }
      );
    }

    // Get preferences using the stored procedure
    let query;
    if (email) {
      const { data, error } = await supabase
        .rpc('get_notification_preferences', { user_email: email });
      
      if (error) {
        console.error('Database error:', error);
        return Response.json(
          { error: 'Failed to fetch preferences' },
          { status: 500 }
        );
      }

      // If no preferences found, return defaults
      if (!data || data.length === 0) {
        return Response.json({
          email: email,
          preferences: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: false,
            in_app_enabled: true,
            booking_confirmations: true,
            reminder_24h: true,
            reminder_2h: true,
            reminder_30min: false,
            cancellation_notifications: true,
            reschedule_notifications: true,
            marketing_emails: false,
            marketing_sms: false,
            preferred_channels: ['email'],
            quiet_hours: {
              start: '22:00',
              end: '08:00',
              timezone: 'America/New_York'
            }
          },
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      const userPrefs = data[0];
      return Response.json({
        email: email,
        preferences: {
          email_enabled: userPrefs.email_enabled,
          sms_enabled: userPrefs.sms_enabled,
          push_enabled: userPrefs.push_enabled,
          booking_confirmations: userPrefs.booking_confirmations,
          reminder_24h: userPrefs.reminder_24h,
          reminder_2h: userPrefs.reminder_2h,
          reminder_30min: userPrefs.reminder_30min,
          preferred_channels: userPrefs.preferred_channels
        },
        is_default: false
      });
    }

    // If userId provided, get by user_id
    const { data: userPrefs, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return Response.json({
          user_id: userId,
          preferences: getDefaultPreferences(),
          is_default: true
        });
      }
      
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return Response.json({
      user_id: userId,
      email: userPrefs.email,
      preferences: {
        email_enabled: userPrefs.email_enabled,
        sms_enabled: userPrefs.sms_enabled,
        push_enabled: userPrefs.push_enabled,
        in_app_enabled: userPrefs.in_app_enabled,
        booking_confirmations: userPrefs.booking_confirmations,
        reminder_24h: userPrefs.reminder_24h,
        reminder_2h: userPrefs.reminder_2h,
        reminder_30min: userPrefs.reminder_30min,
        cancellation_notifications: userPrefs.cancellation_notifications,
        reschedule_notifications: userPrefs.reschedule_notifications,
        marketing_emails: userPrefs.marketing_emails,
        marketing_sms: userPrefs.marketing_sms,
        preferred_channels: userPrefs.preferred_channels,
        quiet_hours: userPrefs.quiet_hours
      },
      created_at: userPrefs.created_at,
      updated_at: userPrefs.updated_at,
      is_default: false
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, user_id, preferences } = body;

    if (!email && !user_id) {
      return Response.json(
        { error: 'Email or user_id required' },
        { status: 400 }
      );
    }

    if (!preferences) {
      return Response.json(
        { error: 'Preferences object required' },
        { status: 400 }
      );
    }

    // Validate preferences structure
    const validationError = validatePreferences(preferences);
    if (validationError) {
      return Response.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Prepare data for upsert
    const preferencesData = {
      email: email,
      user_id: user_id,
      email_enabled: preferences.email_enabled ?? true,
      sms_enabled: preferences.sms_enabled ?? false,
      push_enabled: preferences.push_enabled ?? false,
      in_app_enabled: preferences.in_app_enabled ?? true,
      booking_confirmations: preferences.booking_confirmations ?? true,
      reminder_24h: preferences.reminder_24h ?? true,
      reminder_2h: preferences.reminder_2h ?? true,
      reminder_30min: preferences.reminder_30min ?? false,
      cancellation_notifications: preferences.cancellation_notifications ?? true,
      reschedule_notifications: preferences.reschedule_notifications ?? true,
      marketing_emails: preferences.marketing_emails ?? false,
      marketing_sms: preferences.marketing_sms ?? false,
      preferred_channels: preferences.preferred_channels ?? ['email'],
      quiet_hours: preferences.quiet_hours ?? {
        start: '22:00',
        end: '08:00',
        timezone: 'America/New_York'
      },
      updated_at: new Date().toISOString()
    };

    // Handle opt-out tracking
    if (preferences.email_enabled === false && preferences.email_enabled !== undefined) {
      preferencesData.email_opt_out_date = new Date().toISOString();
    }
    if (preferences.sms_enabled === false && preferences.sms_enabled !== undefined) {
      preferencesData.sms_opt_out_date = new Date().toISOString();
    }
    if (preferences.push_enabled === false && preferences.push_enabled !== undefined) {
      preferencesData.push_opt_out_date = new Date().toISOString();
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(preferencesData, {
        onConflict: email ? 'email' : 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Log the preference change for analytics
    try {
      await logPreferenceChange(email || user_id, preferences, 'updated');
    } catch (logError) {
      console.warn('Failed to log preference change:', logError);
      // Don't fail the request for logging errors
    }

    return Response.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: {
        email_enabled: data.email_enabled,
        sms_enabled: data.sms_enabled,
        push_enabled: data.push_enabled,
        in_app_enabled: data.in_app_enabled,
        booking_confirmations: data.booking_confirmations,
        reminder_24h: data.reminder_24h,
        reminder_2h: data.reminder_2h,
        reminder_30min: data.reminder_30min,
        cancellation_notifications: data.cancellation_notifications,
        reschedule_notifications: data.reschedule_notifications,
        marketing_emails: data.marketing_emails,
        marketing_sms: data.marketing_sms,
        preferred_channels: data.preferred_channels,
        quiet_hours: data.quiet_hours
      },
      updated_at: data.updated_at
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('user_id');

    if (!email && !userId) {
      return Response.json(
        { error: 'Email or user_id parameter required' },
        { status: 400 }
      );
    }

    // Delete preferences (this will reset to defaults)
    let query = supabase.from('notification_preferences').delete();
    
    if (email) {
      query = query.eq('email', email);
    } else {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    // Log the preference change for analytics
    try {
      await logPreferenceChange(email || userId, getDefaultPreferences(), 'reset');
    } catch (logError) {
      console.warn('Failed to log preference change:', logError);
    }

    return Response.json({
      success: true,
      message: 'Notification preferences reset to defaults',
      preferences: getDefaultPreferences()
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get default notification preferences
 */
function getDefaultPreferences() {
  return {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: false,
    in_app_enabled: true,
    booking_confirmations: true,
    reminder_24h: true,
    reminder_2h: true,
    reminder_30min: false,
    cancellation_notifications: true,
    reschedule_notifications: true,
    marketing_emails: false,
    marketing_sms: false,
    preferred_channels: ['email'],
    quiet_hours: {
      start: '22:00',
      end: '08:00',
      timezone: 'America/New_York'
    }
  };
}

/**
 * Validate preferences object structure
 */
function validatePreferences(preferences) {
  const booleanFields = [
    'email_enabled', 'sms_enabled', 'push_enabled', 'in_app_enabled',
    'booking_confirmations', 'reminder_24h', 'reminder_2h', 'reminder_30min',
    'cancellation_notifications', 'reschedule_notifications',
    'marketing_emails', 'marketing_sms'
  ];

  // Check boolean fields
  for (const field of booleanFields) {
    if (preferences[field] !== undefined && typeof preferences[field] !== 'boolean') {
      return `${field} must be a boolean value`;
    }
  }

  // Check preferred_channels
  if (preferences.preferred_channels !== undefined) {
    if (!Array.isArray(preferences.preferred_channels)) {
      return 'preferred_channels must be an array';
    }

    const validChannels = ['email', 'sms', 'push', 'in_app'];
    for (const channel of preferences.preferred_channels) {
      if (!validChannels.includes(channel)) {
        return `Invalid channel: ${channel}. Valid channels: ${validChannels.join(', ')}`;
      }
    }
  }

  // Check quiet_hours
  if (preferences.quiet_hours !== undefined) {
    const { start, end, timezone } = preferences.quiet_hours;
    
    if (!start || !end || !timezone) {
      return 'quiet_hours must include start, end, and timezone';
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      return 'quiet_hours start and end must be in HH:mm format';
    }
  }

  return null; // No validation errors
}

/**
 * Log preference changes for analytics
 */
async function logPreferenceChange(identifier, preferences, action) {
  try {
    const { error } = await supabase
      .from('user_activity_log')
      .insert({
        identifier: identifier,
        activity_type: 'notification_preference_change',
        activity_data: {
          action: action,
          preferences: preferences,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log preference change:', error);
    }
  } catch (error) {
    console.error('Error in logPreferenceChange:', error);
  }
}