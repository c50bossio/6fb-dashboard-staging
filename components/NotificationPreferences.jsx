/**
 * Notification Preferences Component
 * 
 * Comprehensive user interface for managing notification preferences including:
 * - Channel preferences (Email, SMS, Push, In-app)
 * - Reminder timing settings (24h, 2h, 30min before)
 * - Quiet hours configuration
 * - Marketing communication preferences
 * - Real-time preference updates with feedback
 * - Accessibility-compliant design
 * 
 * @version 1.0.0
 * @author 6FB AI Agent System
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  XMarkIcon, 
  BellIcon, 
  EnvelopeIcon, 
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const NotificationPreferences = ({ 
  userEmail, 
  userId, 
  onPreferencesUpdated,
  className = '' 
}) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, [userEmail, userId]);

  /**
   * Load user preferences from API
   */
  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (userEmail) params.append('email', userEmail);
      if (userId) params.append('user_id', userId);

      const response = await fetch(`/api/notifications/preferences?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load preferences');
      }

      setPreferences(data.preferences);
      setHasChanges(false);

    } catch (err) {
      console.error('Error loading preferences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update preferences
   */
  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setError(null);
    setSuccessMessage('');
  };

  /**
   * Update preferred channels
   */
  const updatePreferredChannels = (channel, enabled) => {
    setPreferences(prev => {
      const channels = [...(prev.preferred_channels || [])];
      
      if (enabled && !channels.includes(channel)) {
        channels.push(channel);
      } else if (!enabled && channels.includes(channel)) {
        channels.splice(channels.indexOf(channel), 1);
      }

      return {
        ...prev,
        preferred_channels: channels
      };
    });
    setHasChanges(true);
  };

  /**
   * Update quiet hours
   */
  const updateQuietHours = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  /**
   * Save preferences to API
   */
  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        email: userEmail,
        user_id: userId,
        preferences: preferences
      };

      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      setSuccessMessage('Notification preferences saved successfully!');
      setHasChanges(false);

      // Callback for parent component
      if (onPreferencesUpdated) {
        onPreferencesUpdated(data.preferences);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset preferences to defaults
   */
  const resetPreferences = async () => {
    if (!window.confirm('Are you sure you want to reset all notification preferences to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const params = new URLSearchParams();
      if (userEmail) params.append('email', userEmail);
      if (userId) params.append('user_id', userId);

      const response = await fetch(`/api/notifications/preferences?${params.toString()}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset preferences');
      }

      setPreferences(data.preferences);
      setSuccessMessage('Preferences reset to defaults!');
      setHasChanges(false);

    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !preferences) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-4">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span className="font-medium">Error Loading Preferences</span>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadPreferences}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Preferences
            </h2>
          </div>
          {hasChanges && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Unsaved Changes
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Manage how and when you receive booking notifications
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Channel Preferences */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Notification Channels
          </h3>
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive confirmation and reminder emails
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.email_enabled || false}
                  onChange={(e) => updatePreference('email_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <DevicePhoneMobileIcon className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive text message reminders
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.sms_enabled || false}
                  onChange={(e) => updatePreference('sms_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ComputerDesktopIcon className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive browser notifications when online
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.push_enabled || false}
                  onChange={(e) => updatePreference('push_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BellIcon className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900">In-App Notifications</p>
                  <p className="text-sm text-gray-600">
                    See notifications when using the app
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.in_app_enabled !== false}
                  onChange={(e) => updatePreference('in_app_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Reminder Preferences */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Reminder Settings
          </h3>
          <div className="space-y-4">
            {/* Booking Confirmations */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Booking Confirmations</p>
                <p className="text-sm text-gray-600">
                  Immediate confirmation when booking is made
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.booking_confirmations !== false}
                  onChange={(e) => updatePreference('booking_confirmations', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 24-hour reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">24-Hour Reminder</p>
                <p className="text-sm text-gray-600">
                  Reminder sent 1 day before appointment
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.reminder_24h !== false}
                  onChange={(e) => updatePreference('reminder_24h', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 2-hour reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">2-Hour Reminder</p>
                <p className="text-sm text-gray-600">
                  Reminder sent 2 hours before appointment
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.reminder_2h !== false}
                  onChange={(e) => updatePreference('reminder_2h', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 30-minute reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">30-Minute Final Reminder</p>
                <p className="text-sm text-gray-600">
                  Final reminder sent 30 minutes before appointment
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.reminder_30min === true}
                  onChange={(e) => updatePreference('reminder_30min', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span>Quiet Hours</span>
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              Set hours when you don't want to receive notifications
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={preferences?.quiet_hours?.start || '22:00'}
                  onChange={(e) => updateQuietHours('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={preferences?.quiet_hours?.end || '08:00'}
                  onChange={(e) => updateQuietHours('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={preferences?.quiet_hours?.timezone || 'America/New_York'}
                  onChange={(e) => updateQuietHours('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Marketing Preferences */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Marketing Communications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Marketing Emails</p>
                <p className="text-sm text-gray-600">
                  Receive promotional offers and updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.marketing_emails === true}
                  onChange={(e) => updatePreference('marketing_emails', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Marketing SMS</p>
                <p className="text-sm text-gray-600">
                  Receive promotional text messages
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.marketing_sms === true}
                  onChange={(e) => updatePreference('marketing_sms', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-md">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Privacy Notice</p>
            <p>
              Your notification preferences are stored securely and only used to deliver 
              the communications you've requested. You can update these settings at any time.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 pt-6 border-t border-gray-200">
          <button
            onClick={resetPreferences}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Reset to Defaults
          </button>

          <div className="flex space-x-3">
            <button
              onClick={loadPreferences}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Discard Changes
            </button>

            <button
              onClick={savePreferences}
              disabled={!hasChanges || saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;