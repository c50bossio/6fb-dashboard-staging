'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../components/SupabaseAuthProvider'
import ProtectedRoute from '../../components/ProtectedRoute'
import { Card } from '../../components/ui'
import { 
  BookOpenIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlusIcon,
  ChartBarIcon,
  TagIcon,
  ClockIcon,
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  FolderIcon,
  StarIcon
} from '@heroicons/react/24/outline'

function KnowledgeDocumentCard({ document, onViewDetails }) {
  const domainColors = {
    'barbershop_operations': 'border-blue-500 bg-blue-50',
    'customer_experience': 'border-green-500 bg-green-50',
    'revenue_optimization': 'border-purple-500 bg-purple-50',
    'marketing_strategies': 'border-orange-500 bg-orange-50',
    'staff_management': 'border-indigo-500 bg-indigo-50'
  }

  const domainIcons = {
    'barbershop_operations': ChartBarIcon,
    'customer_experience': StarIcon,
    'revenue_optimization': SparklesIcon,
    'marketing_strategies': LightBulbIcon,
    'staff_management': FolderIcon
  }

  const Icon = domainIcons[document.domain] || DocumentTextIcon

  return (
    <Card className={`border-l-4 ${domainColors[document.domain] || 'border-gray-500 bg-gray-50'} hover:shadow-md transition-shadow cursor-pointer`}
          onClick={() => onViewDetails(document)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <Icon className="h-5 w-5 mr-2 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
            <p className="text-sm text-gray-600 capitalize">
              {document.domain.replace('_', ' ')} • {document.source.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {Math.round((document.confidence_score || 0) * 100)}%
          </span>
          <div className={`w-3 h-3 rounded-full ${
            document.confidence_score >= 0.8 ? 'bg-green-500' :
            document.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-4 line-clamp-3">{document.summary}</p>

      {/* Tags */}
      {document.relevance_tags && document.relevance_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {document.relevance_tags.slice(0, 4).map((tag, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              <TagIcon className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {document.relevance_tags.length > 4 && (
            <span className="text-xs text-gray-500">+{document.relevance_tags.length - 4} more</span>
          )}
        </div>
      )}

      {/* Business Metrics */}
      {document.business_metrics && Object.keys(document.business_metrics).length > 0 && (
        <div className="bg-white rounded-lg p-3 mb-4 border">
          <h4 className="text-xs font-medium text-gray-800 mb-2">📊 Business Impact</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(document.business_metrics).slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                <span className="font-medium">
                  {typeof value === 'number' ? 
                    (key.includes('increase') || key.includes('improvement') ? `+${value}%` :
                     key.includes('cost') || key.includes('price') ? `$${value}` :
                     value) 
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center">
          <ClockIcon className="h-3 w-3 mr-1" />
          <span>Used {document.usage_count || 0} times</span>
        </div>
        <div className="flex items-center">
          <SparklesIcon className="h-3 w-3 mr-1" />
          <span>Effectiveness: {Math.round((document.effectiveness_score || 0) * 100)}%</span>
        </div>
      </div>
    </Card>
  )
}

function KnowledgeSearchResults({ results, onViewDetails }) {
  if (!results || !results.documents || results.documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpenIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No knowledge documents found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Search Results</h3>
        <p className="text-blue-800 mb-3">{results.context_summary}</p>
        
        {results.recommended_actions && results.recommended_actions.length > 0 && (
          <div>
            <h4 className="font-medium text-blue-900 mb-2">💡 Recommended Actions:</h4>
            <ul className="space-y-1">
              {results.recommended_actions.slice(0, 3).map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="text-blue-600">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {results.documents.map((doc, idx) => (
          <KnowledgeDocumentCard 
            key={doc.id || idx} 
            document={doc} 
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Knowledge Gaps */}
      {results.knowledge_gaps && results.knowledge_gaps.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Knowledge Gaps Identified
          </h3>
          <ul className="space-y-1">
            {results.knowledge_gaps.map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-yellow-800">
                <span className="text-yellow-600">⚠️</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DocumentDetailModal({ document, isOpen, onClose }) {
  if (!isOpen || !document) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="capitalize">{document.domain?.replace('_', ' ')}</span>
                <span>•</span>
                <span className="capitalize">{document.source?.replace('_', ' ')}</span>
                <span>•</span>
                <span>Confidence: {Math.round((document.confidence_score || 0) * 100)}%</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{document.summary}</p>
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Content</h3>
            <div className="text-gray-700 bg-white border rounded-lg p-4 whitespace-pre-wrap">
              {document.content}
            </div>
          </div>

          {/* Tags */}
          {document.relevance_tags && document.relevance_tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Relevance Tags</h3>
              <div className="flex flex-wrap gap-2">
                {document.relevance_tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    <TagIcon className="h-4 w-4 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Business Metrics */}
          {document.business_metrics && Object.keys(document.business_metrics).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Metrics</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(document.business_metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-green-700 capitalize font-medium">{key.replace('_', ' ')}:</span>
                      <span className="text-green-900 font-bold">
                        {typeof value === 'number' ? 
                          (key.includes('increase') || key.includes('improvement') ? `+${value}%` :
                           key.includes('cost') || key.includes('price') ? `$${value}` :
                           value) 
                          : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Info</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Usage Count:</span>
                <span className="ml-2 font-medium">{document.usage_count || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Effectiveness:</span>
                <span className="ml-2 font-medium">{Math.round((document.effectiveness_score || 0) * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Knowledge Type:</span>
                <span className="ml-2 font-medium capitalize">{document.knowledge_type?.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Verified:</span>
                <span className="ml-2 font-medium">
                  {document.last_verified ? new Date(document.last_verified).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KnowledgeBaseContent() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [knowledgeStatus, setKnowledgeStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedDomains, setSelectedDomains] = useState([])

  const domains = [
    { id: 'barbershop_operations', label: 'Barbershop Operations', color: 'blue' },
    { id: 'customer_experience', label: 'Customer Experience', color: 'green' },
    { id: 'revenue_optimization', label: 'Revenue Optimization', color: 'purple' },
    { id: 'marketing_strategies', label: 'Marketing Strategies', color: 'orange' },
    { id: 'staff_management', label: 'Staff Management', color: 'indigo' }
  ]

  const fetchKnowledgeStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/knowledge/enhanced?action=status')
      if (response.ok) {
        const data = await response.json()
        setKnowledgeStatus(data)
      }
    } catch (error) {
      console.error('Knowledge status error:', error)
    }
  }, [])

  const performSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/knowledge/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'contextual_search',
          query: searchQuery,
          context: {
            user_id: user.id,
            shop_type: 'barbershop'
          },
          preferred_domains: selectedDomains
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.contextual_search_results) {
          setSearchResults(data.contextual_search_results)
        } else if (data.fallback_data) {
          setSearchResults(data.fallback_data)
        }
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch()
    }
  }

  const handleViewDetails = (document) => {
    setSelectedDocument(document)
    setShowModal(true)
  }

  const toggleDomain = (domainId) => {
    setSelectedDomains(prev => 
      prev.includes(domainId) 
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    )
  }

  useEffect(() => {
    fetchKnowledgeStatus()
  }, [fetchKnowledgeStatus])

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BookOpenIcon className="h-8 w-8 mr-3 text-green-600" />
              Business Knowledge Base
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced RAG system with business-specific knowledge management
            </p>
          </div>
          <button
            onClick={fetchKnowledgeStatus}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Knowledge Base Status */}
      {knowledgeStatus && (
        <div className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Knowledge Base Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {knowledgeStatus.knowledge_status?.total_documents || 0}
              </div>
              <div className="text-sm text-gray-600">Total Documents</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((knowledgeStatus.knowledge_status?.average_confidence || 0) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {knowledgeStatus.knowledge_status?.knowledge_graph_entities || 0}
              </div>
              <div className="text-sm text-gray-600">Graph Entities</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${
                knowledgeStatus.knowledge_status?.status === 'operational' ? 'text-green-600' : 'text-red-600'
              }`}>
                {knowledgeStatus.knowledge_status?.status === 'operational' ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600">System Status</div>
            </div>
          </div>

          {/* Domain Distribution */}
          {knowledgeStatus.knowledge_status?.domain_distribution && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Domain Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(knowledgeStatus.knowledge_status.domain_distribution).map(([domain, count]) => (
                  <div key={domain} className="bg-white rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600 capitalize">{domain.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Interface */}
      <div className="mb-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-blue-600" />
            Smart Knowledge Search
          </h2>
          
          {/* Domain Filters */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Domain:</h3>
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => toggleDomain(domain.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedDomains.includes(domain.id)
                      ? `bg-${domain.color}-100 text-${domain.color}-800 border-${domain.color}-300 border`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {domain.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for business knowledge, strategies, best practices..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={performSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <MagnifyingGlassIcon className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
        </Card>
      </div>

      {/* Search Results */}
      {searchResults && (
        <KnowledgeSearchResults 
          results={searchResults} 
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal 
        document={selectedDocument}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}

export default function KnowledgeBasePage() {
  return (
    <ProtectedRoute>
      <KnowledgeBaseContent />
    </ProtectedRoute>
  )
}