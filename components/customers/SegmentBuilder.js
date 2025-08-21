'use client'

import React, { 
  PlusIcon,
  XMarkIcon,
  FunnelIcon,
  UserGroupIcon,
  ChevronDownIcon,
  PlayIcon,
  BookmarkIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import React, { useAuth } from '../SupabaseAuthProvider'
import React, { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui'

// Condition Component for building rules
const ConditionRule = ({ condition, onChange, onRemove }) => {
  const attributes = [
    { value: 'total_visits', label: 'Total Visits' },
    { value: 'total_spent', label: 'Total Spent' },
    { value: 'last_visit_days', label: 'Days Since Last Visit' },
    { value: 'avg_order_value', label: 'Average Order Value' },
    { value: 'loyalty_points', label: 'Loyalty Points' },
    { value: 'customer_lifetime_value', label: 'Customer Lifetime Value' },
    { value: 'churn_probability', label: 'Churn Probability' },
    { value: 'health_score', label: 'Health Score' },
    { value: 'age', label: 'Age' },
    { value: 'gender', label: 'Gender' },
    { value: 'preferred_service', label: 'Preferred Service' },
    { value: 'signup_date', label: 'Signup Date' },
    { value: 'city', label: 'City' }
  ]

  const operators = {
    numeric: [
      { value: 'gt', label: 'Greater than' },
      { value: 'gte', label: 'Greater than or equal' },
      { value: 'lt', label: 'Less than' },
      { value: 'lte', label: 'Less than or equal' },
      { value: 'eq', label: 'Equal to' },
      { value: 'between', label: 'Between' }
    ],
    text: [
      { value: 'eq', label: 'Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts with' },
      { value: 'in', label: 'In list' }
    ],
    date: [
      { value: 'after', label: 'After' },
      { value: 'before', label: 'Before' },
      { value: 'between', label: 'Between' },
      { value: 'last_days', label: 'Last X days' }
    ]
  }

  const getAttributeType = (attribute) => {
    const numericFields = ['total_visits', 'total_spent', 'avg_order_value', 'loyalty_points', 'customer_lifetime_value', 'churn_probability', 'health_score', 'age', 'last_visit_days']
    const dateFields = ['signup_date', 'last_visit_date']
    
    if (numericFields.includes(attribute)) return 'numeric'
    if (dateFields.includes(attribute)) return 'date'
    return 'text'
  }

  const attributeType = getAttributeType(condition.attribute)
  const availableOperators = operators[attributeType] || operators.text

  return (
    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
      {/* Attribute Selection */}
      <select
        value={condition.attribute}
        onChange={(e) => onChange({ ...condition, attribute: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
      >
        <option value="">Select attribute</option>
        {attributes.map(attr => (
          <option key={attr.value} value={attr.value}>{attr.label}</option>
        ))}
      </select>

      {/* Operator Selection */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
        disabled={!condition.attribute}
      >
        <option value="">Select operator</option>
        {availableOperators.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value Input */}
      {condition.operator === 'between' ? (
        <div className="flex items-center space-x-1">
          <input
            type={attributeType === 'numeric' ? 'number' : 'text'}
            value={condition.value?.[0] || ''}
            onChange={(e) => onChange({ 
              ...condition, 
              value: [e.target.value, condition.value?.[1] || ''] 
            })}
            placeholder="Min"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-20"
          />
          <span className="text-gray-500">and</span>
          <input
            type={attributeType === 'numeric' ? 'number' : 'text'}
            value={condition.value?.[1] || ''}
            onChange={(e) => onChange({ 
              ...condition, 
              value: [condition.value?.[0] || '', e.target.value] 
            })}
            placeholder="Max"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-20"
          />
        </div>
      ) : condition.operator === 'in' ? (
        <input
          type="text"
          value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || ''}
          onChange={(e) => onChange({ 
            ...condition, 
            value: e.target.value.split(',').map(v => v.trim()) 
          })}
          placeholder="Value1, Value2, Value3"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
        />
      ) : (
        <input
          type={attributeType === 'numeric' ? 'number' : attributeType === 'date' ? 'date' : 'text'}
          value={condition.value || ''}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Enter value"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
        />
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-50 rounded-md"
        title="Remove condition"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

// Segment Template Component
const SegmentTemplate = ({ template, onApply }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-olive-300 cursor-pointer transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{template.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {template.rules.map((rule, index) => (
              <Badge key={index} className="text-xs bg-gray-100 text-gray-700">
                {rule.label}
              </Badge>
            ))}
          </div>
        </div>
        <button
          onClick={() => onApply(template)}
          className="ml-3 px-3 py-1 text-sm bg-olive-600 text-white rounded-md hover:bg-olive-700"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export default function SegmentBuilder() {
  const { user, profile } = useAuth()
  const [segmentName, setSegmentName] = useState('')
  const [segmentDescription, setSegmentDescription] = useState('')
  const [segmentType, setSegmentType] = useState('behavioral')
  const [conditions, setConditions] = useState([
    { attribute: '', operator: '', value: '', logic: 'AND' }
  ])
  const [segmentPreview, setSegmentPreview] = useState(null)
  const [savedSegments, setSavedSegments] = useState([])
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Predefined segment templates
  const segmentTemplates = [
    {
      name: 'High Value Customers',
      description: 'Customers with high CLV and frequent visits',
      rules: [
        { label: 'CLV > $500' },
        { label: 'Visits > 10' },
        { label: 'Health Score > 70' }
      ],
      conditions: [
        { attribute: 'customer_lifetime_value', operator: 'gt', value: '500', logic: 'AND' },
        { attribute: 'total_visits', operator: 'gt', value: '10', logic: 'AND' },
        { attribute: 'health_score', operator: 'gt', value: '70', logic: 'AND' }
      ]
    },
    {
      name: 'At Risk Customers',
      description: 'Customers with high churn probability',
      rules: [
        { label: 'Churn Risk > 60%' },
        { label: 'Last Visit > 30 days' }
      ],
      conditions: [
        { attribute: 'churn_probability', operator: 'gt', value: '60', logic: 'AND' },
        { attribute: 'last_visit_days', operator: 'gt', value: '30', logic: 'AND' }
      ]
    },
    {
      name: 'New Customers',
      description: 'Customers who joined recently',
      rules: [
        { label: 'Signup < 30 days' },
        { label: 'Visits ≤ 3' }
      ],
      conditions: [
        { attribute: 'signup_date', operator: 'last_days', value: '30', logic: 'AND' },
        { attribute: 'total_visits', operator: 'lte', value: '3', logic: 'AND' }
      ]
    },
    {
      name: 'VIP Customers',
      description: 'Highest tier customers',
      rules: [
        { label: 'Total Spent > $1000' },
        { label: 'Loyalty Points > 100' },
        { label: 'Health Score > 85' }
      ],
      conditions: [
        { attribute: 'total_spent', operator: 'gt', value: '1000', logic: 'AND' },
        { attribute: 'loyalty_points', operator: 'gt', value: '100', logic: 'AND' },
        { attribute: 'health_score', operator: 'gt', value: '85', logic: 'AND' }
      ]
    }
  ]

  // Load saved segments
  useEffect(() => {
    if (!user || !profile?.barbershop_id) return

    const fetchSegments = async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://your-api-domain.com'
          : 'http://localhost:8001'

        const token = await user.getIdToken()
        const response = await fetch(`${baseUrl}/customer-segments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const segments = await response.json()
          setSavedSegments(segments)
        }
      } catch (err) {
        console.error('Error fetching segments:', err)
      }
    }

    fetchSegments()
  }, [user, profile?.barbershop_id])

  // Add new condition
  const addCondition = () => {
    setConditions([...conditions, { attribute: '', operator: '', value: '', logic: 'AND' }])
  }

  // Update condition
  const updateCondition = (index, updatedCondition) => {
    const newConditions = [...conditions]
    newConditions[index] = updatedCondition
    setConditions(newConditions)
  }

  // Remove condition
  const removeCondition = (index) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index))
    }
  }

  // Preview segment
  const previewSegment = async () => {
    if (!user || !profile?.barbershop_id) return

    const validConditions = conditions.filter(c => c.attribute && c.operator && c.value)
    if (validConditions.length === 0) return

    try {
      setPreviewLoading(true)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-api-domain.com'
        : 'http://localhost:8001'

      const token = await user.getIdToken()
      
      const segmentData = {
        segment_name: segmentName || 'Preview Segment',
        segment_type: segmentType,
        segmentation_rules: {
          conditions: validConditions,
          logic: 'AND' // Can be made configurable
        }
      }

      const response = await fetch(`${baseUrl}/customer-segments/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(segmentData)
      })

      if (response.ok) {
        const preview = await response.json()
        setSegmentPreview(preview)
      }
    } catch (err) {
      console.error('Error previewing segment:', err)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Save segment
  const saveSegment = async () => {
    if (!user || !profile?.barbershop_id || !segmentName) return

    const validConditions = conditions.filter(c => c.attribute && c.operator && c.value)
    if (validConditions.length === 0) return

    try {
      setLoading(true)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-api-domain.com'
        : 'http://localhost:8001'

      const token = await user.getIdToken()
      
      const segmentData = {
        segment_name: segmentName,
        segment_description: segmentDescription,
        segment_type: segmentType,
        segmentation_rules: {
          conditions: validConditions,
          logic: 'AND'
        },
        auto_update: true
      }

      const response = await fetch(`${baseUrl}/customer-segments/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(segmentData)
      })

      if (response.ok) {
        // Reset form
        setSegmentName('')
        setSegmentDescription('')
        setConditions([{ attribute: '', operator: '', value: '', logic: 'AND' }])
        setSegmentPreview(null)
        
        // Refresh segments list
        const segmentsResponse = await fetch(`${baseUrl}/customer-segments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (segmentsResponse.ok) {
          const segments = await segmentsResponse.json()
          setSavedSegments(segments)
        }
      }
    } catch (err) {
      console.error('Error saving segment:', err)
    } finally {
      setLoading(false)
    }
  }

  // Apply template
  const applyTemplate = (template) => {
    setSegmentName(template.name)
    setSegmentDescription(template.description)
    setConditions(template.conditions)
    setShowTemplates(false)
  }

  // Delete segment
  const deleteSegment = async (segmentId) => {
    if (!user || !confirm('Are you sure you want to delete this segment?')) return

    try {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-api-domain.com'
        : 'http://localhost:8001'

      const token = await user.getIdToken()
      
      const response = await fetch(`${baseUrl}/customer-segments/${segmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setSavedSegments(savedSegments.filter(s => s.id !== segmentId))
      }
    } catch (err) {
      console.error('Error deleting segment:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Segment Builder</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Templates
          </button>
          <Button onClick={previewSegment} disabled={previewLoading} className="bg-blue-600 hover:bg-blue-700">
            <EyeIcon className="h-4 w-4 mr-2" />
            {previewLoading ? 'Previewing...' : 'Preview'}
          </Button>
          <Button onClick={saveSegment} disabled={loading || !segmentName} className="bg-olive-600 hover:bg-olive-700">
            <BookmarkIcon className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Segment'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segment Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Templates Section */}
          {showTemplates && (
            <Card>
              <CardHeader>
                <CardTitle>Segment Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {segmentTemplates.map((template, index) => (
                    <SegmentTemplate
                      key={index}
                      template={template}
                      onApply={applyTemplate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segment Definition */}
          <Card>
            <CardHeader>
              <CardTitle>Segment Definition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segment Name *
                  </label>
                  <input
                    type="text"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    placeholder="e.g., High Value Customers"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segment Type
                  </label>
                  <select
                    value={segmentType}
                    onChange={(e) => setSegmentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="demographic">Demographic</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="value">Value-based</option>
                    <option value="lifecycle">Lifecycle</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  placeholder="Describe this segment..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Conditions Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5" />
                Segment Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {conditions.map((condition, index) => (
                <div key={index}>
                  {index > 0 && (
                    <div className="flex items-center justify-center my-2">
                      <select
                        value={condition.logic}
                        onChange={(e) => updateCondition(index, { ...condition, logic: e.target.value })}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                  )}
                  <ConditionRule
                    condition={condition}
                    onChange={(updatedCondition) => updateCondition(index, updatedCondition)}
                    onRemove={() => removeCondition(index)}
                  />
                </div>
              ))}
              
              <button
                onClick={addCondition}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-olive-500 hover:text-olive-600 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mx-auto mb-1" />
                Add Condition
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview Results */}
          {segmentPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-olive-600">
                      {segmentPreview.estimated_size || 0}
                    </div>
                    <p className="text-sm text-gray-600">customers match</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Percentage of base:</span>
                      <span className="font-medium">
                        {segmentPreview.percentage_of_base?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg CLV:</span>
                      <span className="font-medium">
                        ${segmentPreview.average_clv?.toFixed(0) || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg visits:</span>
                      <span className="font-medium">
                        {segmentPreview.average_visits?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Segments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5" />
                Saved Segments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedSegments.length > 0 ? (
                <div className="space-y-3">
                  {savedSegments.map((segment) => (
                    <div key={segment.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {segment.segment_name}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {segment.customer_count} customers
                          </p>
                          <Badge className="text-xs mt-1 capitalize">
                            {segment.segment_type}
                          </Badge>
                        </div>
                        <button
                          onClick={() => deleteSegment(segment.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete segment"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No saved segments yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}