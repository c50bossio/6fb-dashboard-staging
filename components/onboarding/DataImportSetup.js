'use client'

import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  TableCellsIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useRouter } from 'next/navigation'

const SUPPORTED_PLATFORMS = [
  {
    id: 'square',
    name: 'Square Appointments',
    logo: '⬜',
    description: 'Import from Square Appointments',
    fields: ['customers', 'appointments'],
    fileSize: '5-15MB',
    timeEstimate: '5-10 minutes',
    limitations: ['No future appointments', 'Services must be added manually'],
    exportSteps: [
      'Log in to Square Dashboard → Customers',
      'Click "Actions" → "Export Customer List"',
      'Select "All time" date range',
      'Choose CSV format and download',
      'For appointments: Go to Appointments → Reports',
      'Export "Appointments Report" as CSV'
    ],
    helpUrl: 'https://squareup.com/help/us/en/article/5167-export-customer-information'
  },
  {
    id: 'booksy',
    name: 'Booksy',
    logo: '📱',
    description: 'Import from Booksy platform',
    fields: ['customers', 'appointments', 'services'],
    fileSize: '10-25MB',
    timeEstimate: '1-2 days (support required)',
    limitations: ['Requires support assistance', 'Reviews may not be included'],
    exportSteps: [
      'Contact Booksy support via chat or email',
      'Request a full data export for migration',
      'Specify: Clients, Appointments, Services, Staff',
      'Wait 24-48 hours for data delivery',
      'Download ZIP file from email link',
      'Extract CSV files before uploading here'
    ],
    helpUrl: 'https://support.booksy.com/hc/en-us/requests/new'
  },
  {
    id: 'schedulicity',
    name: 'Schedulicity',
    logo: '📅',
    description: 'Import from Schedulicity',
    fields: ['customers', 'appointments', 'services'],
    fileSize: '2-5MB per barber',
    timeEstimate: '15-30 minutes',
    limitations: ['Must export each provider separately'],
    exportSteps: [
      'Log in to Schedulicity Business account',
      'Go to Reports → Custom Reports',
      'Create report: Select "Clients" → Export CSV',
      'Create report: Select "Appointments" → Export CSV',
      'For each barber: Filter by provider name',
      'Download separate CSV for each barber',
      'Combine files or upload separately'
    ],
    helpUrl: 'https://www.schedulicity.com/SchedulicityWeb/Help.aspx'
  },
  {
    id: 'acuity',
    name: 'Acuity Scheduling',
    logo: '🎯',
    description: 'Import from Acuity Scheduling',
    fields: ['customers', 'appointments', 'services'],
    fileSize: '20-40MB',
    timeEstimate: '10-15 minutes',
    limitations: ['Large files with intake forms'],
    exportSteps: [
      'Log in to Acuity Scheduling',
      'Navigate to Clients → Export',
      'Select "Export all clients" → CSV format',
      'Go to Appointments → Export',
      'Choose date range "All time"',
      'Export as CSV (may take time for large datasets)',
      'Services: Business Settings → Export'
    ],
    helpUrl: 'https://help.acuityscheduling.com/hc/en-us/articles/219149467'
  },
  {
    id: 'trafft',
    name: 'Trafft',
    logo: '🚀',
    description: 'Import from Trafft.com',
    fields: ['customers', 'appointments', 'services'],
    fileSize: '5-20MB',
    timeEstimate: '5-10 minutes',
    limitations: ['Custom fields need mapping', 'API coming soon'],
    exportSteps: [
      'Log in to Trafft dashboard',
      'Go to Customers → Actions → Export',
      'Select CSV format and download',
      'Navigate to Appointments → Export',
      'Choose "All appointments" and export',
      'Services: Settings → Services → Export All',
      'Staff: Team → Export Team Members'
    ],
    helpUrl: 'https://trafft.com/documentation/admin-panel/export-import/'
  },
  {
    id: 'csv',
    name: 'Generic CSV',
    logo: '📊',
    description: 'Upload any CSV file',
    fields: ['custom'],
    fileSize: 'Varies',
    timeEstimate: '5-15 minutes',
    limitations: ['Manual field mapping required'],
    exportSteps: [
      'Prepare CSV with these columns:',
      'Customers: First Name, Last Name, Email, Phone',
      'Appointments: Date, Time, Customer, Service, Status',
      'Services: Name, Price, Duration (minutes)',
      'Save as UTF-8 encoded CSV',
      'Use comma separation, quotes for text with commas'
    ],
    helpUrl: null
  }
]

const IMPORT_TYPES = [
  {
    id: 'customers',
    name: 'Customer Data',
    icon: UserGroupIcon,
    description: 'Names, contact info, preferences',
    required: ['name', 'email'],
    optional: ['phone', 'address', 'notes', 'preferences']
  },
  {
    id: 'appointments',
    name: 'Appointment History',
    icon: CalendarDaysIcon,
    description: 'Past and future appointments',
    required: ['customer', 'service', 'date', 'time'],
    optional: ['notes', 'status', 'price']
  },
  {
    id: 'services',
    name: 'Services & Pricing',
    icon: TableCellsIcon,
    description: 'Service menu and prices',
    required: ['name', 'duration', 'price'],
    optional: ['description', 'category']
  }
]

export default function DataImportSetup({ onComplete, initialData = {}, profile }) {
  const { supabase } = useAuth()
  const [selectedPlatform, setSelectedPlatform] = useState(initialData.importPlatform || null)
  const [selectedTypes, setSelectedTypes] = useState(initialData.importTypes || ['customers'])
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [importProgress, setImportProgress] = useState(null)
  const [errors, setErrors] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  const handlePlatformSelect = (platformId) => {
    setSelectedPlatform(platformId)
    setErrors([])
    setUploadedFiles({})
    setPreviewData(null)
  }

  const handleTypeToggle = (typeId) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter(t => t !== typeId))
    } else {
      setSelectedTypes([...selectedTypes, typeId])
    }
  }

  const handleFileUpload = async (event, importType) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['.csv', '.txt', '.zip']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      setErrors([...errors, `${importType}: Only CSV, TXT, and ZIP files are supported`])
      return
    }

    // Validate file size (50MB for CSV/TXT, 100MB for ZIP)
    const maxSize = fileExtension === '.zip' ? 100 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      setErrors([...errors, `${importType}: File size too large (max ${maxSizeMB}MB)`])
      return
    }

    // Clear previous errors for this import type
    setErrors(errors.filter(e => !e.startsWith(importType)))

    // Read file locally for preview
    const reader = new FileReader()
    reader.onload = async (e) => {
      const csv = e.target.result
      const lines = csv.split('\n').filter(line => line.trim())
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/^"|"$/g, '')) || []
      const rows = lines.slice(1, 6).map(line => {
        // Handle CSV with quotes properly
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
        return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : []
      })
      
      setPreviewData(prev => ({
        ...prev,
        [importType]: { headers, rows }
      }))

      // Store file for later processing
      setUploadedFiles(prev => ({
        ...prev,
        [importType]: {
          file: file,
          headers: headers,
          status: 'ready'
        }
      }))
    }
    reader.readAsText(file)
  }

  const validateData = () => {
    const newErrors = []

    selectedTypes.forEach(typeId => {
      const importType = IMPORT_TYPES.find(t => t.id === typeId)
      const file = uploadedFiles[typeId]
      const preview = previewData?.[typeId]

      if (!file && selectedPlatform === 'csv') {
        newErrors.push(`${importType.name}: Please upload a CSV file`)
        return
      }

      if (preview && selectedPlatform === 'csv') {
        // Check required fields
        const missingFields = importType.required.filter(field => 
          !preview.headers.some(header => 
            header.toLowerCase().includes(field.toLowerCase())
          )
        )
        
        if (missingFields.length > 0) {
          newErrors.push(`${importType.name}: Missing required columns: ${missingFields.join(', ')}`)
        }
      }
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleImportStart = async () => {
    if (!validateData()) return

    setIsProcessing(true)
    setImportProgress({ current: 0, total: selectedTypes.length, stage: 'Starting import...' })

    try {
      const importResults = []
      const barbershopId = profile?.shop_id || profile?.barbershop_id
      
      if (!barbershopId) {
        throw new Error('No barbershop ID found. Please complete your profile first.')
      }
      
      // Process each import type
      for (let i = 0; i < selectedTypes.length; i++) {
        const typeId = selectedTypes[i]
        const importType = IMPORT_TYPES.find(t => t.id === typeId)
        const uploadInfo = uploadedFiles[typeId]
        
        if (!uploadInfo?.file) {
          setErrors([...errors, `No file uploaded for ${importType.name}`])
          continue
        }
        
        setImportProgress({
          current: i,
          total: selectedTypes.length,
          stage: `Importing ${importType.name}...`
        })

        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', uploadInfo.file)
        formData.append('platform', selectedPlatform)
        formData.append('barbershopId', barbershopId)
        formData.append('options', JSON.stringify({
          duplicateStrategy: 'skip',
          validateData: true,
          entityType: typeId
        }))

        try {
          // Call our actual import API
          const response = await fetch('/api/onboarding/import', {
            method: 'POST',
            body: formData
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Import failed')
          }

          importResults.push({
            type: typeId,
            success: true,
            imported: result.summary?.imported || {},
            skipped: result.summary?.skipped || {},
            errors: result.summary?.errors || {},
            batchId: result.batchId
          })
          
          // Show progress notification
          console.log(`✅ ${importType.name} imported successfully!`)

        } catch (importError) {
          console.error(`Import error for ${typeId}:`, importError)
          importResults.push({
            type: typeId,
            success: false,
            error: importError.message
          })
          console.error(`❌ Failed to import ${importType.name}`)
        }
      }

      setImportProgress({
        current: selectedTypes.length,
        total: selectedTypes.length,
        stage: 'Import completed successfully!'
      })

      // Complete the step after a brief success display
      setTimeout(() => {
        const importData = {
          importPlatform: selectedPlatform,
          importTypes: selectedTypes,
          filesUploaded: Object.keys(uploadedFiles).length,
          importResults: importResults,
          completedAt: new Date().toISOString(),
          dataPreview: previewData
        }
        
        onComplete && onComplete(importData)
      }, 1500)

    } catch (error) {
      console.error('Import error:', error)
      setErrors([...errors, `Import failed: ${error.message}`])
      console.error('❌ Import failed. Please try again.')
      setImportProgress(null)
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to poll import status
  const pollImportStatus = async (importId, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
      
      const statusResponse = await fetch(`/api/import/status?importId=${importId}`)
      const status = await statusResponse.json()
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status
      }
      
      // Update progress if available
      if (status.progress) {
        setImportProgress(prev => ({
          ...prev,
          stage: status.progress.message || prev.stage
        }))
      }
    }
    throw new Error('Import timeout')
  }

  const handleSkip = () => {
    const skipData = {
      importPlatform: 'manual',
      importTypes: [],
      skipped: true,
      skipReason: 'Will add data manually',
      completedAt: new Date().toISOString()
    }
    
    onComplete && onComplete(skipData)
  }

  // Show success state during processing
  if (importProgress && importProgress.current === importProgress.total) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h2>
          <p className="text-gray-600">
            Your data has been imported and is being processed. 
            You'll be able to review and verify it in the next step.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DocumentArrowUpIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Your Data</h1>
        <p className="text-lg text-gray-600">
          Seamlessly transfer your existing customer and appointment data
        </p>
      </div>

      {/* Platform Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Where are you importing from?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              onClick={() => handlePlatformSelect(platform.id)}
              className={`
                relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                ${selectedPlatform === platform.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{platform.logo}</span>
                <h4 className="font-semibold text-gray-900">{platform.name}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">{platform.description}</p>
              <div className="flex flex-wrap gap-1">
                {platform.fields.map((field) => (
                  <span
                    key={field}
                    className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                  >
                    {field}
                  </span>
                ))}
              </div>
              
              {selectedPlatform === platform.id && (
                <div className="absolute top-2 right-2">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export Instructions */}
      {selectedPlatform && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                How to Export from {SUPPORTED_PLATFORMS.find(p => p.id === selectedPlatform)?.name}
              </h3>
              
              {(() => {
                const platform = SUPPORTED_PLATFORMS.find(p => p.id === selectedPlatform)
                if (!platform) return null
                
                return (
                  <>
                    <ol className="space-y-2 mb-4">
                      {platform.exportSteps.map((step, index) => (
                        <li key={index} className="flex space-x-2">
                          <span className="font-semibold text-blue-700 flex-shrink-0">
                            {index + 1}.
                          </span>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-200">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Expected file size:</span>
                        <p className="text-sm text-gray-900">{platform.fileSize}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Export time:</span>
                        <p className="text-sm text-gray-900">{platform.timeEstimate}</p>
                      </div>
                    </div>
                    
                    {platform.limitations.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Important notes:</p>
                            <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                              {platform.limitations.map((limitation, i) => (
                                <li key={i}>{limitation}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {platform.helpUrl && (
                      <div className="mt-4">
                        <a
                          href={platform.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                          View official export guide
                          <ArrowRightIcon className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Data Type Selection */}
      {selectedPlatform && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What data would you like to import?
          </h3>
          <div className="space-y-4">
            {IMPORT_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = selectedTypes.includes(type.id)
              
              return (
                <div
                  key={type.id}
                  className={`
                    flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => handleTypeToggle(type.id)}
                >
                  <div className={`
                    p-3 rounded-lg ${isSelected ? 'bg-blue-200' : 'bg-gray-100'}
                  `}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{type.name}</h4>
                      {isSelected && <CheckCircleIcon className="h-5 w-5 text-blue-600" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="text-xs text-gray-500">
                        Required: {type.required.join(', ')}
                      </div>
                      {type.optional.length > 0 && (
                        <div className="text-xs text-gray-400">
                          Optional: {type.optional.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* File Upload (for CSV platform) */}
      {selectedPlatform === 'csv' && selectedTypes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upload CSV Files
          </h3>
          <div className="space-y-4">
            {selectedTypes.map((typeId) => {
              const importType = IMPORT_TYPES.find(t => t.id === typeId)
              const file = uploadedFiles[typeId]
              const preview = previewData?.[typeId]
              
              return (
                <div key={typeId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{importType.name}</h4>
                    {file && (
                      <span className="text-sm text-green-600 flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, typeId)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  {preview && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="font-medium text-gray-700 mb-2">Preview:</div>
                      <div className="overflow-x-auto">
                        <div className="flex space-x-4 text-xs text-gray-500 mb-1">
                          {preview.headers.slice(0, 4).map((header, i) => (
                            <span key={i} className="font-medium">{header}</span>
                          ))}
                        </div>
                        {preview.rows.slice(0, 2).map((row, i) => (
                          <div key={i} className="flex space-x-4 text-xs text-gray-600">
                            {row.slice(0, 4).map((cell, j) => (
                              <span key={j}>{cell}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Please fix the following issues:
                </h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Progress */}
      {importProgress && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-blue-800">{importProgress.stage}</p>
                <div className="mt-2 bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {importProgress.current} of {importProgress.total} completed
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={isProcessing}
        >
          Skip for Now
        </button>

        <div className="flex items-center space-x-4">
          {selectedPlatform && selectedPlatform !== 'csv' && (
            <div className="flex items-center text-sm text-amber-600">
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Manual integration available after setup
            </div>
          )}
          
          <button
            onClick={handleImportStart}
            disabled={!selectedPlatform || selectedTypes.length === 0 || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <span>{isProcessing ? 'Importing...' : 'Start Import'}</span>
            {!isProcessing && <ArrowRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Help Information */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Import Tips</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• CSV files should have headers in the first row</li>
          <li>• Ensure customer names and emails are in separate columns</li>
          <li>• Date formats should be YYYY-MM-DD or MM/DD/YYYY</li>
          <li>• File size limit is 5MB per file</li>
          <li>• You can always add more data later manually</li>
        </ul>
      </div>
    </div>
  )
}