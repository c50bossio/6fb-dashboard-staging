'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  SparklesIcon,
  TrophyIcon,
  LightBulbIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import smartSuggestions from '../../services/SmartSuggestionsAPI'

const ContextualGuidanceContext = createContext({})

export function useContextualGuidance() {
  return useContext(ContextualGuidanceContext)
}

/**
 * ContextualGuidanceProvider
 * Provides real-time validation guidance, progress tracking, and completion assistance
 */
export default function ContextualGuidanceProvider({ children }) {
  const [guidanceState, setGuidanceState] = useState({
    currentStep: '',
    formData: {},
    validationGuidance: {},
    progressCelebrations: [],
    completionHints: [],
    errorPrevention: {},
    userProgress: {
      completedFields: 0,
      totalFields: 0,
      completedSteps: 0,
      totalSteps: 0,
      overallProgress: 0
    }
  })

  const [activeGuidance, setActiveGuidance] = useState(null)
  const [celebrationQueue, setCelebrationQueue] = useState([])
  const [isProcessingGuidance, setIsProcessingGuidance] = useState(false)

  /**
   * Update guidance based on current form state
   */
  const updateGuidance = useCallback(async (stepId, formData, options = {}) => {
    if (isProcessingGuidance) return
    
    setIsProcessingGuidance(true)
    
    try {
      // Get step-specific suggestions and validation guidance
      const stepSuggestions = await smartSuggestions.getStepSuggestions(
        stepId, 
        formData, 
        options.userProfile
      )

      // Analyze form completeness and quality
      const progressAnalysis = analyzeProgress(stepId, formData)
      const validationResults = analyzeValidation(formData, stepSuggestions)
      const completionHints = generateCompletionHints(stepId, formData, progressAnalysis)
      
      // Update guidance state
      setGuidanceState(prev => ({
        ...prev,
        currentStep: stepId,
        formData: { ...prev.formData, ...formData },
        validationGuidance: validationResults,
        completionHints,
        userProgress: progressAnalysis,
        lastUpdated: Date.now()
      }))

      // Check for celebration opportunities
      checkForCelebrations(progressAnalysis, prev => prev.userProgress)

    } catch (error) {
      console.warn('Failed to update contextual guidance:', error)
    } finally {
      setIsProcessingGuidance(false)
    }
  }, [isProcessingGuidance])

  /**
   * Analyze user progress for celebrations and encouragement
   */
  const analyzeProgress = (stepId, formData) => {
    const completedFields = Object.values(formData).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length
    const totalFields = Object.keys(formData).length

    return {
      stepId,
      completedFields,
      totalFields,
      fieldCompletionRate: totalFields > 0 ? completedFields / totalFields : 0,
      overallProgress: calculateOverallProgress(stepId, completedFields, totalFields),
      qualityScore: calculateQualityScore(formData),
      momentum: calculateMomentum(formData)
    }
  }

  /**
   * Analyze validation results and provide intelligent guidance
   */
  const analyzeValidation = (formData, stepSuggestions) => {
    const validationGuidance = {}
    
    if (stepSuggestions?.suggestions?.validation) {
      Object.entries(stepSuggestions.suggestions.validation).forEach(([fieldName, guidance]) => {
        validationGuidance[fieldName] = {
          ...guidance,
          preventiveHint: generatePreventiveHint(fieldName, formData[fieldName]),
          improvementSuggestion: generateImprovementSuggestion(fieldName, formData[fieldName])
        }
      })
    }

    return validationGuidance
  }

  /**
   * Generate completion hints and next-step preparation
   */
  const generateCompletionHints = (stepId, formData, progressAnalysis) => {
    const hints = []

    // Progress-based hints
    if (progressAnalysis.fieldCompletionRate > 0.8) {
      hints.push({
        type: 'completion',
        title: 'Almost Done!',
        message: `You're ${Math.round(progressAnalysis.fieldCompletionRate * 100)}% complete with this section.`,
        icon: CheckCircleIcon,
        priority: 'high'
      })
    }

    // Quality improvement hints
    if (progressAnalysis.qualityScore < 0.7) {
      hints.push({
        type: 'quality',
        title: 'Boost Your Setup',
        message: 'Adding a few more details will help customers find and trust your business.',
        icon: LightBulbIcon,
        priority: 'medium',
        actionSuggestion: 'Consider adding your business description and website'
      })
    }

    // Momentum encouragement
    if (progressAnalysis.momentum > 0.5) {
      hints.push({
        type: 'momentum',
        title: 'Great Progress!',
        message: 'You\'re moving through setup quickly. Keep up the momentum!',
        icon: SparklesIcon,
        priority: 'low'
      })
    }

    return hints.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Check for celebration opportunities
   */
  const checkForCelebrations = (currentProgress, getPreviousProgress) => {
    const previousProgress = getPreviousProgress(guidanceState)
    
    // First field completed
    if (currentProgress.completedFields === 1 && previousProgress.completedFields === 0) {
      triggerCelebration({
        type: 'first_field',
        title: 'Great Start!',
        message: 'You\'re on your way to setting up your business.',
        icon: CheckCircleIcon,
        duration: 3000
      })
    }

    // Step completion milestones
    const completionMilestones = [0.25, 0.5, 0.75]
    completionMilestones.forEach(milestone => {
      if (currentProgress.fieldCompletionRate >= milestone && 
          previousProgress.fieldCompletionRate < milestone) {
        triggerCelebration({
          type: 'milestone',
          title: `${Math.round(milestone * 100)}% Complete!`,
          message: 'You\'re making excellent progress.',
          icon: TrophyIcon,
          duration: 2500
        })
      }
    })

    // Quality achievements
    if (currentProgress.qualityScore >= 0.9 && previousProgress.qualityScore < 0.9) {
      triggerCelebration({
        type: 'quality',
        title: 'Excellent Quality!',
        message: 'Your setup looks professional and complete.',
        icon: SparklesIcon,
        duration: 3000
      })
    }
  }

  /**
   * Trigger a celebration animation/notification
   */
  const triggerCelebration = (celebration) => {
    setCelebrationQueue(prev => [...prev, { 
      ...celebration, 
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    }])
  }

  /**
   * Dismiss active celebration
   */
  const dismissCelebration = (celebrationId) => {
    setCelebrationQueue(prev => prev.filter(c => c.id !== celebrationId))
  }

  /**
   * Show specific guidance prompt
   */
  const showGuidance = (guidance) => {
    setActiveGuidance({ ...guidance, id: Date.now() })
  }

  /**
   * Dismiss active guidance
   */
  const dismissGuidance = () => {
    setActiveGuidance(null)
  }

  /**
   * Get field-specific guidance
   */
  const getFieldGuidance = (fieldName) => {
    return guidanceState.validationGuidance[fieldName] || null
  }

  /**
   * Get completion hints for current step
   */
  const getCompletionHints = () => {
    return guidanceState.completionHints || []
  }

  /**
   * Get progress information
   */
  const getProgress = () => {
    return guidanceState.userProgress
  }

  const contextValue = {
    // State
    guidanceState,
    activeGuidance,
    celebrationQueue,
    
    // Actions
    updateGuidance,
    showGuidance,
    dismissGuidance,
    triggerCelebration,
    dismissCelebration,
    
    // Getters
    getFieldGuidance,
    getCompletionHints,
    getProgress,
    
    // Status
    isProcessingGuidance
  }

  return (
    <ContextualGuidanceContext.Provider value={contextValue}>
      {children}
      
      {/* Active Guidance Modal */}
      {activeGuidance && (
        <GuidanceModal
          guidance={activeGuidance}
          onDismiss={dismissGuidance}
        />
      )}
      
      {/* Celebration Notifications */}
      <CelebrationNotifications 
        celebrations={celebrationQueue}
        onDismiss={dismissCelebration}
      />
    </ContextualGuidanceContext.Provider>
  )
}

/**
 * Helper functions
 */
function calculateOverallProgress(stepId, completedFields, totalFields) {
  // This would integrate with actual step progress in real implementation
  const stepProgress = totalFields > 0 ? completedFields / totalFields : 0
  return Math.min(stepProgress * 100, 100)
}

function calculateQualityScore(formData) {
  let score = 0
  let maxScore = 0
  
  Object.entries(formData).forEach(([key, value]) => {
    maxScore += 1
    
    if (value && value !== '') {
      score += 0.5 // Base score for having a value
      
      // Bonus points for quality indicators
      if (typeof value === 'string') {
        if (value.length > 10) score += 0.2 // Detailed input
        if (value.includes('@') && key.includes('email')) score += 0.3 // Valid email format
        if (value.startsWith('http') && key.includes('website')) score += 0.3 // Website URL
      }
      
      score = Math.min(score, 1) // Cap at 1 per field
    }
  })
  
  return maxScore > 0 ? score / maxScore : 0
}

function calculateMomentum(formData) {
  // Simple momentum calculation based on recent activity
  // In real implementation, this would track field completion timing
  const completedCount = Object.values(formData).filter(v => v && v !== '').length
  return Math.min(completedCount / 5, 1) // Normalize to 0-1 range
}

function generatePreventiveHint(fieldName, value) {
  if (!value) return null
  
  const hints = {
    businessName: 'Keep it simple and memorable - avoid special characters that might confuse customers.',
    businessEmail: 'Use a professional email address that customers can easily remember.',
    businessPhone: 'Include your area code to help local customers reach you.',
    businessWebsite: 'Make sure your website is mobile-friendly since most customers browse on their phones.'
  }
  
  return hints[fieldName] || null
}

function generateImprovementSuggestion(fieldName, value) {
  if (!value) return `Consider adding your ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()} to help customers connect with your business.`
  
  const suggestions = {
    businessDescription: value.length < 50 ? 'A longer description helps customers understand what makes your business special.' : null,
    businessName: value.length < 3 ? 'Business names work best when they\'re at least 3 characters long.' : null
  }
  
  return suggestions[fieldName] || null
}

/**
 * Guidance Modal Component
 */
function GuidanceModal({ guidance, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, guidance.duration || 5000)
    
    return () => clearTimeout(timer)
  }, [guidance, onDismiss])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <guidance.icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {guidance.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {guidance.message}
            </p>
            {guidance.actionSuggestion && (
              <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                💡 {guidance.actionSuggestion}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Celebration Notifications Component
 */
function CelebrationNotifications({ celebrations, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {celebrations.map((celebration) => (
        <CelebrationCard
          key={celebration.id}
          celebration={celebration}
          onDismiss={() => onDismiss(celebration.id)}
        />
      ))}
    </div>
  )
}

function CelebrationCard({ celebration, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, celebration.duration || 3000)
    
    return () => clearTimeout(timer)
  }, [celebration, onDismiss])

  const getBgColor = (type) => {
    switch (type) {
      case 'milestone': return 'from-yellow-500 to-amber-600'
      case 'quality': return 'from-purple-500 to-pink-600'
      case 'first_field': return 'from-green-500 to-emerald-600'
      default: return 'from-blue-500 to-indigo-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-80 animate-in slide-in-from-right-2 duration-500">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${getBgColor(celebration.type)} rounded-full flex items-center justify-center`}>
          <celebration.icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{celebration.title}</h4>
          <p className="text-sm text-gray-600">{celebration.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/**
 * Field Guidance Component - Use this around form fields
 */
export function FieldGuidance({ fieldName, children, showHints = true }) {
  const { getFieldGuidance } = useContextualGuidance()
  const guidance = getFieldGuidance(fieldName)
  
  return (
    <div className="relative">
      {children}
      
      {guidance && showHints && (
        <div className="mt-2">
          {guidance.hasIssues && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                {guidance.issues?.map((issue, index) => (
                  <div key={index}>{issue}</div>
                ))}
              </div>
            </div>
          )}
          
          {guidance.preventiveHint && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg mt-1">
              <LightBulbIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">{guidance.preventiveHint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Progress Indicator Component
 */
export function ProgressIndicator() {
  const { getProgress } = useContextualGuidance()
  const progress = getProgress()
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Setup Progress</span>
        <span className="text-sm text-gray-500">{Math.round(progress.overallProgress)}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress.overallProgress}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{progress.completedFields} of {progress.totalFields} fields</span>
        {progress.qualityScore > 0.8 && (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircleIcon className="h-3 w-3" />
            High quality
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Completion Hints Component
 */
export function CompletionHints() {
  const { getCompletionHints } = useContextualGuidance()
  const hints = getCompletionHints()
  
  if (hints.length === 0) return null
  
  return (
    <div className="space-y-2">
      {hints.slice(0, 2).map((hint, index) => (
        <div 
          key={index}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3"
        >
          <div className="flex items-start gap-2">
            <hint.icon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-900">{hint.title}</h4>
              <p className="text-xs text-green-700">{hint.message}</p>
              {hint.actionSuggestion && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  → {hint.actionSuggestion}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}