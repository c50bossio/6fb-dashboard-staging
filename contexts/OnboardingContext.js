'use client'

/**
 * OnboardingContext
 * Simplified context for managing onboarding state
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

const OnboardingContext = createContext({})

export function OnboardingProvider({ children }) {
  const [onboardingData, setOnboardingData] = useState({})
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState([])
  const [saveStatus, setSaveStatus] = useState('saved')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const updateOnboardingData = useCallback((data) => {
    setOnboardingData(prev => ({ ...prev, ...data }))
    setHasUnsavedChanges(true)
  }, [])

  const saveStep = useCallback(async (sessionType, stepId, data) => {
    setSaveStatus('saving')
    setHasUnsavedChanges(false)
    
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setOnboardingData(prev => ({
      ...prev,
      [sessionType]: {
        ...prev[sessionType],
        [stepId]: data
      }
    }))
    
    setSaveStatus('saved')
    return { success: true }
  }, [])

  const markStepComplete = useCallback((sessionType, stepId) => {
    setCompletedSteps(prev => [...prev, `${sessionType}-${stepId}`])
    return { success: true }
  }, [])

  const getSession = useCallback((sessionType) => {
    return onboardingData[sessionType] || null
  }, [onboardingData])

  const isStepCompleted = useCallback((sessionType, stepId) => {
    return completedSteps.includes(`${sessionType}-${stepId}`)
  }, [completedSteps])

  const getProgress = useCallback((sessionType) => {
    const sessionSteps = completedSteps.filter(step => step.startsWith(sessionType))
    return {
      percentage: (sessionSteps.length / 10) * 100, // Assume 10 steps per session
      completedSteps: sessionSteps,
      currentStep: currentStep
    }
  }, [completedSteps, currentStep])

  const value = {
    onboardingData,
    updateOnboardingData,
    currentStep,
    setCurrentStep,
    isLoading,
    completedSteps,
    saveStatus,
    hasUnsavedChanges,
    saveStep,
    markStepComplete,
    getSession,
    isStepCompleted,
    getProgress,
    markUnsavedChanges: () => setHasUnsavedChanges(true),
    clearSession: () => setOnboardingData({}),
    subscribeToChanges: () => ({ unsubscribe: () => {} }), // Stub for compatibility
    getOverallProgress: () => completedSteps.length * 10,
    restoreAllSessions: () => Promise.resolve(),
    sessions: onboardingData
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

export function useOnboardingSession(sessionType) {
  const context = useOnboarding()
  
  return {
    sessionData: context.getSession(sessionType),
    progress: context.getProgress(sessionType),
    saveStep: (stepId, data) => context.saveStep(sessionType, stepId, data),
    markStepComplete: (stepId) => context.markStepComplete(sessionType, stepId),
    isStepCompleted: (stepId) => context.isStepCompleted(sessionType, stepId),
    saveStatus: context.saveStatus,
    hasUnsavedChanges: context.hasUnsavedChanges
  }
}

export default OnboardingContext