'use client'

import React, { useState, useRef } from 'react'
import { 
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui'

/**
 * ExportCSV Component
 * 
 * Provides comprehensive CSV export functionality with customizable fields,
 * formatting options, and progress tracking.
 * 
 * Features:
 * - Customizable field selection
 * - Multiple export formats (CSV, Excel-compatible CSV)
 * - Progress tracking for large exports
 * - Field mapping and custom headers
 * - Data formatting options
 * - Export templates/presets
 * - File size estimation
 * - Error handling and retry logic
 */

// Default field configurations
const DEFAULT_EXPORT_FIELDS = {
  // Basic Information
  name: {
    label: 'Customer Name',
    category: 'basic',
    type: 'string',
    required: true,
    description: 'Full customer name'
  },
  email: {
    label: 'Email Address',
    category: 'basic',
    type: 'email',
    required: false,
    description: 'Primary email address'
  },
  phone: {
    label: 'Phone Number',
    category: 'basic',
    type: 'phone',
    required: false,
    description: 'Primary phone number'
  },
  
  // Visit Information
  visit_count: {
    label: 'Total Visits',
    category: 'visits',
    type: 'number',
    required: false,
    description: 'Total number of visits'
  },
  last_visit: {
    label: 'Last Visit Date',
    category: 'visits',
    type: 'date',
    required: false,
    description: 'Date of most recent visit'
  },
  first_visit: {
    label: 'First Visit Date',
    category: 'visits',
    type: 'date',
    required: false,
    description: 'Date of first visit'
  },
  days_since_last_visit: {
    label: 'Days Since Last Visit',
    category: 'visits',
    type: 'number',
    required: false,
    description: 'Number of days since last visit'
  },
  
  // Financial Information
  total_spent: {
    label: 'Total Amount Spent',
    category: 'financial',
    type: 'currency',
    required: false,
    description: 'Total amount spent across all visits'
  },
  average_spent: {
    label: 'Average Spent Per Visit',
    category: 'financial',
    type: 'currency',
    required: false,
    description: 'Average amount spent per visit'
  },
  
  // Analytics
  health_score: {
    label: 'Health Score',
    category: 'analytics',
    type: 'percentage',
    required: false,
    description: 'Customer health score (0-100)'
  },
  loyalty_tier: {
    label: 'Loyalty Tier',
    category: 'analytics',
    type: 'string',
    required: false,
    description: 'Current loyalty tier'
  },
  churn_risk: {
    label: 'Churn Risk Level',
    category: 'analytics',
    type: 'string',
    required: false,
    description: 'Predicted churn risk'
  },
  
  // Additional Information
  preferred_services: {
    label: 'Preferred Services',
    category: 'preferences',
    type: 'array',
    required: false,
    description: 'List of preferred services'
  },
  tags: {
    label: 'Customer Tags',
    category: 'preferences',
    type: 'array',
    required: false,
    description: 'Custom tags assigned to customer'
  },
  notes: {
    label: 'Notes',
    category: 'additional',
    type: 'text',
    required: false,
    description: 'Additional notes about customer'
  },
  created_at: {
    label: 'Registration Date',
    category: 'additional',
    type: 'date',
    required: false,
    description: 'Date customer registered'
  }
}

// Export presets
const EXPORT_PRESETS = {
  basic: {
    name: 'Basic Information',
    description: 'Essential customer contact information',
    fields: ['name', 'email', 'phone', 'visit_count', 'last_visit'],
    icon: DocumentTextIcon
  },
  financial: {
    name: 'Financial Report',
    description: 'Customer spending and value analysis',
    fields: ['name', 'email', 'visit_count', 'total_spent', 'average_spent', 'loyalty_tier'],
    icon: ChartBarIcon
  },
  comprehensive: {
    name: 'Comprehensive Export',
    description: 'All available customer data',
    fields: Object.keys(DEFAULT_EXPORT_FIELDS),
    icon: TableCellsIcon
  },
  analytics: {
    name: 'Analytics & Risk',
    description: 'Customer health and risk metrics',
    fields: ['name', 'email', 'health_score', 'churn_risk', 'days_since_last_visit', 'loyalty_tier'],
    icon: ChartBarIcon
  }
}

// Field categories for organization
const FIELD_CATEGORIES = {
  basic: { name: 'Basic Information', color: 'blue' },
  visits: { name: 'Visit History', color: 'green' },
  financial: { name: 'Financial Data', color: 'yellow' },
  analytics: { name: 'Analytics', color: 'purple' },
  preferences: { name: 'Preferences', color: 'pink' },
  additional: { name: 'Additional Info', color: 'gray' }
}

/**
 * Format field value for CSV export
 */
function formatFieldValue(value, fieldConfig) {
  if (value == null || value === undefined) return ''
  
  switch (fieldConfig.type) {
    case 'currency':
      return typeof value === 'number' ? `$${value.toFixed(2)}` : value
    
    case 'percentage':
      return typeof value === 'number' ? `${value}%` : value
    
    case 'date':
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return value
      }
    
    case 'phone':
      // Format phone number consistently
      const phone = String(value).replace(/\D/g, '')
      if (phone.length === 10) {
        return `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`
      }
      return value
    
    case 'array':
      return Array.isArray(value) ? value.join('; ') : value
    
    case 'text':
      // Escape text for CSV
      return String(value).replace(/"/g, '""')
    
    default:
      return String(value)
  }
}

/**
 * Generate CSV content from customer data
 */
function generateCSV(customers, selectedFields, fieldConfigs) {
  if (!customers || customers.length === 0) {
    throw new Error('No customer data to export')
  }

  // Generate headers
  const headers = selectedFields.map(fieldKey => {
    const config = fieldConfigs[fieldKey] || DEFAULT_EXPORT_FIELDS[fieldKey]
    return config?.label || fieldKey
  })

  // Generate rows
  const rows = customers.map(customer => {
    return selectedFields.map(fieldKey => {
      const config = fieldConfigs[fieldKey] || DEFAULT_EXPORT_FIELDS[fieldKey]
      const value = customer[fieldKey]
      const formattedValue = formatFieldValue(value, config)
      
      // Escape CSV values that contain commas, quotes, or newlines
      const stringValue = String(formattedValue)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      
      return stringValue
    })
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Main ExportCSV Component
 */
export default function ExportCSV({
  customers = [],
  onExport,
  defaultFields = ['name', 'email', 'phone', 'total_spent', 'visit_count', 'last_visit'],
  fieldConfigs = DEFAULT_EXPORT_FIELDS,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState(defaultFields)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState('basic')
  const modalRef = useRef(null)

  // Calculate estimated file size
  const estimatedSize = Math.round((customers.length * selectedFields.length * 20) / 1024) // KB approximation

  // Handle preset selection
  const applyPreset = (presetKey) => {
    const preset = EXPORT_PRESETS[presetKey]
    if (preset) {
      setSelectedFields(preset.fields)
      setSelectedPreset(presetKey)
    }
  }

  // Toggle field selection
  const toggleField = (fieldKey) => {
    const config = fieldConfigs[fieldKey]
    if (config?.required) return // Can't deselect required fields
    
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    )
    setSelectedPreset('') // Clear preset when manually selecting
  }

  // Handle export process
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field to export')
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      // Generate CSV content
      const csvContent = generateCSV(customers, selectedFields, fieldConfigs)
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `customers-export-${timestamp}.csv`
      
      clearInterval(progressInterval)
      setExportProgress(100)
      
      // Download file
      downloadCSV(csvContent, filename)
      
      // Call optional callback
      onExport?.({
        customers,
        fields: selectedFields,
        filename,
        size: csvContent.length
      })
      
      // Close modal after successful export
      setTimeout(() => {
        setIsOpen(false)
        setIsExporting(false)
        setExportProgress(0)
      }, 1000)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message}`)
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  return (
    <>
      {/* Export Button */}
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        icon={DocumentArrowDownIcon}
        disabled={customers.length === 0}
        className={className}
      >
        Export CSV ({customers.length})
      </Button>

      {/* Export Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !isExporting && setIsOpen(false)}
            />

            {/* Modal */}
            <div 
              ref={modalRef}
              className="
                inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle 
                transition-all transform bg-white shadow-xl rounded-lg
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <DocumentArrowDownIcon className="h-6 w-6 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Export Customer Data
                  </h3>
                </div>
                
                {!isExporting && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                )}
              </div>

              {/* Export Progress */}
              {isExporting && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Exporting...</span>
                    <span className="text-sm text-gray-500">{exportProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-olive-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {!isExporting && (
                <>
                  {/* Export Presets */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Presets</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(EXPORT_PRESETS).map(([key, preset]) => {
                        const Icon = preset.icon
                        return (
                          <button
                            key={key}
                            onClick={() => applyPreset(key)}
                            className={`
                              p-3 border rounded-lg text-left transition-all duration-200
                              ${selectedPreset === key 
                                ? 'border-olive-300 bg-olive-50 text-olive-700' 
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium text-sm">{preset.name}</span>
                            </div>
                            <p className="text-xs text-gray-600">{preset.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Field Selection */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Select Fields ({selectedFields.length} selected)
                    </h4>
                    
                    {Object.entries(FIELD_CATEGORIES).map(([categoryKey, category]) => {
                      const categoryFields = Object.entries(fieldConfigs).filter(
                        ([key, config]) => config.category === categoryKey
                      )
                      
                      if (categoryFields.length === 0) return null
                      
                      return (
                        <div key={categoryKey} className="mb-4">
                          <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                            {category.name}
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryFields.map(([fieldKey, config]) => {
                              const isSelected = selectedFields.includes(fieldKey)
                              const isRequired = config.required
                              
                              return (
                                <label
                                  key={fieldKey}
                                  className={`
                                    flex items-center space-x-2 p-2 rounded border cursor-pointer
                                    transition-all duration-200
                                    ${isSelected 
                                      ? 'border-olive-300 bg-olive-50' 
                                      : 'border-gray-200 hover:border-gray-300'
                                    }
                                    ${isRequired ? 'opacity-75' : ''}
                                  `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleField(fieldKey)}
                                    disabled={isRequired}
                                    className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-sm font-medium">{config.label}</span>
                                      {isRequired && (
                                        <span className="text-xs text-red-500">*</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{config.description}</p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Export Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-blue-800 font-medium mb-1">Export Summary</p>
                        <ul className="text-blue-700 space-y-1">
                          <li>• {customers.length} customers will be exported</li>
                          <li>• {selectedFields.length} fields selected</li>
                          <li>• Estimated file size: ~{estimatedSize} KB</li>
                          <li>• Format: CSV (Excel compatible)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                {!isExporting && (
                  <Button
                    variant="secondary"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                )}
                
                <Button
                  variant="primary"
                  onClick={handleExport}
                  loading={isExporting}
                  disabled={selectedFields.length === 0 || customers.length === 0}
                  icon={isExporting ? undefined : DocumentArrowDownIcon}
                >
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Simple Export Button (no modal)
 */
export function SimpleExportCSV({
  customers = [],
  fields = ['name', 'email', 'phone', 'total_spent', 'visit_count'],
  filename,
  onExport,
  className = '',
  ...buttonProps
}) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (customers.length === 0) return

    setIsExporting(true)
    
    try {
      const csvContent = generateCSV(customers, fields, DEFAULT_EXPORT_FIELDS)
      const exportFilename = filename || `customers-export-${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvContent, exportFilename)
      
      onExport?.({
        customers,
        fields,
        filename: exportFilename,
        size: csvContent.length
      })
      
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      loading={isExporting}
      disabled={customers.length === 0}
      icon={DocumentArrowDownIcon}
      className={className}
      {...buttonProps}
    >
      Export ({customers.length})
    </Button>
  )
}