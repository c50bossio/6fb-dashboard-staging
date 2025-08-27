'use client'

import { 
  UserIcon, 
  BuildingStorefrontIcon, 
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
  BookmarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

// Import existing customization components
import BarberProfileCustomization from '@/components/customization/BarberProfileCustomization'
import BarbershopWebsiteCustomization from '@/components/customization/BarbershopWebsiteCustomization'
import EnterpriseWebsiteCustomization from '@/components/customization/EnterpriseWebsiteCustomization'
import { useAuth } from '@/components/SupabaseAuthProvider'

const CustomizationSection = ({ 
  title, 
  description, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  children, 
  color = 'blue',
  badge,
  hasChanges = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef(null)

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      accent: 'border-blue-300',
      hover: 'hover:bg-blue-100',
      gradient: 'from-blue-500 to-blue-600'
    },
    purple: {
      bg: 'bg-purple-50 border-purple-200 text-purple-800',
      accent: 'border-purple-300',
      hover: 'hover:bg-purple-100',
      gradient: 'from-purple-500 to-purple-600'
    },
    green: {
      bg: 'bg-green-50 border-green-200 text-green-800',
      accent: 'border-green-300',
      hover: 'hover:bg-green-100',
      gradient: 'from-green-500 to-green-600'
    },
    gold: {
      bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      accent: 'border-yellow-300',
      hover: 'hover:bg-yellow-100',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  }

  const handleToggle = () => {
    setIsAnimating(true)
    onToggle()
    setTimeout(() => setIsAnimating(false), 300)
  }

  useEffect(() => {
    if (contentRef.current) {
      if (isExpanded) {
        contentRef.current.style.maxHeight = contentRef.current.scrollHeight + 'px'
      } else {
        contentRef.current.style.maxHeight = '0px'
      }
    }
  }, [isExpanded])

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
      isExpanded 
        ? `${colorClasses[color].accent} shadow-md` 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    } ${hasChanges ? 'ring-2 ring-orange-200 ring-opacity-50' : ''}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className={`w-full px-4 sm:px-6 py-4 sm:py-5 bg-white transition-all duration-200 text-left ${
          isExpanded 
            ? colorClasses[color].hover 
            : 'hover:bg-gray-50'
        } ${isAnimating ? 'scale-[0.98]' : 'scale-100'} active:scale-[0.97]`}
        aria-expanded={isExpanded}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${colorClasses[color].bg} ${
              isExpanded ? 'scale-110' : ''
            }`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200" />
              {hasChanges && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                {badge && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full whitespace-nowrap">
                    {badge}
                  </span>
                )}
                {hasChanges && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-1">
                {description}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isAnimating ? 'rotate-180' : ''
              }`} />
            ) : (
              <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isAnimating ? 'rotate-90' : ''
              }`} />
            )}
          </div>
        </div>
      </button>
      
      {/* Content with smooth animation */}
      <div
        ref={contentRef}
        id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? 'none' : '0px'
        }}
      >
        <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function UnifiedCustomizePage() {
  const { user, profile } = useAuth()
  const [expandedSections, setExpandedSections] = useState(new Set(['barber']))
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({
    barber: false,
    barbershop: false,
    enterprise: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showTutorial, setShowTutorial] = useState(false)
  
  // Determine which sections to show based on role
  const userRole = profile?.role || 'SHOP_OWNER'
  const showBarberSection = ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
  const showBarbershopSection = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
  const showEnterpriseSection = ['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)

  // Calculate completion progress
  const sections = [
    { id: 'barber', visible: showBarberSection },
    { id: 'barbershop', visible: showBarbershopSection },
    { id: 'enterprise', visible: showEnterpriseSection }
  ].filter(s => s.visible)

  const completedSections = sections.length - Object.values(hasUnsavedChanges).filter(Boolean).length
  const progressPercentage = sections.length > 0 ? (completedSections / sections.length) * 100 : 100

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const handleUnsavedChanges = (sectionId, hasChanges) => {
    setHasUnsavedChanges(prev => ({
      ...prev,
      [sectionId]: hasChanges
    }))
  }

  useEffect(() => {
    // Auto-expand appropriate section based on role and simulate loading
    setIsLoading(true)
    setTimeout(() => {
      if (userRole === 'BARBER') {
        setExpandedSections(new Set(['barber']))
      } else if (userRole === 'SHOP_OWNER') {
        setExpandedSections(new Set(['barbershop']))
      } else if (userRole === 'ENTERPRISE_OWNER' || userRole === 'SUPER_ADMIN') {
        setExpandedSections(new Set(['enterprise']))
      }
      setIsLoading(false)
    }, 800)
  }, [userRole])

  // Check if it's a new user (show tutorial)
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('customize-tutorial-seen')
    if (!hasSeenTutorial && !isLoading) {
      setShowTutorial(true)
    }
  }, [isLoading])

  const closeTutorial = () => {
    setShowTutorial(false)
    localStorage.setItem('customize-tutorial-seen', 'true')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Skeleton Header */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-3 animate-pulse"></div>
            <div className="h-5 bg-gray-200 rounded-lg w-2/3 animate-pulse"></div>
          </div>
          
          {/* Skeleton Sections */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
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
                onClick={closeTutorial}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                Get Started
              </button>
              <button 
                onClick={closeTutorial}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex flex-col sm:items-end">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full sm:w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
            <button 
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <QuestionMarkCircleIcon className="w-4 h-4 mr-1" />
              Show Tutorial
            </button>
            <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
              <BookmarkIcon className="w-4 h-4 mr-1" />
              Save All Changes
            </button>
            {Object.values(hasUnsavedChanges).some(Boolean) && (
              <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg">
                <ClockIcon className="w-4 h-4 mr-1" />
                {Object.values(hasUnsavedChanges).filter(Boolean).length} Unsaved Section{Object.values(hasUnsavedChanges).filter(Boolean).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Customization Sections */}
        <div className="space-y-6">
          {/* Barber Profile Section */}
          {showBarberSection && (
            <CustomizationSection
              title="Barber Profile"
              description="Customize your individual booking profile, availability, and professional showcase"
              icon={UserIcon}
              color="blue"
              badge={userRole === 'BARBER' ? 'Primary' : undefined}
              hasChanges={hasUnsavedChanges.barber}
              isExpanded={expandedSections.has('barber')}
              onToggle={() => toggleSection('barber')}
            >
              <BarberProfileCustomization 
                onUnsavedChanges={(hasChanges) => handleUnsavedChanges('barber', hasChanges)}
              />
            </CustomizationSection>
          )}

          {/* Barbershop Website Section */}
          {showBarbershopSection && (
            <CustomizationSection
              title="Barbershop Website"
              description="Design your shop's booking page, manage branding, and optimize your online presence"
              icon={BuildingStorefrontIcon}
              color="purple"
              badge={userRole === 'SHOP_OWNER' ? 'Primary' : undefined}
              hasChanges={hasUnsavedChanges.barbershop}
              isExpanded={expandedSections.has('barbershop')}
              onToggle={() => toggleSection('barbershop')}
            >
              <BarbershopWebsiteCustomization 
                onUnsavedChanges={(hasChanges) => handleUnsavedChanges('barbershop', hasChanges)}
              />
            </CustomizationSection>
          )}

          {/* Enterprise Multi-Location Section */}
          {showEnterpriseSection && (
            <CustomizationSection
              title="Multi-Location Management"
              description="Manage branding, settings, and operations across multiple barbershop locations"
              icon={GlobeAltIcon}
              color="green"
              badge="Enterprise"
              hasChanges={hasUnsavedChanges.enterprise}
              isExpanded={expandedSections.has('enterprise')}
              onToggle={() => toggleSection('enterprise')}
            >
              <EnterpriseWebsiteCustomization 
                onUnsavedChanges={(hasChanges) => handleUnsavedChanges('enterprise', hasChanges)}
              />
            </CustomizationSection>
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
                  onClick={() => setShowTutorial(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
                >
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Watch Tutorial
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
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