'use client'

/**
 * Settings Inheritance Indicator
 * 
 * Shows users where their settings are coming from in the hierarchy
 * (System → Organization → User) to eliminate confusion about why
 * certain values appear or can't be changed.
 */

import React, { useState, useEffect } from 'react'
import { 
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

export default function InheritanceIndicator({ category, level, organizationId }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inheritanceChain, setInheritanceChain] = useState([])

  useEffect(() => {
    // Build inheritance chain based on category and context
    const chain = []
    
    // System level (always present)
    chain.push({
      level: 'system',
      icon: GlobeAltIcon,
      title: 'System Defaults',
      description: 'Base settings applied to all users',
      color: 'gray',
      active: true
    })
    
    // Organization level (if applicable)
    if (organizationId && (level === 'organization' || level === 'mixed')) {
      chain.push({
        level: 'organization',
        icon: BuildingStorefrontIcon,
        title: 'Business Settings',
        description: 'Settings for your organization',
        color: 'blue',
        active: true
      })
    }
    
    // User level (always present for user settings)
    if (level === 'user' || level === 'mixed') {
      chain.push({
        level: 'user',
        icon: UserCircleIcon,
        title: 'Personal Settings',
        description: 'Your individual preferences',
        color: 'green',
        active: true
      })
    }
    
    setInheritanceChain(chain)
  }, [category, level, organizationId])

  if (inheritanceChain.length <= 1) {
    return null // No inheritance to show
  }

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">
              Settings Inheritance
            </h4>
            <p className="text-sm text-blue-700">
              These settings follow a hierarchy: {inheritanceChain.map(item => item.title).join(' → ')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-blue-700">
            <p className="mb-3">
              <strong>How inheritance works:</strong> Settings cascade from system defaults down to your personal preferences. 
              Higher levels override lower levels when configured.
            </p>
          </div>
          
          <div className="space-y-2">
            {inheritanceChain.map((item, index) => {
              const Icon = item.icon
              const isLast = index === inheritanceChain.length - 1
              
              return (
                <div key={item.level} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center mr-3
                    ${item.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
                    ${item.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                    ${item.color === 'green' ? 'bg-green-100 text-green-600' : ''}
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-blue-900">
                        {item.title}
                      </span>
                      {!isLast && (
                        <span className="ml-2 text-blue-400">→</span>
                      )}
                    </div>
                    <p className="text-xs text-blue-600">{item.description}</p>
                  </div>
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}
                  `}>
                    {item.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> {' '}
              {level === 'organization' 
                ? 'These are business-wide settings that affect all team members.'
                : level === 'user'
                ? 'These are your personal preferences and won\'t affect other users.'
                : 'Some settings apply to your business, others are personal preferences.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}