'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const DashboardPerspectiveContext = createContext({
  selectedLocation: null,
  selectedPerspective: null,
  setSelectedLocation: () => {},
  setSelectedPerspective: () => {},
  isOwnerView: true,
  currentViewUserId: null
})

export function DashboardPerspectiveProvider({ children }) {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedPerspective, setSelectedPerspective] = useState(null)

  // Determine if current view is owner view
  // Debug logging to understand the perspective state
  // // Debug log removed for production
const isOwnerView = !selectedPerspective || selectedPerspective.type === 'owner'
  // // Debug log removed for production
// Get the user ID for the current view
  const currentViewUserId = selectedPerspective?.type === 'staff' 
    ? selectedPerspective.id 
    : null // null means owner view (show all data)

  // Persist perspective in sessionStorage
  useEffect(() => {
    if (selectedPerspective) {
      sessionStorage.setItem('dashboard_perspective', JSON.stringify(selectedPerspective))
    }
  }, [selectedPerspective])

  // Restore perspective on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard_perspective')
    if (saved) {
      try {
        const perspective = JSON.parse(saved)
        setSelectedPerspective(perspective)
      } catch (e) {
        console.error('Failed to restore perspective:', e)
      }
    }
  }, [])

  const value = {
    selectedLocation,
    selectedPerspective,
    setSelectedLocation,
    setSelectedPerspective,
    isOwnerView,
    currentViewUserId
  }

  return (
    <DashboardPerspectiveContext.Provider value={value}>
      {children}
    </DashboardPerspectiveContext.Provider>
  )
}

export function useDashboardPerspective() {
  const context = useContext(DashboardPerspectiveContext)
  if (!context) {
    throw new Error('useDashboardPerspective must be used within DashboardPerspectiveProvider')
  }
  return context
}