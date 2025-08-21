'use client'

import { EyeIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function ReviewCard({ 
  review, 
  onViewDetails = null,
  showAttribution = true,
  showActions = true,
  compact = false 
}) {
  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIconSolid
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'certain': return 'bg-green-100 text-green-800'
      case 'high': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      case 'neutral': return 'bg-gray-100 text-gray-800'
      case 'mixed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (compact) {
    return (
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {review.reviewerPhoto ? (
              <img
                src={review.reviewerPhoto}
                alt={review.reviewerName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {review.reviewerName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900">{review.reviewerName}</p>
                {renderStars(review.starRating)}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(review.reviewDate).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{review.reviewText}</p>
            
            {showAttribution && review.attribution?.barber && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
                  {review.attribution.barber.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          {review.reviewerPhoto ? (
            <img
              src={review.reviewerPhoto}
              alt={review.reviewerName}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {review.reviewerName?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">{review.reviewerName}</p>
              {renderStars(review.starRating)}
              <span className="text-sm text-gray-500">
                {new Date(review.reviewDate).toLocaleDateString()}
              </span>
            </div>
            
            {showActions && (
              <div className="flex items-center space-x-2">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(review)}
                    className="text-olive-600 hover:text-olive-800 text-sm font-medium"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                )}
                {review.reviewUrl && (
                  <a
                    href={review.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View on Google
                  </a>
                )}
              </div>
            )}
          </div>
          
          <p className="text-gray-700 mb-3">{review.reviewText}</p>
          
          {showAttribution && (
            <div className="flex flex-wrap items-center gap-3">
              {review.attribution?.barber ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Attributed to:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
                    {review.attribution.barber.name}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(review.attribution.confidence)}`}>
                    {review.attribution.confidence} ({Math.round(review.attribution.confidenceScore)}%)
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(review.attribution.sentiment)}`}>
                    {review.attribution.sentiment}
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Unattributed
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}