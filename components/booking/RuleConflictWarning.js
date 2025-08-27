'use client'

import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

function RuleConflictWarning({ 
  conflicts = [], 
  warnings = [], 
  onDismiss,
  onFixConflict,
  className = ""
}) {
  const [dismissedIds, setDismissedIds] = useState(new Set())
  const [showAll, setShowAll] = useState(false)

  // Filter out dismissed items
  const visibleConflicts = conflicts.filter(conflict => 
    !dismissedIds.has(getConflictId(conflict))
  )
  const visibleWarnings = warnings.filter(warning => 
    !dismissedIds.has(getConflictId(warning))
  )

  const totalVisible = visibleConflicts.length + visibleWarnings.length
  const displayLimit = 3

  // Generate unique ID for each conflict/warning
  function getConflictId(item) {
    return `${item.type}-${item.title}-${item.field?.join?.('-') || item.field}`
  }

  // Dismiss individual item
  const dismissItem = (item) => {
    const id = getConflictId(item)
    setDismissedIds(prev => new Set([...prev, id]))
    
    if (onDismiss) {
      onDismiss(item)
    }
  }

  // Handle fix suggestion click
  const handleFix = (item) => {
    if (onFixConflict) {
      onFixConflict(item)
    }
  }

  // Get icon for conflict type
  const getIcon = (type) => {
    switch (type) {
      case 'critical':
        return ExclamationCircleIcon
      case 'major':
        return ExclamationTriangleIcon
      case 'minor':
        return InformationCircleIcon
      default:
        return InformationCircleIcon
    }
  }

  // Get styling for conflict type
  const getStyles = (type) => {
    switch (type) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200',
          header: 'text-red-800',
          text: 'text-red-700',
          icon: 'text-red-600',
          button: 'text-red-600 hover:text-red-800 hover:bg-red-100'
        }
      case 'major':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          header: 'text-yellow-800',
          text: 'text-yellow-700',
          icon: 'text-yellow-600',
          button: 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100'
        }
      case 'minor':
        return {
          container: 'bg-blue-50 border-blue-200',
          header: 'text-blue-800',
          text: 'text-blue-700',
          icon: 'text-blue-600',
          button: 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
        }
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          header: 'text-gray-800',
          text: 'text-gray-700',
          icon: 'text-gray-600',
          button: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
    }
  }

  // Render individual conflict/warning
  const renderItem = (item) => {
    const Icon = getIcon(item.type)
    const styles = getStyles(item.type)
    const id = getConflictId(item)

    return (
      <div
        key={id}
        className={`border rounded-lg p-4 ${styles.container} transition-all duration-300`}
      >
        <div className="flex items-start space-x-3">
          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className={`font-medium text-sm ${styles.header} leading-tight`}>
                {item.title}
              </h4>
              
              <button
                onClick={() => dismissItem(item)}
                className={`ml-2 p-1 rounded-full transition-colors ${styles.button}`}
                aria-label="Dismiss"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            <p className={`text-sm mt-1 ${styles.text} leading-relaxed`}>
              {item.message}
            </p>
            
            {item.impact && (
              <div className={`text-xs mt-2 ${styles.text} opacity-75`}>
                <strong>Impact:</strong> {item.impact}
              </div>
            )}
            
            {item.suggestion && (
              <div className="mt-3 flex items-start space-x-2">
                <LightBulbIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
                <div className="flex-1">
                  <p className={`text-xs ${styles.text} font-medium`}>
                    Suggestion:
                  </p>
                  <p className={`text-xs ${styles.text} mt-1`}>
                    {item.suggestion}
                  </p>
                  
                  {onFixConflict && (
                    <button
                      onClick={() => handleFix(item)}
                      className={`text-xs font-medium mt-2 px-3 py-1 rounded-md border transition-colors ${styles.button} border-current`}
                    >
                      Apply Fix
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Don't render if no visible items
  if (totalVisible === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">
            No rule conflicts detected
          </p>
        </div>
        <p className="text-xs text-green-700 mt-1">
          Your booking rules are consistent and should work well together.
        </p>
      </div>
    )
  }

  // Determine what to show
  const itemsToShow = showAll ? 
    [...visibleConflicts, ...visibleWarnings] : 
    [...visibleConflicts, ...visibleWarnings].slice(0, displayLimit)

  const hasMore = totalVisible > displayLimit && !showAll

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {visibleConflicts.length > 0 ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          ) : (
            <InformationCircleIcon className="h-5 w-5 text-blue-600" />
          )}
          <h3 className="font-medium text-gray-900">
            {visibleConflicts.length > 0 ? 'Rule Conflicts' : 'Policy Warnings'}
          </h3>
          <span className="text-sm text-gray-500">
            ({totalVisible})
          </span>
        </div>
        
        {totalVisible > 0 && (
          <button
            onClick={() => setDismissedIds(new Set())}
            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Conflict/Warning items */}
      <div className="space-y-3">
        {itemsToShow.map(renderItem)}
      </div>

      {/* Show more/less toggle */}
      {totalVisible > displayLimit && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded hover:bg-gray-100 border border-gray-200"
          >
            {showAll ? (
              <>Show Less</>
            ) : (
              <>Show {totalVisible - displayLimit} More</>
            )}
          </button>
        </div>
      )}

      {/* Quick tips */}
      {visibleConflicts.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-800">
                Quick Tips
              </p>
              <ul className="text-xs text-gray-700 mt-1 space-y-1">
                <li>• Critical conflicts will prevent proper booking operations</li>
                <li>• Major warnings indicate potential business issues</li>
                <li>• Minor warnings are suggestions for optimization</li>
                <li>• Use the "Apply Fix" buttons for automatic corrections</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RuleConflictWarning