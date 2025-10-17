'use client'

import {
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

const DEFAULT_TEMPLATES = {
  appointment_confirmation: {
    subject: 'Appointment Confirmed - {{business_name}}',
    body: `Hi {{customer_name}},

Your appointment has been confirmed!

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
💈 Service: {{service_name}}
👤 Barber: {{barber_name}}
💵 Price: {{service_price}}

Location:
{{business_address}}
{{business_phone}}

If you need to reschedule or cancel, please call us at {{business_phone}} or reply to this email.

We look forward to seeing you!

Best regards,
{{business_name}}`
  },
  appointment_reminder_24h: {
    subject: 'Reminder: Appointment Tomorrow - {{business_name}}',
    body: `Hi {{customer_name}},

This is a friendly reminder about your appointment tomorrow:

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
💈 Service: {{service_name}}
👤 Barber: {{barber_name}}

Location:
{{business_address}}

Need to reschedule? Call us at {{business_phone}}

See you soon!
{{business_name}}`
  },
  appointment_reminder_2h: {
    subject: 'Appointment in 2 Hours - {{business_name}}',
    body: `Hi {{customer_name}},

Your appointment is coming up in 2 hours!

⏰ Time: {{appointment_time}}
💈 Service: {{service_name}}
👤 Barber: {{barber_name}}

Location:
{{business_address}}

See you soon!
{{business_name}}`
  },
  appointment_cancelled: {
    subject: 'Appointment Cancelled - {{business_name}}',
    body: `Hi {{customer_name}},

Your appointment has been cancelled:

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
💈 Service: {{service_name}}

If this was a mistake or you'd like to reschedule, please contact us at {{business_phone}}.

Thank you,
{{business_name}}`
  },
  no_show: {
    subject: 'We Missed You - {{business_name}}',
    body: `Hi {{customer_name}},

We noticed you missed your appointment:

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}

We understand things come up. If you'd like to reschedule, please give us a call at {{business_phone}}.

We hope to see you soon!
{{business_name}}`
  },
  welcome: {
    subject: 'Welcome to {{business_name}}!',
    body: `Hi {{customer_name}},

Welcome to {{business_name}}! We're excited to have you as a customer.

Our team of professional barbers is dedicated to providing you with the best grooming experience. Whether you need a classic cut, modern style, or premium grooming services, we've got you covered.

📍 Location: {{business_address}}
📞 Phone: {{business_phone}}
🌐 Book online: {{business_website}}

We look forward to serving you!

Best regards,
The {{business_name}} Team`
  }
}

const TEMPLATE_VARIABLES = [
  { key: '{{customer_name}}', description: 'Customer\'s name' },
  { key: '{{appointment_date}}', description: 'Appointment date (e.g., Monday, Jan 15, 2025)' },
  { key: '{{appointment_time}}', description: 'Appointment time (e.g., 2:00 PM)' },
  { key: '{{service_name}}', description: 'Service name (e.g., Haircut)' },
  { key: '{{service_price}}', description: 'Service price (e.g., $35)' },
  { key: '{{barber_name}}', description: 'Barber\'s name' },
  { key: '{{business_name}}', description: 'Your business name' },
  { key: '{{business_address}}', description: 'Your business address' },
  { key: '{{business_phone}}', description: 'Your business phone' },
  { key: '{{business_website}}', description: 'Your business website' }
]

export default function EmailTemplatesPage() {
  const { user: _user } = useAuth()
  const _supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('appointment_confirmation')
  const [showPreview, setShowPreview] = useState(false)

  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [originalTemplates, setOriginalTemplates] = useState(null)
  const initialValues = useRef(null)

  useEffect(() => {
    loadTemplates()
  }, [_user])

  // Capture initial state on first render
  useEffect(() => {
    if (!initialValues.current) {
      initialValues.current = JSON.parse(JSON.stringify(templates))
    }
  }, [])

  useEffect(() => {
    // Always check if data has changed against initial values
    if (initialValues.current) {
      const changed = JSON.stringify(templates) !== JSON.stringify(initialValues.current)
      setHasChanges(changed)
    }
  }, [templates])

  const loadTemplates = async () => {
    if (!_user) return

    try {
      setLoading(true)

      const { data: settings } = await _supabase
        .from('business_settings')
        .select('email_templates')
        .eq('user_id', _user.id)
        .single()

      if (settings?.email_templates) {
        const loadedTemplates = { ...DEFAULT_TEMPLATES, ...settings.email_templates }
        setTemplates(loadedTemplates)
        setOriginalTemplates(loadedTemplates)
        initialValues.current = JSON.parse(JSON.stringify(loadedTemplates))
      } else {
        setOriginalTemplates(DEFAULT_TEMPLATES)
      }
    } catch (error) {
      console.error('Error loading email templates:', error)
      setNotification({
        type: 'warning',
        message: 'Using default templates. Save to customize.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotification(null)

    try {
      const { data: existing } = await _supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', _user.id)
        .single()

      if (existing) {
        await _supabase
          .from('business_settings')
          .update({
            email_templates: templates,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', _user.id)
      } else {
        await _supabase
          .from('business_settings')
          .insert({
            user_id: _user.id,
            email_templates: templates
          })
      }

      setOriginalTemplates(templates)
      initialValues.current = JSON.parse(JSON.stringify(templates))
      setHasChanges(false)
      setNotification({
        type: 'success',
        message: 'Email templates saved successfully'
      })
    } catch (error) {
      console.error('Error saving:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save email templates'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalTemplates) {
      setTemplates(originalTemplates)
      initialValues.current = JSON.parse(JSON.stringify(originalTemplates))
      setHasChanges(false)
      setNotification(null)
    }
  }

  const handleResetToDefaults = () => {
    if (confirm('Reset all templates to defaults? Your custom templates will be lost.')) {
      setTemplates(DEFAULT_TEMPLATES)
      setNotification({
        type: 'success',
        message: 'Templates reset to defaults. Click Save to apply changes.'
      })
    }
  }

  const updateTemplate = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [selectedTemplate]: {
        ...prev[selectedTemplate],
        [field]: value
      }
    }))
  }

  const insertVariable = (variable) => {
    // Insert variable at cursor position in the body textarea
    const textarea = document.getElementById('template-body')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentBody = templates[selectedTemplate].body
      const newBody = currentBody.substring(0, start) + variable + currentBody.substring(end)
      updateTemplate('body', newBody)

      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const templateTypes = [
    { id: 'appointment_confirmation', name: 'Appointment Confirmation', icon: '✅' },
    { id: 'appointment_reminder_24h', name: '24-Hour Reminder', icon: '📅' },
    { id: 'appointment_reminder_2h', name: '2-Hour Reminder', icon: '⏰' },
    { id: 'appointment_cancelled', name: 'Cancellation Notice', icon: '❌' },
    { id: 'no_show', name: 'No-Show Follow-up', icon: '🔔' },
    { id: 'welcome', name: 'Welcome Email', icon: '👋' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  const currentTemplate = templates[selectedTemplate]

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <p className="mt-2 text-sm text-gray-600">
          Customize email templates for appointment communications
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                Templates
              </h2>
              <div className="space-y-2">
                {templateTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedTemplate(type.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedTemplate === type.id
                        ? 'bg-olive-100 text-olive-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{type.icon}</span>
                    {type.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="mt-4 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset All to Defaults
              </button>
            </div>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
              <div className="px-4 py-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {templateTypes.find(t => t.id === selectedTemplate)?.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-1.5" />
                    {showPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>

                {!showPreview ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={currentTemplate.subject}
                        onChange={(e) => updateTemplate('subject', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Body
                      </label>
                      <textarea
                        id="template-body"
                        value={currentTemplate.body}
                        onChange={(e) => updateTemplate('body', e.target.value)}
                        rows={16}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm font-mono text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="mb-4 pb-4 border-b border-gray-300">
                      <p className="text-sm font-medium text-gray-600">Subject:</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{currentTemplate.subject}</p>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-800">
                      {currentTemplate.body}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Variables Reference */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
              <div className="px-4 py-6 sm:p-8">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                  <SparklesIcon className="h-5 w-5 text-amber-500 mr-2" />
                  Available Variables
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable.key)}
                      className="flex items-start text-left p-3 rounded-lg border border-gray-200 hover:border-olive-300 hover:bg-olive-50 transition-colors group"
                    >
                      <div className="flex-1">
                        <code className="text-xs font-mono text-olive-700 bg-olive-100 px-2 py-0.5 rounded">
                          {variable.key}
                        </code>
                        <p className="text-xs text-gray-600 mt-1">{variable.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-olive-600 ml-2">Click to insert</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !hasChanges || saving
                ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
                : 'bg-olive-600 text-white hover:bg-olive-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Templates'}
          </button>
        </div>
      </form>
    </div>
  )
}
