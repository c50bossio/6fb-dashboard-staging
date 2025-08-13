'use client'

import { WifiOffIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
            <WifiOffIcon className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription>
            It looks like you've lost your internet connection. 
            Some features may not be available until you're back online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What you can still do:</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>View cached appointments</li>
              <li>Access previously loaded data</li>
              <li>Create appointments (will sync when online)</li>
              <li>Browse cached pages</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              Go Back
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>Your data will automatically sync when you reconnect.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}