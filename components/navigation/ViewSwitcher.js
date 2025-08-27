'use client'

import { useState, useEffect } from 'react'
import { useSubscriptionAccess } from '../../hooks/useSubscriptionAccess'
import { useAuth } from '../SupabaseAuthProvider'
import LocationSelector from './LocationSelector'
import PerspectiveSelector from './PerspectiveSelector'

export default function ViewSwitcher() {
  const { user, profile } = useAuth()
  const { isBusinessOwner, loading: accessLoading } = useSubscriptionAccess()
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedPerspective, setSelectedPerspective] = useState(null)

  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  // Show loading while checking access
  if (accessLoading) {
    return null
  }

  // Don't render for clients or users without business access
  // This now includes subscribed individual barbers
  if (!user || (!isBusinessOwner() && !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'MANAGER'].includes(userRole))) {
    return null
  }

  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
    // Reset perspective when location changes
    setSelectedPerspective(null)
  }

  const handlePerspectiveSelect = (perspective) => {
    setSelectedPerspective(perspective)
    
    // Update any global state or context here
    // For example, you might want to update a global dashboard context
    // or trigger analytics tracking for the perspective switch
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
      <LocationSelector 
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
      />
      
      {selectedLocation && (
        <PerspectiveSelector
          selectedLocation={selectedLocation}
          selectedPerspective={selectedPerspective}
          onPerspectiveSelect={handlePerspectiveSelect}
        />
      )}
    </div>
  )
}