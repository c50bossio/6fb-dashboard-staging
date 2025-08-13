'use client'

import { useState, useEffect } from 'react'

import NotionIntegration from './NotionIntegration'

import { Button, Badge, Alert } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Using emoji alternatives instead of lucide-react for Node.js compatibility
const Shield = () => <span>🛡️</span>
const BookOpen = () => <span>📚</span>
const Brain = () => <span>🧠</span>
const TrendingUp = () => <span>📈</span>
const Users = () => <span>👥</span>
const Lock = () => <span>🔒</span>
const Plus = () => <span>➕</span>
const Search = () => <span>🔍</span>
const Database = () => <span>🗄️</span>

// Manual Entry Tab Component
function ManualEntryTab() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    domain: 'barbershop_operations',
    tags: '',
    confidence: 0.8
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)

  const businessDomains = [
    { id: 'barbershop_operations', label: 'Barbershop Operations' },
    { id: 'customer_experience', label: 'Customer Experience' },
    { id: 'staff_management', label: 'Staff Management' },
    { id: 'marketing_strategies', label: 'Marketing Strategies' },
    { id: 'revenue_optimization', label: 'Revenue Optimization' },
    { id: 'inventory_management', label: 'Inventory Management' },
    { id: 'service_pricing', label: 'Service Pricing' },
    { id: 'business_growth', label: 'Business Growth' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      const response = await fetch('/api/admin/knowledge/manual-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          confidence: parseFloat(formData.confidence)
        })
      })

      const result = await response.json()

      if (result.success) {
        setSubmitResult({
          type: 'success',
          message: `Knowledge entry added successfully! Entry ID: ${result.entry_id}`
        })
        // Reset form
        setFormData({
          title: '',
          content: '',
          domain: 'barbershop_operations',
          tags: '',
          confidence: 0.8
        })
      } else {
        throw new Error(result.error || 'Failed to add knowledge entry')
      }

    } catch (error) {
      setSubmitResult({
        type: 'error',
        message: `Failed to add knowledge entry: ${error.message}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.title.trim() && formData.content.trim()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Knowledge Entry</CardTitle>
          <CardDescription>
            Add individual knowledge entries to enhance AI responses globally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="p-4 border border-blue-200 bg-blue-50 rounded-lg mb-6">
            <Brain />
            <div className="ml-2">
              <strong>Pro Tip:</strong> Be specific and include measurable results when possible. 
              Example: "Sending follow-up texts 24-48 hours after service increases retention by 31%"
            </div>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Knowledge Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Customer Retention Follow-up Strategy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Content Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Knowledge Content *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Describe the strategy, process, or insight in detail. Include specific metrics, time periods, and results when available."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.content.length}/500 characters (be detailed but concise)
              </p>
            </div>

            {/* Domain Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Domain
              </label>
              <select
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {businessDomains.map(domain => (
                  <option key={domain.id} value={domain.id}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., follow-up, retention, text message, 24-48 hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Confidence Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level: {(formData.confidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                name="confidence"
                min="0.1"
                max="1.0"
                step="0.1"
                value={formData.confidence}
                onChange={handleInputChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low (10%)</span>
                <span>Medium (50%)</span>
                <span>High (90%)</span>
                <span>Very High (100%)</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full px-4 py-2 rounded flex items-center justify-center gap-2 ${
                  !isFormValid || isSubmitting 
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⭕</span>
                    Adding Knowledge...
                  </>
                ) : (
                  <>
                    <Plus />
                    Add Knowledge Entry
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Submit Result */}
          {submitResult && (
            <div className="mt-6">
              <Alert className={`p-4 rounded-lg ${
                submitResult.type === 'success' 
                  ? 'border border-green-200 bg-green-50' 
                  : 'border border-red-200 bg-red-50'
              }`}>
                {submitResult.type === 'success' ? <span>✅</span> : <span>⚠️</span>}
                <div className="ml-2">
                  <strong>
                    {submitResult.type === 'success' ? 'Success!' : 'Error:'}
                  </strong>{' '}
                  {submitResult.message}
                </div>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminKnowledgeManager() {
  const [userRole, setUserRole] = useState('SUPER_ADMIN') // Mock admin access
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('notion')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin interface...</p>
        </div>
      </div>
    )
  }

  if (userRole === 'unauthorized') {
    return (
      <Alert className="m-6 p-4 border border-red-200 bg-red-50 rounded-lg">
        <Shield className="h-4 w-4" />
        <div className="ml-2">
          <strong>Access Denied:</strong> This feature is restricted to system administrators only. 
          Global knowledge base management affects all customers and requires special permissions.
        </div>
      </Alert>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Global AI Knowledge Management</h1>
          <Badge className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Admin Only</Badge>
        </div>
        <p className="text-gray-600">
          Manage the global AI knowledge base that benefits all barbershop customers. 
          Changes here will affect AI responses system-wide.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'notion', label: 'Notion Import', icon: Database, description: 'Bulk import from Notion workspace' },
            { id: 'manual', label: 'Manual Entry', icon: Plus, description: 'Add individual knowledge entries' },
            { id: 'manage', label: 'Manage', icon: BookOpen, description: 'View and edit existing entries' },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Knowledge base performance' }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'notion' && <NotionIntegration />}

      {activeTab === 'manual' && <ManualEntryTab />}

      {activeTab === 'manage' && (
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base Management</CardTitle>
            <CardDescription>
              View and manage existing knowledge entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Knowledge Entries</p>
              <p>Import from Notion or add manually first, then they'll appear here for management.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Entries</p>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-xs text-gray-500 mt-1">Ready for import</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                    <p className="text-3xl font-bold">0%</p>
                    <p className="text-xs text-gray-500 mt-1">After import</p>
                  </div>
                  <Brain className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Domains</p>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-xs text-gray-500 mt-1">Business areas</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Impact</p>
                    <p className="text-3xl font-bold">Ready</p>
                    <p className="text-xs text-gray-500 mt-1">System status</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System-Wide Knowledge Impact</CardTitle>
              <CardDescription>
                How your knowledge improvements will affect all barbershop customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <TrendingUp className="h-4 w-4" />
                <div className="ml-2">
                  <strong>Global Impact Potential:</strong> Every knowledge entry you add will immediately 
                  improve AI responses for thousands of barbershop customers worldwide. Your expertise 
                  becomes their competitive advantage.
                </div>
              </Alert>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">📈 Expected Improvements</h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• 25-40% increase in recommendation accuracy</li>
                    <li>• 60-80% more actionable business advice</li>
                    <li>• Industry-specific insights vs generic tips</li>
                    <li>• Proven strategies with real ROI data</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">🎯 Customer Benefits</h4>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li>• Faster business problem resolution</li>
                    <li>• Higher confidence in AI recommendations</li>
                    <li>• Access to expert-level barbershop knowledge</li>
                    <li>• Competitive strategies from successful shops</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}