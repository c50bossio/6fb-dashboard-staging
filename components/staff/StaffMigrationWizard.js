'use client'

import { useState } from 'react'
import { ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

/**
 * Staff Migration Wizard
 * Converts existing barbers from UUID-based URLs to slug-based URLs
 *
 * Flow:
 * 1. Preview - Show dry run results (what will be migrated)
 * 2. Confirm - User reviews and confirms migration
 * 3. Execute - Run migration and show results
 */
export default function StaffMigrationWizard() {
  const [currentStep, setCurrentStep] = useState(1) // 1: Preview, 2: Results
  const [preview, setPreview] = useState([])
  const [results, setResults] = useState([])
  const [errors, setErrors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load preview on mount
  const loadPreview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/staff/migrate?dry_run=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load preview')
      }

      setPreview(data.preview || [])
    } catch (err) {
      console.error('Preview error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Execute migration
  const executeMigration = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/staff/migrate', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute migration')
      }

      setResults(data.migrated || [])
      setErrors(data.errors || [])
      setCurrentStep(2)
    } catch (err) {
      console.error('Migration error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useState(() => {
    loadPreview()
  }, [])

  if (currentStep === 1) {
    return (
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Migration Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This migration will update existing barber profiles with new booking URLs.
                  The old URLs will continue to work via automatic redirects.
                </p>
                <p className="mt-2 font-medium">
                  We recommend testing with a backup before running this in production.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Migration Preview</h3>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading
                ? 'Loading preview...'
                : preview.length === 0
                ? 'No barbers need migration'
                : `${preview.length} barber${preview.length !== 1 ? 's' : ''} will be migrated`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="px-6 py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={loadPreview}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {!isLoading && !error && preview.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">{item.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{item.old_url}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-olive-700 font-mono">
                          {item.new_slug}
                        </div>
                        <div className="text-sm text-gray-600 font-mono">{item.new_url}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.has_conflict ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Conflict resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && preview.length === 0 && (
            <div className="px-6 py-12 text-center">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Barbers Up to Date
              </h3>
              <p className="text-gray-600">
                All your barbers already have booking slugs configured. No migration needed!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {!isLoading && !error && preview.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {preview.filter((p) => p.has_conflict).length > 0 && (
                  <p>
                    <ExclamationTriangleIcon className="h-4 w-4 inline text-yellow-500 mr-1" />
                    {preview.filter((p) => p.has_conflict).length} conflict
                    {preview.filter((p) => p.has_conflict).length !== 1 ? 's' : ''} resolved
                    by appending numbers
                  </p>
                )}
              </div>
              <button
                onClick={executeMigration}
                disabled={isLoading}
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 flex items-center"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Run Migration
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 2: Results
  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {results.length > 0 && errors.length === 0 && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Migration Successful!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Successfully migrated {results.length} barber
                  {results.length !== 1 ? 's' : ''} to the new URL system.
                </p>
                <p className="mt-1">
                  Old URLs will automatically redirect to new ones. No action needed!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partial Success Banner */}
      {errors.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Partial Migration</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Migrated {results.length} barber{results.length !== 1 ? 's' : ''}, but{' '}
                  {errors.length} error{errors.length !== 1 ? 's' : ''} occurred.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Migration Results</h3>
          <p className="text-sm text-gray-600 mt-1">
            {results.length} successfully migrated, {errors.length} failed
          </p>
        </div>

        {/* Success Table */}
        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Booking URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-olive-700 font-mono">
                        {item.new_url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Migrated
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error Table */}
        {errors.length > 0 && (
          <div className="px-6 py-4 border-t border-red-200 bg-red-50">
            <h4 className="text-sm font-semibold text-red-900 mb-3">Errors</h4>
            <div className="space-y-2">
              {errors.map((err, index) => (
                <div key={index} className="text-sm text-red-800">
                  <span className="font-medium">{err.name}:</span> {err.error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => window.location.href = '/admin/staff'}
            className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            Go to Staff Management
          </button>
        </div>
      </div>
    </div>
  )
}
