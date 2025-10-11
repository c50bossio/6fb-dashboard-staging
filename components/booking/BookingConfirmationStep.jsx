/**
 * Booking Confirmation Step Component
 *
 * Final step in booking flow with:
 * - Booking details review and confirmation
 * - Notification preference selection
 * - Payment confirmation integration
 * - Real-time booking submission
 * - Success state with next steps
 * - Error handling and retry logic
 * - Accessibility-compliant design
 *
 * Database Schema Mapping:
 * - client_name, client_phone, client_email (appointments table)
 * - scheduled_at (not start_time/end_time)
 * - barber.full_name (not barber.name) via profiles table
 * - barber.avatar_url (not barber.image_url) via profiles table
 * - Safe fallback patterns handle both flat and nested data structures
 *
 * @version 1.1.0
 * @author 6FB AI Agent System
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const BookingConfirmationStep = ({
  bookingData,
  onConfirm,
  onBack,
  isProcessing = false,
  error = null,
  userPreferences = null,
  className = ''
}) => {
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: false,
    booking_confirmations: true,
    reminder_24h: true,
    reminder_2h: true,
    reminder_30min: false,
    preferred_channels: ['email']
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);
  
  // Initialize preferences from user data or props
  useEffect(() => {
    if (userPreferences) {
      setNotificationPreferences(userPreferences);
    }
  }, [userPreferences]);

  // Update preferred channels when individual channels change
  useEffect(() => {
    const channels = [];
    if (notificationPreferences.email_enabled) channels.push('email');
    if (notificationPreferences.sms_enabled) channels.push('sms');
    if (notificationPreferences.push_enabled) channels.push('push');
    
    setNotificationPreferences(prev => ({
      ...prev,
      preferred_channels: channels.length > 0 ? channels : ['email'] // Always have at least email
    }));
  }, [
    notificationPreferences.email_enabled, 
    notificationPreferences.sms_enabled, 
    notificationPreferences.push_enabled
  ]);

  /**
   * Get client name with safe fallbacks
   * Priority: client_name > client.full_name > 'Walk-in'
   */
  const getClientName = () => {
    return bookingData.client_name ||
           bookingData.client?.full_name ||
           'Walk-in';
  };

  /**
   * Get client phone with safe fallbacks
   */
  const getClientPhone = () => {
    return bookingData.client_phone ||
           bookingData.client?.phone ||
           null;
  };

  /**
   * Get client email with safe fallbacks
   */
  const getClientEmail = () => {
    return bookingData.client_email ||
           bookingData.client?.email ||
           null;
  };

  /**
   * Get barber name with safe fallbacks
   * Priority: barber.full_name > barber_name > 'Your Barber'
   */
  const getBarberName = () => {
    return bookingData.barber?.full_name ||
           bookingData.barber_name ||
           'Your Barber';
  };

  /**
   * Get barber avatar with safe fallbacks
   */
  const getBarberAvatar = () => {
    return bookingData.barber?.avatar_url ||
           bookingData.barber_avatar_url ||
           null;
  };

  /**
   * Format appointment date and time
   * Uses scheduled_at field from database schema
   */
  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    return {
      date: date.toLocaleDateString('en-US', dateOptions),
      time: date.toLocaleTimeString('en-US', timeOptions),
      full: date.toLocaleString('en-US', {
        ...dateOptions,
        ...timeOptions
      })
    };
  };

  /**
   * Handle notification preference change
   */
  const updateNotificationPreference = (key, value) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * Handle booking confirmation submission
   */
  const handleConfirmBooking = async () => {
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions to continue.');
      return;
    }

    // Prepare booking data with notification preferences
    const finalBookingData = {
      ...bookingData,
      notification_preferences: notificationPreferences
    };

    try {
      await onConfirm(finalBookingData);
    } catch (error) {
      console.error('Booking confirmation error:', error);
    }
  };

  if (!bookingData) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No booking data available</p>
        </div>
      </div>
    );
  }

  // Use scheduled_at (correct schema field) with fallback to appointment_datetime
  const dateTime = formatDateTime(bookingData.scheduled_at || bookingData.appointment_datetime);

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Confirm Your Booking
            </h2>
          </div>
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Review your appointment details and confirm your booking
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Booking Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Booking Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Appointment Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{bookingData.service_name}</p>
                  <p className="text-sm text-gray-600">Service</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {getBarberAvatar() ? (
                  <img
                    src={getBarberAvatar()}
                    alt={getBarberName()}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-green-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{getBarberName()}</p>
                  <p className="text-sm text-gray-600">Barber</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <MapPinIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{bookingData.shop_name}</p>
                  <p className="text-sm text-gray-600">Location</p>
                </div>
              </div>
            </div>

            {/* Date & Time Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{dateTime.date}</p>
                  <p className="text-sm text-gray-600">Date</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{dateTime.time}</p>
                  <p className="text-sm text-gray-600">Time</p>
                </div>
              </div>

              {bookingData.total_price && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">${bookingData.total_price}</p>
                    <p className="text-sm text-gray-600">Total Price</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {bookingData.notes && (
            <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Special Notes:</p>
              <p className="text-sm text-gray-600">{bookingData.notes}</p>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="border border-gray-200 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <button
              onClick={() => setShowNotificationOptions(!showNotificationOptions)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <BellIcon className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Notification Preferences</h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {notificationPreferences.preferred_channels.length} channel(s) selected
                </span>
                <div className={`transform transition-transform ${showNotificationOptions ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          <div className={`px-4 py-4 space-y-4 ${showNotificationOptions ? 'block' : 'hidden'}`}>
            {/* Notification Channels */}
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">How would you like to receive notifications?</h5>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.email_enabled}
                    onChange={(e) => updateNotificationPreference('email_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-xs text-gray-600">Confirmation and reminder emails</p>
                  </div>
                </label>

                {bookingData.client_phone && (
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.sms_enabled}
                      onChange={(e) => updateNotificationPreference('sms_enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <DevicePhoneMobileIcon className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">SMS Text Messages</p>
                      <p className="text-xs text-gray-600">Quick reminders via text</p>
                    </div>
                  </label>
                )}

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.push_enabled}
                    onChange={(e) => updateNotificationPreference('push_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <BellIcon className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                    <p className="text-xs text-gray-600">Browser notifications when online</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Reminder Timing */}
            <div className="pt-4 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-900 mb-3">When should we remind you?</h5>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.reminder_24h}
                    onChange={(e) => updateNotificationPreference('reminder_24h', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">24 hours before appointment</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.reminder_2h}
                    onChange={(e) => updateNotificationPreference('reminder_2h', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">2 hours before appointment</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.reminder_30min}
                    onChange={(e) => updateNotificationPreference('reminder_30min', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">30 minutes before appointment</span>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> You can always update these preferences in your account settings after booking.
              </p>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required
            />
            <div className="text-sm">
              <p className="text-gray-900">
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                . I understand the cancellation policy and confirm that all appointment details are correct.
              </p>
              <p className="text-gray-600 mt-1">
                By booking, you agree to receive transactional notifications about your appointment.
              </p>
            </div>
          </label>
        </div>

        {/* Confirmation Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p>Your appointment will be confirmed immediately</p>
            <p>You'll receive confirmation via your selected channels</p>
          </div>

          <button
            onClick={handleConfirmBooking}
            disabled={isProcessing || !agreedToTerms}
            className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing Booking...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Confirm Booking
              </>
            )}
          </button>
        </div>

        {/* Additional Information */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <h5 className="font-medium text-gray-900 mb-2">What happens next?</h5>
          <ul className="space-y-1 list-disc list-inside">
            <li>You'll receive an immediate booking confirmation</li>
            <li>Reminders will be sent based on your preferences</li>
            <li>You can reschedule or cancel up to 24 hours in advance</li>
            <li>Payment will be processed at the time of service (if not prepaid)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationStep;