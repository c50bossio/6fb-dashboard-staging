'use client'

import { useState, useCallback } from 'react'
import { DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { platformImportConfigs } from '@/lib/platform-import-configs'
import { parseCSV, analyzeCSV, generateImportSummary } from '@/lib/csv-auto-detector'

export default function SimplifiedDataImport({ data, updateData, errors, onNext }) {
  const [selectedPlatform, setSelectedPlatform] = useState(data.selectedPlatform || null)
  const [importStatus, setImportStatus] = useState('idle') // idle, analyzing, complete, error
  const [analysisResults, setAnalysisResults] = useState(null)
  const [importSummary, setImportSummary] = useState([])

  const handleFileUpload = useCallback((event) => {
    const files = Array.from(event.target.files)
    if (!files.length) return

    // For single file platforms
    if (platformImportConfigs[selectedPlatform]?.importType !== 'multiple') {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          setImportStatus('analyzing')
          
          // Parse and analyze the CSV
          const csvContent = e.target.result
          const { headers, rows } = parseCSV(csvContent)
          const analysis = analyzeCSV(headers, rows)
          
          // Generate user-friendly summary
          const summary = generateImportSummary(analysis)
          
          setAnalysisResults(analysis)
          setImportSummary(summary)
          setImportStatus('complete')
          
          // Update parent data
          updateData({
            importedData: {
              platform: selectedPlatform || analysis.detectedPlatform,
              analysis,
              rowCount: rows.length,
              customerCount: analysis.statistics.uniqueCustomers,
              serviceCount: analysis.statistics.uniqueServices
            }
          })
        } catch (error) {
          console.error('Import error:', error)
          setImportStatus('error')
          setImportSummary(['❌ Unable to process file. Please check the format.'])
        }
      }
      reader.readAsText(file)
    } else {
      // For multiple file platforms (Trafft, Acuity)
      setImportStatus('analyzing')
      let combinedAnalysis = {
        detectedPlatform: selectedPlatform,
        dataTypes: { hasCustomers: false, hasAppointments: false, hasServices: false },
        statistics: { totalRows: 0, uniqueCustomers: 0, uniqueServices: 0, dateRange: null },
        confidence: 100
      }
      
      let filesProcessed = 0
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const csvContent = e.target.result
            const { headers, rows } = parseCSV(csvContent)
            const analysis = analyzeCSV(headers, rows)
            
            // Combine analyses from multiple files
            combinedAnalysis.dataTypes.hasCustomers = combinedAnalysis.dataTypes.hasCustomers || analysis.dataTypes.hasCustomers
            combinedAnalysis.dataTypes.hasAppointments = combinedAnalysis.dataTypes.hasAppointments || analysis.dataTypes.hasAppointments
            combinedAnalysis.dataTypes.hasServices = combinedAnalysis.dataTypes.hasServices || analysis.dataTypes.hasServices
            combinedAnalysis.statistics.totalRows += analysis.statistics.totalRows
            combinedAnalysis.statistics.uniqueCustomers = Math.max(combinedAnalysis.statistics.uniqueCustomers, analysis.statistics.uniqueCustomers)
            combinedAnalysis.statistics.uniqueServices = Math.max(combinedAnalysis.statistics.uniqueServices, analysis.statistics.uniqueServices)
            
            filesProcessed++
            if (filesProcessed === files.length) {
              const summary = generateImportSummary(combinedAnalysis)
              setAnalysisResults(combinedAnalysis)
              setImportSummary(summary)
              setImportStatus('complete')
              
              updateData({
                importedData: {
                  platform: selectedPlatform,
                  analysis: combinedAnalysis,
                  rowCount: combinedAnalysis.statistics.totalRows,
                  customerCount: combinedAnalysis.statistics.uniqueCustomers,
                  serviceCount: combinedAnalysis.statistics.uniqueServices
                }
              })
            }
          } catch (error) {
            console.error('Import error:', error)
            setImportStatus('error')
            setImportSummary(['❌ Unable to process one or more files. Please check the format.'])
          }
        }
        reader.readAsText(file)
      })
    }
  }, [selectedPlatform, updateData])

  const platforms = ['square', 'booksy', 'acuity', 'trafft', 'other']

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Switching from another platform?
        </h3>
        <p className="text-gray-600 mb-4">
          Import your data with one click. Select your current platform:
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {platforms.map((platform) => {
            const config = platformImportConfigs[platform] || {
              name: 'Other Platform',
              icon: '📊',
              description: 'Generic CSV import'
            }
            
            return (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`flex flex-col items-center justify-center p-4 min-h-[100px] rounded-lg border-2 transition-all ${
                  selectedPlatform === platform
                    ? 'border-yellow-500 bg-yellow-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="text-3xl mb-2">{config.icon}</div>
                <div className="text-sm font-medium text-gray-900 text-center">{config.name}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Import Instructions */}
      {selectedPlatform && importStatus === 'idle' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3">
            How to export from {platformImportConfigs[selectedPlatform]?.name}:
          </h4>
          <ol className="space-y-2 text-sm text-gray-700">
            {platformImportConfigs[selectedPlatform]?.exportInstructions?.map((instruction, index) => (
              <li key={index} className="flex gap-2">
                <span className="font-medium text-gray-500">{index + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
          
          {/* File Upload */}
          <div className="mt-6">
            <label className="block">
              <div className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg hover:border-yellow-500 cursor-pointer">
                <div className="text-center">
                  <DocumentArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {platformImportConfigs[selectedPlatform]?.importType === 'multiple' 
                      ? 'Click to upload your CSV files (you can select multiple)'
                      : 'Click to upload your CSV file'}
                  </p>
                  <p className="text-xs text-gray-500">or drag and drop</p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                multiple={platformImportConfigs[selectedPlatform]?.importType === 'multiple'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {platformImportConfigs[selectedPlatform]?.importType === 'multiple' && (
              <p className="text-xs text-gray-600 mt-2 text-center">
                💡 Tip: Hold Ctrl/Cmd to select multiple files at once
              </p>
            )}
          </div>
        </div>
      )}

      {/* Analysis Status */}
      {importStatus === 'analyzing' && (
        <div className="bg-yellow-50 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Analyzing your data...</p>
        </div>
      )}

      {/* Import Results */}
      {importStatus === 'complete' && analysisResults && (
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Import Successful!</h4>
              <div className="space-y-1">
                {importSummary.map((line, index) => (
                  <p key={index} className="text-sm text-gray-700">{line}</p>
                ))}
              </div>
            </div>
          </div>
          
          {/* Data breakdown */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-green-200">
            {analysisResults.dataTypes.hasCustomers && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {analysisResults.statistics.uniqueCustomers}
                </div>
                <div className="text-xs text-gray-600">Customers</div>
              </div>
            )}
            {analysisResults.dataTypes.hasAppointments && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {analysisResults.statistics.totalRows}
                </div>
                <div className="text-xs text-gray-600">Appointments</div>
              </div>
            )}
            {analysisResults.dataTypes.hasServices && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {analysisResults.statistics.uniqueServices}
                </div>
                <div className="text-xs text-gray-600">Services</div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-600 mt-4 text-center">
            Your data will be imported after completing setup
          </p>
        </div>
      )}

      {/* Error State */}
      {importStatus === 'error' && (
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Import Failed</h4>
              <div className="space-y-1">
                {importSummary.map((line, index) => (
                  <p key={index} className="text-sm text-gray-700">{line}</p>
                ))}
              </div>
              <button
                onClick={() => {
                  setImportStatus('idle')
                  setImportSummary([])
                }}
                className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Option */}
      {importStatus === 'idle' && (
        <div className="text-center pt-4">
          <button
            onClick={() => onNext()}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Skip this step - I'll start fresh
          </button>
        </div>
      )}
    </div>
  )
}