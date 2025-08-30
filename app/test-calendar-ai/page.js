'use client'

/**
 * Test Page for Phase 5-6: Google Calendar & AI Integration
 * Demonstrates React Query hooks, AI scheduling, and calendar management
 */

import { Calendar, Brain, RefreshCw, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { AISchedulingSidebar } from '@/components/calendar/AISchedulingSidebar'
import { CalendarConnectionManager } from '@/components/calendar/CalendarConnectionManager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useBookingPatterns, useScheduleOptimization } from '@/hooks/queries/useAI'
import { useCalendarSyncStatus, useCalendarConflicts } from '@/hooks/queries/useCalendar'

// Test barbershop ID from our migration
const TEST_BARBERSHOP_ID = 'c61b33d5-4a96-472b-8f97-d1a3ae5532f9'

export default function CalendarAITestPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  // Calendar hooks
  const { data: syncStatus } = useCalendarSyncStatus(TEST_BARBERSHOP_ID)
  const { data: conflicts } = useCalendarConflicts(TEST_BARBERSHOP_ID, {
    start: selectedDate,
    end: selectedDate
  })
  
  // AI hooks
  const { data: patterns, isLoading: patternsLoading } = useBookingPatterns(TEST_BARBERSHOP_ID)
  const optimizeSchedule = useScheduleOptimization()
  
  const handleOptimizeSchedule = () => {
    optimizeSchedule.mutate({
      shopId: TEST_BARBERSHOP_ID,
      date: selectedDate
    })
  }
  
  const handleSlotSelection = (slot) => {
    setSelectedSlot(slot)
    console.log('Selected slot:', slot)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Phase 5-6: Calendar & AI Integration Test</h1>
          <p className="text-gray-600">Testing Google Calendar sync with AI-powered scheduling</p>
        </div>
        
        {/* Phase Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">✅ Phase 5-6 Implementation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Calendar Hooks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">AI Agent Service</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">UI Components</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Real-time Sync</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar Connection */}
            <CalendarConnectionManager shopId={TEST_BARBERSHOP_ID} />
            
            {/* Sync Status */}
            {syncStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Sync Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge variant={
                        syncStatus.status === 'syncing' ? 'default' :
                        syncStatus.status === 'completed' ? 'success' :
                        syncStatus.status === 'error' ? 'destructive' :
                        'secondary'
                      }>
                        {syncStatus.status || 'Not synced'}
                      </Badge>
                    </div>
                    {syncStatus.progress !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Progress</p>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${syncStatus.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {syncStatus.lastSync && (
                      <div>
                        <p className="text-sm text-gray-600">Last Sync</p>
                        <p className="font-medium">
                          {new Date(syncStatus.lastSync).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Conflicts */}
            {conflicts && conflicts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Calendar Conflicts ({conflicts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {conflicts.map(conflict => (
                      <div key={conflict.id} className="p-3 border rounded-lg bg-orange-50">
                        <p className="font-medium text-orange-900">{conflict.title}</p>
                        <p className="text-sm text-orange-700">
                          {new Date(conflict.start_time).toLocaleString()} - 
                          {new Date(conflict.end_time).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Booking Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Booking Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patternsLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ) : patterns ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Peak Hours</p>
                      <p className="font-medium">
                        {patterns.peakHours?.map(h => `${h}:00`).join(', ') || 'No data'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Popular Services</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {patterns.popularServices?.map(service => (
                          <Badge key={service} variant="secondary">{service}</Badge>
                        )) || <span className="text-gray-500">No data</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Duration</p>
                      <p className="font-medium">{patterns.averageDuration || 30} minutes</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Booking Frequency</p>
                      <Badge variant={
                        patterns.bookingFrequency === 'high' ? 'success' :
                        patterns.bookingFrequency === 'normal' ? 'default' :
                        'secondary'
                      }>
                        {patterns.bookingFrequency || 'normal'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No pattern data available</p>
                )}
                
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={handleOptimizeSchedule}
                    disabled={optimizeSchedule.isPending}
                    className="w-full"
                  >
                    {optimizeSchedule.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Optimize Today's Schedule
                      </>
                    )}
                  </Button>
                  
                  {optimizeSchedule.isSuccess && optimizeSchedule.data && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✅ Schedule optimized! Saved {optimizeSchedule.data.totalImprovement} minutes
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar - AI Suggestions */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <AISchedulingSidebar
                shopId={TEST_BARBERSHOP_ID}
                service={{ duration_minutes: 30, name: 'Haircut' }}
                date={selectedDate}
                onSelectTimeSlot={handleSlotSelection}
              />
              
              {/* Selected Slot Display */}
              {selectedSlot && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Time Slot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Time</span>
                        <span className="font-medium">
                          {selectedSlot.time} - {selectedSlot.endTime}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Confidence</span>
                        <Badge variant="success">{selectedSlot.confidence}%</Badge>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Reasoning</span>
                        <p className="text-sm mt-1">{selectedSlot.reasoning}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        
        {/* Technical Details */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🛠️ Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">React Query Hooks</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• useCalendarAccounts() - Manage connected accounts</li>
                  <li>• useCalendarSync() - Trigger synchronization</li>
                  <li>• useCalendarConflicts() - Detect booking conflicts</li>
                  <li>• useAISchedulingSuggestions() - Get AI recommendations</li>
                  <li>• useNoShowPrediction() - Risk assessment</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI Features</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Pattern analysis from 90 days of data</li>
                  <li>• Optimal slot scoring algorithm</li>
                  <li>• No-show risk prediction</li>
                  <li>• Schedule optimization engine</li>
                  <li>• Smart reminder scheduling</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 This page demonstrates the complete Phase 5-6 implementation with Google Calendar 
                integration and AI-powered scheduling. All hooks use React Query for optimal 
                performance with caching, background refetch, and optimistic updates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}