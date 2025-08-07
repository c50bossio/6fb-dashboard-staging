'use client'

import { SparklesIcon, UsersIcon, CheckBadgeIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function AgentCollaborationIndicator({ collaborationData, isVisible = true }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (isVisible && collaborationData) {
      // Animate in with slight delay
      const timer = setTimeout(() => setAnimateIn(true), 100)
      return () => clearTimeout(timer)
    }
  }, [isVisible, collaborationData])

  if (!isVisible || !collaborationData) return null

  const {
    primary_agent,
    collaborative_responses = [],
    coordination_summary,
    collaboration_score = 0,
    total_confidence = 0,
    combined_recommendations = []
  } = collaborationData

  const totalAgents = 1 + collaborative_responses.length
  const isMultiAgent = totalAgents > 1

  return (
    <div className={`
      transition-all duration-500 ease-out
      ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
    `}>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 mb-4">
        {/* Collaboration Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isMultiAgent ? (
              <UsersIcon className="h-5 w-5 text-purple-600" />
            ) : (
              <SparklesIcon className="h-5 w-5 text-blue-600" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {isMultiAgent ? 'Multi-Agent Collaboration' : 'AI Agent Response'}
              </h3>
              <p className="text-xs text-gray-600">
                {totalAgents} agent{totalAgents > 1 ? 's' : ''} • {total_confidence > 0 ? (total_confidence * 100).toFixed(0) : 0}% confidence
              </p>
            </div>
          </div>
          
          {/* Collaboration Score */}
          <div className="flex items-center space-x-2">
            {collaboration_score > 0.8 && (
              <CheckBadgeIcon className="h-4 w-4 text-green-500" />
            )}
            <div className="text-right">
              <div className="text-xs font-medium text-gray-700">
                Quality Score
              </div>
              <div className={`text-sm font-bold ${
                collaboration_score > 0.8 ? 'text-green-600' : 
                collaboration_score > 0.6 ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {collaboration_score > 0 ? (collaboration_score * 100).toFixed(0) : 'N/A'}%
              </div>
            </div>
          </div>
        </div>

        {/* Primary Agent */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">Primary: {primary_agent}</span>
          </div>
        </div>

        {/* Collaborative Agents */}
        {collaborative_responses.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Collaborating Agents:</div>
            <div className="space-y-1">
              {collaborative_responses.map((response, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm text-purple-800">
                    {response.agent_id?.replace('_', ' ')?.replace(/\w\S*/g, (txt) => 
                      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                    ) || `Agent ${index + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({response.domain?.replace('_', ' ') || 'general'})
                  </span>
                  {response.confidence && (
                    <span className="text-xs text-gray-600">
                      {(response.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coordination Summary */}
        {coordination_summary && (
          <div className="mb-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span>Coordination Summary</span>
              <ClockIcon className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
              <div className="mt-2 p-3 bg-white/60 rounded-lg text-sm text-gray-700 leading-relaxed">
                {coordination_summary}
              </div>
            )}
          </div>
        )}

        {/* Combined Recommendations Preview */}
        {combined_recommendations.length > 0 && (
          <div className="border-t border-purple-100 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Key Recommendations ({combined_recommendations.length}):
            </div>
            <div className="space-y-1">
              {combined_recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span className="text-xs text-gray-700 leading-tight">{rec}</span>
                </div>
              ))}
              {combined_recommendations.length > 3 && (
                <div className="text-xs text-gray-500 ml-4">
                  +{combined_recommendations.length - 3} more recommendations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-100">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">
              {isMultiAgent ? 'Multi-agent analysis complete' : 'AI analysis complete'}
            </span>
          </div>
          
          {isMultiAgent && (
            <div className="text-xs text-purple-600 font-medium">
              Collaborative Response
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function CompactCollaborationIndicator({ collaborationData, className = '' }) {
  if (!collaborationData) return null

  const {
    primary_agent,
    collaborative_responses = [],
    collaboration_score = 0,
    total_confidence = 0
  } = collaborationData

  const totalAgents = 1 + collaborative_responses.length
  const isMultiAgent = totalAgents > 1

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isMultiAgent ? (
        <UsersIcon className="h-4 w-4 text-purple-500" />
      ) : (
        <SparklesIcon className="h-4 w-4 text-blue-500" />
      )}
      
      <div className="text-xs">
        <span className="font-medium text-gray-700">
          {totalAgents} agent{totalAgents > 1 ? 's' : ''}
        </span>
        {collaboration_score > 0 && (
          <span className="text-gray-500 ml-1">
            • {(collaboration_score * 100).toFixed(0)}% quality
          </span>
        )}
      </div>
      
      {collaboration_score > 0.8 && (
        <CheckBadgeIcon className="h-3 w-3 text-green-500" />
      )}
    </div>
  )
}