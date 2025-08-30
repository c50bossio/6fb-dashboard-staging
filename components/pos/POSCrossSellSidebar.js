import { ShoppingCart, TrendingUp, Star, Clock, DollarSign, X, Plus } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { useCrossSellingSuggestions, useTrackCrossSellInteraction } from '@/hooks/queries/useCrossSelling'

const POSCrossSellSidebar = ({ 
  shopId,
  currentItems = [],
  serviceType,
  customerHistory = {},
  customerId,
  sessionId = `pos-${Date.now()}`,
  onAddToCart,
  onClose,
  className = ""
}) => {
  const [expandedSuggestion, setExpandedSuggestion] = useState(null)
  const [viewedSuggestions, setViewedSuggestions] = useState(new Set())
  
  // Get cross-selling suggestions
  const { 
    data: suggestionsData, 
    isLoading, 
    error, 
    refetch 
  } = useCrossSellingSuggestions(shopId, currentItems, {
    serviceId: serviceType?.id,
    customerId,
    sessionId,
    enabled: !!shopId
  })

  // Track interactions
  const trackInteraction = useTrackCrossSellInteraction()

  const suggestions = suggestionsData?.suggestions || []
  const metadata = suggestionsData?.metadata

  // Track when suggestions are viewed
  useEffect(() => {
    if (suggestions.length > 0) {
      suggestions.forEach(suggestion => {
        if (!viewedSuggestions.has(suggestion.suggestion_id)) {
          setViewedSuggestions(prev => new Set(prev).add(suggestion.suggestion_id))
          
          // Track viewing after a brief delay
          setTimeout(() => {
            trackInteraction.mutate({
              shopId,
              sessionId,
              suggestionId: suggestion.suggestion_id,
              action: 'viewed',
              productId: suggestion.product.id,
              anchorProductId: suggestion.anchor_product_id,
              anchorServiceId: suggestion.anchor_service_id,
              customerId
            })
          }, 1000)
        }
      })
    }
  }, [suggestions, viewedSuggestions, shopId, sessionId, customerId, trackInteraction])

  const handleAddToCart = (suggestion) => {
    // Add item to cart
    if (onAddToCart) {
      onAddToCart({
        id: suggestion.product.id,
        name: suggestion.product.name,
        price: suggestion.product.price,
        type: 'product',
        source: 'cross_sell_suggestion',
        suggestion_type: suggestion.type
      })
    }

    // Track acceptance
    trackInteraction.mutate({
      shopId,
      sessionId,
      suggestionId: suggestion.suggestion_id,
      action: 'accepted',
      productId: suggestion.product.id,
      anchorProductId: suggestion.anchor_product_id,
      anchorServiceId: suggestion.anchor_service_id,
      customerId,
      revenueImpact: suggestion.product.price
    })
  }

  const handleDismiss = (suggestion) => {
    // Track dismissal
    trackInteraction.mutate({
      shopId,
      sessionId,
      suggestionId: suggestion.suggestion_id,
      action: 'dismissed',
      productId: suggestion.product.id,
      anchorProductId: suggestion.anchor_product_id,
      anchorServiceId: suggestion.anchor_service_id,
      customerId
    })
  }

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'product_affinity':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />
      case 'service_upsell':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'customer_preference':
        return <Star className="w-4 h-4 text-yellow-500" />
      case 'seasonal_promotion':
        return <Clock className="w-4 h-4 text-purple-500" />
      default:
        return <Plus className="w-4 h-4 text-gray-500" />
    }
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (!shopId) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
          {metadata?.total_suggestions > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {metadata.total_suggestions}
            </span>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-4">
          <div className="text-red-600 text-sm mb-2">Failed to load suggestions</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* No Suggestions */}
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No suggestions available</p>
          <p className="text-xs text-gray-400 mt-1">
            Add items to get personalized recommendations
          </p>
        </div>
      )}

      {/* Suggestions List */}
      {!isLoading && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.suggestion_id}
              className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Product Info */}
                  <div className="flex items-center gap-2 mb-2">
                    {getSuggestionIcon(suggestion.type)}
                    <h4 className="font-medium text-sm text-gray-900">
                      {suggestion.product.name}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                      {suggestion.confidence}% match
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <span className="font-semibold text-green-600">
                      ${suggestion.product.price}
                    </span>
                    {suggestion.bundle_savings && (
                      <span className="text-xs text-gray-500 line-through">
                        ${suggestion.item.original_price}
                      </span>
                    )}
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-gray-600 mb-3">
                    {suggestion.reasoning}
                  </p>

                  {/* Additional Info */}
                  {expandedSuggestion === suggestion.suggestion_id && (
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      {suggestion.product.description && (
                        <p><strong>Description:</strong> {suggestion.product.description}</p>
                      )}
                      {suggestion.adoption_rate && (
                        <p><strong>Popularity:</strong> {Math.round(suggestion.adoption_rate * 100)}% of customers purchase this</p>
                      )}
                      {suggestion.average_value && (
                        <p><strong>Avg Value:</strong> ${suggestion.average_value}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Image */}
                {suggestion.product.image_url && (
                  <div className="ml-3 flex-shrink-0">
                    <img
                      src={suggestion.product.image_url}
                      alt={suggestion.product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedSuggestion(
                      expandedSuggestion === suggestion.suggestion_id 
                        ? null 
                        : suggestion.suggestion_id
                    )}
                    className="text-xs"
                  >
                    {expandedSuggestion === suggestion.suggestion_id ? 'Less' : 'More'}
                  </Button>
                  <span className="text-xs text-gray-400">
                    Rank #{suggestion.rank}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(suggestion)}
                    className="text-xs px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddToCart(suggestion)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {metadata && suggestions.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Generated:</span>
              <span>{new Date(metadata.generated_at).toLocaleTimeString()}</span>
            </div>
            {metadata.suggestion_types && (
              <div className="flex justify-between">
                <span>Mix:</span>
                <span>
                  {Object.entries(metadata.suggestion_types)
                    .filter(([_, count]) => count > 0)
                    .map(([type, count]) => `${count} ${type.replace('_', ' ')}`)
                    .join(', ')
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default POSCrossSellSidebar