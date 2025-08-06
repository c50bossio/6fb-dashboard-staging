'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Alert, AlertDescription } from "@/components/ui"
import { Loader2, Search, Brain, Target, TrendingUp, Users, DollarSign, Clock } from 'lucide-react'

export default function AdvancedRAGPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState('all')

  const businessDomains = [
    { id: 'all', name: 'All Domains', icon: Brain },
    { id: 'barbershop_operations', name: 'Operations', icon: Clock },
    { id: 'customer_experience', name: 'Customer Experience', icon: Users },
    { id: 'revenue_optimization', name: 'Revenue', icon: DollarSign },
    { id: 'marketing_strategies', name: 'Marketing', icon: Target },
    { id: 'staff_management', name: 'Staff Management', icon: TrendingUp }
  ]

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        query: query.trim(),
        domain: selectedDomain
      })

      const response = await fetch(`/api/knowledge/advanced-rag?${params}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.knowledge_result)
      } else {
        throw new Error(data.error || 'Failed to retrieve knowledge')
      }
    } catch (error) {
      console.error('Advanced RAG error:', error)
      setResults({
        documents: [],
        context_summary: `Error retrieving knowledge: ${error.message}`,
        knowledge_gaps: ['Service temporarily unavailable'],
        recommended_actions: ['Try rephrasing your question', 'Check system status'],
        key_insights: ['Advanced RAG system is initializing'],
        total_confidence: 0.3,
        rag_metadata: { error: error.message }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const exampleQueries = [
    "How can I increase customer retention?",
    "What are the best scheduling strategies?",
    "How to optimize pricing for maximum profit?",
    "Social media marketing best practices",
    "Staff training and productivity tips"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Brain className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Advanced RAG System</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Industry-specific business intelligence powered by enhanced retrieval-augmented generation
          </p>
        </div>

        {/* Search Interface */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Business Knowledge Search
            </CardTitle>
            <CardDescription>
              Ask questions about barbershop management, operations, marketing, and growth strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Domain Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Focus Area</label>
              <div className="flex flex-wrap gap-2">
                {businessDomains.map((domain) => {
                  const IconComponent = domain.icon
                  return (
                    <button
                      key={domain.id}
                      onClick={() => setSelectedDomain(domain.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDomain === domain.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {domain.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Query Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Question</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about barbershop best practices, optimization strategies, or business growth..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading || !query.trim()}
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Example Queries */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Try These Examples</label>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(example)}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Results */}
            <div className="lg:col-span-2 space-y-4">
              {/* Context Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{results.context_summary}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={results.total_confidence > 0.8 ? "success" : results.total_confidence > 0.5 ? "warning" : "destructive"}>
                      {Math.round(results.total_confidence * 100)}% Confidence
                    </Badge>
                    {results.rag_metadata && (
                      <Badge variant="outline">
                        {results.rag_metadata.processing_method || 'Advanced RAG'}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Knowledge Documents */}
              {results.documents && results.documents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Relevant Knowledge</h3>
                  {results.documents.map((doc, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{doc.title}</CardTitle>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.domain?.replace('_', ' ') || 'General'}
                            </Badge>
                            <Badge variant={doc.confidence_score > 0.8 ? "success" : "secondary"} className="text-xs">
                              {Math.round(doc.confidence_score * 100)}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-2">{doc.summary}</p>
                        <p className="text-sm text-gray-800">{doc.content}</p>
                        
                        {/* Business Metrics */}
                        {doc.business_metrics && Object.keys(doc.business_metrics).length > 0 && (
                          <div className="mt-3 p-2 bg-green-50 rounded-lg">
                            <h4 className="text-sm font-medium text-green-800 mb-1">Key Metrics</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(doc.business_metrics).map(([metric, value], metricIndex) => (
                                <Badge key={metricIndex} variant="success" className="text-xs">
                                  {metric.replace('_', ' ')}: {value}%
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Relevance Tags */}
                        {doc.relevance_tags && doc.relevance_tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doc.relevance_tags.slice(0, 4).map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Insights Sidebar */}
            <div className="space-y-4">
              {/* Key Insights */}
              {results.key_insights && results.key_insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-4 h-4" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {results.key_insights.map((insight, index) => (
                        <li key={index} className="text-sm text-gray-700 border-l-2 border-blue-200 pl-3">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Actions */}
              {results.recommended_actions && results.recommended_actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-4 h-4" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {results.recommended_actions.map((action, index) => (
                        <li key={index} className="text-sm text-gray-700 border-l-2 border-green-200 pl-3">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Knowledge Gaps */}
              {results.knowledge_gaps && results.knowledge_gaps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Search className="w-4 h-4" />
                      Knowledge Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {results.knowledge_gaps.map((gap, index) => (
                        <li key={index} className="text-sm text-amber-700 border-l-2 border-amber-200 pl-3">
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* System Info */}
              {results.rag_metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">System Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {results.rag_metadata.documents_retrieved && (
                      <div className="text-sm">
                        <span className="text-gray-600">Documents:</span> {results.rag_metadata.documents_retrieved}
                      </div>
                    )}
                    {results.rag_metadata.domains_analyzed && (
                      <div className="text-sm">
                        <span className="text-gray-600">Domains:</span> {results.rag_metadata.domains_analyzed.length}
                      </div>
                    )}
                    {results.rag_metadata.processing_method && (
                      <div className="text-sm">
                        <span className="text-gray-600">Method:</span> {results.rag_metadata.processing_method}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {results && results.documents && results.documents.length === 0 && (
          <Alert>
            <Search className="h-4 w-4" />
            <AlertDescription>
              No specific knowledge documents found for your query, but the system provided contextual insights and recommendations above.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}