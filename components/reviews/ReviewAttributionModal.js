'use client'

import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function ReviewAttributionModal({ review, isOpen, onClose, onEditAttribution = null }) {
  if (!isOpen || !review) return null

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Review Attribution Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Review</h4>
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <strong>{review.reviewerName}</strong>
                {renderStars(review.starRating)}
                <span className="text-sm text-gray-500">
                  {new Date(review.reviewDate).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700">{review.reviewText}</p>
            </div>
          </div>

          {review.attribution ? (
            <>
              <div>
                <h4 className="font-medium mb-2">Attribution</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Attributed to</label>
                    <p className="font-medium">{review.attribution.barber?.name || 'None'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Confidence</label>
                    <p className="font-medium">
                      {review.attribution.confidence} ({Math.round(review.attribution.confidenceScore)}%)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Sentiment</label>
                    <p className="font-medium">{review.attribution.sentiment}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Sentiment Score</label>
                    <p className="font-medium">
                      {review.attribution.sentimentScore?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {review.attribution.extractedNames?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Extracted Names</h4>
                  <div className="flex flex-wrap gap-2">
                    {review.attribution.extractedNames.map((name, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {review.attribution.mentionedPhrases?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Key Phrases</h4>
                  <div className="flex flex-wrap gap-2">
                    {review.attribution.mentionedPhrases.map((phrase, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {review.attribution.aiReasoning && (
                <div>
                  <h4 className="font-medium mb-2">AI Reasoning</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">{review.attribution.aiReasoning}</p>
                  </div>
                </div>
              )}

              {review.attribution.manualOverride && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    This attribution has been manually overridden
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">This review has not been attributed to any specific barber.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
          {onEditAttribution && (
            <button
              onClick={() => onEditAttribution(review)}
              className="px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700"
            >
              Edit Attribution
            </button>
          )}
        </div>
      </div>
    </div>
  )
}