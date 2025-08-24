'use client'

/**
 * Universal Settings Form Component
 * 
 * Dynamically renders form fields based on settings category, eliminating
 * the need for separate form components for each settings type.
 * 
 * This component handles all the different forms that were previously
 * scattered across 20+ separate settings pages, consolidating them into
 * a single, reusable component with proper validation and UX.
 */

import React, { useState, useEffect } from 'react'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import Button from '../ui/Button'

const FORM_SCHEMAS = {
  business_info: {
    fields: [
      { 
        id: 'name', 
        label: 'Business Name', 
        type: 'text', 
        required: true,
        placeholder: 'Enter your business name',
        description: 'This appears on booking confirmations and receipts'
      },
      { 
        id: 'description', 
        label: 'Business Description', 
        type: 'textarea', 
        maxLength: 500,
        placeholder: 'Describe your services and what makes your business special...',
        description: 'This appears on your public booking page'
      },
      { 
        id: 'email', 
        label: 'Business Email', 
        type: 'email', 
        required: true,
        placeholder: 'business@example.com',
        description: 'Primary email for customer communications'
      },
      { 
        id: 'phone', 
        label: 'Business Phone', 
        type: 'tel', 
        required: true,
        placeholder: '(555) 123-4567',
        description: 'Main contact number for your business'
      },
      { 
        id: 'website', 
        label: 'Website URL', 
        type: 'url',
        placeholder: 'https://yourbusiness.com',
        description: 'Your business website (optional)'
      },
      {
        id: 'address',
        label: 'Business Address',
        type: 'group',
        fields: [
          { id: 'street', label: 'Street Address', type: 'text', required: true },
          { id: 'city', label: 'City', type: 'text', required: true },
          { id: 'state', label: 'State', type: 'text', required: true },
          { id: 'zip_code', label: 'ZIP Code', type: 'text', required: true },
          { id: 'country', label: 'Country', type: 'select', options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
            { value: 'UK', label: 'United Kingdom' }
          ], defaultValue: 'US' }
        ]
      }
    ]
  },
  
  notifications: {
    fields: [
      {
        id: 'email_enabled',
        label: 'Email Notifications',
        type: 'toggle',
        description: 'Receive notifications via email'
      },
      {
        id: 'sms_enabled',
        label: 'SMS Notifications', 
        type: 'toggle',
        description: 'Receive notifications via text message'
      },
      {
        id: 'appointment_confirmations',
        label: 'Appointment Confirmations',
        type: 'toggle',
        description: 'Get notified when appointments are booked'
      },
      {
        id: 'appointment_reminders',
        label: 'Appointment Reminders',
        type: 'toggle',
        description: 'Send reminders before appointments'
      },
      {
        id: 'cancellation_notifications',
        label: 'Cancellation Alerts',
        type: 'toggle',
        description: 'Get notified when appointments are cancelled'
      },
      {
        id: 'marketing_enabled',
        label: 'Marketing Communications',
        type: 'toggle',
        description: 'Receive promotional emails and updates'
      },
      {
        id: 'review_requests',
        label: 'Review Requests',
        type: 'toggle',
        description: 'Automatically request reviews after appointments'
      },
      {
        id: 'email_frequency',
        label: 'Email Frequency',
        type: 'select',
        options: [
          { value: 'immediate', label: 'Immediate' },
          { value: 'daily', label: 'Daily Digest' },
          { value: 'weekly', label: 'Weekly Summary' }
        ],
        defaultValue: 'immediate'
      }
    ]
  },
  
  booking_preferences: {
    fields: [
      {
        id: 'booking_window_days',
        label: 'Booking Window (Days)',
        type: 'number',
        min: 1,
        max: 365,
        required: true,
        description: 'How far in advance customers can book appointments'
      },
      {
        id: 'cancellation_policy',
        label: 'Cancellation Policy',
        type: 'select',
        required: true,
        options: [
          { value: '1_hour', label: '1 Hour Notice' },
          { value: '2_hours', label: '2 Hours Notice' },
          { value: '24_hours', label: '24 Hours Notice' },
          { value: '48_hours', label: '48 Hours Notice' }
        ],
        description: 'Minimum notice required for cancellations'
      },
      {
        id: 'require_deposit',
        label: 'Require Deposit',
        type: 'toggle',
        description: 'Require customers to pay a deposit when booking'
      },
      {
        id: 'allow_walk_ins',
        label: 'Allow Walk-ins',
        type: 'toggle',
        description: 'Accept customers without appointments'
      },
      {
        id: 'require_phone',
        label: 'Require Phone Number',
        type: 'toggle',
        description: 'Make phone number mandatory for bookings'
      },
      {
        id: 'appointment_duration_default',
        label: 'Default Appointment Duration (minutes)',
        type: 'number',
        min: 15,
        max: 240,
        step: 15,
        defaultValue: 30
      },
      {
        id: 'buffer_time',
        label: 'Buffer Time Between Appointments (minutes)',
        type: 'number',
        min: 0,
        max: 60,
        step: 5,
        defaultValue: 5
      }
    ]
  },
  
  integrations: {
    fields: [
      {
        id: 'google_calendar',
        label: 'Google Calendar Integration',
        type: 'integration',
        description: 'Sync appointments with Google Calendar',
        fields: [
          { id: 'enabled', type: 'toggle', label: 'Enable Sync' },
          { id: 'bidirectional', type: 'toggle', label: 'Two-way Sync' }
        ]
      },
      {
        id: 'stripe_connect',
        label: 'Stripe Payment Processing',
        type: 'integration',
        description: 'Accept payments through Stripe',
        fields: [
          { id: 'enabled', type: 'toggle', label: 'Enable Payments' },
          { id: 'automatic_payouts', type: 'toggle', label: 'Automatic Payouts' }
        ]
      },
      {
        id: 'sendgrid',
        label: 'SendGrid Email Service',
        type: 'integration', 
        description: 'Send emails through SendGrid',
        fields: [
          { id: 'enabled', type: 'toggle', label: 'Enable Email Service' },
          { id: 'template_id', type: 'text', label: 'Template ID', placeholder: 'd-1234567890abcdef' }
        ]
      },
      {
        id: 'twilio',
        label: 'Twilio SMS Service',
        type: 'integration',
        description: 'Send SMS notifications through Twilio',
        fields: [
          { id: 'enabled', type: 'toggle', label: 'Enable SMS Service' },
          { id: 'phone_number', type: 'tel', label: 'Twilio Phone Number' }
        ]
      }
    ]
  },
  
  appearance: {
    fields: [
      {
        id: 'theme',
        label: 'Theme',
        type: 'select',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'modern', label: 'Modern' },
          { value: 'classic', label: 'Classic' },
          { value: 'custom', label: 'Custom' }
        ],
        defaultValue: 'professional'
      },
      {
        id: 'primary_color',
        label: 'Primary Color',
        type: 'color',
        defaultValue: '#6B7280',
        description: 'Main brand color for buttons and highlights'
      },
      {
        id: 'secondary_color',
        label: 'Secondary Color',
        type: 'color',
        defaultValue: '#F3F4F6',
        description: 'Background and accent color'
      },
      {
        id: 'logo_url',
        label: 'Logo URL',
        type: 'url',
        placeholder: 'https://example.com/logo.png',
        description: 'URL to your business logo image'
      },
      {
        id: 'font_family',
        label: 'Font Family',
        type: 'select',
        options: [
          { value: 'inter', label: 'Inter (Default)' },
          { value: 'roboto', label: 'Roboto' },
          { value: 'opensans', label: 'Open Sans' },
          { value: 'montserrat', label: 'Montserrat' }
        ],
        defaultValue: 'inter'
      }
    ]
  }
}

export default function SettingsForm({ 
  category, 
  settings = {}, 
  onChange, 
  onSave, 
  disabled = false, 
  loading = false,
  organizationInfo 
}) {
  const [formData, setFormData] = useState(settings)
  const [validation, setValidation] = useState({})
  const [showPasswords, setShowPasswords] = useState({})

  const schema = FORM_SCHEMAS[category]

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleFieldChange = (fieldId, value) => {
    const newData = { ...formData, [fieldId]: value }
    setFormData(newData)
    onChange?.(newData)
    
    // Clear validation error for this field
    if (validation[fieldId]) {
      setValidation(prev => ({ ...prev, [fieldId]: null }))
    }
  }

  const handleGroupFieldChange = (groupId, fieldId, value) => {
    const newData = {
      ...formData,
      [groupId]: {
        ...formData[groupId],
        [fieldId]: value
      }
    }
    setFormData(newData)
    onChange?.(newData)
  }

  const validateForm = () => {
    const errors = {}
    
    schema.fields.forEach(field => {
      if (field.required && !formData[field.id]) {
        errors[field.id] = `${field.label} is required`
      }
      
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
        if (!emailRegex.test(formData[field.id])) {
          errors[field.id] = 'Invalid email format'
        }
      }
      
      if (field.type === 'url' && formData[field.id]) {
        try {
          new URL(formData[field.id])
        } catch {
          errors[field.id] = 'Invalid URL format'
        }
      }
      
      if (field.type === 'group' && field.fields) {
        field.fields.forEach(subField => {
          if (subField.required && !formData[field.id]?.[subField.id]) {
            errors[`${field.id}.${subField.id}`] = `${subField.label} is required`
          }
        })
      }
    })
    
    setValidation(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    onSave?.(formData)
  }

  const renderField = (field, value, onChange, path = '') => {
    const fieldPath = path ? `${path}.${field.id}` : field.id
    const hasError = validation[fieldPath]
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
        return (
          <div key={field.id} className=\"space-y-2\">
            <label className=\"block text-sm font-medium text-gray-700\">
              {field.label}
              {field.required && <span className=\"text-red-500 ml-1\">*</span>}
            </label>
            <input
              type={field.type}
              value={value || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
                ${hasError ? 'border-red-300' : ''}
              `}
            />
            {field.description && (
              <p className=\"text-sm text-gray-500\">{field.description}</p>
            )}
            {hasError && (
              <p className=\"text-sm text-red-600 flex items-center\">
                <XCircleIcon className=\"h-4 w-4 mr-1\" />
                {hasError}
              </p>
            )}
          </div>
        )
        
      case 'textarea':
        return (
          <div key={field.id} className=\"space-y-2\">
            <label className=\"block text-sm font-medium text-gray-700\">
              {field.label}
              {field.required && <span className=\"text-red-500 ml-1\">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              rows={4}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent resize-none
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
                ${hasError ? 'border-red-300' : ''}
              `}
            />
            {field.maxLength && (
              <p className=\"text-xs text-gray-400 text-right\">
                {(value || '').length}/{field.maxLength}
              </p>
            )}
            {field.description && (
              <p className=\"text-sm text-gray-500\">{field.description}</p>
            )}
            {hasError && (
              <p className=\"text-sm text-red-600 flex items-center\">
                <XCircleIcon className=\"h-4 w-4 mr-1\" />
                {hasError}
              </p>
            )}
          </div>
        )
        
      case 'number':
        return (
          <div key={field.id} className=\"space-y-2\">
            <label className=\"block text-sm font-medium text-gray-700\">
              {field.label}
              {field.required && <span className=\"text-red-500 ml-1\">*</span>}
            </label>
            <input
              type=\"number\"
              value={value || field.defaultValue || ''}
              onChange={(e) => onChange(field.id, parseInt(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
                ${hasError ? 'border-red-300' : ''}
              `}
            />
            {field.description && (
              <p className=\"text-sm text-gray-500\">{field.description}</p>
            )}
            {hasError && (
              <p className=\"text-sm text-red-600 flex items-center\">
                <XCircleIcon className=\"h-4 w-4 mr-1\" />
                {hasError}
              </p>
            )}
          </div>
        )
        
      case 'select':
        return (
          <div key={field.id} className=\"space-y-2\">
            <label className=\"block text-sm font-medium text-gray-700\">
              {field.label}
              {field.required && <span className=\"text-red-500 ml-1\">*</span>}
            </label>
            <select
              value={value || field.defaultValue || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
                ${hasError ? 'border-red-300' : ''}
              `}
            >
              <option value=\"\">Select {field.label.toLowerCase()}...</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className=\"text-sm text-gray-500\">{field.description}</p>
            )}
            {hasError && (
              <p className=\"text-sm text-red-600 flex items-center\">
                <XCircleIcon className=\"h-4 w-4 mr-1\" />
                {hasError}
              </p>
            )}
          </div>
        )
        
      case 'toggle':
        return (
          <div key={field.id} className=\"flex items-center justify-between py-2\">
            <div className=\"flex-1\">
              <label className=\"text-sm font-medium text-gray-700\">
                {field.label}
              </label>
              {field.description && (
                <p className=\"text-sm text-gray-500 mt-1\">{field.description}</p>
              )}
            </div>
            <button
              type=\"button\"
              onClick={() => onChange(field.id, !value)}
              disabled={disabled}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2
                ${value ? 'bg-olive-600' : 'bg-gray-200'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${value ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        )
        
      case 'color':
        return (
          <div key={field.id} className=\"space-y-2\">
            <label className=\"block text-sm font-medium text-gray-700\">
              {field.label}
            </label>
            <div className=\"flex items-center space-x-3\">
              <input
                type=\"color\"
                value={value || field.defaultValue}
                onChange={(e) => onChange(field.id, e.target.value)}
                disabled={disabled}
                className=\"h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed\"
              />
              <input
                type=\"text\"
                value={value || field.defaultValue}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder=\"#000000\"
                disabled={disabled}
                className={`
                  flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent
                  ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
                `}
              />
            </div>
            {field.description && (
              <p className=\"text-sm text-gray-500\">{field.description}</p>
            )}
          </div>
        )
        
      case 'group':
        return (
          <div key={field.id} className=\"space-y-4\">
            <h3 className=\"text-base font-medium text-gray-900\">{field.label}</h3>
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-gray-200\">
              {field.fields.map(subField => 
                renderField(
                  subField, 
                  formData[field.id]?.[subField.id], 
                  (subFieldId, subValue) => handleGroupFieldChange(field.id, subFieldId, subValue),
                  field.id
                )
              )}
            </div>
          </div>
        )
        
      case 'integration':
        return (
          <div key={field.id} className=\"border border-gray-200 rounded-lg p-4 space-y-4\">
            <div className=\"flex items-center justify-between\">
              <div>
                <h3 className=\"text-base font-medium text-gray-900\">{field.label}</h3>
                <p className=\"text-sm text-gray-500\">{field.description}</p>
              </div>
              {formData[field.id]?.enabled && (
                <CheckCircleIcon className=\"h-5 w-5 text-green-500\" />
              )}
            </div>
            <div className=\"space-y-3\">
              {field.fields.map(subField => 
                renderField(
                  subField,
                  formData[field.id]?.[subField.id],
                  (subFieldId, subValue) => handleGroupFieldChange(field.id, subFieldId, subValue)
                )
              )}
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  if (!schema) {
    return (
      <div className=\"text-center py-8\">
        <QuestionMarkCircleIcon className=\"h-12 w-12 text-gray-400 mx-auto mb-4\" />
        <p className=\"text-gray-500\">Settings form for \"{category}\" is not available yet.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className=\"space-y-6\">
      {schema.fields.map(field => 
        renderField(field, formData[field.id], handleFieldChange)
      )}
      
      <div className=\"flex items-center justify-between pt-6 border-t border-gray-200\">
        <div className=\"text-sm text-gray-500\">
          {Object.keys(validation).length > 0 && (
            <span className=\"text-red-600\">
              Please fix {Object.keys(validation).length} error(s) above
            </span>
          )}
        </div>
        <div className=\"flex space-x-3\">
          <Button
            type=\"button\"
            variant=\"outline\"
            onClick={() => setFormData(settings)}
            disabled={disabled || loading}
          >
            Reset
          </Button>
          <Button
            type=\"submit\"
            disabled={disabled || loading || Object.keys(validation).length > 0}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}