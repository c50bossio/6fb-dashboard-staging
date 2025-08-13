'use client'

import { useState } from 'react'

import { Button, Badge, Alert } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Using emoji alternatives instead of lucide-react for Node.js compatibility
const Brain = () => <span>🧠</span>
const Plus = () => <span>➕</span>
const CheckCircle = () => <span>✅</span>
const AlertCircle = () => <span>⚠️</span>
const Loader2 = ({ className }) => <span className={`${className} inline-block animate-spin`}>⭕</span>

export default function ManualEntryForm() {
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
              <Button
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
                    <Loader2 className="animate-spin" />
                    Adding Knowledge...
                  </>
                ) : (
                  <>
                    <Plus />
                    Add Knowledge Entry
                  </>
                )}
              </Button>
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
                {submitResult.type === 'success' ? <CheckCircle /> : <AlertCircle />}
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

      {/* Quick Entry Helper */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Entry Alternative</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-3">
            For faster entry, you can also chat directly with the AI and say:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="font-mono text-sm">
              "Add this knowledge: [Your strategy/insight here]. Domain: [domain_name]"
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            The AI will automatically extract and categorize your knowledge entry.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}