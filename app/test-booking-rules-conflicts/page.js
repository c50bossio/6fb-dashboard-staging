'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import RuleConflictWarning from '@/components/booking/RuleConflictWarning'
import { validateRulesWithRealData } from '@/lib/booking-rules-engine/RealDataRuleValidator'
import { RuleValidator } from '@/lib/booking-rules-engine/RuleValidator'

/**
 * Test page to verify Apply Fix button functionality with policy conflicts
 */
export default function TestBookingRulesConflictsPage() {
  const [rules, setRules] = useState({
    // Create conflicting rules to trigger warnings
    cancellationWindow: 48, // hours
    minAdvanceBooking: 60, // minutes (1 hour) - This creates a conflict!
    reminderTiming: 72, // hours - Send reminder after cancellation deadline
    noShowFee: 150, // Excessive fee
    noShowFeeType: 'fixed',
    maxBookingsPerDay: 8,
    maxBookingsPerWeek: 30, // Inconsistent with daily limit (8 * 7 = 56)
    requireDeposit: true,
    acceptOnlinePayments: false, // Conflict: deposit without payment processing
  })

  const [validationResults, setValidationResults] = useState({
    conflicts: [],
    warnings: [],
    hasConflicts: false,
    hasWarnings: false
  })
  
  const [realDataResults, setRealDataResults] = useState(null)
  const [isLoadingRealData, setIsLoadingRealData] = useState(false)
  const [useRealData, setUseRealData] = useState(false)

  const [validator] = useState(() => new RuleValidator())

  // Test services for context
  const testServices = [
    { name: 'Haircut', duration: 30, price: 35 },
    { name: 'Beard Trim', duration: 15, price: 20 },
    { name: 'Hair Wash & Style', duration: 45, price: 50 },
    { name: 'Color Treatment', duration: 90, price: 80 }
  ]

  // Validate rules on mount and when rules change
  useEffect(() => {
    if (useRealData) {
      validateWithRealData()
    } else {
      const results = validator.detectRuleConflicts(rules, testServices, 45)
      setValidationResults(results)
      
    }
  }, [rules, validator, useRealData])

  // Validate using real data
  const validateWithRealData = async () => {
    try {
      setIsLoadingRealData(true)

      const results = await validateRulesWithRealData(rules, {
        includeHistoricalAnalysis: true,
        includeConflictDetection: true,
        includePredictiveAnalysis: true,
        monthsBack: 6
      })

      setRealDataResults(results)
      
      // Update the main validation results with real data conflicts
      if (results.conflictAnalysis) {
        setValidationResults({
          conflicts: [...(results.conflicts || []), ...(results.conflictAnalysis.realDataConflicts || [])],
          warnings: results.warnings || [],
          hasConflicts: (results.conflicts?.length || 0) + (results.conflictAnalysis?.realDataConflicts?.length || 0) > 0,
          hasWarnings: (results.warnings?.length || 0) > 0
        })
      }
      
    } catch (error) {
      console.error('Error validating with real data:', error)
      setRealDataResults({ error: error.message })
    } finally {
      setIsLoadingRealData(false)
    }
  }

  // Handle Apply Fix button
  const handleFixConflict = (conflict) => {

    try {
      // Use RuleValidator.applyFix method
      const fixedRules = RuleValidator.applyFix(rules, conflict, testServices)
      
      if (fixedRules && Object.keys(fixedRules).length > 0) {
        
        setRules(prevRules => ({
          ...prevRules,
          ...fixedRules
        }))
        
        // Success feedback
        alert(`Applied fix for "${conflict.title}"`)
      } else {
        console.warn('No fix could be applied automatically')
        alert('This conflict requires manual adjustment')
      }
    } catch (error) {
      console.error('Error applying fix:', error)
      alert('Error applying fix: ' + error.message)
    }
  }

  const handleDismiss = (item) => {
    
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Test Booking Rules Conflicts & Apply Fix
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Testing Apply Fix button functionality with intentionally conflicting rules
          </p>
        </div>

        {/* Current Rules Display */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Rules (Intentionally Conflicting)</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Cancellation Window:</strong> {rules.cancellationWindow} hours
            </div>
            <div>
              <strong>Min Advance Booking:</strong> {rules.minAdvanceBooking} minutes
            </div>
            <div>
              <strong>Reminder Timing:</strong> {rules.reminderTiming} hours
            </div>
            <div>
              <strong>No-Show Fee:</strong> ${rules.noShowFee}
            </div>
            <div>
              <strong>Max Bookings/Day:</strong> {rules.maxBookingsPerDay}
            </div>
            <div>
              <strong>Max Bookings/Week:</strong> {rules.maxBookingsPerWeek}
            </div>
            <div>
              <strong>Require Deposit:</strong> {rules.requireDeposit ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Accept Online Payments:</strong> {rules.acceptOnlinePayments ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Conflict Warnings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Policy Conflicts & Warnings</h2>
            
            {/* Real Data Toggle */}
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRealData}
                  onChange={(e) => setUseRealData(e.target.checked)}
                  className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                />
                <span className="text-sm text-gray-700 font-medium">
                  Use Real Shop Data
                </span>
              </label>
              
              {isLoadingRealData && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-olive-600"></div>
                  <span className="text-xs text-gray-500">Loading real data...</span>
                </div>
              )}
            </div>
          </div>
          
          <RuleConflictWarning
            conflicts={validationResults.conflicts}
            warnings={validationResults.warnings}
            onFixConflict={handleFixConflict}
            onDismiss={handleDismiss}
            className="transition-all duration-300"
          />

          {/* Real Data Insights */}
          {realDataResults && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Real Data Analysis</h3>
              
              {realDataResults.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium">Error loading real data:</div>
                  <div className="text-red-600 text-sm mt-1">{realDataResults.error}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Data Quality */}
                  {realDataResults.dataQuality && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-900">Data Quality Assessment</h4>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          realDataResults.dataQuality.grade === 'A' ? 'bg-green-100 text-green-800' :
                          realDataResults.dataQuality.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          realDataResults.dataQuality.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Grade {realDataResults.dataQuality.grade} ({realDataResults.dataQuality.score}/100)
                        </span>
                      </div>
                      {realDataResults.dataQuality.issues.length > 0 && (
                        <ul className="text-sm text-blue-800 space-y-1">
                          {realDataResults.dataQuality.issues.map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  
                  {/* Real Data Insights */}
                  {realDataResults.realDataInsights?.insights && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">
                        Real Data Insights ({realDataResults.realDataInsights.totalInsights})
                      </h4>
                      <div className="space-y-2 text-sm">
                        {realDataResults.realDataInsights.insights.map((insight, index) => (
                          <div key={index} className={`p-2 rounded ${
                            insight.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            insight.type === 'info' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <div className="font-medium">{insight.title}</div>
                            <div className="text-xs mt-1">{insight.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Historical Impact */}
                  {realDataResults.historicalImpact && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-2">Historical Impact Analysis</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Total Appointments:</strong> {realDataResults.historicalImpact.totalAppointments}
                        </div>
                        <div>
                          <strong>Would Be Affected:</strong> {realDataResults.historicalImpact.wouldBeAffected}
                        </div>
                        <div>
                          <strong>Policy Violations:</strong> {realDataResults.historicalImpact.policyViolations}
                        </div>
                        <div>
                          <strong>Potential Revenue:</strong> ${realDataResults.historicalImpact.potentialRevenue}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Predictive Analysis */}
                  {realDataResults.predictiveAnalysis?.predictions && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-medium text-indigo-900 mb-2">
                        Predictive Analysis (Confidence: {realDataResults.predictiveAnalysis.confidence}%)
                      </h4>
                      <div className="space-y-2 text-sm text-indigo-800">
                        {realDataResults.predictiveAnalysis.predictions.noShowFeeRevenue && (
                          <div>
                            <strong>Projected No-Show Fee Revenue:</strong>
                            <div className="ml-4">
                              Monthly: ${realDataResults.predictiveAnalysis.predictions.noShowFeeRevenue.monthly} |
                              Annual: ${realDataResults.predictiveAnalysis.predictions.noShowFeeRevenue.annual}
                            </div>
                          </div>
                        )}
                        {realDataResults.predictiveAnalysis.predictions.bookingImpact && (
                          <div>
                            <strong>Expected Booking Impact:</strong>
                            <div className="ml-4">
                              {realDataResults.predictiveAnalysis.predictions.bookingImpact.expectedReduction}% reduction |
                              ${realDataResults.predictiveAnalysis.predictions.bookingImpact.revenueImpact} revenue impact
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Debug Information */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Validation Mode: {useRealData ? 'Real Shop Data' : 'Demo Data'}</div>
              <div>Total Conflicts: {validationResults.conflicts?.length || 0}</div>
              <div>Total Warnings: {validationResults.warnings?.length || 0}</div>
              <div>Has Conflicts: {validationResults.hasConflicts ? 'Yes' : 'No'}</div>
              <div>Has Warnings: {validationResults.hasWarnings ? 'Yes' : 'No'}</div>
              {realDataResults && (
                <div>Real Data Quality: {realDataResults.dataQuality?.grade || 'Unknown'}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}