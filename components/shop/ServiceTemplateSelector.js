'use client'

import { useState } from 'react'
import { 
  PlusIcon, 
  CheckIcon, 
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'

const templates = {
  popular: [
    { id: 'classic-cut', name: 'Haircut', price: 35, duration: 30, category: 'haircut' },
    { id: 'fade-cut', name: 'Fade Cut', price: 40, duration: 40, category: 'haircut' },
    { id: 'beard-trim', name: 'Beard Trim', price: 20, duration: 20, category: 'beard' },
    { id: 'kids-cut', name: 'Kids Cut', price: 25, duration: 20, category: 'haircut' },
    { id: 'haircut-beard', name: 'Haircut & Beard', price: 45, duration: 45, category: 'combo' },
    { id: 'vip-package', name: 'VIP Package', price: 55, duration: 50, category: 'combo' }
  ],
  haircuts: [
    { id: 'classic-cut', name: 'Classic Haircut', price: 35, duration: 45, category: 'haircut' },
    { id: 'fade-cut', name: 'Fade Cut', price: 40, duration: 50, category: 'haircut' },
    { id: 'buzz-cut', name: 'Buzz Cut', price: 25, duration: 30, category: 'haircut' },
    { id: 'scissor-cut', name: 'Scissor Cut', price: 45, duration: 55, category: 'haircut' },
    { id: 'kids-cut', name: 'Kids Cut', price: 20, duration: 30, category: 'haircut' }
  ],
  beard: [
    { id: 'beard-trim', name: 'Beard Trim', price: 25, duration: 30, category: 'beard' },
    { id: 'beard-shape', name: 'Beard Shape & Line', price: 30, duration: 35, category: 'beard' },
    { id: 'hot-shave', name: 'Hot Towel Shave', price: 45, duration: 60, category: 'shave' },
    { id: 'neck-shave', name: 'Neck Shave', price: 15, duration: 15, category: 'shave' },
    { id: 'mustache-trim', name: 'Mustache Trim', price: 10, duration: 10, category: 'beard' }
  ],
  packages: [
    { id: 'vip-package', name: 'VIP Package', price: 55, duration: 50, category: 'combo' },
    { id: 'express-pkg', name: 'Express Package', price: 45, duration: 40, category: 'combo' },
    { id: 'vip-treatment', name: 'VIP Treatment', price: 100, duration: 120, category: 'combo' },
    { id: 'groom-pkg', name: 'Groom Package', price: 65, duration: 75, category: 'combo' }
  ]
}

export default function ServiceTemplateSelector({ onAddTemplate, existingServices = [] }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState('popular')
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [addedTemplates, setAddedTemplates] = useState([])
  const [bulkAdding, setBulkAdding] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })

  // Don't show if there are already services
  if (existingServices.length > 0) {
    return null
  }

  const handleQuickAdd = async (template, skipToast = false) => {
    // Check if already added in this session
    if (addedTemplates.includes(template.id)) {
      if (!skipToast) {
        toast.error(`${template.name} already added`)
      }
      return false
    }

    // Check if service with same name already exists in database
    if (existingServices.some(s => s.name.toLowerCase() === template.name.toLowerCase())) {
      if (!skipToast) {
        toast.error(`${template.name} already exists in your services`)
      }
      return false
    }

    const templateData = {
      name: template.name,
      description: getTemplateDescription(template),
      category: template.category,
      price: template.price.toString(),
      duration_minutes: template.duration.toString(),
      is_active: true
    }

    try {
      await onAddTemplate(templateData)
      setAddedTemplates([...addedTemplates, template.id])
      return true
    } catch (error) {
      if (!skipToast) {
        toast.error(`Failed to add ${template.name}`)
      }
      return false
    }
  }

  const handleBulkAdd = async () => {
    if (selectedTemplates.length === 0) {
      toast.error('Select services to add')
      return
    }

    for (const templateId of selectedTemplates) {
      const template = Object.values(templates).flat().find(t => t.id === templateId)
      if (template) {
        await handleQuickAdd(template)
      }
    }

    setSelectedTemplates([])
    setIsBulkMode(false)
    toast.success(`Added ${selectedTemplates.length} services!`)
  }

  const toggleTemplateSelection = (templateId) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const getTemplateDescription = (template) => {
    const descriptions = {
      'classic-cut': 'Traditional scissor cut with styling',
      'fade-cut': 'Modern fade with precise blending',
      'buzz-cut': 'Quick and clean buzz cut',
      'scissor-cut': 'Premium scissor-only cutting technique',
      'kids-cut': 'Gentle service for children under 12',
      'beard-trim': 'Professional beard trimming and shaping',
      'beard-shape': 'Precise beard shaping and line up',
      'haircut-beard': 'Complete haircut with professional beard grooming',
      'hot-shave': 'Traditional straight razor shave with hot towel',
      'neck-shave': 'Clean neck line maintenance',
      'mustache-trim': 'Mustache grooming and styling',
      'full-service': 'Haircut, beard trim, shampoo and styling',
      'express-pkg': 'Quick haircut and beard trim',
      'vip-package': 'Premium grooming experience with haircut and beard',
      'vip-treatment': 'Full service with scalp massage and premium products',
      'groom-pkg': 'Perfect for special occasions'
    }
    return descriptions[template.id] || ''
  }

  const getCategoryColor = (category) => {
    const colors = {
      haircut: 'bg-olive-100 text-olive-800 hover:bg-olive-200',
      beard: 'bg-moss-100 text-moss-800 hover:bg-moss-200',
      shave: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
      combo: 'bg-gold-100 text-gold-800 hover:bg-gold-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }

  const tabs = [
    { id: 'popular', label: 'Most Popular', count: templates.popular.length },
    { id: 'haircuts', label: 'Haircuts', count: templates.haircuts.length },
    { id: 'beard', label: 'Beard & Shave', count: templates.beard.length },
    { id: 'packages', label: 'Packages', count: templates.packages.length }
  ]

  return (
    <div className="bg-gradient-to-r from-olive-50 to-moss-50 rounded-xl shadow-sm border border-olive-200 mb-6 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-5 w-5 text-olive-600" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-gray-900">Quick Start Templates</h2>
            <p className="text-sm text-gray-600">
              {isExpanded ? 'Select services to add to your catalog' : 'Click to add common services'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <Badge variant="info" className="mr-2">
              {Object.values(templates).flat().length} templates available
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/50 rounded-lg">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Bulk Mode Toggle */}
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode)
                setSelectedTemplates([])
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isBulkMode
                  ? 'bg-olive-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isBulkMode ? 'Cancel Selection' : 'Select Multiple'}
            </button>
          </div>

          {/* Template Chips */}
          <div className="space-y-3">
            {/* Quick Start Pack - Only in Popular Tab */}
            {activeTab === 'popular' && !isBulkMode && (
              <div className="p-3 bg-gradient-to-r from-gold-50 to-amber-50 rounded-lg border border-gold-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      ⚡ Quick Start Pack
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Add 6 essential services with one click
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setBulkAdding(true)
                      setBulkProgress({ current: 0, total: templates.popular.length })
                      
                      let successCount = 0
                      for (let i = 0; i < templates.popular.length; i++) {
                        const template = templates.popular[i]
                        setBulkProgress({ current: i + 1, total: templates.popular.length })
                        
                        const success = await handleQuickAdd(template, true) // Skip individual toasts
                        if (success) {
                          successCount++
                        }
                      }
                      
                      setBulkAdding(false)
                      setBulkProgress({ current: 0, total: 0 })
                      
                      if (successCount > 0) {
                        toast.success(`Added ${successCount} service${successCount !== 1 ? 's' : ''} successfully!`)
                      } else {
                        toast.error('No services were added - they may already exist')
                      }
                    }}
                    disabled={bulkAdding}
                    className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkAdding 
                      ? `Adding ${bulkProgress.current}/${bulkProgress.total}...` 
                      : 'Add All Popular'}
                  </button>
                </div>
              </div>
            )}

            {/* Service Chips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {templates[activeTab].map(template => {
                const isAdded = addedTemplates.includes(template.id)
                const isSelected = selectedTemplates.includes(template.id)

                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      if (isBulkMode) {
                        toggleTemplateSelection(template.id)
                      } else {
                        handleQuickAdd(template)
                      }
                    }}
                    disabled={isAdded && !isBulkMode}
                    className={`
                      group relative flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all
                      ${isAdded 
                        ? 'bg-green-50 border-green-300 cursor-not-allowed' 
                        : isSelected
                        ? 'bg-olive-100 border-olive-400 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-olive-400 hover:shadow-sm'
                      }
                    `}
                  >
                    {/* Checkbox for Bulk Mode */}
                    {isBulkMode && (
                      <div className={`
                        w-4 h-4 rounded border-2 flex items-center justify-center
                        ${isSelected ? 'bg-olive-600 border-olive-600' : 'border-gray-300'}
                      `}>
                        {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                      </div>
                    )}

                    {/* Icon */}
                    {!isBulkMode && (
                      <div className="flex-shrink-0">
                        {isAdded ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <PlusIcon className="h-4 w-4 text-gray-400 group-hover:text-olive-600" />
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          isAdded ? 'text-green-700' : 'text-gray-900'
                        }`}>
                          {template.name}
                        </span>
                        {activeTab === 'popular' && templates.popular.slice(0, 3).includes(template) && (
                          <Badge variant="warning" className="px-1.5 py-0 text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">${template.price}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{template.duration} min</span>
                      </div>
                    </div>

                    {/* Tooltip on Hover */}
                    {!isBulkMode && !isAdded && (
                      <div className="absolute left-0 -top-8 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {getTemplateDescription(template)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Bulk Action Bar */}
            {isBulkMode && selectedTemplates.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-olive-50 rounded-lg border border-olive-200">
                <span className="text-sm font-medium text-gray-700">
                  {selectedTemplates.length} service{selectedTemplates.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTemplates([])}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleBulkAdd}
                    className="px-4 py-1.5 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors text-sm font-medium"
                  >
                    Add Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}