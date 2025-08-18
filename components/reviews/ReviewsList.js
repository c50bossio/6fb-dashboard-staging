'use client'

import { useState, useEffect } from 'react'
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import ReviewCard from './ReviewCard'
import ReviewAttributionModal from './ReviewAttributionModal'

export default function ReviewsList({ 
  reviews = [],
  barbers = [],
  loading = false,
  onRefresh = null,
  showFilters = true,
  showSearch = true,
  showAttribution = true,
  compact = false,
  className = ''
}) {
  const [filteredReviews, setFilteredReviews] = useState(reviews)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [selectedRating, setSelectedRating] = useState('all')
  const [selectedConfidence, setSelectedConfidence] = useState('all')
  const [selectedSentiment, setSelectedSentiment] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [selectedReview, setSelectedReview] = useState(null)
  const [showAttributionModal, setShowAttributionModal] = useState(false)

  useEffect(() => {
    setFilteredReviews(reviews)
  }, [reviews])

  useEffect(() => {
    let filtered = reviews.filter(review => {
      const matchesSearch = 
        review.reviewText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (review.attribution?.barber?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesBarber = 
        selectedBarber === 'all' || 
        review.attribution?.barber?.id === selectedBarber ||
        (selectedBarber === 'unattributed' && !review.attribution?.barber)

      const matchesRating = 
        selectedRating === 'all' || 
        review.starRating === parseInt(selectedRating)

      const matchesConfidence = 
        selectedConfidence === 'all' || 
        review.attribution?.confidence === selectedConfidence

      const matchesSentiment = 
        selectedSentiment === 'all' || 
        review.attribution?.sentiment === selectedSentiment

      return matchesSearch && matchesBarber && matchesRating && matchesConfidence && matchesSentiment
    })

    if (dateRange !== 'all') {
      const now = new Date()
      let cutoffDate
      
      switch (dateRange) {
        case '7days':
          cutoffDate = new Date(now.setDate(now.getDate() - 7))
          break
        case '30days':
          cutoffDate = new Date(now.setDate(now.getDate() - 30))
          break
        case '90days':
          cutoffDate = new Date(now.setDate(now.getDate() - 90))
          break
        default:
          cutoffDate = null
      }

      if (cutoffDate) {
        filtered = filtered.filter(review => new Date(review.reviewDate) >= cutoffDate)
      }
    }

    setFilteredReviews(filtered)
  }, [reviews, searchTerm, selectedBarber, selectedRating, selectedConfidence, selectedSentiment, dateRange])

  const handleViewDetails = (review) => {
    setSelectedReview(review)
    setShowAttributionModal(true)
  }

  return (
    <div className={className}>
      {/* Filters */}
      {(showFilters || showSearch) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {showSearch && (
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reviews..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              )}
              
              {showFilters && (
                <div className="flex flex-wrap gap-3">
                  {barbers.length > 0 && (
                    <select
                      value={selectedBarber}
                      onChange={(e) => setSelectedBarber(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                    >
                      <option value="all">All Barbers</option>
                      <option value="unattributed">Unattributed</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.first_name} {barber.last_name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>

                  {showAttribution && (
                    <>
                      <select
                        value={selectedConfidence}
                        onChange={(e) => setSelectedConfidence(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                      >
                        <option value="all">All Confidence</option>
                        <option value="certain">Certain</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      <select
                        value={selectedSentiment}
                        onChange={(e) => setSelectedSentiment(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                      >
                        <option value="all">All Sentiment</option>
                        <option value="positive">Positive</option>
                        <option value="negative">Negative</option>
                        <option value="neutral">Neutral</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </>
                  )}

                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                  >
                    <option value="all">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                  </select>
                </div>
              )}

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Sync
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedBarber !== 'all' || selectedRating !== 'all'
                ? 'Try adjusting your filters'
                : 'Reviews will appear here once synced from Google My Business'
              }
            </p>
          </div>
        ) : (
          <div className={compact ? 'divide-y divide-gray-200' : ''}>
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onViewDetails={handleViewDetails}
                showAttribution={showAttribution}
                compact={compact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Attribution Modal */}
      {showAttributionModal && selectedReview && (
        <ReviewAttributionModal
          review={selectedReview}
          isOpen={showAttributionModal}
          onClose={() => {
            setShowAttributionModal(false)
            setSelectedReview(null)
          }}
        />
      )}
    </div>
  )
}