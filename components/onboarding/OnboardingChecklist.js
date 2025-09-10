'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'

const checklistItems = [
  {
    id: 'profile',
    category: 'Setup',
    title: 'Complete your profile',
    description: 'Add your business information and contact details',
    points: 20,
    required: true,
    link: '/dashboard/settings'
  },
  {
    id: 'services',
    category: 'Setup',
    title: 'Add your services',
    description: 'Set up at least 3 services with pricing',
    points: 15,
    required: true,
    link: '/shop/settings'
  },
  {
    id: 'hours',
    category: 'Setup',
    title: 'Set business hours',
    description: 'Configure when you\'re available for bookings',
    points: 10,
    required: true,
    link: '/dashboard/settings'
  },
  {
    id: 'photo',
    category: 'Branding',
    title: 'Upload profile photo',
    description: 'Add a professional photo or logo',
    points: 10,
    required: false,
    link: '/dashboard/settings'
  },
  {
    id: 'first_booking',
    category: 'Milestone',
    title: 'Get your first booking',
    description: 'Share your booking link to get started',
    points: 25,
    required: false,
    milestone: true
  },
  {
    id: 'payment',
    category: 'Growth',
    title: 'Connect payment processing',
    description: 'Accept online payments with Stripe',
    points: 20,
    required: false,
    link: '/shop/financial'
  },
  {
    id: 'team',
    category: 'Growth',
    title: 'Add team members',
    description: 'Invite other barbers to your shop',
    points: 15,
    required: false,
    link: '/shop/settings/staff'
  },
  {
    id: 'promotion',
    category: 'Marketing',
    title: 'Create first promotion',
    description: 'Offer a discount to attract new clients',
    points: 15,
    required: false,
    link: '/dashboard/bookings'
  }
]

export default function OnboardingChecklist({ 
  completedItems = [], 
  onItemClick = null,
  minimized = false,
  onToggleMinimize = null,
  embedMode = false,
  theme = 'light',
  compact = false,
  onComplete = null,
  onProgress = null
}) {
  const [isMinimized, setIsMinimized] = useState(minimized)
  const [showCelebration, setShowCelebration] = useState(false)
  const [checklistData, setChecklistData] = useState(null)
  const [loading, setLoading] = useState(embedMode)
  
  // Fetch checklist data in embed mode
  useEffect(() => {
    if (embedMode) {
      fetchChecklistStatus()
    }
  }, [embedMode])

  const fetchChecklistStatus = async () => {
    try {
      const response = await fetch('/api/onboarding/checklist/status')
      const result = await response.json()
      if (result.success) {
        setChecklistData(result.data)
        if (onProgress) {
          onProgress(result.data.progress)
        }
      }
    } catch (error) {
      console.error('Failed to fetch checklist status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate progress
  const items = embedMode ? (checklistData?.items || []) : checklistItems
  const completed = embedMode ? (checklistData?.items?.filter(item => item.completed) || []) : completedItems.map(id => checklistItems.find(item => item.id === id))
  const totalPoints = embedMode ? (checklistData?.progress?.total_points || 0) : checklistItems.reduce((sum, item) => sum + item.points, 0)
  const earnedPoints = embedMode ? (checklistData?.progress?.earned_points || 0) : checklistItems.filter(item => completedItems.includes(item.id)).reduce((sum, item) => sum + item.points, 0)
  const progressPercentage = embedMode ? (checklistData?.progress?.completion_percentage || 0) : (earnedPoints / totalPoints) * 100
  
  // Count completed items
  const requiredItems = items.filter(item => item.required)
  const completedRequired = embedMode ? items.filter(item => item.completed && item.required).length : requiredItems.filter(item => completedItems.includes(item.id)).length
  const totalRequired = requiredItems.length
  
  // Check for 100% completion
  useEffect(() => {
    if (progressPercentage === 100 && !showCelebration) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 5000)
      if (onComplete) {
        onComplete()
      }
    }
  }, [progressPercentage])
  
  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized)
    if (onToggleMinimize) {
      onToggleMinimize(!isMinimized)
    }
  }
  
  const getAchievementLevel = () => {
    if (progressPercentage >= 100) return { level: 'Expert', color: 'purple', icon: '👑' }
    if (progressPercentage >= 75) return { level: 'Advanced', color: 'blue', icon: '🌟' }
    if (progressPercentage >= 50) return { level: 'Intermediate', color: 'green', icon: '🚀' }
    if (progressPercentage >= 25) return { level: 'Beginner', color: 'yellow', icon: '📈' }
    return { level: 'Newcomer', color: 'gray', icon: '🌱' }
  }
  
  const achievement = getAchievementLevel()
  
  // Handle item click - update completion status and navigate
  const handleItemClick = async (item) => {
    const isCompleted = embedMode ? item.completed : completedItems.includes(item.id)
    
    if (isCompleted) return // Don't do anything if already completed
    
    // In embed mode, show instructions and try to communicate with parent
    if (embedMode) {
      if (window.parent !== window) {
        // Try to notify parent window to handle navigation
        window.parent.postMessage({
          type: 'onboarding-checklist-navigate',
          link: item.link,
          item: item
        }, '*')
      } else {
        // Fallback: show alert
        alert(`Complete this step: ${item.description}${item.link ? `\nGo to: ${item.link}` : ''}`)
      }
      return
    }
    
    // Handle navigation and completion tracking for dashboard mode
    if (onItemClick) {
      onItemClick(item)
      
      // Also try to mark as completed via API call if we can track completion
      try {
        const response = await fetch('/api/onboarding/checklist/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_id: item.id,
            completed: true,
            points: item.points
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && onProgress) {
            onProgress(result.data.completion_percentage)
          }
        }
      } catch (error) {
        console.error('Failed to update completion status:', error)
        // Navigation still works even if API fails
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${
          theme === 'dark' ? 'border-white' : 'border-blue-600'
        }`}></div>
      </div>
    )
  }

  const containerClass = embedMode 
    ? `w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}` 
    : 'fixed bottom-4 right-4 z-40 max-w-sm'

  const cardClass = embedMode
    ? `${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`
    : 'bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden'

  return (
    <div className={containerClass}>
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-bounce text-6xl text-center">🎉</div>
        </div>
      )}
      
      {/* Main Container */}
      <div className={cardClass}>
        {/* Header */}
        <div 
          className={`px-4 py-3 ${embedMode ? (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100') : 'bg-gradient-to-r from-olive-500 to-olive-600'} ${
            embedMode ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : 'text-white'
          } ${embedMode ? '' : 'cursor-pointer'}`}
          onClick={embedMode ? undefined : handleToggleMinimize}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2" />
              <h3 className="font-semibold">Setup Progress</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {Math.round(progressPercentage)}%
              </span>
              {!embedMode && (
                <button className="p-1 hover:bg-white/20 rounded">
                  {isMinimized ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className={`mt-2 rounded-full h-2 overflow-hidden ${
            embedMode ? (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300') : 'bg-olive-400'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                embedMode ? 'bg-blue-500' : 'bg-white'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Content */}
        {(embedMode || !isMinimized) && (
          <div className="p-4">
            {/* Achievement Badge */}
            <div className={`mb-4 p-3 bg-${achievement.color}-50 border border-${achievement.color}-200 rounded-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{achievement.icon}</span>
                  <div>
                    <p className={`font-medium text-${achievement.color}-900`}>
                      {achievement.level} Level
                    </p>
                    <p className={`text-xs text-${achievement.color}-700`}>
                      {earnedPoints} / {totalPoints} points earned
                    </p>
                  </div>
                </div>
                {progressPercentage === 100 && (
                  <TrophyIcon className="w-6 h-6 text-amber-800" />
                )}
              </div>
            </div>
            
            {/* Required Items Notice */}
            {completedRequired < totalRequired && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                <p className="text-amber-800">
                  Complete {totalRequired - completedRequired} required {totalRequired - completedRequired === 1 ? 'item' : 'items'} to go live
                </p>
              </div>
            )}
            
            {/* Checklist Items */}
            <div className={`space-y-2 overflow-y-auto ${compact ? 'max-h-60' : 'max-h-80'}`}>
              {items.map((item) => {
                const isCompleted = embedMode ? item.completed : completedItems.includes(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => !isCompleted && handleItemClick(item)}
                    className={`${compact ? 'p-2' : 'p-3'} rounded-lg border transition-all ${
                      isCompleted
                        ? `${theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`
                        : `${theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-olive-300'} cursor-pointer`
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircleIconSolid className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            isCompleted ? 'text-green-900 line-through' : 'text-gray-900'
                          }`}>
                            {item.title}
                            {item.required && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </h4>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            isCompleted 
                              ? 'bg-moss-100 text-moss-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            +{item.points} pts
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${
                          isCompleted ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {item.description}
                        </p>
                        {item.milestone && !isCompleted && (
                          <span className="inline-flex items-center mt-1 text-xs text-olive-600">
                            <TrophyIcon className="w-3 h-3 mr-1" />
                            Milestone
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Footer Actions */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Hide checklist for this session
                    if (onToggleMinimize) {
                      onToggleMinimize(true)
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide for now
                </button>
                {progressPercentage === 100 ? (
                  <span className="text-xs font-medium text-green-600">
                    ✨ Setup Complete!
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {checklistItems.length - completedItems.length} items remaining
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}