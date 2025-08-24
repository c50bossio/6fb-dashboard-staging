'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { platformImportConfigs } from '@/lib/platform-import-configs'
import PlatformExportGuide from './PlatformExportGuide'
import MultiFileUploader from './MultiFileUploader'
import { parseCSV, analyzeCSV } from '@/lib/csv-auto-detector'

export default function PlatformTailoredImport({ onComplete, initialData = {}, profile }) {
  const [selectedPlatform, setSelectedPlatform] = useState(initialData.platform || null)
  const [showExportGuide, setShowExportGuide] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [importStatus, setImportStatus] = useState('idle') // idle, validating, importing, complete, error
  const [importResults, setImportResults] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  // Enhanced platform configurations with visual styling
  const platforms = [
    {
      id: 'square',
      name: 'Square',
      fullName: 'Square Appointments',
      icon: '🟦',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      fileCount: 1,
      fileLabel: '1 CSV file',
      description: 'Export from Dashboard → Appointments',
      popular: true
    },
    {
      id: 'booksy',
      name: 'Booksy',
      fullName: 'Booksy',
      icon: '💈',
      gradient: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      fileCount: 1,
      fileLabel: '1 CSV file',
      description: 'Request export from support chat',
      special: 'Contact support required'
    },
    {
      id: 'acuity',
      name: 'Acuity',
      fullName: 'Acuity Scheduling',
      icon: '📅',
      gradient: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      fileCount: 2,
      fileLabel: '2 CSV files',
      description: 'Appointments + Clients exports',
      multiFile: true
    },
    {
      id: 'trafft',
      name: 'Trafft',
      fullName: 'Trafft',
      icon: '🗓️',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      fileCount: 2,
      fileLabel: '2 CSV files',
      description: 'Customers + Appointments exports',
      multiFile: true
    },
    {
      id: 'schedulicity',
      name: 'Schedulicity',
      fullName: 'Schedulicity',
      icon: '📆',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      fileCount: 1,
      fileLabel: '1-2 CSV files',
      description: 'Export from Reports section',
      flexible: true
    },
    {
      id: 'other',
      name: 'Other',
      fullName: 'Other Platform',
      icon: '📊',
      gradient: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      fileCount: 1,
      fileLabel: 'CSV file(s)',
      description: 'Generic CSV import',
      generic: true
    }
  ]

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform.id)
    setUploadedFiles({})
    setImportStatus('idle')
    setValidationErrors([])
    setImportResults(null)
  }

  const handleFilesUploaded = async (files) => {
    setUploadedFiles(files)
    setImportStatus('validating')
    
    try {
      // Validate files match platform requirements
      const platform = platforms.find(p => p.id === selectedPlatform)
      const config = platformImportConfigs[selectedPlatform]
      
      if (platform.multiFile && Object.keys(files).length !== platform.fileCount) {
        setValidationErrors([`${platform.name} requires exactly ${platform.fileCount} files`])
        setImportStatus('error')
        return
      }

      // Parse and validate CSV content
      const parsedData = {}
      const errors = []
      
      for (const [fileKey, fileData] of Object.entries(files)) {
        try {
          // Handle both old format (direct File object) and new format (object with file property)
          const actualFile = fileData.file || fileData
          const text = await actualFile.text()
          const parsed = parseCSV(text)
          const analysis = analyzeCSV(parsed.headers, parsed.rows)
          
          // Check for required headers based on platform
          if (config.dataDetection) {
            // Determine which type of file this likely is based on headers
            let fileType = 'unknown'
            let bestMatch = 0
            
            for (const [type, expectedFields] of Object.entries(config.dataDetection)) {
              const matches = expectedFields.filter(field => {
                const normalizedField = field.toLowerCase().replace(/[^a-z0-9]/g, '')
                return parsed.headers.some(h => {
                  const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '')
                  // More flexible matching: check if either contains the other
                  return normalizedHeader.includes(normalizedField) || 
                         normalizedField.includes(normalizedHeader) ||
                         // Handle common variations
                         (normalizedField === 'customername' && normalizedHeader === 'customer') ||
                         (normalizedField === 'customer' && normalizedHeader === 'customername') ||
                         (normalizedField === 'clientname' && normalizedHeader === 'client') ||
                         (normalizedField === 'clientsname' && normalizedHeader === 'clientname') ||
                         // Handle split name fields
                         (normalizedField === 'customername' && 
                          (parsed.headers.some(h2 => h2.toLowerCase().includes('first')) && 
                           parsed.headers.some(h2 => h2.toLowerCase().includes('last')))) ||
                         (normalizedField === 'clientname' && 
                          (parsed.headers.some(h2 => h2.toLowerCase().includes('first')) && 
                           parsed.headers.some(h2 => h2.toLowerCase().includes('last'))))
                })
              }).length
              
              if (matches > bestMatch) {
                bestMatch = matches
                fileType = type
              }
            }
            
            // Only validate against the detected file type's requirements
            if (fileType !== 'unknown' && config.dataDetection[fileType]) {
              const criticalFields = config.dataDetection[fileType].slice(0, 2) // Only first 2 fields are critical
              const missingCritical = criticalFields.filter(field => {
                const normalizedField = field.toLowerCase().replace(/[^a-z0-9]/g, '')
                
                // Check if field exists in headers
                const fieldExists = parsed.headers.some(h => {
                  const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '')
                  return normalizedHeader.includes(normalizedField) || 
                         normalizedField.includes(normalizedHeader)
                })
                
                // Special case: if looking for "Customer Name" or "Client Name", 
                // accept if we have both "First Name" and "Last Name"
                if (!fieldExists && 
                    (normalizedField === 'customername' || normalizedField === 'clientname')) {
                  const hasFirstName = parsed.headers.some(h => 
                    h.toLowerCase().includes('first') && h.toLowerCase().includes('name'))
                  const hasLastName = parsed.headers.some(h => 
                    h.toLowerCase().includes('last') && h.toLowerCase().includes('name'))
                  return !(hasFirstName && hasLastName)
                }
                
                return !fieldExists
              })
              
              if (missingCritical.length > 0 && !platform.generic) {
                const fileName = fileData.name || actualFile.name || 'unknown'
                errors.push(`File "${fileName}" appears to be ${fileType} data but missing critical fields: ${missingCritical.join(', ')}. Found headers: ${parsed.headers.slice(0, 5).join(', ')}${parsed.headers.length > 5 ? '...' : ''}`)
              }
            }
          }
          
          parsedData[fileKey] = {
            headers: parsed.headers,
            rows: parsed.data,
            analysis
          }
        } catch (error) {
          const fileName = fileData.name || (fileData.file && fileData.file.name) || 'unknown'
          errors.push(`Failed to parse "${fileName}": ${error.message}`)
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
        setImportStatus('error')
        return
      }

      // Files are valid, ready to import
      setImportStatus('ready')
      setImportResults(parsedData)
      
    } catch (error) {
      console.error('Validation error:', error)
      setValidationErrors([error.message])
      setImportStatus('error')
    }
  }

  const handleImport = async () => {
    setImportStatus('importing')
    
    try {
      // Get barbershopId with fallback for onboarding
      const barbershopId = profile?.shop_id || 
                          profile?.barbershop_id || 
                          initialData?.barbershopId || 
                          'onboarding-temp-' + Date.now()
      
      console.log('🚀 Starting import with:', {
        platform: selectedPlatform,
        barbershopId,
        fileCount: Object.keys(uploadedFiles).length,
        profile
      })
      
      const formData = new FormData()
      formData.append('platform', selectedPlatform)
      formData.append('barbershopId', barbershopId)
      
      // Add all files to FormData with numbered keys for the API
      let fileIndex = 1
      Object.entries(uploadedFiles).forEach(([key, fileData]) => {
        // Handle both old format (direct File object) and new format (object with file property)
        const actualFile = fileData.file || fileData
        formData.append(`file${fileIndex}`, actualFile, actualFile.name || `${key}.csv`)
        fileIndex++
      })

      const response = await fetch('/api/onboarding/platform-import', {
        method: 'POST',
        headers: {
          'x-onboarding-flow': 'true'  // Indicate this is part of onboarding
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      
      setImportStatus('complete')
      setImportResults(result)
      
      // Auto-advance after successful import
      setTimeout(() => {
        if (onComplete) {
          onComplete({
            platform: selectedPlatform,
            importedData: result
          })
        }
      }, 2000)
      
    } catch (error) {
      console.error('Import error:', error)
      setValidationErrors([error.message])
      setImportStatus('error')
    }
  }

  // Show platform selection
  if (!selectedPlatform) {
    return (
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Import Your Data
          </h1>
          <p className="text-lg text-gray-600">
            Select your current platform to get started
          </p>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformSelect(platform)}
              className={`relative p-6 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-105 ${
                platform.bgColor
              } ${platform.borderColor} hover:border-opacity-60`}
            >
              {platform.popular && (
                <span className="absolute -top-2 -right-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  Popular
                </span>
              )}
              
              {platform.special && (
                <span className="absolute -top-2 -right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                  {platform.special}
                </span>
              )}

              <div className="text-4xl mb-3">{platform.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {platform.fullName}
              </h3>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                {platform.multiFile ? (
                  <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {platform.fileLabel}
                </span>
              </div>
              
              <p className="text-sm text-gray-600">
                {platform.description}
              </p>

              <div className="mt-4 flex items-center justify-center text-sm font-medium text-blue-600">
                Select Platform
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Not sure which platform you're using?</p>
              <p>Check your current booking system's login page or contact their support for help exporting your data.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show platform-specific import interface
  const platform = platforms.find(p => p.id === selectedPlatform)
  const config = platformImportConfigs[selectedPlatform]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with platform info */}
      <div className="mb-8">
        <button
          onClick={() => setSelectedPlatform(null)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center"
        >
          ← Change platform
        </button>
        
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-3xl text-white shadow-lg`}>
            {platform.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Import from {platform.fullName}
            </h1>
            <p className="text-gray-600">
              {platform.multiFile 
                ? `Upload ${platform.fileCount} files: ${config.importType === 'multiple' 
                  ? Object.values(config.dataDetection).map((fields, i) => 
                    i === 0 ? 'Appointments' : 'Clients').join(' + ')
                  : 'your exported data'}`
                : 'Upload your exported CSV file'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Export Guide */}
      <PlatformExportGuide
        platform={selectedPlatform}
        config={config}
        isOpen={showExportGuide}
        onToggle={() => setShowExportGuide(!showExportGuide)}
      />

      {/* File Upload Area */}
      <div className="mt-6">
        {platform.multiFile ? (
          <MultiFileUploader
            platform={selectedPlatform}
            config={config}
            onFilesUploaded={handleFilesUploaded}
            uploadedFiles={uploadedFiles}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  handleFilesUploaded({ file1: file })
                }
              }}
              className="hidden"
              id="single-file-upload"
            />
            <label htmlFor="single-file-upload" className="cursor-pointer">
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                CSV file from {platform.name}
              </p>
            </label>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {validationErrors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 mb-1">Validation Issues</p>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary */}
      {importStatus === 'ready' && importResults && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-900 mb-2">Ready to Import</p>
              <div className="text-sm text-green-700 space-y-1">
                {Object.entries(importResults).map(([key, data]) => (
                  <div key={key}>
                    • {data.rows.length} records found with {data.headers.length} fields
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        {importStatus === 'ready' && (
          <button
            onClick={handleImport}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Import Data
          </button>
        )}
        
        {importStatus === 'importing' && (
          <div className="flex-1 px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-center">
            Importing...
          </div>
        )}
        
        {importStatus === 'complete' && (
          <div className="flex-1 px-6 py-3 bg-green-100 text-green-700 rounded-lg font-medium text-center">
            ✓ Import Complete!
          </div>
        )}
        
        <button
          onClick={() => onComplete({ skipped: true })}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}