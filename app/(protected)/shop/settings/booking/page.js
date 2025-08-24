'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import BookingRulesSetup from '@/components/onboarding/BookingRulesSetup'
import OnboardingStepBanner from '@/components/onboarding/OnboardingStepBanner'
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function BookingRulesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const [barbershopId, setBarbershopId] = useState(null)
  const [bookingRules, setBookingRules] = useState({})
  const [originalRules, setOriginalRules] = useState({})

  useEffect(() => {
    loadBookingRules()
  }, [user])

  const loadBookingRules = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Get user's barbershop
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.barbershop_id) {
        setNotification({
          type: 'error',
          message: 'No barbershop found for this user'
        })
        setLoading(false)
        return
      }
      
      setBarbershopId(profile.barbershop_id)
      
      // Load booking rules from business_settings table
      const { data: settings, error } = await supabase
        .from('business_settings')
        .select('booking_rules')
        .eq('user_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows
        throw error
      }
      
      const rules = settings?.booking_rules || {}
      setBookingRules(rules)
      setOriginalRules(rules)
    } catch (error) {
      console.error('Error loading booking rules:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load booking rules'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    setNotification(null)
    
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('business_settings')
          .update({
            booking_rules: bookingRules,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        
        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('business_settings')
          .insert({
            user_id: user.id,
            booking_rules: bookingRules,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) throw error
      }
      
      setOriginalRules(bookingRules)
      setNotification({
        type: 'success',
        message: 'Booking rules saved successfully'
      })
    } catch (error) {
      console.error('Error saving booking rules:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save booking rules'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setBookingRules(originalRules)
    setNotification(null)
  }

  const hasChanges = JSON.stringify(bookingRules) !== JSON.stringify(originalRules)

  // Validation function for onboarding completion
  const validateBookingCompletion = async () => {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const bookingComplete = data.steps?.booking?.complete || false
        return {
          valid: bookingComplete,
          message: bookingComplete 
            ? 'Booking policies configured successfully! Your cancellation and booking rules are set up.'
            : 'Please configure at least one booking or cancellation policy'
        }
      }
    } catch (error) {
      console.error('Error validating booking completion:', error)
    }
    
    return {
      valid: false,
      message: 'Unable to validate booking policies. Please ensure you have configured cancellation and booking rules.'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Onboarding Step Banner */}
      <OnboardingStepBanner 
        stepId="booking"
        validateCompletion={validateBookingCompletion}
        completionMessage="Booking policies configured successfully!"
      />

      <div className="mb-8">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-8 w-8 text-olive-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Rules</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure booking policies, cancellations, and client requirements
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          notification.type === 'success' ? 'bg-green-50' :
          notification.type === 'error' ? 'bg-red-50' :
          'bg-yellow-50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 mr-2 ${
              notification.type === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`} />
          )}
          <span className={`text-sm ${
            notification.type === 'success' ? 'text-green-800' :
            notification.type === 'error' ? 'text-red-800' :
            'text-yellow-800'
          }`}>
            {notification.message}
          </span>
        </div>
      )}

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <BookingRulesSetup 
            data={bookingRules}
            updateData={(newData) => setBookingRules(newData)}
            onComplete={() => {}}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !hasChanges || saving
              ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
              : 'bg-olive-600 text-white hover:bg-olive-700'
          }`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}