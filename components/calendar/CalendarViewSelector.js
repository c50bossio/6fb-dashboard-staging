'use client'

import { useEffect } from 'react'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import UnifiedContextSelector from '../shared/UnifiedContextSelector'
import { useAuth } from '../SupabaseAuthProvider'

export default function CalendarViewSelector({
  onViewChange,
  currentView = 'book-appointment'
}) {
  const { userRole } = useAuth()
  const { 
    activeContext,
    getOptimalCalendarView,
    getPageDefaults
  } = useGlobalDashboard()
  
  // Auto-update calendar view when context changes
  useEffect(() => {
    if (activeContext && onViewChange) {
      const optimalView = getOptimalCalendarView()
      
      // Map context-driven view to legacy view IDs for backward compatibility
      const contextToLegacyViewMap = {
        'resourceTimeGridWeek': 'shop-calendar',
        'resourceTimeGridDay': 'book-appointment',
        'timeGridWeek': activeContext.contextType === 'personal' ? 'my-schedule' : 'shop-calendar',
        'timeGridDay': 'choose-time',
        'listWeek': 'my-appointments'
      }
      
      const legacyView = contextToLegacyViewMap[optimalView] || currentView
      
      // Only trigger change if view actually changed
      if (legacyView !== currentView) {
        onViewChange(legacyView)
      }
    }
  }, [activeContext, onViewChange, getOptimalCalendarView, currentView])
  
  // Get calendar-specific quick actions
  const calendarQuickActions = getPageDefaults('calendar')?.quickActions || [
    'Today', 
    'This Week', 
    'Available Now', 
    '+ New Appointment'
  ]
  
  return (
    <div className="flex items-center space-x-4">
      {/* Unified Context Selector - replaces all dropdowns */}
      <UnifiedContextSelector 
        showQuickActions={true}
        quickActions={calendarQuickActions}
        size="default"
      />
      
      {/* Context-aware status indicator */}
      {activeContext && (
        <div className="hidden lg:flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span>
            {activeContext.contextType === 'executive' && 'Executive Dashboard'}
            {activeContext.contextType === 'manager' && 'Managing Location'}
            {activeContext.contextType === 'personal' && 'Personal Schedule'}
            {activeContext.contextType === 'booking' && 'Booking Mode'}
          </span>
        </div>
      )}
    </div>
  )
}