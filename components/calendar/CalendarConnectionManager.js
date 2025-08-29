'use client'

/**
 * Calendar Connection Manager Component
 * Phase 5-6: Visual interface for Google Calendar OAuth and account management
 */

import { useState } from 'react'
import { useCalendarAccounts, useConnectCalendar, useDisconnectCalendar, useSyncCalendar } from '@/hooks/queries/useCalendar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export function CalendarConnectionManager({ shopId }) {
  const [syncingAccountId, setSyncingAccountId] = useState(null)
  const { data: accounts, isLoading, error } = useCalendarAccounts(shopId)
  const connectCalendar = useConnectCalendar()
  const disconnectCalendar = useDisconnectCalendar()
  const syncCalendar = useSyncCalendar()
  
  const handleConnect = () => {
    connectCalendar.mutate(shopId)
  }
  
  const handleDisconnect = async (accountId) => {
    if (confirm('Are you sure you want to disconnect this calendar?')) {
      disconnectCalendar.mutate({ shopId, accountId })
    }
  }
  
  const handleSync = async (accountId) => {
    setSyncingAccountId(accountId)
    try {
      await syncCalendar.mutateAsync({ shopId, accountId })
    } finally {
      setSyncingAccountId(null)
    }
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading calendar accounts...</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load calendar accounts. Please try again.
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Connected Calendars
          </CardTitle>
          <Button 
            onClick={handleConnect}
            variant="default"
            size="sm"
            disabled={connectCalendar.isPending}
          >
            {connectCalendar.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Connect Calendar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {accounts?.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-1">No calendars connected</p>
            <p className="text-sm text-gray-400">
              Connect your Google Calendar to sync appointments automatically
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts?.map(account => (
              <div 
                key={account.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">{account.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">
                        Last synced: {account.last_sync 
                          ? new Date(account.last_sync).toLocaleString()
                          : 'Never'}
                      </span>
                      {account.sync_enabled ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleSync(account.id)}
                    variant="outline"
                    size="sm"
                    disabled={syncingAccountId === account.id || syncCalendar.isPending}
                  >
                    {syncingAccountId === account.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleDisconnect(account.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={disconnectCalendar.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {syncCalendar.isSuccess && (
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Calendar synced successfully. Your appointments are up to date.
            </AlertDescription>
          </Alert>
        )}
        
        {syncCalendar.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to sync calendar. Please try again or reconnect your account.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Connect your Google Calendar with one click</li>
            <li>• Appointments sync automatically in real-time</li>
            <li>• Prevent double-bookings across all calendars</li>
            <li>• Your data is encrypted and secure</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}