'use client'

import { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import ProtectedRoute from '../../../components/ProtectedRoute'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function AITrainingDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('knowledge')
  const [newKnowledge, setNewKnowledge] = useState({
    category: 'pricing',
    title: '',
    content: ''
  })

  const knowledgeCategories = [
    { id: 'pricing', name: 'Pricing & Services', icon: '💰' },
    { id: 'service_standards', name: 'Service Standards', icon: '⭐' },
    { id: 'marketing', name: 'Marketing Strategies', icon: '📣' },
    { id: 'policies', name: 'Shop Policies', icon: '📋' },
    { id: 'scripts', name: 'Customer Scripts', icon: '💬' }
  ]

  const exampleKnowledge = [
    {
      category: 'pricing',
      title: 'Holiday Special Pricing',
      content: 'December special: 20% off all services. Gift cards available.',
      date: '2024-12-01'
    },
    {
      category: 'service_standards',
      title: 'VIP Customer Treatment',
      content: 'VIP customers get priority booking, complimentary hot towel service, and exclusive products.',
      date: '2024-11-15'
    }
  ]

  const handleAddKnowledge = async (e) => {
    e.preventDefault()
    // In real implementation, this would call the API
    console.log('Adding knowledge:', newKnowledge)
    
    // Reset form
    setNewKnowledge({
      category: 'pricing',
      title: '',
      content: ''
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">AI Training Center</h1>
                  <p className="mt-1 text-gray-600">Teach your AI with your business knowledge</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'knowledge'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                Knowledge Base
              </button>
              <button
                onClick={() => setActiveTab('examples')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'examples'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 inline mr-2" />
                Training Examples
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'prompts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <SparklesIcon className="h-5 w-5 inline mr-2" />
                Custom Prompts
              </button>
            </nav>
          </div>

          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Knowledge Form */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Add Knowledge</h2>
                <form onSubmit={handleAddKnowledge} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newKnowledge.category}
                      onChange={(e) => setNewKnowledge({...newKnowledge, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {knowledgeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newKnowledge.title}
                      onChange={(e) => setNewKnowledge({...newKnowledge, title: e.target.value})}
                      placeholder="e.g., Weekend Pricing"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={newKnowledge.content}
                      onChange={(e) => setNewKnowledge({...newKnowledge, content: e.target.value})}
                      placeholder="Enter your business knowledge, pricing, policies, or strategies..."
                      rows={6}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Add to Knowledge Base
                  </button>
                </form>
              </div>

              {/* Knowledge List */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Knowledge</h2>
                <div className="space-y-4">
                  {exampleKnowledge.map((item, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {knowledgeCategories.find(c => c.id === item.category)?.name} • {item.date}
                          </p>
                        </div>
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Training Examples Tab */}
          {activeTab === 'examples' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Training from Conversations</h2>
              <p className="text-gray-600 mb-6">
                Mark successful conversations as training examples to improve AI responses.
              </p>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Q: How can I increase weekend traffic?</span>
                    <span className="text-xs text-gray-500">2 days ago</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    A: Consider offering weekend specials like "Father & Son" packages at 20% off, 
                    or early bird discounts before 10 AM. Social media posts on Friday work well.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600">Marked as helpful by user</span>
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      Add to Training Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Prompts Tab */}
          {activeTab === 'prompts' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customize AI Personality</h2>
              <p className="text-gray-600 mb-6">
                Define how your AI agents should behave and what knowledge they should prioritize.
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Coach Personality
                  </label>
                  <textarea
                    defaultValue="You are a friendly, experienced barbershop business coach. Always be encouraging and provide specific, actionable advice based on our shop's actual data and policies."
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop-Specific Context
                  </label>
                  <textarea
                    placeholder="Add your shop's unique value proposition, target market, location details, etc."
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Update AI Behavior
                </button>
              </div>
            </div>
          )}

          {/* Quick Start Guide */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <AcademicCapIcon className="h-6 w-6 mr-2" />
              Quick Start Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">1. Add Your Knowledge</h4>
                <p className="text-sm text-gray-700">
                  Upload your pricing, policies, service standards, and successful strategies.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">2. Train from Success</h4>
                <p className="text-sm text-gray-700">
                  Mark helpful conversations as training examples to improve responses.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">3. Customize Behavior</h4>
                <p className="text-sm text-gray-700">
                  Set the AI's personality and ensure it reflects your brand values.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}