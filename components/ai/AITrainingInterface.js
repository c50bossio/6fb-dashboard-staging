'use client'

import { 
  AcademicCapIcon,
  SparklesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function AITrainingInterface() {
  const [selectedAgent, setSelectedAgent] = useState('marcus')
  const [trainingMode, setTrainingMode] = useState('prompts')

  const agents = [
    {
      id: 'marcus',
      name: 'Marcus',
      role: 'Master Coach',
      color: 'blue',
      specialty: 'Business strategy and coaching',
      confidence: 94,
      status: 'active'
    },
    {
      id: 'sophia',
      name: 'Sophia',
      role: 'Marketing Expert',
      color: 'purple',
      specialty: 'Marketing and customer acquisition',
      confidence: 91,
      status: 'active'
    },
    {
      id: 'david',
      name: 'David',
      role: 'Operations Manager',
      color: 'green',
      specialty: 'Operations and efficiency',
      confidence: 88,
      status: 'training'
    }
  ]

  const trainingModules = [
    {
      id: 'prompts',
      name: 'Prompt Engineering',
      icon: Cog6ToothIcon,
      description: 'Customize AI responses and behavior patterns',
      status: 'available'
    },
    {
      id: 'knowledge',
      name: 'Knowledge Base',
      icon: AcademicCapIcon,
      description: 'Add business-specific knowledge and expertise',
      status: 'available'
    },
    {
      id: 'performance',
      name: 'Performance Tuning',
      icon: ChartBarIcon,
      description: 'Optimize response accuracy and speed',
      status: 'beta'
    },
    {
      id: 'custom',
      name: 'Custom Training',
      icon: SparklesIcon,
      description: 'Advanced AI model customization',
      status: 'coming-soon'
    }
  ]

  const currentAgent = agents.find(agent => agent.id === selectedAgent)

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select AI Agent to Train</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                selectedAgent === agent.id
                  ? `border-${agent.color}-500 bg-${agent.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className={`h-8 w-8 bg-${agent.color}-100 rounded-full flex items-center justify-center`}>
                  <SparklesIcon className={`h-5 w-5 text-${agent.color}-600`} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <p className="text-xs text-gray-600">{agent.role}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{agent.specialty}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Confidence: {agent.confidence}%</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  agent.status === 'active' ? 'bg-moss-100 text-moss-900' :
                  agent.status === 'training' ? 'bg-amber-100 text-amber-900' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Training Modules */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Training Modules for {currentAgent?.name}</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${currentAgent?.color}-100 text-${currentAgent?.color}-800`}>
            {currentAgent?.role}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {trainingModules.map((module) => (
            <button
              key={module.id}
              onClick={() => setTrainingMode(module.id)}
              disabled={module.status === 'coming-soon'}
              className={`p-4 rounded-lg border transition-colors text-left ${
                trainingMode === module.id
                  ? 'border-olive-500 bg-olive-50'
                  : module.status === 'coming-soon'
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <module.icon className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">{module.name}</h4>
                {module.status === 'beta' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    Beta
                  </span>
                )}
                {module.status === 'coming-soon' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Soon
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{module.description}</p>
            </button>
          ))}
        </div>

        {/* Training Content Area */}
        <div className="border-t border-gray-200 pt-6">
          {trainingMode === 'prompts' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Custom Prompts for {currentAgent?.name}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                    placeholder={`You are ${currentAgent?.name}, a ${currentAgent?.role} specializing in ${currentAgent?.specialty}. Always provide practical, actionable advice...`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Response Style
                  </label>
                  <select className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500">
                    <option value="professional">Professional & Detailed</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="technical">Technical & Precise</option>
                    <option value="coaching">Coaching & Motivational</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {trainingMode === 'knowledge' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Knowledge Base Management</h4>
              <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-olive-600" />
                  <span className="text-sm font-medium text-olive-900">Connected to Notion</span>
                </div>
                <p className="text-sm text-olive-700">
                  {currentAgent?.name} has access to 47 business knowledge articles from your Notion workspace.
                </p>
              </div>
              <div className="space-y-2">
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="font-medium text-gray-900">Barbershop Operations (12 articles)</div>
                  <div className="text-sm text-gray-600">Daily procedures, sanitation, equipment maintenance</div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="font-medium text-gray-900">Customer Service (8 articles)</div>
                  <div className="text-sm text-gray-600">Client interaction, complaint handling, retention</div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="font-medium text-gray-900">Marketing Strategies (15 articles)</div>
                  <div className="text-sm text-gray-600">Social media, promotions, customer acquisition</div>
                </button>
              </div>
            </div>
          )}

          {trainingMode === 'performance' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Performance Optimization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Response Metrics</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Accuracy</span>
                      <span className="text-sm font-medium">{currentAgent?.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Response Time</span>
                      <span className="text-sm font-medium">1.2s avg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">User Satisfaction</span>
                      <span className="text-sm font-medium">4.7/5</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Optimization Settings</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600">Temperature (Creativity)</label>
                      <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Max Response Length</label>
                      <select className="w-full text-sm border border-gray-300 rounded">
                        <option>Short (100 tokens)</option>
                        <option>Medium (250 tokens)</option>
                        <option>Long (500 tokens)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {trainingMode === 'custom' && (
            <div className="text-center py-12">
              <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">Advanced Training Coming Soon</h4>
              <p className="text-gray-600">
                Custom model fine-tuning and advanced AI training features are in development.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Reset to Defaults
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-olive-600 rounded-md hover:bg-olive-700">
              Save Training Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}