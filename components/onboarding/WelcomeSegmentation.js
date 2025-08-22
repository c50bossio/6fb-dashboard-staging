'use client'

import { 
  SparklesIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  UserGroupIcon,
  MapPinIcon,
  DocumentArrowUpIcon,
  ChevronRightIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function WelcomeSegmentation({ 
  data, 
  updateData, 
  onComplete,
  profile 
}) {
  const [selectedPath, setSelectedPath] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Define the three segmentation paths
  const segmentationPaths = [
    {
      id: 'first_barbershop',
      title: 'My First Barbershop',
      subtitle: 'Starting fresh in the business',
      description: 'Get step-by-step guidance to set up your first barbershop with industry best practices and proven workflows.',
      icon: SparklesIcon,
      features: [
        'Guided tutorial throughout',
        'Industry best practices included', 
        'Essential features prioritized',
        'Success tips and recommendations'
      ],
      gradient: 'from-blue-500 to-purple-600',
      glowColor: 'shadow-blue-500/25',
      targetAudience: 'New to the barbershop business',
      estimatedTime: '15 minutes',
      complexity: 'Beginner-friendly'
    },
    {
      id: 'adding_locations',
      title: 'Adding Locations',
      subtitle: 'Expanding my business',
      description: 'Streamline multi-location management with advanced tools for franchises, chains, and growing enterprises.',
      icon: BuildingOfficeIcon,
      features: [
        'Multi-location dashboard',
        'Centralized staff management',
        'Enterprise reporting tools',
        'Location performance insights'
      ],
      gradient: 'from-emerald-500 to-teal-600',
      glowColor: 'shadow-emerald-500/25',
      targetAudience: 'Growing multi-location business',
      estimatedTime: '12 minutes',
      complexity: 'Enterprise-focused'
    },
    {
      id: 'switching_systems',
      title: 'Switching Systems',
      subtitle: 'Migrating from another platform',
      description: 'Seamlessly import your data and transition from your current booking system with minimal disruption.',
      icon: ArrowPathIcon,
      features: [
        'Data import assistance',
        'Migration best practices',
        'Minimize business disruption',
        'Transition support included'
      ],
      gradient: 'from-orange-500 to-red-600',
      glowColor: 'shadow-orange-500/25',
      targetAudience: 'Switching from another system',
      estimatedTime: '20 minutes',
      complexity: 'Migration-focused'
    }
  ]

  const handlePathSelection = (pathId) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    setSelectedPath(pathId)
    
    // Add a brief animation delay before proceeding (reduced from 800ms to 400ms for snappier UX)
    setTimeout(() => {
      // Update the onboarding data with the selected segmentation path
      const segmentationData = {
        segmentationPath: pathId,
        segmentationMetadata: {
          selectedAt: new Date().toISOString(),
          userProfile: {
            role: profile?.role,
            businessExperience: pathId === 'first_barbershop' ? 'beginner' : 
                              pathId === 'adding_locations' ? 'experienced' : 'migrating'
          }
        }
      }
      
      updateData(segmentationData)
      
      // Complete this step and auto-advance to next step
      if (onComplete) {
        onComplete(segmentationData, { autoAdvance: true })
      }
    }, 400)
  }

  const getUserGreeting = () => {
    const role = profile?.role
    if (role === 'ENTERPRISE_OWNER') return 'Welcome to Enterprise Management'
    if (role === 'SHOP_OWNER') return 'Welcome to Shop Management' 
    if (role === 'BARBER') return 'Welcome to Professional Booking'
    return 'Welcome to Your Dashboard'
  }

  const getRoleDescription = () => {
    const role = profile?.role
    if (role === 'ENTERPRISE_OWNER') return 'Let\'s set up your enterprise for success across multiple locations'
    if (role === 'SHOP_OWNER') return 'Let\'s get your barbershop ready for online bookings and business growth'
    if (role === 'BARBER') return 'Let\'s create your professional booking page and service offerings'
    return 'Let\'s get your business set up for success'
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getUserGreeting()}
        </h1>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          {getRoleDescription()}
        </p>
        
        {/* Personalization indicator */}
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
          <LightBulbIcon className="h-4 w-4" />
          Choose your path for a personalized setup experience
        </div>
      </div>

      {/* Path Selection Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {segmentationPaths.map((path) => {
          const Icon = path.icon
          const isSelected = selectedPath === path.id
          const isDisabled = isAnimating && !isSelected
          
          return (
            <div
              key={path.id}
              onClick={() => handlePathSelection(path.id)}
              className={`
                relative cursor-pointer group transition-all duration-300 transform
                ${isSelected ? 'scale-105 z-10' : 'hover:scale-102'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected ? path.glowColor + ' shadow-2xl' : 'hover:shadow-xl'}
              `}
            >
              {/* Selection Animation Overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-green-700 font-semibold">Perfect choice!</p>
                    <p className="text-green-600 text-sm">Preparing your personalized flow...</p>
                  </div>
                </div>
              )}

              <div className={`
                bg-white rounded-2xl border-2 p-6 h-full transition-all duration-300
                ${isSelected ? 'border-brand-500' : 'border-gray-200 group-hover:border-brand-300'}
              `}>
                {/* Header with icon and gradient */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${path.gradient}
                    shadow-lg transition-transform duration-300 group-hover:scale-110
                  `}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">{path.estimatedTime}</div>
                    <div className={`
                      text-xs px-2 py-1 rounded-full font-medium
                      ${path.id === 'first_barbershop' ? 'bg-blue-100 text-blue-700' :
                        path.id === 'adding_locations' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-orange-100 text-orange-700'}
                    `}>
                      {path.complexity}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {path.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {path.subtitle}
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {path.description}
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2 mb-6">
                  {path.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Target audience */}
                <div className="text-xs text-gray-500 mb-4">
                  Perfect for: {path.targetAudience}
                </div>

                {/* Visual indicator that entire card is clickable */}
                <div className={`
                  flex items-center justify-center gap-2 p-3 rounded-lg transition-all duration-300 pointer-events-none
                  ${isSelected 
                    ? 'bg-brand-600 text-white' 
                    : 'bg-gray-50 text-gray-700 group-hover:bg-brand-50 group-hover:text-brand-700'
                  }
                `}>
                  <span className="font-medium">
                    {isSelected ? 'Loading...' : 'Click to Select'}
                  </span>
                  {!isSelected && <ChevronRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Help section */}
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <h4 className="font-semibold text-gray-900 mb-2">Not sure which path to choose?</h4>
        <p className="text-gray-600 text-sm mb-4">
          Don't worry! You can always access advanced features later. We recommend starting with "My First Barbershop" 
          if you're unsure - it covers all the essentials and you can expand from there.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <UserGroupIcon className="h-4 w-4" />
            <span>Used by 10,000+ barbershops</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPinIcon className="h-4 w-4" />
            <span>All regions supported</span>
          </div>
          <div className="flex items-center gap-1">
            <DocumentArrowUpIcon className="h-4 w-4" />
            <span>Data import available</span>
          </div>
        </div>
      </div>
    </div>
  )
}