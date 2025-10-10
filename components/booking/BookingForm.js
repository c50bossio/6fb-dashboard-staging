'use client'

import { useState } from 'react'
import { validateEmail, validatePhone, validateRequired } from '@/lib/form-validation'

/**
 * Booking Form
 * Collects customer information for the booking
 */
export default function BookingForm({ bookingData, onSubmit, onBack, isLoading }) {
  const [formData, setFormData] = useState({
    customerName: bookingData.customerName || '',
    customerEmail: bookingData.customerEmail || '',
    customerPhone: bookingData.customerPhone || '',
    notes: bookingData.notes || '',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }

    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const newErrors = {}

    // Name validation
    const nameValidation = validateRequired(formData.customerName, 'Name')
    if (!nameValidation.valid) {
      newErrors.customerName = nameValidation.error
    }

    // Email validation
    const emailValidation = validateEmail(formData.customerEmail)
    if (!emailValidation.valid) {
      newErrors.customerEmail = emailValidation.error
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.customerPhone) {
      const phoneValidation = validatePhone(formData.customerPhone)
      if (!phoneValidation.valid) {
        newErrors.customerPhone = phoneValidation.error
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your Information</h2>
        <p className="text-muted-foreground mt-1">We'll send your booking confirmation to this email</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-foreground mb-1">
            Full Name <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            id="customerName"
            value={formData.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            className={`w-full px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.customerName ? 'border-red-500 dark:border-red-400' : 'border-border'
            }`}
            placeholder="John Smith"
            disabled={isLoading}
          />
          {errors.customerName && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.customerName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="customerEmail" className="block text-sm font-medium text-foreground mb-1">
            Email Address <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="email"
            id="customerEmail"
            value={formData.customerEmail}
            onChange={(e) => handleChange('customerEmail', e.target.value)}
            className={`w-full px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.customerEmail ? 'border-red-500 dark:border-red-400' : 'border-border'
            }`}
            placeholder="john.smith@example.com"
            disabled={isLoading}
          />
          {errors.customerEmail && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.customerEmail}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            We'll send your booking confirmation and reminders to this email
          </p>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-foreground mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="customerPhone"
            value={formData.customerPhone}
            onChange={(e) => handleChange('customerPhone', e.target.value)}
            className={`w-full px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.customerPhone ? 'border-red-500 dark:border-red-400' : 'border-border'
            }`}
            placeholder="+1-555-123-4567"
            disabled={isLoading}
          />
          {errors.customerPhone && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.customerPhone}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            We'll use this to send SMS reminders if you'd like
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
            Special Requests (Optional)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            placeholder="Any special requests or notes for your appointment..."
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">
              Example: "Please use beard oil" or "First time customer"
            </p>
            <p className="text-xs text-muted-foreground">
              {formData.notes.length}/500
            </p>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="p-4 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800 rounded-lg">
          <h3 className="text-sm font-semibold text-olive-900 dark:text-olive-100 mb-2">Booking Summary</h3>
          <div className="space-y-1 text-sm text-olive-800 dark:text-olive-200">
            <div className="flex justify-between">
              <span>Service:</span>
              <span className="font-medium">{bookingData.serviceDetails?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-medium">{bookingData.duration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span className="font-medium">
                {new Date(bookingData.dateTime).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-olive-300 dark:border-olive-700 text-base font-semibold">
              <span>Total:</span>
              <span>${bookingData.price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-3 text-foreground bg-card border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 text-white bg-olive-600 rounded-lg hover:bg-olive-700 focus:ring-4 focus:ring-olive-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Confirming...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </form>

      {/* Terms */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          By confirming your booking, you agree to our cancellation policy. Please provide at least 24 hours notice for cancellations or rescheduling.
        </p>
      </div>
    </div>
  )
}
