'use client'

import {
  LightBulbIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

/**
 * Everboarding System
 * Progressive feature introduction and contextual guidance beyond initial onboarding
 */

export default function EverboardingSystem({ 
  user, 
  profile, 
  currentPage, 
  userBehavior = {},
  onFeatureDiscovered,
  onFeatureCompleted 
}) {
  const [activePrompt, setActivePrompt] = useState(null)
  const [dismissedPrompts, setDismissedPrompts] = useState(new Set())
  const [userProgress, setUserProgress] = useState({
    featuresDiscovered: 0,
    totalFeatures: 15,
    level: 'Beginner'
  })

  // Load user progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('everboarding_progress')
    const savedDismissed = localStorage.getItem('everboarding_dismissed')
    
    if (savedProgress) {
      try {
        setUserProgress(JSON.parse(savedProgress))
      } catch (e) {
        console.warn('Could not parse everboarding progress')
      }
    }
    
    if (savedDismissed) {
      try {
        setDismissedPrompts(new Set(JSON.parse(savedDismissed)))
      } catch (e) {
        console.warn('Could not parse dismissed prompts')
      }
    }
  }, [])

  // Save progress to localStorage
  const saveProgress = (progress) => {
    localStorage.setItem('everboarding_progress', JSON.stringify(progress))
    setUserProgress(progress)
  }

  const saveDismissedPrompts = (dismissed) => {
    localStorage.setItem('everboarding_dismissed', JSON.stringify([...dismissed]))
    setDismissedPrompts(dismissed)
  }

  // Feature discovery definitions
  const featureDiscoveryMap = {
    // Dashboard features
    '/dashboard': [
      {
        id: 'dashboard_analytics',
        title: 'Unlock Customer Analytics',
        description: 'See detailed insights about your customer patterns, peak hours, and revenue trends.',
        condition: () => userBehavior.appointmentsCount > 5,
        action: 'customers?tab=intelligence',
        actionText: 'View Analytics',
        category: 'analytics',
        difficulty: 'intermediate'
      },
      {
        id: 'ai_recommendations',
        title: 'AI Business Recommendations',
        description: 'Get personalized suggestions to grow your business based on your data.',
        condition: () => userBehavior.daysActive > 7,
        action: 'ai-insights',
        actionText: 'Get AI Insights',
        category: 'ai',
        difficulty: 'advanced'
      }
    ],

    // Customers page features
    '/dashboard/customers': [
      {
        id: 'customer_segments',
        title: 'Customer Segmentation',
        description: 'Group your customers by behavior to create targeted marketing campaigns.',
        condition: () => userBehavior.customersCount > 20,
        action: 'customers?tab=segments',
        actionText: 'Create Segments',
        category: 'marketing',
        difficulty: 'advanced'
      },
      {
        id: 'loyalty_program',
        title: 'Loyalty Program',
        description: 'Reward repeat customers with points and discounts to increase retention.',
        condition: () => userBehavior.repeatCustomers > 3,
        action: 'customers?tab=loyalty',
        actionText: 'Set Up Loyalty',
        category: 'retention',
        difficulty: 'intermediate'
      }
    ],

    // Calendar page features
    '/dashboard/calendar': [
      {
        id: 'advanced_scheduling',
        title: 'Advanced Scheduling Rules',
        description: 'Set up complex scheduling rules, buffer times, and staff availability.',
        condition: () => userBehavior.appointmentsCreated > 10,
        action: 'calendar/settings',
        actionText: 'Configure Rules',
        category: 'scheduling',
        difficulty: 'intermediate'
      },
      {
        id: 'staff_scheduling',
        title: 'Staff Schedule Management',
        description: 'Manage multiple staff schedules and assign specific services to each barber.',
        condition: () => userBehavior.staffCount > 1,
        action: 'staff/schedule',
        actionText: 'Manage Staff',
        category: 'team',
        difficulty: 'intermediate'
      }
    ],

    // Settings features
    '/dashboard/settings': [
      {
        id: 'automated_reminders',
        title: 'Automated Reminders',
        description: 'Reduce no-shows by automatically sending SMS and email reminders to customers.',
        condition: () => userBehavior.noShowRate > 10,
        action: 'settings/notifications',
        actionText: 'Enable Reminders',
        category: 'automation',
        difficulty: 'beginner'
      },
      {
        id: 'online_payments',
        title: 'Online Payments',
        description: 'Accept payments online and reduce checkout time in your shop.',
        condition: () => userBehavior.appointmentsCompleted > 5,
        action: 'settings/payments',
        actionText: 'Set Up Payments',
        category: 'payments',
        difficulty: 'intermediate'
      }
    ]
  }

  // Milestone achievements
  const milestones = [
    {
      id: 'first_booking',
      title: 'First Booking!',
      description: 'Congratulations on your first online booking!',
      condition: () => userBehavior.appointmentsCount === 1,
      reward: 'You\'re on your way to digital success!'
    },
    {
      id: 'ten_customers',
      title: 'Customer Milestone',
      description: 'Amazing! You now have 10 customers using your online booking.',
      condition: () => userBehavior.customersCount === 10,
      reward: 'Time to explore customer analytics!'
    },
    {
      id: 'month_active',
      title: 'One Month Strong',
      description: 'You\'ve been actively using the system for a month!',
      condition: () => userBehavior.daysActive === 30,
      reward: 'Advanced features are now available to you.'
    }
  ]

  // Determine which features to show based on current context
  useEffect(() => {
    const currentPageFeatures = featureDiscoveryMap[currentPage] || []
    
    // Find features that meet conditions and haven't been dismissed
    const availableFeature = currentPageFeatures.find(feature => 
      !dismissedPrompts.has(feature.id) && 
      feature.condition() &&
      !userProgress.discoveredFeatures?.includes(feature.id)
    )

    // Check for milestone achievements
    const availableMilestone = milestones.find(milestone =>
      !dismissedPrompts.has(milestone.id) &&
      milestone.condition() &&
      !userProgress.completedMilestones?.includes(milestone.id)
    )

    // Prioritize milestones over feature discoveries
    if (availableMilestone) {
      setActivePrompt({
        type: 'milestone',
        ...availableMilestone
      })
    } else if (availableFeature) {
      setActivePrompt({
        type: 'feature',
        ...availableFeature
      })
    } else {
      setActivePrompt(null)
    }
  }, [currentPage, userBehavior, dismissedPrompts, userProgress])

  // Handle feature discovery
  const handleFeatureDiscovered = (featureId) => {
    const newProgress = {
      ...userProgress,
      featuresDiscovered: userProgress.featuresDiscovered + 1,
      discoveredFeatures: [...(userProgress.discoveredFeatures || []), featureId],
      level: calculateUserLevel(userProgress.featuresDiscovered + 1)
    }
    
    saveProgress(newProgress)
    
    if (onFeatureDiscovered) {
      onFeatureDiscovered(featureId)
    }
    
    setActivePrompt(null)
  }

  // Handle milestone completion
  const handleMilestoneCompleted = (milestoneId) => {
    const newProgress = {
      ...userProgress,
      completedMilestones: [...(userProgress.completedMilestones || []), milestoneId]
    }
    
    saveProgress(newProgress)
    
    if (onFeatureCompleted) {
      onFeatureCompleted(milestoneId)
    }
    
    setActivePrompt(null)
  }

  // Dismiss prompt
  const handleDismiss = (promptId) => {
    const newDismissed = new Set(dismissedPrompts)
    newDismissed.add(promptId)
    saveDismissedPrompts(newDismissed)
    setActivePrompt(null)
  }

  // Calculate user level based on features discovered
  const calculateUserLevel = (featuresDiscovered) => {
    if (featuresDiscovered >= 12) return 'Expert'
    if (featuresDiscovered >= 8) return 'Advanced'
    if (featuresDiscovered >= 4) return 'Intermediate'
    return 'Beginner'
  }

  // Get level color
  const getLevelColor = (level) => {
    switch (level) {
      case 'Expert': return 'text-purple-700 bg-purple-100'
      case 'Advanced': return 'text-blue-700 bg-blue-100'
      case 'Intermediate': return 'text-green-700 bg-green-100'
      default: return 'text-orange-700 bg-orange-100'
    }
  }

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      analytics: 'from-blue-500 to-indigo-600',
      ai: 'from-purple-500 to-pink-600', 
      marketing: 'from-green-500 to-emerald-600',
      retention: 'from-yellow-500 to-orange-600',
      scheduling: 'from-cyan-500 to-blue-600',
      team: 'from-teal-500 to-cyan-600',
      automation: 'from-indigo-500 to-purple-600',
      payments: 'from-emerald-500 to-teal-600'
    }
    return colors[category] || 'from-gray-500 to-gray-600'
  }

  if (!activePrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {activePrompt.type === 'milestone' ? (
        // Milestone celebration
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-xl p-4 text-white animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrophyIcon className="h-6 w-6" />
              <h3 className="font-bold">{activePrompt.title}</h3>
            </div>
            <button
              onClick={() => handleMilestoneCompleted(activePrompt.id)}
              className="text-white hover:bg-white/20 rounded p-1 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-sm mb-3 opacity-90">{activePrompt.description}</p>
          
          <div className="bg-white/20 rounded p-2 mb-3">
            <p className="text-xs font-medium">🎉 {activePrompt.reward}</p>
          </div>
          
          <button
            onClick={() => handleMilestoneCompleted(activePrompt.id)}
            className="w-full bg-white text-orange-600 px-3 py-2 rounded font-medium hover:bg-gray-50 transition-colors"
          >
            Awesome!
          </button>
        </div>
      ) : (
        // Feature discovery
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(activePrompt.category)} flex items-center justify-center flex-shrink-0`}>
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{activePrompt.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(userProgress.level)}`}>
                    {activePrompt.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{activePrompt.description}</p>
              </div>
            </div>
            
            <button
              onClick={() => handleDismiss(activePrompt.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleDismiss(activePrompt.id)}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              Maybe Later
            </button>
            
            <button
              onClick={() => {
                window.location.href = `/dashboard/${activePrompt.action}`
                handleFeatureDiscovered(activePrompt.id)
              }}
              className="flex-1 bg-brand-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
            >
              {activePrompt.actionText}
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Discovery Progress</span>
              <span>{userProgress.featuresDiscovered}/{userProgress.totalFeatures}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(userProgress.featuresDiscovered / userProgress.totalFeatures) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook to track user behavior for everboarding
export function useEverboardingTracking() {
  const [userBehavior, setUserBehavior] = useState({
    appointmentsCount: 0,
    customersCount: 0,
    daysActive: 0,
    appointmentsCreated: 0,
    repeatCustomers: 0,
    staffCount: 1,
    noShowRate: 0,
    appointmentsCompleted: 0
  })

  // Load user behavior data
  useEffect(() => {
    const loadBehaviorData = async () => {
      try {
        // This would typically come from your analytics API
        const response = await fetch('/api/analytics/user-behavior')
        if (response.ok) {
          const data = await response.json()
          setUserBehavior(data)
        }
      } catch (error) {
        console.warn('Could not load user behavior data:', error)
      }
    }

    loadBehaviorData()
  }, [])

  return userBehavior
}