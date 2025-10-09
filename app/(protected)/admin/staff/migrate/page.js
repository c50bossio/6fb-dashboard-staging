'use client'

import StaffMigrationWizard from '@/components/staff/StaffMigrationWizard'
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

/**
 * Staff Migration Page
 * Migrate existing barbers from UUID-based URLs to slug-based URLs
 */
export default function StaffMigrationPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/admin/staff')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground flex items-center">
                    <ArrowPathIcon className="h-8 w-8 mr-3 text-olive-600" />
                    Staff Migration
                  </h1>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Convert existing barbers to the new URL system
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Info Section */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">What is this migration?</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              This tool converts your existing barber profiles from UUID-based URLs (like{' '}
              <code className="px-1 py-0.5 bg-blue-100 rounded">/book/abc-123-def</code>) to
              human-readable slug-based URLs (like{' '}
              <code className="px-1 py-0.5 bg-blue-100 rounded">/book/john-smith</code>).
            </p>
            <p className="font-medium">Benefits:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Easier to share and remember</li>
              <li>Better for SEO (search engine optimization)</li>
              <li>More professional appearance</li>
              <li>Old URLs automatically redirect (no broken links)</li>
            </ul>
          </div>
        </div>

        {/* Migration Wizard */}
        <StaffMigrationWizard />

        {/* Technical Details */}
        <div className="mt-6 bg-gray-100 border border-gray-300 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-card-foreground mb-2">Technical Details</h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>
              <strong>Slug Generation:</strong> Slugs are generated from first and last names
              using lowercase letters, numbers, and hyphens only.
            </p>
            <p>
              <strong>Conflict Resolution:</strong> If two barbers have the same name, the system
              automatically appends a number (e.g., "john-smith-2").
            </p>
            <p>
              <strong>Backward Compatibility:</strong> Old UUID-based URLs will automatically
              redirect to new slug-based URLs using HTTP 301 (permanent redirect).
            </p>
            <p>
              <strong>Idempotent:</strong> This migration can be run multiple times safely. It only
              updates barbers that don't already have booking slugs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
