'use client'

import { useState } from 'react'
import {
  CogIcon,
  ChartBarIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

// Agent icon mapping
const AGENT_ICONS = {
  'master_triage_agent': '🎯',
  'financial_coach_agent': '💼',
  'operations_manager_agent': '⚙️',
  'marketing_expert_agent': '📱',
  'customer_service_agent': '👥',
  'booking_intelligence_agent': '📅',
  'analytics_agent': '📊'
}

export default function AgentCard({
  agent,
  onEdit,
  onTest,
  onViewStats
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get agent icon
  const agentIcon = AGENT_ICONS[agent.name] || '🤖'

  // Format agent name for display
  const displayName = agent.name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Truncate instructions
  const truncatedInstructions = agent.instructions?.substring(0, 200) + '...'

  // Calculate stats
  const avgCost = agent.stats?.total_cost && agent.stats?.total_queries
    ? (agent.stats.total_cost / agent.stats.total_queries).toFixed(3)
    : '0.000'

  const avgResponseTime = agent.stats?.total_response_time && agent.stats?.total_queries
    ? (agent.stats.total_response_time / agent.stats.total_queries).toFixed(1)
    : '0.0'

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-3xl">{agentIcon}</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {displayName}
              </h3>
              {agent.handoff_description && (
                <p className="text-sm text-gray-600 mt-1">
                  {agent.handoff_description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {agent.enabled ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" title="Enabled" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" title="Disabled" />
            )}
            <button
              onClick={() => onEdit(agent)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit Agent"
            >
              <CogIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Preview */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-sm text-gray-700">
          {isExpanded ? agent.instructions : truncatedInstructions}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 font-medium"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>

      {/* Tools */}
      {agent.tools && agent.tools.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Available Tools
          </h4>
          <div className="flex flex-wrap gap-2">
            {agent.tools.map((tool, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {agent.stats?.total_queries || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Queries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              ${avgCost}
            </div>
            <div className="text-xs text-gray-500 mt-1">Avg Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {avgResponseTime}s
            </div>
            <div className="text-xs text-gray-500 mt-1">Avg Time</div>
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">Model:</span>{' '}
            <span className="font-medium text-gray-900">{agent.model || 'gpt-4-turbo-preview'}</span>
          </div>
          <div>
            <span className="text-gray-500">Temperature:</span>{' '}
            <span className="font-medium text-gray-900">{agent.temperature || 0.7}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-white flex gap-2">
        <button
          onClick={() => onTest(agent)}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <BeakerIcon className="w-4 h-4 mr-2" />
          Test Agent
        </button>
        <button
          onClick={() => onEdit(agent)}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <CogIcon className="w-4 h-4 mr-2" />
          Configure
        </button>
        <button
          onClick={() => onViewStats(agent)}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ChartBarIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
