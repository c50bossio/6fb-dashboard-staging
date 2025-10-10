'use client'

import {
  ClipboardDocumentIcon,
  CheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useState, useMemo } from 'react'
import { TemplatePresets } from '@/lib/booking-rules-engine/TemplatePresets'

export default function PolicyTemplateGenerator({ 
  rules, 
  businessInfo = { 
    name: 'Your Barbershop',
    phone: '(555) 123-4567',
    email: 'info@yourbarbershop.com',
    website: 'yourbarbershop.com',
    address: 'Your Address'
  },
  className = ''
}) {
  const [selectedTone, setSelectedTone] = useState('professional')
  const [selectedTemplate, setSelectedTemplate] = useState('website_policy')
  const [copied, setCopied] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    website: true,
    email: false,
    sms: false,
    cancellation: false
  })

  // Generate templates using the utility
  const templates = useMemo(() => {
    return TemplatePresets.generateAllTemplates(rules, businessInfo, selectedTone)
  }, [rules, businessInfo, selectedTone])

  const templateOptions = [
    {
      id: 'website_policy',
      name: 'Website Booking Policy',
      description: 'Complete policy for your booking page',
      icon: DocumentTextIcon,
      category: 'website'
    },
    {
      id: 'email_confirmation',
      name: 'Email Confirmation Template',
      description: 'Booking confirmation email template',
      icon: EnvelopeIcon,
      category: 'email'
    },
    {
      id: 'email_reminder',
      name: 'Email Reminder Template',
      description: 'Appointment reminder email',
      icon: EnvelopeIcon,
      category: 'email'
    },
    {
      id: 'sms_confirmation',
      name: 'SMS Confirmation Template',
      description: 'Booking confirmation text message',
      icon: DevicePhoneMobileIcon,
      category: 'sms'
    },
    {
      id: 'sms_reminder',
      name: 'SMS Reminder Template',
      description: 'Appointment reminder text',
      icon: DevicePhoneMobileIcon,
      category: 'sms'
    },
    {
      id: 'cancellation_notice',
      name: 'Cancellation Notice',
      description: 'Policy notice for cancellations',
      icon: ExclamationTriangleIcon,
      category: 'cancellation'
    }
  ]

  const toneOptions = [
    { id: 'professional', name: 'Professional', description: 'Formal and polished tone' },
    { id: 'friendly', name: 'Friendly', description: 'Warm and approachable tone' },
    { id: 'strict', name: 'Strict', description: 'Clear and firm boundaries' }
  ]

  const copyToClipboard = async (text, templateId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(templateId)
      setTimeout(() => setCopied(''), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getCategoryTemplates = (category) => {
    return templateOptions.filter(template => template.category === category)
  }

  const getCurrentTemplate = () => {
    return templates[selectedTemplate] || ''
  }

  const TemplateCard = ({ template, isActive, onClick }) => (
    <button
      onClick={() => onClick(template.id)}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start">
        <template.icon className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${
          isActive ? 'text-blue-600' : 'text-gray-400'
        }`} />
        <div className="flex-1">
          <h4 className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
            {template.name}
          </h4>
          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
        </div>
      </div>
    </button>
  )

  const CategorySection = ({ category, title, templates, icon: Icon }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(category)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-gray-600 mr-3" />
          <h3 className="font-medium text-gray-900">{title}</h3>
          <span className="ml-2 text-sm text-gray-500">({templates.length})</span>
        </div>
        {expandedSections[category] ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      
      {expandedSections[category] && (
        <div className="p-4 space-y-3">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={selectedTemplate === template.id}
              onClick={setSelectedTemplate}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Communication Templates Generator
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Auto-generate professional templates for your booking communications
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <EyeIcon className="h-4 w-4 mr-2" />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Communication Tone
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {toneOptions.map(tone => (
            <button
              key={tone.id}
              onClick={() => setSelectedTone(tone.id)}
              className={`p-3 text-left border rounded-lg transition-all ${
                selectedTone === tone.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{tone.name}</div>
              <div className="text-sm text-gray-600 mt-1">{tone.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Categories */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Template Categories</h4>
          
          <CategorySection
            category="website"
            title="Website & Booking Page"
            templates={getCategoryTemplates('website')}
            icon={DocumentTextIcon}
          />
          
          <CategorySection
            category="email"
            title="Email Templates"
            templates={getCategoryTemplates('email')}
            icon={EnvelopeIcon}
          />
          
          <CategorySection
            category="sms"
            title="SMS Templates"
            templates={getCategoryTemplates('sms')}
            icon={DevicePhoneMobileIcon}
          />
          
          <CategorySection
            category="cancellation"
            title="Cancellation Notices"
            templates={getCategoryTemplates('cancellation')}
            icon={ExclamationTriangleIcon}
          />
        </div>

        {/* Template Preview & Copy */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {templateOptions.find(t => t.id === selectedTemplate)?.name || 'Select Template'}
            </h4>
            {getCurrentTemplate() && (
              <button
                onClick={() => copyToClipboard(getCurrentTemplate(), selectedTemplate)}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {copied === selectedTemplate ? (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                    Copy Template
                  </>
                )}
              </button>
            )}
          </div>

          {getCurrentTemplate() ? (
            <div className="relative">
              <textarea
                readOnly
                value={getCurrentTemplate()}
                className="w-full h-96 p-4 text-sm border border-gray-300 rounded-lg bg-gray-50 font-mono resize-none"
                placeholder="Select a template to see the generated content..."
              />
              <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                {getCurrentTemplate().length} characters
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Select a template</p>
                <p className="text-sm">Choose from the categories on the left to generate content</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Mode */}
      {showPreview && getCurrentTemplate() && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 flex items-center">
              <EyeIcon className="h-5 w-5 mr-2" />
              Preview: {templateOptions.find(t => t.id === selectedTemplate)?.name}
            </h4>
          </div>
          <div className="p-4">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: getCurrentTemplate().replace(/\n/g, '<br>') 
              }}
            />
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-blue-900 mb-2">Template Usage Tips</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Copy templates and customize with your specific details</li>
              <li>• Website policies can be embedded directly in your booking page</li>
              <li>• Email templates work with most email marketing platforms</li>
              <li>• SMS templates should be kept under 160 characters when possible</li>
              <li>• Test all templates before going live with customers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}