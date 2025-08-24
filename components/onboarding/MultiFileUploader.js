'use client'

import { useState, useCallback, useRef } from 'react'
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentIcon,
  XMarkIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

export default function MultiFileUploader({
  platform,
  config,
  onFilesUploaded,
  uploadedFiles = {}
}) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState([])
  const fileInputRefs = useRef({})

  // Define required files based on platform
  const getRequiredFiles = () => {
    switch (platform) {
      case 'acuity':
        return [
          {
            id: 'appointments',
            name: 'Appointments Export',
            description: 'From Reports → Export → Appointments',
            icon: CalendarDaysIcon,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            acceptedHeaders: ['Start Date and Time', 'Client Name', 'Appointment Type'],
            example: 'appointments_2024.csv'
          },
          {
            id: 'clients',
            name: 'Clients Export',
            description: 'From Clients → Import/export → Export client list',
            icon: UserGroupIcon,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            acceptedHeaders: ['First Name', 'Last Name', 'Email', 'Phone'],
            example: 'clients_export.csv'
          }
        ]
      case 'trafft':
        return [
          {
            id: 'customers',
            name: 'Customers Export',
            description: 'From Customers → Export Data',
            icon: UserGroupIcon,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            // More flexible header matching for Trafft customer exports
            acceptedHeaders: [
              'Customer Name', 'Customer Email', 'Customer Phone',
              'First Name', 'Last Name', 'Email', 'Phone',
              'Name', 'Gender', 'Birthday', 'Note'
            ],
            example: 'customers_export.csv'
          },
          {
            id: 'appointments',
            name: 'Appointments Export',
            description: 'From Appointments → Export Data',
            icon: CalendarDaysIcon,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            // More flexible header matching for Trafft appointment exports
            acceptedHeaders: [
              'Appointment Date', 'Service', 'Employee', 'Customer',
              'Date', 'Time', 'Service Name', 'Staff', 'Status',
              'Duration', 'Price', 'Location', 'Created'
            ],
            example: 'appointments_export.csv'
          }
        ]
      default:
        return []
    }
  }

  const requiredFiles = getRequiredFiles()

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFilesSelection(files)
  }, [])

  // Handle file selection (both drag-drop and click)
  const handleFilesSelection = useCallback(async (files) => {
    if (!files.length) return

    setUploading(true)
    setErrors([])

    try {
      const csvFiles = files.filter(file => 
        file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
      )

      if (csvFiles.length === 0) {
        setErrors(['Please upload CSV files only.'])
        setUploading(false)
        return
      }

      if (csvFiles.length > requiredFiles.length) {
        setErrors([`Please upload exactly ${requiredFiles.length} files for ${config?.name || platform}.`])
        setUploading(false)
        return
      }

      // Analyze files and try to match them to required file types
      const analyzedFiles = await analyzeFiles(csvFiles)
      
      // Update parent with the analyzed files
      onFilesUploaded(analyzedFiles)

    } catch (error) {
      console.error('File upload error:', error)
      setErrors(['Failed to process files. Please try again.'])
    } finally {
      setUploading(false)
    }
  }, [requiredFiles.length, config?.name, platform, onFilesUploaded])

  // Analyze CSV files to determine their type
  const analyzeFiles = async (files) => {
    const analyzed = {}
    const usedTypes = new Set()
    const unmatchedFiles = []

    // First pass: try to match files based on headers AND filename hints
    for (const file of files) {
      try {
        const content = await file.text()
        const headers = content.split('\n')[0].split(',').map(h => h.trim().replace(/"/g, ''))
        const fileName = file.name.toLowerCase()
        
        // Try to match file to required file types based on headers
        let matchedType = null
        let bestConfidence = 0

        for (const requiredFile of requiredFiles) {
          // Skip if this type was already matched with higher confidence
          if (usedTypes.has(requiredFile.id)) continue
          
          // Check filename hints first
          let filenameBonus = 0
          if (requiredFile.id === 'customers' && 
              (fileName.includes('customer') || fileName.includes('client'))) {
            filenameBonus = 0.2
          } else if (requiredFile.id === 'appointments' && 
              (fileName.includes('appointment') || fileName.includes('booking') || 
               fileName.includes('schedule'))) {
            filenameBonus = 0.2
          }
          
          const matches = requiredFile.acceptedHeaders.filter(header => {
            const normalizedExpected = header.toLowerCase().replace(/[^a-z0-9]/g, '')
            
            // Check for direct match
            const hasDirectMatch = headers.some(h => {
              const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '')
              // More flexible matching
              return normalizedHeader.includes(normalizedExpected) || 
                     normalizedExpected.includes(normalizedHeader) ||
                     // Handle common variations
                     (normalizedExpected === 'customername' && normalizedHeader === 'customer') ||
                     (normalizedExpected === 'customer' && normalizedHeader === 'customername') ||
                     (normalizedExpected === 'clientname' && normalizedHeader === 'client') ||
                     (normalizedExpected === 'appointmentdate' && normalizedHeader.includes('date'))
            })
            
            // Special case: accept "First Name" + "Last Name" for "Customer Name" or "Client Name"
            if (!hasDirectMatch && 
                (normalizedExpected === 'customername' || normalizedExpected === 'clientname')) {
              const hasFirstName = headers.some(h => 
                h.toLowerCase().includes('first') && h.toLowerCase().includes('name'))
              const hasLastName = headers.some(h => 
                h.toLowerCase().includes('last') && h.toLowerCase().includes('name'))
              return hasFirstName && hasLastName
            }
            
            return hasDirectMatch
          })
          
          // Calculate confidence with filename bonus
          const headerConfidence = matches.length / requiredFile.acceptedHeaders.length
          const currentConfidence = Math.min(1, headerConfidence + filenameBonus)

          if (currentConfidence > bestConfidence && currentConfidence >= 0.2) {
            bestConfidence = currentConfidence
            matchedType = requiredFile.id
          }
        }

        if (matchedType) {
          analyzed[matchedType] = {
            file, // Keep the original File object
            name: file.name,
            size: file.size,
            headers,
            confidence: bestConfidence,
            uploadedAt: new Date().toISOString()
          }
          usedTypes.add(matchedType)
        } else {
          unmatchedFiles.push({ file, headers })
        }
      } catch (error) {
        console.error(`Error analyzing file ${file.name}:`, error)
        unmatchedFiles.push({ file, headers: [] })
      }
    }

    // Second pass: try to match remaining files to unmatched types
    if (unmatchedFiles.length > 0) {
      const remainingTypes = requiredFiles.filter(rf => !usedTypes.has(rf.id))
      
      for (let i = 0; i < unmatchedFiles.length && i < remainingTypes.length; i++) {
        const { file, headers } = unmatchedFiles[i]
        const targetType = remainingTypes[i]
        
        analyzed[targetType.id] = {
          file,
          name: file.name,
          size: file.size,
          headers,
          confidence: 0.1, // Low confidence for fallback matching
          uploadedAt: new Date().toISOString(),
          needsVerification: true
        }
      }
    }

    return analyzed
  }

  // Handle file input change
  const handleFileInputChange = useCallback((fileType, event) => {
    const files = Array.from(event.target.files)
    if (files.length > 0) {
      handleSingleFileUpload(fileType, files[0])
    }
  }, [])

  // Handle single file upload for specific slot
  const handleSingleFileUpload = useCallback(async (fileType, file) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setErrors([`Please upload a CSV file for ${fileType}.`])
      return
    }

    setUploading(true)
    setErrors([])

    try {
      const content = await file.text()
      const headers = content.split('\n')[0].split(',').map(h => h.trim().replace(/"/g, ''))

      const newFiles = {
        ...uploadedFiles,
        [fileType]: {
          file,
          name: file.name,
          size: file.size,
          headers,
          confidence: 1, // User explicitly chose this file type
          uploadedAt: new Date().toISOString()
        }
      }

      onFilesUploaded(newFiles)
    } catch (error) {
      console.error('File upload error:', error)
      setErrors(['Failed to process file. Please try again.'])
    } finally {
      setUploading(false)
    }
  }, [uploadedFiles, onFilesUploaded])

  // Remove uploaded file
  const handleRemoveFile = useCallback((fileType) => {
    const newFiles = { ...uploadedFiles }
    delete newFiles[fileType]
    onFilesUploaded(newFiles)
  }, [uploadedFiles, onFilesUploaded])

  // Reassign file to different type
  const handleReassignFile = useCallback((fromType, toType) => {
    const newFiles = { ...uploadedFiles }
    if (newFiles[fromType] && !newFiles[toType]) {
      newFiles[toType] = { ...newFiles[fromType], confidence: 1 } // Manual assignment = full confidence
      delete newFiles[fromType]
      onFilesUploaded(newFiles)
    }
  }, [uploadedFiles, onFilesUploaded])

  // Check if all required files are uploaded
  const allFilesUploaded = requiredFiles.every(rf => uploadedFiles[rf.id])
  const uploadProgress = Object.keys(uploadedFiles).length / requiredFiles.length

  if (requiredFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">
          Multi-file upload not required for this platform.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Upload Required Files
        </h3>
        <p className="text-gray-600">
          {config?.name || platform} requires {requiredFiles.length} separate files
        </p>
        
        {/* Progress indicator */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{Object.keys(uploadedFiles).length} of {requiredFiles.length} files</span>
            <span>{Math.round(uploadProgress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Drag and drop area for multiple files */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'pointer-events-none opacity-50' : 'hover:border-blue-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-600">Processing files...</p>
          </div>
        ) : (
          <div>
            <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop all files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              We'll automatically match files to the correct type
            </p>
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={(e) => handleFilesSelection(Array.from(e.target.files))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Individual file slots */}
      <div className="grid gap-4">
        {requiredFiles.map((requiredFile) => {
          const Icon = requiredFile.icon
          const uploadedFile = uploadedFiles[requiredFile.id]
          const isUploaded = !!uploadedFile

          return (
            <div
              key={requiredFile.id}
              className={`
                border-2 rounded-xl p-6 transition-all
                ${isUploaded 
                  ? `${requiredFile.borderColor} ${requiredFile.bgColor}` 
                  : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              <div className="flex items-start space-x-4">
                <div className={`
                  p-3 rounded-lg flex-shrink-0
                  ${isUploaded ? requiredFile.bgColor : 'bg-gray-100'}
                `}>
                  <Icon className={`h-6 w-6 ${isUploaded ? requiredFile.color : 'text-gray-500'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{requiredFile.name}</span>
                      {isUploaded && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                    </h4>
                    
                    {isUploaded && (
                      <button
                        onClick={() => handleRemoveFile(requiredFile.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove file"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    {requiredFile.description}
                  </p>

                  {isUploaded ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <DocumentIcon className="h-4 w-4" />
                        <span className="font-medium">{uploadedFile.name}</span>
                        <span className="text-gray-500">
                          ({(uploadedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <ClockIcon className="h-3 w-3" />
                        <span>
                          Uploaded {new Date(uploadedFile.uploadedAt).toLocaleTimeString()}
                        </span>
                        {uploadedFile.confidence < 1 && (
                          <div className="mt-1">
                            {uploadedFile.needsVerification ? (
                              <div className="flex items-center gap-2 text-amber-600">
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                <span className="text-sm">
                                  File placed here based on upload order. Please verify it contains {requiredFile.id} data.
                                </span>
                              </div>
                            ) : uploadedFile.confidence < 0.5 ? (
                              <div className="flex items-center gap-2 text-amber-600">
                                <InformationCircleIcon className="h-4 w-4" />
                                <span className="text-sm">
                                  {Math.round(uploadedFile.confidence * 100)}% confident this is {requiredFile.id} data
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircleIcon className="h-4 w-4" />
                                <span className="text-sm">
                                  Auto-matched as {requiredFile.id} ({Math.round(uploadedFile.confidence * 100)}% confident)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Preview headers */}
                      <div className="text-xs text-gray-400">
                        <span className="font-medium">Headers found: </span>
                        {uploadedFile.headers.slice(0, 3).join(', ')}
                        {uploadedFile.headers.length > 3 && '...'}
                      </div>

                      {/* Reassignment option for low confidence matches */}
                      {uploadedFile.confidence < 0.7 && requiredFiles.length > 1 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Wrong match?</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReassignFile(requiredFile.id, e.target.value)
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Move to...</option>
                            {requiredFiles
                              .filter(rf => rf.id !== requiredFile.id && !uploadedFiles[rf.id])
                              .map(rf => (
                                <option key={rf.id} value={rf.id}>
                                  {rf.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => fileInputRefs.current[requiredFile.id]?.click()}
                        className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                        disabled={uploading}
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        <span>Upload {requiredFile.name}</span>
                      </button>
                      
                      <p className="text-xs text-gray-500">
                        Example: {requiredFile.example}
                      </p>

                      <input
                        ref={el => fileInputRefs.current[requiredFile.id] = el}
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileInputChange(requiredFile.id, e)}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Upload Issues
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {allFilesUploaded && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                All Files Ready
              </h3>
              <p className="mt-1 text-sm text-green-700">
                All required files have been uploaded and are ready for import.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Export Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {config?.exportInstructions?.slice(0, 4).map((instruction, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-200 text-blue-800 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                {index + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}