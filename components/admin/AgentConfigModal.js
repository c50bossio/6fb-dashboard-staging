'use client'

import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CheckIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const AVAILABLE_TOOLS = [
  'get_revenue_by_date_range',
  'get_appointment_metrics',
  'get_top_services',
  'get_commission_summary',
  'get_customer_metrics',
  'get_inventory_status',
  'forecast_revenue'
]

const AVAILABLE_MODELS = [
  'gpt-4-turbo-preview',
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-opus-4',
  'claude-sonnet-3.5',
  'gemini-2.0-flash'
]

const ALL_AGENTS = [
  'financial_coach_agent',
  'operations_manager_agent',
  'marketing_expert_agent',
  'customer_service_agent',
  'booking_intelligence_agent',
  'analytics_agent',
  'master_triage_agent'
]

export default function AgentConfigModal({ agent, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    handoff_description: '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    max_tokens: 4000,
    tools: [],
    handoffs: [],
    enabled: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        instructions: agent.instructions || '',
        handoff_description: agent.handoff_description || '',
        model: agent.model || 'gpt-4-turbo-preview',
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 4000,
        tools: agent.tools || [],
        handoffs: agent.handoffs?.map(h => h.agent) || [],
        enabled: agent.enabled !== undefined ? agent.enabled : true
      })
    }
  }, [agent])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/agents/${agent.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update agent')
      }

      const data = await response.json()
      onSave(data.agent)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save agent configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToolToggle = (tool) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }))
  }

  const handleHandoffToggle = (handoffAgent) => {
    setFormData(prev => ({
      ...prev,
      handoffs: prev.handoffs.includes(handoffAgent)
        ? prev.handoffs.filter(a => a !== handoffAgent)
        : [...prev.handoffs, handoffAgent]
    }))
  }

  const displayName = formData.name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Agent: {displayName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Update agent configuration and behavior
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Agent Status
                </label>
                <p className="text-sm text-gray-500">
                  Enable or disable this agent
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`${
                  formData.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    formData.enabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {/* Handoff Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Handoff Description
                <span className="text-gray-400 ml-1">(shown to other agents)</span>
              </label>
              <input
                type="text"
                value={formData.handoff_description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  handoff_description: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief description of this agent's capabilities"
              />
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Agent Instructions
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {showPreview ? (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                    {formData.instructions}
                  </div>
                </div>
              ) : (
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    instructions: e.target.value
                  }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="Enter detailed agent instructions..."
                />
              )}
              <p className="text-sm text-gray-500 mt-1">
                {formData.instructions.length} characters
              </p>
            </div>

            {/* Model Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    model: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {AVAILABLE_MODELS.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature ({formData.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="500"
                  max="8000"
                  step="500"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    max_tokens: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tool Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Available Tools
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_TOOLS.map(tool => (
                  <label
                    key={tool}
                    className="relative flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={formData.tools.includes(tool)}
                        onChange={() => handleToolToggle(tool)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">
                        {tool}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Handoff Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Handoff Targets
                <span className="text-gray-400 ml-1">(agents this can hand off to)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ALL_AGENTS.filter(a => a !== agent.name).map(handoffAgent => (
                  <label
                    key={handoffAgent}
                    className="relative flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={formData.handoffs.includes(handoffAgent)}
                        onChange={() => handleHandoffToggle(handoffAgent)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">
                        {handoffAgent.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Changes take effect immediately
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
