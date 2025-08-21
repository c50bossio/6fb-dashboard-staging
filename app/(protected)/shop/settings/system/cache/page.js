'use client'

import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import cacheManager from '@/lib/cacheManager'
import { toast } from '@/hooks/use-toast'

export default function CacheManagementPage() {
  const [isClearing, setIsClearing] = useState(false)

  const handleFixUpdates = async () => {
    setIsClearing(true)
    
    toast({
      title: "Refreshing Application",
      description: "Clearing caches and loading latest updates..."
    })

    try {
      // Clear all caches and force update check
      await cacheManager.clearAll()
      
      toast({
        title: "Success!",
        description: "Application will reload with latest updates.",
        variant: "success"
      })
      
      // Reload after a brief delay to show success message
      setTimeout(() => {
        window.location.reload(true)
      }, 1500)
      
    } catch (error) {
      console.error('Cache clear failed:', error)
      toast({
        title: "Update Failed",
        description: "Please try refreshing the page manually.",
        variant: "destructive"
      })
      setIsClearing(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Maintenance</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tools to keep your application running smoothly
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Update Issues Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Not Seeing Recent Updates?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              If changes made to your shop aren't appearing after deployment, 
              use this tool to force the application to load the latest version.
            </p>
            
            <button
              onClick={handleFixUpdates}
              disabled={isClearing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Fix Update Issues
                </>
              )}
            </button>
          </div>

          {/* Simple Info Box */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">
              <strong>When to use this:</strong> Only when deployed changes aren't visible. 
              This will clear your browser's stored data and reload the application. 
              You'll remain logged in.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}