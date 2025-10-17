'use client'

import { 
  UserIcon, 
  BuildingStorefrontIcon, 
  GlobeAltIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
  BookmarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo, useCallback, Suspense, lazy, memo } from 'react'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useDebounce } from '@/hooks/useDebounce'

// Lazy load heavy components for better performance
const CustomizationSection = lazy(() => import('@/components/optimized/CustomizationSection'))
const BarberProfileCustomization = lazy(() => import('@/components/customization/BarberProfileCustomizationOptimized'))
const BarbershopWebsiteCustomization = lazy(() => import('@/components/customization/BarbershopWebsiteCustomization'))
const EnterpriseWebsiteCustomization = lazy(() => import('@/components/customization/EnterpriseWebsiteCustomization'))

// Memoized skeleton components for loading states
const SectionSkeleton = memo(function SectionSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
})

// Memoized loading screen with better UX
const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Skeleton Header */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-3"></div>
          <div className="h-5 bg-gray-200 rounded-lg w-2/3"></div>
        </div>
        
        {/* Skeleton Progress Bar */}
        <div className="mb-6 bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full w-1/3 animate-pulse"></div>
          </div>
        </div>
        
        {/* Skeleton Sections */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <SectionSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
})

// Memoized tutorial overlay
const TutorialOverlay = memo(function TutorialOverlay({ 
  showTutorial, 
  onClose 
}) {
  if (!showTutorial) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Customization!</h3>
          <p className="text-gray-600">
            Create a professional online presence that attracts customers and grows your business. 
            Each section is tailored to help you succeed with the Six Figure Barber methodology.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            Get Started
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
})

// Memoized progress indicator
const ProgressIndicator = memo(function ProgressIndicator({ 
  completedSections, 
  totalSections 
}) {
  const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 100

  return (
    <div className="flex flex-col sm:items-end">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">Setup Progress</span>
        <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
      </div>
      <div className="w-full sm:w-32 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
})

// Memoized quick actions bar
const QuickActionsBar = memo(function QuickActionsBar({ 
  onShowTutorial, 
  onSaveAll, 
  unsavedCount 
}) {
  return (
    <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
        <button 
          onClick={onShowTutorial}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <QuestionMarkCircleIcon className="w-4 h-4 mr-1" />
          Show Tutorial
        </button>
        <button 
          onClick={onSaveAll}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <BookmarkIcon className="w-4 h-4 mr-1" />
          Save All Changes
        </button>
        {unsavedCount > 0 && (
          <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg">
            <ClockIcon className="w-4 h-4 mr-1" />
            {unsavedCount} Unsaved Section{unsavedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
})

// Main component with optimizations
export default function UnifiedCustomizePageOptimized() {
  const { user, profile } = useAuth()
  
  // State management with optimization
  const [expandedSections, setExpandedSections] = useState(new Set(['barber']))
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({
    barber: false,
    barbershop: false,
    enterprise: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showTutorial, setShowTutorial] = useState(false)
  
  // Debounced values for better performance
  const debouncedExpandedSections = useDebounce(expandedSections, 100)
  
  // Memoized user role determination
  const userRole = useMemo(() => profile?.role || 'SHOP_OWNER', [profile?.role])
  
  // Memoized section visibility calculations
  const sectionVisibility = useMemo(() => ({
    showBarberSection: ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole),
    showBarbershopSection: ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole),
    showEnterpriseSection: ['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
  }), [userRole])

  // Memoized progress calculation
  const progressData = useMemo(() => {
    const sections = [
      { id: 'barber', visible: sectionVisibility.showBarberSection },
      { id: 'barbershop', visible: sectionVisibility.showBarbershopSection },
      { id: 'enterprise', visible: sectionVisibility.showEnterpriseSection }
    ].filter(s => s.visible)

    const completedSections = sections.length - Object.values(hasUnsavedChanges).filter(Boolean).length
    return { 
      completedSections, 
      totalSections: sections.length,
      unsavedCount: Object.values(hasUnsavedChanges).filter(Boolean).length
    }
  }, [sectionVisibility, hasUnsavedChanges])

  // Optimized section toggle handler
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId)
      } else {
        newExpanded.add(sectionId)
      }
      return newExpanded
    })
  }, [])

  // Optimized unsaved changes handler
  const handleUnsavedChanges = useCallback((sectionId, hasChanges) => {
    setHasUnsavedChanges(prev => ({
      ...prev,
      [sectionId]: hasChanges
    }))
  }, [])

  // Optimized tutorial handlers
  const showTutorialHandler = useCallback(() => setShowTutorial(true), [])
  const closeTutorialHandler = useCallback(() => {
    setShowTutorial(false)
    localStorage.setItem('customize-tutorial-seen', 'true')
  }, [])

  // Optimized save all handler
  const handleSaveAll = useCallback(() => {
    // Trigger save for all sections with changes
    
    // This would trigger save events for all customization components
  }, [])

  // Auto-expand section based on role (optimized)
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      const defaultSection = userRole === 'BARBER' ? 'barber' 
                           : userRole === 'SHOP_OWNER' ? 'barbershop'
                           : userRole === 'ENTERPRISE_OWNER' || userRole === 'SUPER_ADMIN' ? 'enterprise'
                           : 'barber'
      
      setExpandedSections(new Set([defaultSection]))
      setIsLoading(false)
    }, 500) // Reduced loading time for better UX

    return () => clearTimeout(timer)
  }, [userRole])

  // Check for first-time tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('customize-tutorial-seen')
    if (!hasSeenTutorial && !isLoading) {
      setShowTutorial(true)
    }
  }, [isLoading])

  // Render loading state
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      {/* Tutorial Overlay */}
      <TutorialOverlay 
        showTutorial={showTutorial} 
        onClose={closeTutorialHandler} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Enhanced Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Customize Your Experience
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-2 max-w-2xl">
                Build a professional online presence that attracts more customers and grows your business
              </p>
            </div>
            
            {/* Progress Indicator */}
            <ProgressIndicator 
              completedSections={progressData.completedSections}
              totalSections={progressData.totalSections}
            />
          </div>
        </div>

        {/* Quick Actions Bar */}
        <QuickActionsBar
          onShowTutorial={showTutorialHandler}
          onSaveAll={handleSaveAll}
          unsavedCount={progressData.unsavedCount}
        />

        {/* Customization Sections */}
        <div className="space-y-6">
          {/* Barber Profile Section */}
          {sectionVisibility.showBarberSection && (
            <ComponentErrorBoundary componentName="BarberProfileCustomization">
              <Suspense fallback={<SectionSkeleton />}>
                <CustomizationSection
                  title="Barber Profile"
                  description="Customize your individual booking profile, availability, and professional showcase"
                  icon={UserIcon}
                  color="blue"
                  badge={userRole === 'BARBER' ? 'Primary' : undefined}
                  hasChanges={hasUnsavedChanges.barber}
                  isExpanded={debouncedExpandedSections.has('barber')}
                  onToggle={() => toggleSection('barber')}
                >
                  <BarberProfileCustomization 
                    onUnsavedChanges={(hasChanges) => handleUnsavedChanges('barber', hasChanges)}
                  />
                </CustomizationSection>
              </Suspense>
            </ComponentErrorBoundary>
          )}

          {/* Barbershop Website Section */}
          {sectionVisibility.showBarbershopSection && (
            <ComponentErrorBoundary componentName="BarbershopWebsiteCustomization">
              <Suspense fallback={<SectionSkeleton />}>
                <CustomizationSection
                  title="Barbershop Website"
                  description="Design your shop's booking page, manage branding, and optimize your online presence"
                  icon={BuildingStorefrontIcon}
                  color="purple"
                  badge={userRole === 'SHOP_OWNER' ? 'Primary' : undefined}
                  hasChanges={hasUnsavedChanges.barbershop}
                  isExpanded={debouncedExpandedSections.has('barbershop')}
                  onToggle={() => toggleSection('barbershop')}
                >
                  <BarbershopWebsiteCustomization 
                    onUnsavedChanges={(hasChanges) => handleUnsavedChanges('barbershop', hasChanges)}
                  />
                </CustomizationSection>
              </Suspense>
            </ComponentErrorBoundary>
          )}

          {/* Enterprise Multi-Location Section */}
          {sectionVisibility.showEnterpriseSection && (
            <ComponentErrorBoundary componentName="EnterpriseWebsiteCustomization">
              <Suspense fallback={<SectionSkeleton />}>
                <CustomizationSection
                  title="Multi-Location Management"
                  description="Manage branding, settings, and operations across multiple barbershop locations"
                  icon={GlobeAltIcon}
                  color="green"
                  badge="Enterprise"
                  hasChanges={hasUnsavedChanges.enterprise}
                  isExpanded={debouncedExpandedSections.has('enterprise')}
                  onToggle={() => toggleSection('enterprise')}
                >
                  <EnterpriseWebsiteCustomization 
                    onUnsavedChanges={(hasChanges) => handleUnsavedChanges('enterprise', hasChanges)}
                  />
                </CustomizationSection>
              </Suspense>
            </ComponentErrorBoundary>
          )}
        </div>

        {/* Enhanced Help Section */}
        <div className="mt-12 bg-gradient-to-br from-white to-blue-50 rounded-2xl p-6 sm:p-8 border border-blue-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help Getting Started?</h3>
              <p className="text-gray-600 mb-4">
                Our customization tools are designed around the Six Figure Barber methodology to help you create 
                a professional online presence that attracts premium customers and grows your business.
              </p>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={showTutorialHandler}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Watch Tutorial
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500">
                  <QuestionMarkCircleIcon className="w-4 h-4 mr-2" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Six Figure Barber Methodology Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Built with the <span className="font-semibold text-gray-700">Six Figure Barber</span> methodology for premium positioning and business growth
          </p>
        </div>
      </div>
    </div>
  )
}