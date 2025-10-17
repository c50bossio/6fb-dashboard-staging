'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export const AI_MODELS = {
  'gpt-5': {
    name: 'GPT-5',
    provider: 'openai',
    description: 'Most capable - Best for complex reasoning',
    recommended: true,
    badge: 'NEW',
    cost: 'Premium'
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Faster & cheaper - Good balance',
    cost: 'Standard'
  },
  'gpt-5-nano': {
    name: 'GPT-5 Nano', 
    provider: 'openai',
    description: 'Lightweight - Quick responses',
    cost: 'Budget'
  },
  'claude-opus-4-1-20250805': {
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    description: 'Best for coding & analysis',
    badge: 'UPDATED',
    cost: 'Premium'
  },
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Cost-effective & fast',
    cost: 'Budget'
  }
}

export default function ModelSelector({ selectedModel, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentModel = AI_MODELS[selectedModel] || AI_MODELS['gpt-5']
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="font-medium text-sm">{currentModel.name}</span>
          {currentModel.badge && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-olive-100 text-olive-800 dark:bg-olive-900 dark:text-olive-200 rounded">
              {currentModel.badge}
            </span>
          )}
          {currentModel.recommended && (
            <span className="px-1.5 py-0.5 text-xs font-semibold bg-moss-100 text-moss-900 dark:bg-green-900 dark:text-green-200 rounded">
              RECOMMENDED
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1.5 uppercase tracking-wider">
              Select AI Model
            </div>
            
            {Object.entries(AI_MODELS).map(([key, model]) => (
              <button
                key={key}
                onClick={() => {
                  onModelChange(key)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedModel === key ? 'bg-olive-50 dark:bg-olive-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{model.name}</span>
                      {model.badge && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-olive-100 text-olive-800 dark:bg-olive-900 dark:text-olive-200 rounded">
                          {model.badge}
                        </span>
                      )}
                      {model.recommended && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold bg-moss-100 text-moss-900 dark:bg-green-900 dark:text-green-200 rounded">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.description}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Provider: {model.provider}
                      </span>
                      <span className={`text-xs font-medium ${
                        model.cost === 'Premium' ? 'text-orange-600 dark:text-orange-400' :
                        model.cost === 'Standard' ? 'text-olive-600 dark:text-olive-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {model.cost}
                      </span>
                    </div>
                  </div>
                  {selectedModel === key && (
                    <div className="ml-2 mt-1">
                      <svg className="w-5 h-5 text-olive-600 dark:text-olive-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 px-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="font-semibold mb-1">Model Tips:</div>
                <ul className="space-y-1">
                  <li>• <strong>GPT-5</strong>: Default choice for most tasks</li>
                  <li>• <strong>Claude Opus 4.1</strong>: Best for code & technical analysis</li>
                  <li>• <strong>GPT-5 Mini/Nano</strong>: Faster responses, lower cost</li>
                  <li>• <strong>Gemini 2.0</strong>: Most cost-effective option</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}