'use client'

import { 
  EyeIcon,
  SparklesIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  HeartIcon,
  ChartBarIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { templateEngine, TEMPLATE_CATEGORIES, PREMIUM_TEMPLATES } from '@/lib/templates/template-engine'

const TemplateCard = ({ template, onPreview, onApply, isApplying, isRecommended = false }) => {
  const [isLiked, setIsLiked] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const categoryInfo = Object.values(TEMPLATE_CATEGORIES).find(cat => cat.id === template.category)
  const conversionRate = template.analytics?.conversionRate || 0
  const usageCount = template.analytics?.usageCount || 0
  const popularityScore = template.analytics?.popularityScore || 0

  return (
    <div className={`relative group bg-white rounded-xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
      isRecommended ? 'ring-2 ring-yellow-400 ring-opacity-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Recommendation Badge */}
      {isRecommended && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            <TrophyIcon className="w-3 h-3" />
            <span>Recommended</span>
          </div>
        </div>
      )}

      {/* Preview Image */}
      <div className="relative h-48 bg-gradient-to-br overflow-hidden" style={{
        background: `linear-gradient(135deg, ${template.colorScheme.primary}20, ${template.colorScheme.accent}20)`
      }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{
              background: template.colorScheme.primary
            }}>
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: template.colorScheme.primary }}>
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1 max-w-32">
              {categoryInfo?.name}
            </p>
          </div>
        </div>

        {/* Preview Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <button
            onClick={() => onPreview(template)}
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transform scale-95 group-hover:scale-100"
          >
            <PlayIcon className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Like Button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-all duration-200"
        >
          {isLiked ? (
            <HeartSolidIcon className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Template Info */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{template.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
          </div>
        </div>

        {/* Six Figure Barber Alignment */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ background: template.colorScheme.primary }}></div>
            <span className="text-sm font-medium text-gray-700">
              {template.sixFigureAlignment.positioning}
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2">
            {template.sixFigureAlignment.valueProposition}
          </p>
        </div>

        {/* Analytics Preview */}
        <div className="grid grid-cols-3 gap-2 mb-4 py-3 px-2 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {Math.round(conversionRate)}%
            </div>
            <div className="text-xs text-gray-500">Conversion</div>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <div className="text-sm font-semibold text-gray-900">
              {usageCount}
            </div>
            <div className="text-xs text-gray-500">Users</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {Math.round(popularityScore * 10)}
            </div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onPreview(template)}
            className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <EyeIcon className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => onApply(template)}
            disabled={isApplying}
            className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all text-sm font-medium"
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Applying...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Apply</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const FilterBar = ({ selectedCategory, onCategoryChange, searchTerm, onSearchChange, sortBy, onSortChange }) => {
  const categories = Object.values(TEMPLATE_CATEGORIES)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-5 h-5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="popularity">Most Popular</option>
            <option value="conversion">Highest Conversion</option>
            <option value="newest">Newest First</option>
            <option value="alphabetical">A-Z</option>
          </select>
        </div>
      </div>
    </div>
  )
}

const TemplatePreviewModal = ({ template, isOpen, onClose, onApply, isApplying }) => {
  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: template.colorScheme.primary
            }}>
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Template Preview */}
          <div className="mb-6">
            <div className="aspect-video bg-gradient-to-br rounded-xl overflow-hidden" style={{
              background: `linear-gradient(135deg, ${template.colorScheme.primary}, ${template.colorScheme.accent})`
            }}>
              <div className="h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">{template.name}</div>
                  <div className="text-lg opacity-90">{template.sixFigureAlignment.valueProposition}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Features */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Template Features</h3>
              <div className="space-y-2">
                {Object.entries(template.features).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {value.toString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Six Figure Barber Alignment */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Six Figure Barber Alignment</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Positioning</div>
                  <div className="text-sm text-gray-600">{template.sixFigureAlignment.positioning}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Target Client</div>
                  <div className="text-sm text-gray-600">{template.sixFigureAlignment.targetClient}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Pricing Strategy</div>
                  <div className="text-sm text-gray-600">{template.sixFigureAlignment.pricingStrategy}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Color Scheme Preview */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Color Scheme</h3>
            <div className="flex space-x-3">
              {Object.entries(template.colorScheme).map(([name, color]) => (
                <div key={name} className="text-center">
                  <div 
                    className="w-12 h-12 rounded-lg border border-gray-200 shadow-sm"
                    style={{ background: color }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-1 capitalize">{name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            This template follows Six Figure Barber methodology for premium positioning
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onApply(template)}
              disabled={isApplying}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all font-medium"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                  Applying Template...
                </>
              ) : (
                'Apply This Template'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TemplateGallery({ onTemplateApplied }) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('popularity')
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Load templates and recommendations
  useEffect(() => {
    loadTemplates()
    if (user) {
      loadRecommendations()
    }
  }, [user])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const templatesWithAnalytics = await templateEngine.getTemplatesWithAnalytics()
      setTemplates(templatesWithAnalytics)
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates(Object.values(PREMIUM_TEMPLATES))
      setMessage({ type: 'error', text: 'Error loading templates. Showing defaults.' })
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async () => {
    try {
      const userRecommendations = await templateEngine.getRecommendations(user.id)
      setRecommendations(userRecommendations)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    }
  }

  // Filter and sort templates
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.sixFigureAlignment.positioning.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesSearch
  }).sort((a, b) => {
    switch (sortBy) {
      case 'conversion':
        return (b.analytics?.conversionRate || 0) - (a.analytics?.conversionRate || 0)
      case 'newest':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      case 'alphabetical':
        return a.name.localeCompare(b.name)
      default: // popularity
        return (b.analytics?.popularityScore || 0) - (a.analytics?.popularityScore || 0)
    }
  })

  const handlePreview = (template) => {
    setPreviewTemplate(template)
    setShowPreview(true)
  }

  const handleApply = async (template) => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in to apply templates.' })
      return
    }

    try {
      setApplyingTemplate(template.id)
      setMessage({ type: 'info', text: 'Applying template...' })
      
      const result = await templateEngine.applyTemplate(user.id, template.id)
      
      if (result.success) {
        setMessage({ type: 'success', text: `Template "${template.name}" applied successfully!` })
        setShowPreview(false)
        if (onTemplateApplied) {
          onTemplateApplied(template, result.settings)
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to apply template.' })
      }
    } catch (error) {
      console.error('Error applying template:', error)
      setMessage({ type: 'error', text: 'Failed to apply template. Please try again.' })
    } finally {
      setApplyingTemplate(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Perfect Template</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Each template is crafted following Six Figure Barber methodology to help you attract premium clients 
          and grow your business with professional positioning.
        </p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 text-current hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <TrophyIcon className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onApply={handleApply}
                isApplying={applyingTemplate === template.id}
                isRecommended={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={handlePreview}
            onApply={handleApply}
            isApplying={applyingTemplate === template.id}
            isRecommended={recommendations.some(rec => rec.id === template.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse all categories.</p>
          <button
            onClick={() => {
              setSelectedCategory('')
              setSearchTerm('')
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <span>Show All Templates</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onApply={handleApply}
        isApplying={applyingTemplate === previewTemplate?.id}
      />
    </div>
  )
}