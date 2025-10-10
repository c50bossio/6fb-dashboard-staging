'use client'

import { useState } from 'react'
import { 
  ExclamationTriangleIcon, 
  UserIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useAuth } from './SupabaseAuthProvider'

export default function ProfileCompletionPrompt() {
  const { profile } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)

  // Check if profile needs completion
  const needsCompletion = profile && (
    !profile.full_name || 
    profile.full_name === 'User' || 
    profile.full_name.trim() === '' ||
    (!profile.first_name && !profile.last_name)
  )

  // Don't show if dismissed or profile is complete
  if (isDismissed || !needsCompletion) {
    return null
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 dark:text-amber-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Complete Your Profile
          </h3>
          <div className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            <p>
              Help us personalize your experience by completing your profile information.
              Your profile currently shows a generic name instead of your actual name.
            </p>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link
              href="/settings/profile"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-amber-600 transition-colors duration-200"
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Complete Profile
            </Link>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="inline-flex items-center px-3 py-2 border border-amber-300 dark:border-amber-700 text-sm leading-4 font-medium rounded-md text-amber-700 dark:text-amber-400 bg-transparent hover:bg-amber-50 dark:hover:bg-amber-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-amber-600 transition-colors duration-200"
            >
              Dismiss
            </button>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="bg-amber-50 dark:bg-amber-900/20 rounded-md p-1.5 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-amber-900/20 focus:ring-amber-600"
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}